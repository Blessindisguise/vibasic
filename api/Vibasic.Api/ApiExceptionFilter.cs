using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Vibasic.Infrastructure;

namespace Vibasic.Api;

/// <summary>
/// Turns expected domain errors into ProblemDetails with a Vietnamese title:
/// ValidationException → 400 with per-field errors, NotFoundException → 404, RuleException → 409,
/// DbUpdateConcurrencyException (someone else saved the same row first) → 409.
/// </summary>
public class ApiExceptionFilter(ProblemDetailsFactory factory) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var http = context.HttpContext;
        ProblemDetails? problem = context.Exception switch
        {
            ValidationException v => factory.CreateValidationProblemDetails(http, ToModelState(v), 400, v.Message),
            NotFoundException n => factory.CreateProblemDetails(http, 404, n.Message),
            RuleException r => factory.CreateProblemDetails(http, 409, r.Message),
            DbUpdateConcurrencyException => factory.CreateProblemDetails(http, 409, "Dữ liệu vừa được người khác thay đổi. Tải lại trang rồi thử lại."),
            _ => null,
        };
        if (problem is null) return;
        context.Result = new ObjectResult(problem) { StatusCode = problem.Status };
        context.ExceptionHandled = true;
    }

    private static ModelStateDictionary ToModelState(ValidationException v)
    {
        var ms = new ModelStateDictionary();
        foreach (var (field, message) in v.Errors) ms.AddModelError(field, message);
        return ms;
    }
}
