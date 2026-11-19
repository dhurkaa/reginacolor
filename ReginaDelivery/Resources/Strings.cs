namespace ReginaDelivery.Resources;

/// <summary>All UI text (Albanian). Keep every user-facing string here so English can be added later.</summary>
public static class Strings
{
    // Brand / layout
    public const string AppName = "Regina Colori";
    public const string AppSuffix = "Porositë";
    public const string Menu = "Menyja";

    // Roles
    public const string RoleAgent = "Agjent";
    public const string RoleField = "Terrenist";
    public const string RoleAgentHint = "Sheh gjithçka, merr njoftime, menaxhon çmimet dhe përdoruesit.";
    public const string RoleFieldHint = "Vetëm dërgon porosi dhe sheh historikun e vet.";

    // Auth
    public const string Login = "Hyr";
    public const string Logout = "Dil";
    public const string LoginSubtitle = "Porositë nga terreni";
    public const string Username = "Përdoruesi";
    public const string Password = "Fjalëkalimi";
    public const string LoginInvalid = "Përdoruesi ose fjalëkalimi është i gabuar.";
    public const string LoginLocked = "Shumë tentime të dështuara. Provoni përsëri pas 15 minutash.";

    // Navigation
    public const string Orders = "Porositë";
    public const string NewOrder = "Porosi e re";
    public const string History = "Historiku";
    public const string Users = "Përdoruesit";
    public const string Products = "Produktet";
    public const string PriceList = "Produktet & Çmimet";
    public const string Report = "Raporti mujor";
    public const string Notifications = "Njoftimet";

    // Fields
    public const string FieldUser = "Terrenisti";
    public const string Product = "Produkti";
    public const string Brand = "Brendi";
    public const string Company = "Kompania / Klienti";
    public const string Location = "Vendi";
    public const string Phone = "Telefoni";
    public const string Note = "Shënim";
    public const string Quantity = "Sasia";
    public const string Unit = "Njësia";
    public const string Size = "Masa";
    public const string Shade = "Nuanca";
    public const string Price = "Çmimi";
    public const string UnitPrice = "Çmimi / njësi";
    public const string Value = "Vlera";
    public const string DateTime = "Data & Ora";
    public const string Gps = "GPS";
    public const string FullName = "Emri i plotë";
    public const string Role = "Roli";
    public const string Description = "Përshkrimi";
    public const string Code = "Kodi";
    public const string Sizes = "Masat (me presje, p.sh. 3L, 9L, 14L)";
    public const string ShadePrefix = "Prefiksi i nuancës";
    public const string ShadeFrom = "Nuanca nga";
    public const string ShadeTo = "Nuanca deri";
    public const string SortOrder = "Renditja";
    public const string Status = "Statusi";
    public const string Active = "Aktiv";
    public const string Inactive = "Joaktiv";
    public const string Details = "Detajet";
    public const string Optional = "opsionale";
    public const string NoPrice = "pa çmim";

    // Field – new order
    public const string SearchProduct = "Kërko produktin…";
    public const string Load = "Porosia";
    public const string LoadEmpty = "Prekni një produkt për ta shtuar.";
    public const string CompanyPlaceholder = "Emri i kompanisë / klientit";
    public const string LocationPlaceholder = "Qyteti, adresa";
    public const string PhonePlaceholder = "+383 4x xxx xxx";
    public const string NotePlaceholder = "P.sh. i duhet deri të premten";
    public const string AddGps = "Shto lokacionin GPS";
    public const string SendButton = "✓ DËRGO POROSINË";
    public const string ConfirmTitle = "Konfirmo porosinë";
    public const string Confirm = "Po, dërgoje";
    public const string Back = "Kthehu";
    public const string Remove = "Hiq";
    public const string ChooseSize = "Zgjidh masën";
    public const string ShadeNumber = "Nr. i nuancës";
    public const string NoResults = "Asnjë produkt nuk u gjet.";
    public const string Saving = "Duke dërguar…";
    public const string GettingLocation = "Duke marrë lokacionin…";
    public const string OrderSent = "Porosia u dërgua te agjentët";
    public const string EstimatedTotal = "Totali (sipas listës)";

    // Field validation
    public const string ErrNoItems = "Shtoni të paktën një produkt.";
    public const string ErrCompany = "Shkruani emrin e kompanisë / klientit.";
    public const string ErrLocation = "Shkruani vendin.";
    public const string ErrItem = "Një nga produktet nuk është i vlefshëm. Kontrolloni sasinë, masën dhe nuancën.";
    public const string ErrMissingSize = "Zgjidhni masën për çdo produkt.";

    // Field – history
    public const string HistoryTitle = "Porositë e mia (30 të fundit)";
    public const string HistoryEmpty = "Nuk keni dërguar ende porosi.";

    // Agent – orders
    public const string KpiOrdersToday = "Porosi sot";
    public const string KpiOrdersWeek = "Porosi këtë javë";
    public const string KpiSalesWeek = "Shitjet këtë javë";
    public const string KpiSalesMonth = "Shitjet këtë muaj";
    public const string From = "Nga";
    public const string To = "Deri";
    public const string All = "Të gjithë";
    public const string AllBrands = "Të gjitha brendet";
    public const string AllProducts = "Të gjitha produktet";
    public const string SearchCompanyLocation = "Kërko kompaninë ose vendin";
    public const string Apply = "Filtro";
    public const string Reset = "Pastro";
    public const string ExportCsv = "Eksporto CSV";
    public const string NoOrders = "Nuk ka porosi për këtë filtër.";
    public const string TotalsPerProduct = "Totalet sipas produktit";
    public const string TotalsHint = "Për filtrin aktual, pa porositë e anuluara.";
    public const string Total = "Totali";
    public const string Previous = "‹ Para";
    public const string Next = "Pas ›";
    public const string Page = "Faqja";
    public const string LastUpdated = "Përditësuar";
    public const string AutoRefresh = "Rifreskim automatik çdo 30 sekonda";
    public const string NewOrdersArrived = "porosi të reja";

    // Agent – order detail
    public const string OrderNo = "Porosia #";
    public const string VoidOrder = "Anulo porosinë";
    public const string Voided = "Anuluar";
    public const string VoidReason = "Arsyeja e anulimit";
    public const string VoidReasonRequired = "Shkruani arsyen e anulimit.";
    public const string Restore = "Rikthe porosinë";
    public const string OpenMap = "Hap në hartë";
    public const string NoGps = "Pa GPS";
    public const string Device = "Pajisja";
    public const string IpAddress = "IP";
    public const string BackToList = "‹ Kthehu te porositë";
    public const string SavePrices = "Ruaj çmimet";
    public const string PricesSaved = "Çmimet u ruajtën.";
    public const string PricesHint = "Çmimet merren nga lista kur dërgohet porosia. Këtu mund t'i ndryshoni (p.sh. zbritje) vetëm për këtë porosi.";
    public const string MissingPriceWarning = "Disa produkte nuk kanë çmim – nuk llogariten në shitje derisa t'u vendoset çmimi.";

    // Agent – users
    public const string AddUser = "Shto përdorues";
    public const string ResetPassword = "Ndrysho fjalëkalimin";
    public const string NewPassword = "Fjalëkalimi i ri";
    public const string Disable = "Çaktivizo";
    public const string Enable = "Aktivizo";
    public const string LastOrder = "Porosia e fundit";
    public const string Never = "Asnjëherë";
    public const string OrdersCount = "Porosi";
    public const string PhonesWithNotifications = "Telefona me njoftime";
    public const string ErrPasswordShort = "Fjalëkalimi duhet të ketë të paktën 8 karaktere.";
    public const string ErrUsername = "Përdoruesi: 3–32 shkronja të vogla, numra, '.', '_' ose '-'.";
    public const string ErrUsernameTaken = "Ky përdorues ekziston tashmë.";
    public const string ErrFullName = "Shkruani emrin e plotë.";
    public const string ErrSelf = "Nuk mund ta çaktivizoni llogarinë tuaj.";
    public const string ErrLastAgent = "Duhet të mbetet të paktën një agjent aktiv.";
    public const string UserAdded = "Përdoruesi u shtua.";
    public const string PasswordChanged = "Fjalëkalimi u ndryshua. Përdoruesi duhet të hyjë përsëri.";
    public const string UserDisabled = "Përdoruesi u çaktivizua dhe u nxor nga sistemi.";
    public const string UserEnabled = "Përdoruesi u aktivizua.";

    // Agent – products
    public const string AddProduct = "Shto produkt";
    public const string EditProduct = "Ndrysho produktin";
    public const string Save = "Ruaj";
    public const string Cancel = "Anulo";
    public const string Edit = "Ndrysho";
    public const string Deactivate = "Çaktivizo";
    public const string Activate = "Aktivizo";
    public const string ProductSaved = "Produkti u ruajt.";
    public const string ErrProductName = "Shkruani emrin dhe brendin e produktit.";
    public const string ErrCodeTaken = "Ky kod ekziston tashmë.";
    public const string ErrShadeRange = "Intervali i nuancës nuk është i vlefshëm.";
    public const string ErrPrice = "Një çmim nuk është i vlefshëm.";
    public const string ProductsHint = "Çmimet janë në € për njësi (kovë / thes / copë). Produktet nuk fshihen – çaktivizojini që të mos shfaqen te terrenistët.";
    public const string MissingPrices = "produkte/masa pa çmim";

    // Agent – report
    public const string Month = "Muaji";
    public const string Sales = "Shitjet";
    public const string OrdersInMonth = "Porosi";
    public const string AvgOrder = "Mesatarja për porosi";
    public const string VsLastMonth = "krahasuar me muajin e kaluar";
    public const string TopProducts = "Produktet më të shitura";
    public const string ByFieldUser = "Sipas terrenistit";
    public const string ByCompany = "Klientët kryesorë";
    public const string ByBrand = "Sipas brendit";
    public const string DailySales = "Shitjet ditore";
    public const string Share = "Pjesa";
    public const string ExportMonth = "Eksporto muajin (CSV)";
    public const string NoData = "Nuk ka porosi në këtë muaj.";
    public const string UnpricedItems = "artikuj pa çmim në këtë muaj – vendosni çmimet te porositë që shitjet të jenë të sakta.";

    // Agent – notifications
    public const string NotificationsTitle = "Njoftimet në telefon";
    public const string NotificationsIntro = "Aktivizoni njoftimet në çdo telefon ku doni të merrni porositë e reja.";
    public const string EnableNotifications = "🔔 Aktivizo njoftimet në këtë pajisje";
    public const string DisableNotifications = "Çaktivizo në këtë pajisje";
    public const string SendTest = "Dërgo njoftim provë";
    public const string TestSent = "Njoftimi provë u dërgua në {0} pajisje.";
    public const string NotifOn = "Njoftimet janë aktive në këtë pajisje.";
    public const string NotifOff = "Njoftimet nuk janë aktive në këtë pajisje.";
    public const string NotifBlocked = "Njoftimet janë bllokuar në shfletues. Lejojini te cilësimet e faqes (ikona 🔒 pranë adresës).";
    public const string NotifUnsupported = "Ky shfletues nuk i mbështet njoftimet. Në Android përdorni Chrome. Në iPhone shtoni faqen në Home Screen (iOS 16.4+) dhe hapeni nga atje.";
    public const string NotifNeedsHttps = "Njoftimet kërkojnë HTTPS.";
    public const string MyDevices = "Pajisjet e mia";
    public const string RemoveDevice = "Hiq";
    public const string Telegram = "Telegram";
    public const string TelegramOn = "Telegram është i lidhur – çdo porosi dërgohet edhe në grupin e agjentëve.";
    public const string TelegramOff = "Telegram nuk është konfiguruar (TELEGRAM_BOT_TOKEN dhe TELEGRAM_CHAT_ID).";
    public const string InstallHint = "Këshillë: në Chrome hapni menynë ⋮ → \"Add to Home screen\" që aplikacioni të hapet si app.";

    // Errors
    public const string ErrorTitle = "Gabim";
    public const string Forbidden = "Nuk keni qasje në këtë faqe.";
    public const string NotFound = "Faqja nuk u gjet.";
    public const string GenericError = "Diçka shkoi keq. Provoni përsëri.";
    public const string GoHome = "Kthehu në fillim";
}
