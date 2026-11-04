using System.Reflection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Vibasic.Domain;

namespace Vibasic.Infrastructure;

/// <summary>Stores an enum as its Vietnamese <see cref="LabelAttribute"/> text.</summary>
public class LabelConverter<TEnum>() : ValueConverter<TEnum, string>(v => Labels<TEnum>.ToLabel(v), s => Labels<TEnum>.FromLabel(s))
    where TEnum : struct, Enum;

public static class Labels<TEnum> where TEnum : struct, Enum
{
    private static readonly Dictionary<TEnum, string> To = Enum.GetValues<TEnum>().ToDictionary(
        v => v,
        v => typeof(TEnum).GetField(v.ToString())!.GetCustomAttribute<LabelAttribute>()?.Text ?? v.ToString());

    private static readonly Dictionary<string, TEnum> From = To.ToDictionary(kv => kv.Value, kv => kv.Key);

    public static string ToLabel(TEnum v) => To[v];
    public static TEnum FromLabel(string s) => From[s];
}
