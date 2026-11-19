using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using WebPush;

namespace ReginaDelivery.Services;

/// <summary>VAPID keys for Web Push: from env vars, else generated once and kept next to the database.</summary>
public class VapidKeys
{
    public string PublicKey { get; }
    public string PrivateKey { get; }
    public string Subject { get; }

    public VapidKeys(IConfiguration config, string dataDir, ILogger<VapidKeys> logger)
    {
        var appUrl = config["APP_URL"];
        Subject = config["VAPID_SUBJECT"] is { Length: > 0 } subj ? subj
            : appUrl is { Length: > 0 } && appUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? appUrl.TrimEnd('/')
            : "https://reginacolori.com";

        if (config["VAPID_PUBLIC_KEY"] is { Length: > 0 } pub && config["VAPID_PRIVATE_KEY"] is { Length: > 0 } priv)
        {
            PublicKey = pub;
            PrivateKey = priv;
            return;
        }

        var file = Path.Combine(dataDir, "vapid.json");
        if (File.Exists(file))
        {
            var saved = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(file));
            if (saved is not null && saved.TryGetValue("publicKey", out var p) && saved.TryGetValue("privateKey", out var k))
            {
                PublicKey = p;
                PrivateKey = k;
                return;
            }
        }

        var generated = VapidHelper.GenerateVapidKeys();
        PublicKey = generated.PublicKey;
        PrivateKey = generated.PrivateKey;
        File.WriteAllText(file, JsonSerializer.Serialize(new Dictionary<string, string>
        {
            ["publicKey"] = PublicKey,
            ["privateKey"] = PrivateKey,
        }));
        logger.LogInformation("Generated new VAPID keys in {File}.", file);
    }
}

/// <summary>Orders waiting to be announced. Saving an order never waits for push/Telegram.</summary>
public class NotificationQueue
{
    private readonly Channel<int> _channel = Channel.CreateUnbounded<int>();
    public void OrderCreated(int orderId) => _channel.Writer.TryWrite(orderId);
    public IAsyncEnumerable<int> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public record PushMessage(string Title, string Body, string Url, string Tag);

public class NotificationSender(
    AppDbContext db, VapidKeys vapid, IHttpClientFactory httpFactory, IConfiguration config,
    TimeService time, ILogger<NotificationSender> logger)
{
    public bool TelegramConfigured =>
        !string.IsNullOrWhiteSpace(config["TELEGRAM_BOT_TOKEN"]) && !string.IsNullOrWhiteSpace(config["TELEGRAM_CHAT_ID"]);

    /// <summary>Announce a new order to every active agent (all their phones) and the Telegram group.</summary>
    public async Task SendOrderAsync(int orderId, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking()
            .Include(o => o.FieldUser)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order is null) return;

        var items = order.Items.OrderBy(i => i.Id).ToList();
        var lines = items.Select(i => "• " + i.Describe()).ToList();
        var total = order.Total;

        var bodyText = new StringBuilder()
            .Append(order.FieldUser.FullName).Append(" · ").AppendLine(order.Location)
            .AppendLine(string.Join("\n", lines.Take(6)))
            .Append(lines.Count > 6 ? $"… +{lines.Count - 6}\n" : "")
            .Append("Totali: ").Append(Money.Format(total))
            .ToString();

        var msg = new PushMessage($"🧾 Porosi e re #{order.Id} — {order.CompanyName}", bodyText,
            $"/agent/orders/{order.Id}", $"order-{order.Id}");

        var agentDevices = await db.PushDevices
            .Where(d => d.User.Role == Role.Agent && d.User.IsActive)
            .ToListAsync(ct);
        await PushAsync(agentDevices, msg, ct);

        if (TelegramConfigured)
        {
            var html = new StringBuilder()
                .Append("🧾 <b>Porosi e re #").Append(order.Id).Append("</b>\n")
                .Append("🏢 <b>").Append(H(order.CompanyName)).Append("</b>\n")
                .Append("📍 ").Append(H(order.Location)).Append('\n');
            if (!string.IsNullOrEmpty(order.Phone)) html.Append("📞 ").Append(H(order.Phone)).Append('\n');
            html.Append("👤 ").Append(H(order.FieldUser.FullName)).Append(" · ").Append(time.Format(order.CreatedAtUtc)).Append("\n\n");
            foreach (var i in items)
            {
                html.Append("• ").Append(H(i.Describe()));
                if (i.UnitPrice.HasValue) html.Append(" — ").Append(Money.Format(i.LineTotal));
                html.Append('\n');
            }
            html.Append("\n<b>Totali: ").Append(Money.Format(total)).Append("</b>");
            if (order.HasMissingPrice) html.Append(" (disa produkte pa çmim)");
            if (!string.IsNullOrEmpty(order.Note)) html.Append("\n📝 ").Append(H(order.Note));
            if (order.HasGps) html.Append("\n<a href=\"").Append(H(order.MapUrl)).Append("\">Harta</a>");
            if (config["APP_URL"] is { Length: > 0 } appUrl)
                html.Append("\n<a href=\"").Append(H(appUrl.TrimEnd('/') + msg.Url)).Append("\">Hap porosinë</a>");
            await TelegramAsync(html.ToString(), ct);
        }
    }

    /// <summary>Test notification to one user's devices (and Telegram, if configured).</summary>
    public async Task<int> SendTestAsync(int userId, CancellationToken ct)
    {
        var devices = await db.PushDevices.Where(d => d.UserId == userId).ToListAsync(ct);
        var msg = new PushMessage("✅ Njoftimet funksionojnë", "Ky telefon do të marrë njoftim për çdo porosi të re.", "/agent", "test");
        var sent = await PushAsync(devices, msg, ct);
        if (TelegramConfigured) await TelegramAsync("✅ Njoftimet e Regina Colori funksionojnë.", ct);
        return sent;
    }

    private async Task<int> PushAsync(List<PushDevice> devices, PushMessage msg, CancellationToken ct)
    {
        if (devices.Count == 0) return 0;
        var client = new WebPushClient(httpFactory.CreateClient("webpush"));
        var details = new VapidDetails(vapid.Subject, vapid.PublicKey, vapid.PrivateKey);
        var payload = JsonSerializer.Serialize(new { title = msg.Title, body = msg.Body, url = msg.Url, tag = msg.Tag });
        var sent = 0;
        var dead = new List<PushDevice>();

        foreach (var d in devices)
        {
            try
            {
                await client.SendNotificationAsync(new PushSubscription(d.Endpoint, d.P256dh, d.Auth), payload, details, ct);
                sent++;
            }
            catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                dead.Add(d); // phone unsubscribed / app removed
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Web push to device {DeviceId} failed.", d.Id);
            }
        }

        if (dead.Count > 0)
        {
            db.PushDevices.RemoveRange(dead);
            await db.SaveChangesAsync(ct);
        }
        return sent;
    }

    private async Task TelegramAsync(string html, CancellationToken ct)
    {
        var token = config["TELEGRAM_BOT_TOKEN"]!.Trim();
        var http = httpFactory.CreateClient("telegram");
        foreach (var chatId in config["TELEGRAM_CHAT_ID"]!.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            try
            {
                using var res = await http.PostAsJsonAsync($"https://api.telegram.org/bot{token}/sendMessage", new
                {
                    chat_id = chatId,
                    text = html,
                    parse_mode = "HTML",
                    disable_web_page_preview = true,
                }, ct);
                if (!res.IsSuccessStatusCode)
                    logger.LogWarning("Telegram sendMessage to {Chat} failed: {Status} {Body}", chatId, (int)res.StatusCode,
                        await res.Content.ReadAsStringAsync(ct));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Telegram sendMessage to {Chat} failed.", chatId);
            }
        }
    }

    private static string H(string s) => WebUtility.HtmlEncode(s);
}

/// <summary>Background worker: sends notifications for each queued order.</summary>
public class NotificationWorker(NotificationQueue queue, IServiceScopeFactory scopes, ILogger<NotificationWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var orderId in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<NotificationSender>().SendOrderAsync(orderId, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Sending notifications for order {OrderId} failed.", orderId);
            }
        }
    }
}
