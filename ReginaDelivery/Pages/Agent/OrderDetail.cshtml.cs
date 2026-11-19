using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using ReginaDelivery.Resources;

namespace ReginaDelivery.Pages.Agent;

public class OrderDetailModel(AppDbContext db) : PageModel
{
    public Order Order { get; private set; } = null!;

    public async Task<IActionResult> OnGetAsync(int id)
    {
        var o = await db.Orders.AsNoTracking()
            .Include(x => x.FieldUser)
            .Include(x => x.Items).ThenInclude(i => i.Product)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();
        Order = o;
        return Page();
    }

    /// <summary>Agent adjusts prices for this order only (e.g. discount). Form fields: price[itemId].</summary>
    public async Task<IActionResult> OnPostPricesAsync(int id, Dictionary<int, string> price)
    {
        var o = await db.Orders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();

        foreach (var item in o.Items)
        {
            if (!price.TryGetValue(item.Id, out var text)) continue;
            if (string.IsNullOrWhiteSpace(text)) { item.UnitPrice = null; continue; }
            if (!Money.TryParse(text, out var value) || value > 1_000_000)
            {
                TempData["Err"] = Strings.ErrPrice;
                return RedirectToPage(new { id });
            }
            item.UnitPrice = Math.Round(value, 2);
        }
        await db.SaveChangesAsync();
        TempData["Ok"] = Strings.PricesSaved;
        return RedirectToPage(new { id });
    }

    public async Task<IActionResult> OnPostVoidAsync(int id, string? reason)
    {
        var o = await db.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();
        reason = reason?.Trim();
        if (string.IsNullOrEmpty(reason))
        {
            TempData["Err"] = Strings.VoidReasonRequired;
            return RedirectToPage(new { id });
        }
        o.IsVoided = true;
        o.VoidReason = reason.Length > 300 ? reason[..300] : reason;
        await db.SaveChangesAsync();
        return RedirectToPage(new { id });
    }

    public async Task<IActionResult> OnPostRestoreAsync(int id)
    {
        var o = await db.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();
        o.IsVoided = false;
        o.VoidReason = null;
        await db.SaveChangesAsync();
        return RedirectToPage(new { id });
    }
}
