using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using ReginaDelivery.Services;

namespace ReginaDelivery.Pages.Field;

public class HistoryModel(AppDbContext db) : PageModel
{
    public List<Order> Orders { get; private set; } = new();

    public async Task OnGetAsync()
    {
        var me = User.GetUserId(); // always from the auth cookie, never the query string
        Orders = await db.Orders.AsNoTracking()
            .Where(o => o.FieldUserId == me)
            .OrderByDescending(o => o.CreatedAtUtc).ThenByDescending(o => o.Id)
            .Take(30)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .AsSplitQuery()
            .ToListAsync();
    }
}
