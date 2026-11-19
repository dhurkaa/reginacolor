# Build Spec: Regina Colori – Delivery Tracker

> Paste this whole file into Claude Code (or save it as `CLAUDE.md` in an empty folder and say "build this").

## 1. Goal

A small web app for **Regina Colori** (paint & building-materials distributor in Kosovo, official San Marco distributor — https://reginacolori.com).

Two roles:
- **Admin** (the owner) – sees every delivery: **when** it was reported (exact date/time), **which driver**, **which products** and **how much**, and **where/to whom**.
- **Driver** – logs in on his phone, picks the products he delivered, enters the customer/place, taps **"Dorëzuar" (Delivered)**. Nothing else.

Keep it simple, fast on a cheap Android phone, and easy to deploy as one app.

## 2. Tech stack (fixed — do not change)

- **ASP.NET Core 8, Razor Pages**, C#
- **EF Core 8 + SQLite** (`app.db`) — single file DB, easy to back up
- **Cookie authentication** with roles `Admin` and `Driver` (no ASP.NET Identity UI scaffolding — keep it lean; hash passwords with `PasswordHasher<User>`)
- Plain CSS (no Tailwind build step), a little vanilla JS. No SPA framework.
- Single project: `ReginaDelivery/`

## 3. Data model

```csharp
public enum Role { Admin, Driver }

public class User {
    public int Id { get; set; }
    public string Username { get; set; } = "";      // unique, lowercase
    public string FullName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Role Role { get; set; }
    public bool IsActive { get; set; } = true;      // admin can disable a driver
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class Product {
    public int Id { get; set; }
    public string Code { get; set; } = "";          // unique slug, e.g. "rc-urbano"
    public string Name { get; set; } = "";          // "Urbano"
    public string Brand { get; set; } = "";         // "Regina Colori" | "Regina Polvere" | "Bau Farbe" | "Bau Putz"
    public string Description { get; set; } = "";   // "Pittura Per Interni"
    public string DefaultUnit { get; set; } = "copë"; // copë / thes / kovë / kg / L
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class Delivery {
    public int Id { get; set; }
    public int DriverId { get; set; }
    public User Driver { get; set; } = null!;
    public string CustomerName { get; set; } = "";  // required
    public string Location { get; set; } = "";      // city / address, required
    public string? Note { get; set; }
    public double? Latitude { get; set; }           // optional, from browser geolocation
    public double? Longitude { get; set; }
    public DateTime DeliveredAtUtc { get; set; }    // SET BY SERVER, never by client
    public List<DeliveryItem> Items { get; set; } = new();
    public bool IsVoided { get; set; }              // admin can void a wrong entry (no hard delete)
    public string? VoidReason { get; set; }
}

public class DeliveryItem {
    public int Id { get; set; }
    public int DeliveryId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }           // > 0
    public string Unit { get; set; } = "copë";
}
```

**Important rule:** `DeliveredAtUtc = DateTime.UtcNow` on the server at the moment of submit. The driver cannot edit the time. Display all times in **Europe/Belgrade** (Kosovo time), format `dd.MM.yyyy HH:mm`.

## 4. Product seed (from reginacolori.com, 34 products)

Seed into the DB on first run (`Data/products.json` + seeder). Note: Bau Putz has two products called "BP 110" with different descriptions — keep both, distinct codes.

```json
[
  { "code": "rc-urbano",      "brand": "Regina Colori",  "name": "Urbano",              "description": "Pittura Per Interni" },
  { "code": "rc-bianca",      "brand": "Regina Colori",  "name": "Bianca",              "description": "Idropittura Per Interni – Ecologia" },
  { "code": "rc-armonia",     "brand": "Regina Colori",  "name": "Armonia",             "description": "Idropittura Lavabile Per Interni" },
  { "code": "rc-acrilin",     "brand": "Regina Colori",  "name": "Acrilin",             "description": "Fissativo All'acqua Per Interni" },
  { "code": "rc-acrilex",     "brand": "Regina Colori",  "name": "Acrilex",             "description": "Fissativo All'acqua Per Esterni" },
  { "code": "rc-primafas",    "brand": "Regina Colori",  "name": "Primafas",            "description": "Strati Di Base" },
  { "code": "rc-primabet",    "brand": "Regina Colori",  "name": "Primabet",            "description": "Strati Di Base" },
  { "code": "rc-fortecril",   "brand": "Regina Colori",  "name": "Fortecril",           "description": "Supporto Armato – Interni/Esterni" },
  { "code": "rc-recril",      "brand": "Regina Colori",  "name": "Recril",              "description": "Pittura Acrilica Per Esterno" },
  { "code": "rc-quarzo",      "brand": "Regina Colori",  "name": "Quarzo",              "description": "Pittura Al Quarzo Per Esterno" },
  { "code": "rc-recasa",      "brand": "Regina Colori",  "name": "Recasa",              "description": "Rivestimento" },
  { "code": "rc-marmomix",    "brand": "Regina Colori",  "name": "Marmomix",            "description": "Rivestimento Murale Plastico" },

  { "code": "rp-collacem-grigio",  "brand": "Regina Polvere", "name": "Collacem Grigio",   "description": "Grigio / Grey" },
  { "code": "rp-collacem-bianco",  "brand": "Regina Polvere", "name": "Collacem Bianco",   "description": "Bianco / White" },
  { "code": "rp-reflex-grigio",    "brand": "Regina Polvere", "name": "Reflex Grigio",     "description": "Collante per Piastrelle – Grigio" },
  { "code": "rp-reflex-bianco",    "brand": "Regina Polvere", "name": "Reflex Bianco",     "description": "Collante per Piastrelle – Bianco" },
  { "code": "rp-reflex-waterproof","brand": "Regina Polvere", "name": "Reflex Waterproofing", "description": "Impermeabilizzante" },

  { "code": "bf-classic-farbe", "brand": "Bau Farbe", "name": "Classic Farbe", "description": "Pittura per Interni Economica" },
  { "code": "bf-acryl-farbe",   "brand": "Bau Farbe", "name": "Acryl Farbe",   "description": "Pittura per Interni" },
  { "code": "bf-star-farbe",    "brand": "Bau Farbe", "name": "Star Farbe",    "description": "Pittura Lavabile per Interni" },
  { "code": "bf-fasadex",       "brand": "Bau Farbe", "name": "Fasadex",       "description": "Pittura Acrilica per Esterni" },
  { "code": "bf-betoncontact",  "brand": "Bau Farbe", "name": "Betoncontact",  "description": "Per Interni e Esterni" },
  { "code": "bf-grundfarbe",    "brand": "Bau Farbe", "name": "Grundfarbe",    "description": "Per Interni" },
  { "code": "bf-putzgrund",     "brand": "Bau Farbe", "name": "Putzgrund",     "description": "Per Interni e Esterni" },
  { "code": "bf-tiefgrund",     "brand": "Bau Farbe", "name": "Tiefgrund",     "description": "Per Interni e Esterni" },
  { "code": "bf-bau-fassade",   "brand": "Bau Farbe", "name": "Bau Fassade",   "description": "Facciate Decorative" },

  { "code": "bp-10",          "brand": "Bau Putz", "name": "BP 10",        "description": "Intonaco a base di cemento" },
  { "code": "bp-900",         "brand": "Bau Putz", "name": "BP 900",       "description": "Colla grigia per polistirolo" },
  { "code": "bp-110-finale",  "brand": "Bau Putz", "name": "BP 110",       "description": "Intonaco finale a base di cemento" },
  { "code": "bp-110-malta",   "brand": "Bau Putz", "name": "BP 110",       "description": "Malta lisciante a base di cemento" },
  { "code": "bp-950",         "brand": "Bau Putz", "name": "BP 950",       "description": "Colla bianca per polistirolo" },
  { "code": "bp-970-grau",    "brand": "Bau Putz", "name": "BP 970 Grau",  "description": "Colla per piastrelle economica – Grigio" },
  { "code": "bp-970-weiss",   "brand": "Bau Putz", "name": "BP 970 Weiss", "description": "Colla per piastrelle economica – Bianco" },
  { "code": "bp-990",         "brand": "Bau Putz", "name": "BP 990",       "description": "Facciate Decorative" }
]
```

Default units by brand: Regina Colori & Bau Farbe → `kovë` (bucket); Regina Polvere & Bau Putz → `thes` (bag). Driver can change unit per line (`copë`, `thes`, `kovë`, `kg`, `L`, `paletë`).

## 5. Pages & routes

| Route | Who | What |
|---|---|---|
| `/login` | all | Username + password. Redirect by role. |
| `/logout` | all | POST only. |
| `/driver` | Driver | "New delivery" form (main screen). |
| `/driver/history` | Driver | His own last 30 deliveries (read-only). |
| `/admin` | Admin | Dashboard: KPIs + deliveries table. |
| `/admin/deliveries/{id}` | Admin | Detail: items, time, driver, customer, map link if GPS, void button. |
| `/admin/drivers` | Admin | List / add driver / disable / reset password. |
| `/admin/products` | Admin | List / add / edit / deactivate products (grouped by brand). |
| `/admin/export.csv` | Admin | CSV of filtered deliveries (one row per item). |

Unauthenticated → `/login`. Driver hitting `/admin/*` → 403 page. Disabled users can't log in and active sessions are rejected on next request (check `IsActive` in a cookie validation event).

### 5.1 Driver – New delivery (mobile-first, the most important screen)

1. **Search box** at top ("Kërko produktin…") that filters instantly.
2. Products **grouped by brand** as tappable cards (name bold, description small grey).
3. Tapping a product adds a line to a sticky **"Ngarkesa" (Load) panel** at the bottom: product name, quantity stepper (− / number / +, decimal allowed), unit dropdown, remove (×).
4. Fields: **Klienti** (customer, required), **Vendi** (location/address, required), **Shënim** (note, optional).
5. Checkbox "Shto lokacionin GPS" (checked by default) → uses `navigator.geolocation`; if denied, just submit without it.
6. Big green button **"✓ DORËZUAR"**. Disabled until ≥1 item + required fields. Confirm modal listing the items → submit.
7. Success screen: "Dorëzimi u regjistrua – 19.11.2026 15:42" + button "Dorëzim i ri".
8. Prevent double submit (disable button + server-side idempotency token in a hidden field).

Large tap targets (min 48px), works one-handed, no horizontal scroll at 360px width.

### 5.2 Admin – Dashboard

- **KPI cards:** deliveries today, deliveries this week, total items this week, active drivers today.
- **Filters:** date range (default: last 7 days), driver, brand, product, text search (customer/location). Filters live in the query string.
- **Table** (newest first, 50/page): `Data & Ora` | `Shoferi` | `Klienti` | `Vendi` | `Produktet` (e.g. "Urbano ×10 kovë, BP 10 ×20 thes") | `GPS` (📍 link to Google Maps) | detail link.
- Voided deliveries shown struck-through with a grey "Anuluar" badge, excluded from KPIs.
- **"Totals per product"** section under the table for the current filter: product, brand, total quantity per unit — so the owner sees what left the warehouse.
- Auto-refresh table every 60s (simple `fetch` of a partial) so new deliveries show up live.
- **Export CSV** button respecting current filters (UTF-8 with BOM so Excel shows ë/ç correctly).

### 5.3 Admin – Drivers & Products

- Drivers: add (full name, username, password), reset password, enable/disable. Show "last delivery" time per driver.
- Products: CRUD, deactivate instead of delete (old deliveries must still show the name).

## 6. Language

UI text in **Albanian** (driver and owner are in Kosovo). Product names/descriptions stay as on the website (Italian). Put all UI strings in one `Resources/Strings.cs` static class so English can be added later.

Key strings: Hyr (Login), Dil (Logout), Dorëzim i ri, Dorëzuar, Historiku, Shoferët, Produktet, Klienti, Vendi, Shënim, Sasia, Njësia, Eksporto CSV, Sot, Këtë javë, Anulo dorëzimin.

## 7. Design

Professional, premium, clean; consistent on desktop and mobile.
- Brand colours: deep blue `#1F3A5F` primary, warm accent `#E8A33D`, success green `#2E9E5B`, light background `#F6F7F9`, cards white with 12px radius and soft shadow.
- Font: system stack (`-apple-system, Segoe UI, Roboto, sans-serif`).
- Admin: left sidebar on desktop, collapses to top bar + hamburger on mobile; table becomes stacked cards under 768px.
- Logo: text wordmark "Regina Colori · Dorëzimet" (no copying of the site's logo image).

## 8. Security

- Passwords hashed (`PasswordHasher`), min 8 chars.
- Anti-forgery tokens on all POST forms (Razor Pages default).
- Login rate limit: 5 failed attempts / 15 min per username+IP (`Microsoft.AspNetCore.RateLimiting` or simple in-memory counter).
- Cookie: HttpOnly, Secure, SameSite=Lax, 14-day sliding expiry for drivers (they shouldn't re-login every day), 8h for admin.
- Drivers can only ever read their own deliveries (filter by `DriverId` from claims, never from query string).
- First run: if no admin exists, create one from env vars `ADMIN_USERNAME` / `ADMIN_PASSWORD` (fail startup with clear message if missing). **No hard-coded default passwords.**
- Audit: store `CreatedByIp` and `UserAgent` on Delivery (add these two string fields).

## 9. Project structure

```
ReginaDelivery/
  Program.cs
  appsettings.json
  Data/AppDbContext.cs
  Data/Seeder.cs
  Data/products.json
  Models/(User, Product, Delivery, DeliveryItem).cs
  Services/TimeService.cs        // UTC <-> Europe/Belgrade
  Services/CsvExportService.cs
  Resources/Strings.cs
  Pages/Login.cshtml(.cs)
  Pages/Driver/Index.cshtml(.cs)
  Pages/Driver/History.cshtml(.cs)
  Pages/Admin/Index.cshtml(.cs)
  Pages/Admin/DeliveryDetail.cshtml(.cs)
  Pages/Admin/Drivers.cshtml(.cs)
  Pages/Admin/Products.cshtml(.cs)
  Pages/Shared/_Layout.cshtml, _AdminLayout.cshtml, _DriverLayout.cshtml
  wwwroot/css/site.css
  wwwroot/js/driver.js
  wwwroot/manifest.webmanifest   // so the driver can "Add to Home Screen"
  Dockerfile
  README.md
```

Use EF Core migrations (`dotnet ef migrations add Initial`), apply automatically on startup.

## 10. Deployment

- `Dockerfile` (multi-stage, `mcr.microsoft.com/dotnet/aspnet:8.0`), DB file on a mounted volume `/data/app.db`.
- README with: local run (`dotnet run`), env vars, Docker run command, how to back up `app.db`, and a note to deploy behind HTTPS (e.g. Railway / Render / a VPS with Caddy).

## 11. Acceptance checklist (verify before saying "done")

- [ ] `dotnet build` passes with no warnings about nullability in our code.
- [ ] Fresh start with env vars creates admin + 34 products.
- [ ] Admin creates driver "test"; driver logs in on 375px viewport, adds 2 products, submits → success screen shows server time.
- [ ] Admin dashboard shows that delivery within 60s, correct Kosovo time, driver name, items, totals.
- [ ] Driver cannot open `/admin` (403) or another driver's delivery.
- [ ] Disabled driver is logged out on next request.
- [ ] CSV opens in Excel with Albanian characters intact.
- [ ] Double-tapping "Dorëzuar" creates only one delivery.
- [ ] Voiding a delivery removes it from KPIs/totals but keeps it visible as "Anuluar".

## 12. Later (not now)

Photo proof of delivery, customer signature, offline queue (service worker) for no-signal areas, push notification to admin on each delivery, multiple warehouses/stock levels.
