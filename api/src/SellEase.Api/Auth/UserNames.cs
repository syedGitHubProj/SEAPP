using System.Text.RegularExpressions;

namespace SellEase.Api.Auth;

public static partial class UserNames
{
    /// <summary>
    /// Staff may sign in with a phone number. "0300-123 4567" and "03001234567" are the same user,
    /// so phone-like names keep only their digits (and a leading +). Other names are just trimmed.
    /// </summary>
    public static string Normalize(string input)
    {
        var trimmed = input.Trim();
        if (!PhoneLike().IsMatch(trimmed)) return trimmed;
        var digits = new string(trimmed.Where(char.IsAsciiDigit).ToArray());
        return trimmed.StartsWith('+') ? "+" + digits : digits;
    }

    [GeneratedRegex(@"^\+?[0-9][0-9 \-]*$")]
    private static partial Regex PhoneLike();
}
