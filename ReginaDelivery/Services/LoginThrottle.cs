using System.Collections.Concurrent;

namespace ReginaDelivery.Services;

/// <summary>In-memory limit: 5 failed logins per 15 minutes per username+IP.</summary>
public class LoginThrottle
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private readonly ConcurrentDictionary<string, List<DateTime>> _failures = new();

    public static string Key(string username, string? ip) => $"{username.Trim().ToLowerInvariant()}|{ip}";

    public bool IsBlocked(string key)
    {
        if (!_failures.TryGetValue(key, out var list)) return false;
        lock (list)
        {
            Prune(list);
            return list.Count >= MaxFailures;
        }
    }

    public void RegisterFailure(string key)
    {
        var list = _failures.GetOrAdd(key, _ => new List<DateTime>());
        lock (list)
        {
            Prune(list);
            list.Add(DateTime.UtcNow);
        }
        if (_failures.Count > 10_000) Cleanup();
    }

    public void Reset(string key) => _failures.TryRemove(key, out _);

    private static void Prune(List<DateTime> list)
    {
        var cutoff = DateTime.UtcNow - Window;
        list.RemoveAll(t => t < cutoff);
    }

    private void Cleanup()
    {
        foreach (var (key, list) in _failures)
        {
            bool empty;
            lock (list) { Prune(list); empty = list.Count == 0; }
            if (empty) _failures.TryRemove(key, out _);
        }
    }
}
