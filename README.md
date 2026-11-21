# REGINA COLOR — Sistemi privat i porosive

**Versioni 1.1 · Nëntor 2026**

Aplikacion web në shqip për porositë e fabrikës Regina Color. I ndarë plotësisht nga `reginacolori.com`. Punon në telefon dhe kompjuter dhe mund të instalohet si aplikacion ("Add to Home screen").

- **Agjenti** (në terren) zgjedh klientin + lokacionin, produktet, paketimet/nuancat dhe sasitë, pastaj dërgon porosinë.
- **Fabrika / magazina** merr **njoftim në telefon dhe në Telegram**, përgatit porosinë dhe regjistron **sasitë realisht të dërguara** (një ose disa dërgesa, me datë dhe orë automatike).
- **Administratori** menaxhon **çmimet**, stafin dhe korrigjimet. Ai sheh **shitjet në €** sipas muajit/vitit, produktet më të shitura, agjentët dhe klientët.

Katalogu: **54 grupe produktesh / 199 variante** (përfshirë nuancat RG 101–172 dhe MX 101–124).

## Çfarë ka të re në 1.1

| | |
|---|---|
| 💶 **Çmimet** | Lista e çmimeve për çdo produkt + paketim (faqja **Çmimet**). Porosia e merr çmimin automatikisht; admini mund ta ndryshojë për një porosi (zbritje). |
| 📊 **Shitjet** | Raporti tregon vlerën e dërguar në €, krahasimin me periudhën e kaluar, produktet sipas sasisë/vlerës, agjentët dhe klientët. CSV me çmim dhe vlerë. |
| 🔔 **Njoftimet** | Push në telefon (edhe kur aplikacioni është i mbyllur), zile + njoftim kur aplikacioni është i hapur, dhe mesazh në grupin Telegram për çdo porosi të re. Agjenti njoftohet kur i dërgohet porosia. |
| 📱 **Aplikacion** | Ikonë, "Add to Home screen", data/ora gjithmonë `dd.MM.yyyy HH:mm` (ora e Kosovës), pa rrëshqitje anash në telefon. |
| 🔒 **Siguria** | U rregullua një problem i versionit 1.0: përdoruesit joaktivë mund të thërrisnin disa veprime (anulim, dërgesë). Tani çdo veprim kontrollohet me `require_role`. |

## Rolet

| Veprimi | Agjenti | Fabrika | Administratori |
|---|:-:|:-:|:-:|
| Krijon porosi / klient të ri | Po | Po | Po |
| Shikon porositë e veta | Po | Po | Po |
| Shikon të gjitha porositë | Jo | Po | Po |
| Merr njoftim për porosi të re | Jo | Po | Po |
| Merr njoftim kur dërgohet porosia e vet | Po | – | – |
| Kalon në përgatitje, regjistron dërgesa, mbyll me mbetje | Jo | Po | Po |
| Raportet e shitjeve / CSV | Jo | Po | Po |
| Lista e çmimeve, çmimi i porosisë | Jo | Jo | Po |
| Korrigjon sasinë e porositur, rihap porosinë | Jo | Jo | Po |
| Ndryshon rolet e stafit | Jo | Jo | Po |

---

## Vendosja online (një herë, rreth 30 minuta)

Ju duhen 3 llogari falas: **GitHub** (kodi është në `dhurkaa/reginacolor`), **Supabase** (databaza + login) dhe **Vercel** (faqja + njoftimet). Vlerat sekrete (çelësat VAPID dhe sekreti i njoftimeve) janë gjeneruar tashmë në kompjuterin ku u ndërtua projekti, te skedari `.secrets/vercel-env.txt`. Ky skedar **nuk** dërgohet në GitHub.

### Hapi 1 — Supabase (databaza)

1. Hyni në [supabase.com](https://supabase.com) → **New project**. Rajoni: **Central EU (Frankfurt)**. Ruani fjalëkalimin e databazës.
2. **SQL Editor** → ngjitni dhe ekzekutoni `supabase/schema.sql`, pastaj `supabase/seed.sql`.
3. **Authentication → Sign In / Providers**: mbani **Email** aktiv dhe çaktivizoni **Allow new users to sign up**. Llogaritë krijohen vetëm nga ju.
4. **Authentication → Users → Add user**: krijoni llogarinë tuaj (email + fjalëkalim i fortë, *Auto Confirm User*).
5. Në **SQL Editor** bëjeni administrator (zëvendësoni email-in):
   ```sql
   update public.profiles set role = 'admin', active = true, full_name = 'Emri Mbiemri'
   where id = (select id from auth.users where email = 'EMAILI_YT@KOMPANIA.COM');
   ```
6. **Project Settings → API**: kopjoni **Project URL**, **anon / publishable key** dhe **service_role / secret key**. Kjo e fundit është sekrete dhe shkon vetëm te Vercel.

### Hapi 2 — `config.js`

Në GitHub hapni `config.js` → ✏️ Edit dhe vendosni:
```js
supabaseUrl: 'https://XXXX.supabase.co',
supabaseAnonKey: 'anon-ose-publishable-key',
```
`vapidPublicKey` është vendosur tashmë. **Mos vendosni kurrë** `service_role`, `VAPID_PRIVATE_KEY` ose token-in e Telegram këtu, sepse ky skedar është publik.

### Hapi 3 — Vercel (publikimi)

1. Hyni në [vercel.com](https://vercel.com) me GitHub → **Add New → Project** → zgjidhni `reginacolor` → **Framework Preset: Other**. Build Command dhe Output Directory lërini bosh.
2. Te **Environment Variables** shtoni vlerat nga `.secrets/vercel-env.txt` dhe Supabase:

   | Emri | Vlera |
   |---|---|
   | `SUPABASE_URL` | Project URL nga Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
   | `NOTIFY_SECRET` | nga `.secrets/vercel-env.txt` |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | nga `.secrets/vercel-env.txt` |
   | `VAPID_SUBJECT` | `mailto:emaili-juaj@kompania.com` |
   | `APP_URL` | adresa e faqes, p.sh. `https://reginacolor.vercel.app` |
   | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | shih Hapi 5 (mund të shtohen më vonë) |

3. **Deploy**. Pas çdo ndryshimi në GitHub, Vercel e përditëson faqen vetë. Nëse ndryshoni variablat, bëni **Redeploy**.
4. Opsionale: **Settings → Domains** → p.sh. `porosite.reginacolori.com`.

### Hapi 4 — Lidhni databazën me njoftimet

Në Supabase → **SQL Editor** (rreshti i plotë me sekretin është edhe në `.secrets/vercel-env.txt`):
```sql
insert into public.app_config(key,value) values
  ('notify_url','https://ADRESA-JUAJ.vercel.app/api/notify'),
  ('notify_secret','I_NJEJTI_NOTIFY_SECRET_SI_NE_VERCEL')
on conflict (key) do update set value = excluded.value;
```
Pas kësaj, çdo porosi e re dhe çdo dërgesë e njofton automatikisht funksionin `/api/notify`. Nëse njoftimi dështon, porosia ruhet gjithsesi.

### Hapi 5 — Telegram

1. Në Telegram shkruani **@BotFather** → `/newbot` → jepni emrin (p.sh. *Regina Porosite*) dhe merrni **token-in**.
2. Krijoni një grup (p.sh. *Regina – Porositë*), shtoni stafin dhe botin, pastaj shkruani një mesazh në grup.
3. Hapni `https://api.telegram.org/bot<TOKEN>/getUpdates` në shfletues dhe gjeni `"chat":{"id":-100…}`. Ky është `TELEGRAM_CHAT_ID`. Disa grupe mund të vendosen me presje.
4. Vendosni `TELEGRAM_BOT_TOKEN` dhe `TELEGRAM_CHAT_ID` te Vercel → **Redeploy**.

### Hapi 6 — Stafi dhe telefonat

1. Për çdo punëtor: Supabase → **Authentication → Users → Add user**. Pastaj në aplikacion, **Stafi & qasja** → caktoni rolin (Agjent / Fabrikë / Administrator) → **Aktiv** → Ruaj.
2. Në çdo telefon: hapni faqen në **Chrome** → menyja ⋮ → **Add to Home screen**. Hapeni nga ikona → **Njoftimet** → **🔔 Aktivizo njoftimet** → *Allow*. Shtypni **Provo njoftimin** për kontroll.
   - **iPhone:** Safari → Share → **Add to Home Screen** (iOS 16.4+). Njoftimet aktivizohen vetëm brenda aplikacionit të hapur nga ikona.
3. Si administrator: **Çmimet** → vendosni çmimet → **Ruaj ndryshimet**.

### Kontrolli përfundimtar

- [ ] Agjenti krijon porosi → Telegram + push te fabrika brenda pak sekondave
- [ ] Fabrika regjistron dërgesë (p.sh. 25 nga 27) → agjenti merr njoftim, porosia mbyllet me mbetje 2
- [ ] **Shitjet dhe raportet** tregon vlerën në € për muajin
- [ ] Një llogari joaktive nuk sheh asgjë

Nëse njoftimet nuk vijnë: Vercel → Project → **Logs** (funksioni `/api/notify`), dhe në Supabase `select * from net._http_response order by created desc limit 5;`.

---

## Testim lokal

Pa Supabase, aplikacioni hapet në **modalitet demo**: të dhënat ruhen vetëm në shfletues dhe rolet ndërrohen poshtë majtas.

```sh
npm install
npm start          # http://localhost:8080
npm test           # katalogu, rolet, dërgesat, çmimet, funksioni i njoftimeve
npm run vapid      # gjeneron çelësa të rinj VAPID (nëse duhen)
```

## Konventa dhe kufizime

- Pluhurat (thasë 25 kg) shfaqen pa peshë. `Reflex Waterproofing (A+B)` është **komplet 25 kg + 8 kg**.
- `Recasa RG 101–172` dhe `Marmo Mix MX 101–124` janë një produkt me zgjedhje nuance. Nuancat ndajnë çmimin e paketimit.
- Çmimi ruhet në çdo rresht porosie në momentin e krijimit. Ndryshimi i listës **nuk** ndryshon porositë e vjetra. Për to përdorni çmimin te detajet e porosisë ose **Plotëso çmimet nga lista**.
- **Shitjet** llogariten vetëm nga sasitë realisht të dërguara, sipas datës së dërgesës. Porositë e anuluara dhe mbetjet nuk hyjnë.
- Paletat/mullat nuk konvertohen automatikisht në thasë (kërkohet numri i thasëve për paletë sipas produktit).
- Raportet mujore përdorin orën e pajisjes. Për stafin jashtë Kosovës, standardizoni filtrat në databazë.
- Kërkohet internet. Lista rifreskohet çdo 30 sekonda ose me **Rifresko**.

## Mirëmbajtja

- **Backup:** Supabase bën backup ditor në planin falas (7 ditë). Eksportoni CSV çdo muaj nga **Shitjet dhe raportet**.
- **Privatësia:** mos përdorni llogari të përbashkëta. Çaktivizoni përdoruesit kur largohen.
- **Përditësimi i databazës:** `supabase/schema.sql` mund të ekzekutohet përsëri pa humbur të dhëna.

## Skedarët

| Skedari | Përmbajtja |
|---|---|
| `index.html`, `styles.css`, `app.js` | ndërfaqja |
| `art.js` | ikonat, logoja dhe ilustrimet e produkteve (kova/thasë sipas linjës; admini mund të vendosë foto reale) |
| `catalog.js` | katalogu i produkteve |
| `cloud-backend.js` / `local-backend.js` | Supabase / demo në shfletues |
| `config.js` | URL e Supabase, anon key, çelësi publik VAPID |
| `sw.js`, `manifest.webmanifest`, `assets/` | njoftimet push dhe instalimi si app |
| `api/notify.js` | funksioni Vercel: Telegram + push |
| `supabase/schema.sql`, `supabase/seed.sql` | databaza, siguria (RLS), çmimet, njoftimet |
| `vercel.json` | headers sigurie për publikim |
| `tests/` | testet automatike |

## Arkiva (nuk publikohen në Vercel)

- `chatgpt-v1/` – versioni origjinal 1.0 nga ChatGPT, përfshirë `REGINA_COLOR_DEMO.html` (demo në një skedar).
- `ReginaDelivery/` – një draft i hershëm në ASP.NET që u braktis; nuk përdoret.
- `SPEC.md` – specifikimi i parë.
