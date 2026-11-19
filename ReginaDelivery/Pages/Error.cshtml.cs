using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ReginaDelivery.Resources;

namespace ReginaDelivery.Pages;

[IgnoreAntiforgeryToken]
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
public class ErrorModel : PageModel
{
    public int Code { get; private set; }
    public string Message { get; private set; } = "";

    public void OnGet(int? code) => Set(code);
    public void OnPost(int? code) => Set(code);

    private void Set(int? code)
    {
        // When re-executed by the status-code middleware the original status is already set; keep it.
        Code = code ?? (Response.StatusCode >= 400 ? Response.StatusCode : 500);
        if (Response.StatusCode < 400) Response.StatusCode = Code;
        Message = Code switch
        {
            403 => Strings.Forbidden,
            404 => Strings.NotFound,
            _ => Strings.GenericError,
        };
    }
}
