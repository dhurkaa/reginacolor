using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ReginaDelivery.Services;

namespace ReginaDelivery.Pages;

public class IndexModel : PageModel
{
    public IActionResult OnGet() => LocalRedirect(AppClaims.HomeFor(User));
}
