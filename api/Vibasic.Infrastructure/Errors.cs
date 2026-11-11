namespace Vibasic.Infrastructure;

/// <summary>Input errors keyed by request field name (camelCase). Messages are user-facing Vietnamese.</summary>
public sealed class ValidationException(IReadOnlyDictionary<string, string> errors)
    : Exception("Dữ liệu chưa hợp lệ. Kiểm tra lại các ô được đánh dấu.")
{
    public IReadOnlyDictionary<string, string> Errors { get; } = errors;
}

public sealed class NotFoundException(string message) : Exception(message);

/// <summary>A business rule forbids the action. The message says what happened and what to do.</summary>
public sealed class RuleException(string message) : Exception(message);

/// <summary>Collects the first error per field, then throws them together.</summary>
public sealed class Validator
{
    private readonly Dictionary<string, string> _errors = [];

    public Validator Check(bool ok, string field, string message)
    {
        if (!ok) _errors.TryAdd(field, message);
        return this;
    }

    public bool Has(string field) => _errors.ContainsKey(field);

    public void ThrowIfAny()
    {
        if (_errors.Count > 0) throw new ValidationException(_errors);
    }
}
