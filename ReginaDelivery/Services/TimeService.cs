using System.Globalization;

namespace ReginaDelivery.Services;

/// <summary>UTC &lt;-&gt; Europe/Belgrade (Kosovo time). All storage is UTC; all display is local.</summary>
public class TimeService
{
    public const string DisplayFormat = "dd.MM.yyyy HH:mm";

    public TimeZoneInfo Zone { get; }

    public TimeService()
    {
        Zone = FindZone("Europe/Belgrade") ?? FindZone("Central Europe Standard Time") ?? TimeZoneInfo.Utc;
    }

    private static TimeZoneInfo? FindZone(string id)
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch (TimeZoneNotFoundException) { return null; }
        catch (InvalidTimeZoneException) { return null; }
    }

    public DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

    public string Format(DateTime utc) => ToLocal(utc).ToString(DisplayFormat, CultureInfo.InvariantCulture);

    public DateTime LocalNow => ToLocal(DateTime.UtcNow);

    public DateOnly TodayLocal => DateOnly.FromDateTime(LocalNow);

    /// <summary>UTC instant of local midnight at the start of <paramref name="day"/>.</summary>
    public DateTime StartOfDayUtc(DateOnly day) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified), Zone);

    /// <summary>Monday of the local week containing <paramref name="day"/>.</summary>
    public static DateOnly StartOfWeek(DateOnly day)
    {
        var diff = ((int)day.DayOfWeek + 6) % 7; // Monday = 0
        return day.AddDays(-diff);
    }
}
