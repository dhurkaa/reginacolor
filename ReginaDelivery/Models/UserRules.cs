using System.Text.RegularExpressions;

namespace ReginaDelivery.Models;

public static partial class UserRules
{
    public const int MinPasswordLength = 8;
    public const string UsernameRuleText = "Username must be 3–32 characters: lowercase letters, digits, '.', '_' or '-'.";

    [GeneratedRegex("^[a-z0-9._-]{3,32}$")]
    private static partial Regex UsernameRegex();

    public static bool IsValidUsername(string username) => UsernameRegex().IsMatch(username);

    public static readonly string[] Units = ["copë", "thes", "kovë", "kg", "L", "paletë"];
}
