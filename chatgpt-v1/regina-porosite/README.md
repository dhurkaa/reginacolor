# REGINA COLOR — Sistemi privat i porosive

**Versioni 1.0 · Nëntor 2026**

Aplikacion web në gjuhën shqipe, i ndarë plotësisht nga `reginacolori.com`. Pa çmime. Katalogu është përgatitur nga listat e konfirmuara nga fabrika: **54 grupe produktesh / 199 variante përfshirë nuancat**.

## Çfarë punon

- Agjenti zgjedh klientin **dhe lokacionin**, produktet/nuancat/paketimet, sasitë dhe dërgon porosinë.
- Shfaqet numri i porosisë, data dhe ora automatike, emri i agjentit dhe statusi.
- Fabrika regjistron **sasi të dërguara** kundrejt **sasisë origjinale** në një ose disa dërgesa. Nuk fshihet historia. Mund ta mbyllë me mbetje.
- Administratori korrigjon sasinë e porositur, pa lejuar ulje poshtë sasisë së dërguar. Ruhet një regjistër i veprimeve.
- Raportet mujore/vjetore dhe CSV bazohen **vetëm në dërgesat reale** dhe në datat e tyre.
- Rolet: **agent**, **warehouse**, **admin**. Siguria zbatohet në databazë përmes **Row Level Security**, jo vetëm në pamjen e faqes.
- Asgjë nuk ndryshon në website-in publik. Projekti mund të publikohet në një adresë më vete.

## Provo menjëherë, pa instaluar asgjë

Hap skedarin **`REGINA_COLOR_DEMO.html`** me Chrome/Edge (jashtë kësaj dosjeje, i përfshirë në ZIP). Në demonstrim:

1. Fillo si Administrator ose ndrysho rolin poshtë majtas.
2. Krijo një porosi për **Termo Projekt – Istog**, klient demonstrues.
3. Kalo te Fabrika, hape porosinë, cakto një sasi të dërguar më të vogël dhe regjistro dërgesën.
4. Mbylle porosinë me mbetje, kontrollo historikun dhe statistikat.

**KUJDES:** DEMO përdor `localStorage` të shfletuesit. Të dhënat janë lokale vetëm në atë pajisje, nuk ndahen online, rolet nuk janë autentikim i vërtetë. **Mos përdorni të dhëna reale të ndjeshme në demo.**

## Vendose online për përdorim real

### Hapi 1 — Supabase

1. Krijo një projekt të ri privat në [supabase.com](https://supabase.com).
2. Supabase → **SQL Editor**: ekzekuto `supabase/schema.sql`, më pas `supabase/seed.sql`.
3. Supabase → **Authentication → Providers → Email**: mbaj email/password aktiv. Çaktivizo regjistrimin e lirë (public sign-up) në konfigurimin e autentikimit; përdor vetëm ftesat ose llogaritë e krijuara nga administratori.
4. Krijo përdoruesin e parë te **Authentication → Users** dhe vendos fjalëkalim të sigurt.
5. Në SQL Editor, aktivizo administratorin e parë (zëvendëso email-in):

```sql
update public.profiles
set role = 'admin', active = true
where id = (select id from auth.users where email = 'EMAILI_YT@KOMPANIA.COM');
```

6. Për përdoruesit e mëvonshëm, krijo llogarinë në **Authentication → Users**. Ata dalin si `active = false`, pastaj administratori i aktivizon dhe u cakton rolin në panelin **Stafi & qasja**. Administratori i parë duhet ta ketë email-in të konfirmuar.

### Hapi 2 — Konfiguro lidhjen

Në `config.js`, vendos **Project URL** dhe **anon/publishable key** nga Supabase → Project Settings → API:

```js
export const CLOUD_CONFIG = {
  supabaseUrl: 'https://projekti-juaj.supabase.co',
  supabaseAnonKey: 'çelësi-publik-anon-ose-publishable'
};
```

**Mos vendos kurrë `service_role`/secret key në frontend**, sepse do t'i jepte kujtdo që e merr çelësin privilegje mbi databazën.

### Hapi 3 — Publiko faqen statike

Publiko dosjen `regina-porosite/` në një shërbim static hosting me **HTTPS** (p.sh. Netlify, Vercel ose serverin tuaj). Nuk ka `npm install` ose proces build-i; skedari fillestar është `index.html`.

Mund të përdorni një nën-domen krejt privat si `porosite.reginacolori.com`, ose domen tjetër. Aplikacioni mbetet i ndarë nga website-i publik dhe kërkon login për të parë të dhënat. Adresa e faqes mund të hapet publikisht, por të dhënat janë të mbrojtura nga login + RLS.

**Rekomandohet:** testoni të gjitha rolet dhe politikat RLS me llogari testuese para nisjes. Aktivizoni backup-et sipas planit të Supabase dhe mbani eksportet periodike. Ofruesit e hosting-ut/databazës mund të kenë tarifa dhe limite përdorimi.

## Rolet

| Veprimi | Agjenti | Fabrika | Administratori |
|---|---:|---:|---:|
| Shikon porositë e veta | Po | Po | Po |
| Shikon të gjitha porositë | Jo | Po | Po |
| Krijon porosi / klient të ri | Po | Po | Po |
| Kalon në përgatitje | Jo | Po | Po |
| Regjistron dërgesa | Jo | Po | Po |
| Mbyll porosi me mbetje | Jo | Po | Po |
| Korrigjon sasinë e porositur | Jo | Jo | Po |
| Nxjerr raporte / CSV | Jo | Po | Po |
| Ndryshon rolet e stafit | Jo | Jo | Po |

## Konventa dhe kufizime

- Për pluhurat e zakonshëm, 25 kg është ruajtur në databazë por nuk shfaqet si peshë në përmbledhjen e porosisë (njësia është **thasë**).
- `Reflex Waterproofing (A+B)` ruhet si **komplet 25 kg + 8 kg**.
- `Recasa RG 101–172` dhe `Marmo Mix MX 101–124` janë zgjedhje të nuancës **brenda një produkti**, jo 96 karta të veçanta.
- Paketimet `Teifgrund` janë ruajtur sipas shkrimit të dhënë, pa korrigjim automatik të emrit.
- Për **paleta** dhe **mulla** nuk është vendosur konvertim i supozuar. Për momentin sasia regjistrohet si thasë/copë/komplete. Konvertimi kërkon numrin real të njësive për paletë dhe për mullë sipas produktit.
- Fotot zyrtare nuk janë kopjuar automatikisht nga website-i. Administratori mund të vendosë URL direkte HTTPS të fotografisë për secilin produkt. Pamja përdor ngjyra të errëta + theks të artë si frymëzim nga identiteti historik vizual i markës, jo si kopje njëpërnjë e stilit aktual.
- Datat regjistrohen si `timestamptz` (UTC në databazë) dhe shfaqen sipas zonës Europe/Belgrade. Raportet e vitit/muajit marrin zonën kohore të pajisjes në versionin 1; për stafin që punon jashtë Kosovës rekomandohet standardizim i filtrave në databazë.
- Në këtë version nuk ka menaxhim sasish të rezervuara të inventarit, fatura apo çmime. Nuk ka integrim me Telegram.
- Kërkohet internet që agjentët dhe fabrika të shohin të njëjtat porosi në mënyrë reale. Faqja rifreskon listën e porosive çdo 30 sekonda ose me butonin **Rifresko**.

## Mirëmbajtja

- **Përmbajtja**: Admini shton klientë dhe produkte të rinj (aktualisht me një paketim) dhe cakton fotografi me URL; variantet shtesë mund të shtohen në tabelën `product_variants` ose në një përditësim të aplikacionit.
- **Teknika**: mbaji kopjet rezervë, kontrollo lejet pas ndryshimeve, testo rifreskimet e aplikacionit dhe përditësimet e Supabase.
- **Privatësia**: mos përdor llogari të përbashkëta. Çaktivizo përdoruesit kur largohen nga stafi.

## Skedarët

`index.html` faqja kryesore; `styles.css` dizajni; `catalog.js` katalogu; `app.js` ndërfaqja; `local-backend.js` demonstrimi; `cloud-backend.js` qasja në Supabase; `config.js` konfigurimi; `supabase/schema.sql` databaza dhe politikat e sigurisë; `supabase/seed.sql` katalogu i konfirmuar.

Për testim zhvillimor të dosjes (me Python 3 të instaluar), në terminal:

```sh
cd regina-porosite
python3 -m http.server 8080
```

Pastaj hap `http://localhost:8080`.
