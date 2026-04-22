# PDF-export, andra login, offertförfrågan, save-toast och unsaved-warning

**Typ:** Feature-prompt (fem sammanhängande delar)
**Författare:** Cowork-sessionen med Dennis, 2026-04-21
**Berör:** `src/app.js`, `src/style.css`, `src/index.html`, `src/data.js` (mindre — endast om auth-listan flyttas dit), inga externa beroenden
**Omfattning:** Kundnära UX-slipning av det sista kvartsmilen — PDF-leverans, fler kunder i loginet, offertflöde, save-feedback och unsaved-warning. Ingen kalkyllogik ändras.

Denna promptfil innehåller fem delar (I–V). Alla kan (och bör) implementeras i samma session — de delar ingen datamodell men de berör samma filer och slutanvändar-upplevelse. Ordningsrekommendation står i startprompten längst ner.

---

# DEL I — PDF-export som "Kalkylbudget", inte skärmdump

---

## 1. Varför vi gör detta

Idag gör kalkylatorns "Skriv ut / spara som PDF"-knapp bara `window.print()` utan någon `@media print`-stilmall. Resultatet är en skärmdump av sidan — sidebaren, knappar, scroll-baren, headern, allt följer med. Det ser amatörigt ut, och viktigast: det kommunicerar inte "Byggbiten levererar detta" till slutkunden.

Kunden är HSB. HSB skriver ut kalkylen, lägger den i en pärm eller mejlar den till styrelsen. Den första sidan avgör om kalkylen uppfattas som **ett professionellt underlag från en proffs-entreprenör** — eller som en webbskärmdump. Dennis har en skarp Byggbiten-offert (`10368 Staben 2 - Varmförråd (4).pdf`) med tydligt avsändarblock, kundblock, tabell med kod/benämning/enh/mängd/pris/netto/inkl-moms, och separat villkorssida med signatur-rader. Det är vår designreferens — med **en avgörande skillnad:** kalkylatorn producerar en **kalkylbudget**, inte en bindande offert. Dokumenttiteln, disclaimers och avtalsbekräftelsen måste skilja dem åt.

**Problem ur kundens perspektiv:** HSB-förvaltaren har precis byggt en 4-rums-kalkyl på 450 tkr. Hen trycker "Skriv ut" och får en sida där sidebaren med "Ny kalkyl" / "Återgå till hemvy" dyker upp längst till vänster, tabellen är trasig över sidbrytningen, och pusselbiten i headern är full storlek. Kunden ser inte Byggbitens avsändaradress. Det blir svårt att vidarebefordra till styrelsen.

Vi vill att utskriften ska se ut som **en riktig Byggbiten-kalkylbudget**, inte som en skärmprint. Samma logga, samma avsändarblock, samma tabellstil som den skarpa offerten — men med tydlig märkning "Kalkylbudget" och disclaimers som motsvarar.

---

## 2. Nuvarande beteende

- `app.js` rad 1415–1417: `if (actionName === 'print') { window.print(); return; }`
- `style.css`: saknar `@media print` helt.
- Utskriften får hela sidans layout inklusive sidebar (228 px kolumn), mörk header, action-knappar, drag-handles, flash-banner, scroll-bar. Sidbrytning är slumpmässig och tabellerna splittas mitt i.
- Byggbitens logga är vit-på-mörk (`byggbiten-logga.svg` vit-version från Q3) och syns därför inte på vit print-bakgrund.
- Dokumentet har ingen tydlig titel — högst upp står "Renoveringskalkyl" från `<h1>` men utan kontext ser det inte ut som ett kundriktat dokument.

---

## 3. Förväntat beteende

### 3.1 — Dedikerad print-layout i DOM

Lägg till en ny DOM-tree `<div id="print-layout">…</div>` som är **`display: none` på skärm** och **`display: block` i `@media print`**. All övrig sidan göms i print (sidebar, header, knappar, interaktiva element).

Print-layout är ren semantisk HTML som motsvarar referensens sidindelning:

**Sida 1 — Header + metadata + arbetsbeskrivning + tabell per rum**

```
┌────────────────────────────────────────────────────────────────────┐
│ [Byggbiten-logga]              KALKYLBUDGET       Kalkyldatum       │
│                                                    2026-04-21        │
│                                                                      │
│ KALKYLNAMN / PROJEKT                 KUND                            │
│ Strindbergsvägen 4B — 3 rok          HSB Sundsvall                   │
│                                      [adress från login-profil]      │
│ LEVERANTÖR                                                           │
│ Byggbiten i Norrland AB              Org/personnummer: 5569XX-XXXX   │
│ Regementsvägen 4                                                     │
│ 852 38 Sundsvall                     KONTAKT                         │
│ Sverige                              [kontaktnamn hos HSB om satt]   │
│                                                                      │
│ Org/personnummer: 556875-4260                                        │
│ Godkänd för F-skatt                                                  │
│                                                                      │
│ OMBUD/KALKYLANSVARIG                                                 │
│ Dennis Sendelbach                                                    │
│ dennis@byggbiten.nu                                                  │
│ 0704969141                                                           │
│                                                                      │
│ ────────────────────────────────────────────────────────────────── │
│                                                                      │
│ ARBETSBESKRIVNING / INLEDNING                                        │
│ Kalkylbudget för renovering av bostadsrätten. Innefattar följande    │
│ rum: [rum-lista kommaseparerad med antal]. Kalkylen är baserad på    │
│ Byggbitens kalibrerade schablonpriser och anger ej bindande pris.    │
│                                                                      │
│ ────────────────────────────────────────────────────────────────── │
│                                                                      │
│ [Rum 1: Sovrum — 12 m²]                                              │
│ Kod   Benämning                 Enh   Mängd   Pris/enh  Netto  Inkl │
│ ────  ───────────────────────   ───   ─────   ────────  ─────  ──── │
│  15.016 Ekparkett                m²    12,0        825   9 900 12 375│
│  ⤷ 14.001 inkl. rivning av…     m²    12,0         95   1 140  1 425│
│  14.011 Måla tak                 m²    12,0        144   1 728  2 160│
│  14.012 Måla väggar              m² v  28,1        144   4 046  5 058│
│  ⤷ 14.017 Skyddstäckning         st     1,0        450     450    562│
│  16.056 Ny innerdörr             st     1,0      5 070   5 070  6 338│
│                                             Rum-total  22 334 27 918│
│                                                                      │
│ [Rum 2: Badrum — 5 m²]                                               │
│ …                                                                    │
│                                                                      │
│ ... fortsätter per rum ...                                           │
│                                                                      │
│ [Footer - page 1]                                                    │
│ Byggbiten i Norrland AB | Regementsvägen 4, 852 38 Sundsvall         │
│ Tfn 070-235 65 55 | E-post info@byggbiten.nu                         │
│ Bankgiro 825-3312 | Plusgiro 92431-6 | Momsreg SE556875426001        │
│                                                        1 (2)         │
└────────────────────────────────────────────────────────────────────┘
```

**Sida 2 — Sammanställning + disclaimers + signaturfält (utan avtalsbekräftelse)**

```
┌────────────────────────────────────────────────────────────────────┐
│ [Byggbiten-logga]              KALKYLBUDGET       Kalkyldatum       │
│                                                    2026-04-21        │
│                                                                      │
│ SAMMANSTÄLLNING / TOTALT                                             │
│ Rum                             Netto (kr)          Inkl moms (kr)  │
│ ───────────────────────────    ───────────         ───────────────  │
│ Sovrum 1                           22 334                  27 918   │
│ Sovrum 2                           18 420                  23 025   │
│ Vardagsrum                         45 300                  56 625   │
│ Badrum                            145 800                 182 250   │
│ ──────────────────────────     ────────────        ────────────     │
│ TOTALT                            231 854                 289 818   │
│                                                                      │
│ ────────────────────────────────────────────────────────────────── │
│                                                                      │
│ OM DENNA KALKYLBUDGET                                                │
│ Kalkylbudgeten är en vägledande prisuppskattning baserad på Bygg-   │
│ bitens schablonpriser för ytskiktsrenovering 2026. Slutligt pris    │
│ sätts i offert efter platsbesök.                                     │
│                                                                      │
│ INGÅR EJ                                                             │
│ * Bygglovskostnader                                                  │
│ * Föroreningar eller extraåtgärder mark                              │
│ * Anslutningsavgifter                                                │
│ * Hyra av tillfälligt boende under renovering                        │
│                                                                      │
│ NÄSTA STEG                                                           │
│ Vid intresse av skarp offert — kontakta Byggbiten i Norrland AB      │
│ för platsbesök. Vi återkommer med bindande pris inom 5 arbetsdagar. │
│                                                                      │
│                                                                      │
│                                                                      │
│ [Footer - page 2]                                                    │
│ Byggbiten i Norrland AB | ... samma som sida 1 ...      2 (2)        │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 — Skillnader mot referens-PDF:n (medvetna)

- **Titeln är "KALKYLBUDGET" (inte "OFFERT")** — tydligt för att undvika att den uppfattas som bindande.
- **"Godkänd för F-skatt"** behålls i leverantörblocket (det är fortfarande sant) men uppfattas inte som att kalkylen är en F-skatt-belagd offert.
- **Ingen "AVTALSBEKRÄFTELSE"-sektion och inga signatur-rader.** Ersätts med "OM DENNA KALKYLBUDGET" + "NÄSTA STEG". En kalkylbudget signeras inte.
- **"OFFERTNR / PROJEKT" byts till "KALKYLNAMN / PROJEKT"** och visar `state.projektNamn`.
- **Priser i tabellen visas i två kolumner: Netto (ex moms) + Inkl moms 25 %.** Appens on-screen-totaler är ex moms enligt Q2, men på kalkylbudgeten är det klargörande att visa båda — det är så HSB faktiskt tänker när de planerar (inkl moms är kassaflöde).
- **Kod-kolumnen visar Wikells-koden** (t.ex. 15.016, 14.048) där priset kommer från Wikells. Poster utan Wikells-motsvarighet (schablon kök, schablon UE, Byggbiten-erfarenhet) får tom Kod-kolumn eller "Schablon" som platshållare. Denna information finns redan idag som kommentar i `data.js` — vi behöver exponera den. Förslag: lägg till `wikellsId: '15.016'` som attribut på varje item/followup i `data.js`.

### 3.3 — `@media print` CSS-regler

```css
@page {
  size: A4;
  margin: 16mm 14mm 14mm 14mm;
}

@media print {
  /* Dölj allt interaktivt */
  body > .app-shell,
  body > .login-split,
  body > .home-view,
  .flash-banner,
  .modal-backdrop,
  #print-layout { display: none; }

  #print-layout { display: block; }

  /* Print-typografi */
  body { font-family: 'Rubik', 'Inter', sans-serif; color: #1A1A1A; background: #FFFFFF; }

  .print-header-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16mm; }
  .print-title { font-size: 24pt; font-weight: 600; letter-spacing: 0.5pt; }
  .print-logo { width: 42mm; }
  .print-date-box { border: 1px solid #1A1A1A; padding: 4mm 6mm; font-size: 10pt; }

  .print-blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm 12mm; margin-bottom: 12mm; }
  .print-block-label { text-transform: uppercase; font-weight: 600; font-size: 9pt; margin-bottom: 2mm; }

  .print-section-title { text-transform: uppercase; font-weight: 600; font-size: 10pt; background: #F0F0F0; padding: 3mm 4mm; margin: 8mm 0 3mm 0; }

  .print-room-title { font-size: 11pt; font-weight: 600; padding: 3mm 4mm; background: #F7F6F3; margin: 6mm 0 2mm 0; }

  .print-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .print-table th { text-align: left; text-decoration: underline; font-weight: 600; font-size: 8pt; padding: 2mm 3mm; }
  .print-table td { padding: 1.5mm 3mm; vertical-align: top; }
  .print-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .print-table tr.is-followup td:first-child::before { content: '⤷ '; }
  .print-table tr.is-room-total td { font-weight: 600; border-top: 0.5pt solid #1A1A1A; padding-top: 2.5mm; }

  .print-footer { position: fixed; bottom: 8mm; left: 14mm; right: 14mm;
                  display: flex; justify-content: space-between;
                  font-size: 7.5pt; color: #3C3C3B;
                  border-top: 0.5pt solid #1A1A1A; padding-top: 2mm; }

  .print-page-break { page-break-before: always; }

  /* Undvik hemska sidbrytningar mitt i rum */
  .print-room { page-break-inside: avoid; }
}
```

### 3.4 — Ny print-logga

Den vita loggan `byggbiten-logga.svg` fungerar inte på vit print-bakgrund. Vi behöver **den mörka versionen** (`byggbiten_logga_transparent_beskuren.svg` från Q3) inlinad som andra SVG och användas specifikt i `#print-layout`. Kan hållas helt separat från skärmens logga via två `<img>`-element: ett för skärm (vit), ett för print (mörk).

### 3.5 — Datastrukturen — tillgång till Wikells-koder

`data.js` har källinformationen som kommentarer idag, t.ex. `price: 825  // Wikells 15.016`. Vi behöver den som data, inte kommentar. Tillägg i varje item/followup:

```js
const GOLV_EKPARKETT = {
  id: 'golv_ekparkett',
  label: 'Ekparkett',
  price: 825,
  unit: 'kr/m²',
  wikellsId: '15.016',        // NYTT — exponeras i print-tabellen
  // ...
};
```

Poster **utan** motsvarande Wikells-id (schablon-kök, UE, skyddstäckning med justerat pris, ytterdörr, hatthylla): sätt `wikellsId: null` (eller utelämna fältet). Print-tabellen visar "Schablon" i kod-kolumnen när id saknas.

### 3.6 — Print-datagenerering

Ny funktion `buildPrintData(state)` som returnerar:

```js
{
  header: {
    kalkylNamn: state.projektNamn || '(namnlös kalkyl)',
    datum: state.datum,
    kund: { namn: '...', adress: '...', orgnr: '...' },  // från AUTH-listan (Del II)
    kontakt: { namn: '...', mejl: '...' },               // från AUTH-listan
    leverantor: { /* hårdkodad Byggbiten */ }
  },
  rum: [
    {
      namn: 'Sovrum 1',
      yta: 12,
      rader: [
        { kod: '15.016', label: 'Ekparkett', enh: 'm²', mangd: 12.0, prisEnh: 825, netto: 9900, inklMoms: 12375, isFollowup: false },
        { kod: '14.001', label: 'inkl. rivning av befintligt golv', enh: 'm²', mangd: 12.0, prisEnh: 95, netto: 1140, inklMoms: 1425, isFollowup: true },
        ...
      ],
      rumTotalNetto: 22334,
      rumTotalInkl: 27918
    }
  ],
  sammanstallning: [
    { rum: 'Sovrum 1', netto: 22334, inkl: 27918 },
    ...
  ],
  totalNetto: 231854,
  totalInkl: 289818
}
```

Funktionen återanvänder existerande `calcItemTotal`, `calcFollowupTotal`, `calcRoomSubtotal` — adderar bara moms-kolumner genom att multiplicera med 1.25.

### 3.7 — Rendering

Ny funktion `renderPrintLayout()` som skriver ut `#print-layout`-divens innehåll från `buildPrintData(state)`. Körs vid varje render eller precis innan `window.print()` — välj det som är enklast att underhålla. Förslag: kör den i `beforePrint`-eventet så den alltid är uppdaterad men inte räknas vid varje on-screen-render:

```js
window.addEventListener('beforeprint', () => {
  renderPrintLayout();
});
```

### 3.8 — Vad ersätts och vad läggs till

**Ersätts:**
- `actionName === 'print'` → `window.print()`-handlern blir samma (bara anropet behåller) men beforeprint-listenern renderar layouten först.

**Läggs till:**
- Ny `<div id="print-layout">` i `index.html` (eller skapas dynamiskt i JS om det är renare).
- `@media print { … }`-regler i `style.css`.
- `buildPrintData(state)` och `renderPrintLayout()` i `app.js`.
- `wikellsId`-fält på alla Wikells-härledda items och followups i `data.js`.
- Print-logga-SVG inlinad i `<img class="print-logo" …>` eller som inline SVG i HTML.

**Rörs inte:**
- Kalkyllogik, datamodell, state-struktur (utöver `wikellsId`-fält).

---

## 4. Verifiering (Del I)

1. Öppna appen, bygg en 4-rums-kalkyl (sovrum, vardagsrum, badrum, hall).
2. Tryck Ctrl+P (eller Cmd+P på Mac). Print-preview ska visa:
   - Sida 1: Byggbiten-logga mörk, "KALKYLBUDGET"-titel, kalkylnamn, kund (HSB Sundsvall), leverantör, kontakt. Tabell per rum med Wikells-koder, mängd, pris/enh, netto, inkl moms. Rum-totaler.
   - Sida 2: Sammanställning + disclaimers + "NÄSTA STEG". Footer med företagsinfo.
3. Testa "Spara som PDF" via webbläsarens print-dialog. Resulterande PDF ska vara 2 sidor, snygg, utan sidebar/header/knappar.
4. Testa med en kalkyl som innehåller **övriga-rum** (inga yta/kvm). Tabellraderna ska visa "st" i Enh-kolumnen, rätt count.
5. Testa med en **följepost kryssad**. Den ska renderas indenterat med `⤷`-prefix i print-tabellen.
6. Testa utskrift med **tomma kalkylnamn** — ska visa "(namnlös kalkyl)" i KALKYLNAMN-fältet.
7. Verifiera sidbrytning: om du har 7 rum ska sidbrytningarna hamna **mellan rum**, inte mitt i ett rum (`page-break-inside: avoid`).
8. Inkl moms-summan ska vara **exakt** netto × 1.25 (ingen avrundning innan multiplikation).

---

---

# DEL II — Ytterligare login (flerkund-stöd)

---

## 1. Varför vi gör detta

Idag är appen hårdkodad för en enda kund: `hsbsundsvall` / `Byggbiten2026!`. Dennis vill lägga till ytterligare en kund. Den naturliga framtida riktningen är "fler kunder kommer att komma", så vi bygger strukturen som en **lista av kunder** i stället för en hårdkodad användare — då är nästa kund bara en ny rad i en array, ingen kod-ändring.

**Problem ur Dennis perspektiv:** Appen levereras till en kund i taget som en fil. Idag betyder det en kod-ändring för varje kund. Om vi flyttar auth-listan till data.js kan Dennis uppdatera den utan att Claude Code behöver göras (klart övergripande mål — inte detta pass).

## 2. Nuvarande beteende

`src/app.js` rad 25–26:
```js
const AUTH_USER = 'hsbsundsvall';
const AUTH_PASSWORD = 'Byggbiten2026!';
```

Login-logiken i `attemptLogin()` (rad 1504–1515) kollar exakt mot dessa två strängar. Case-insensitive på username, case-sensitive på lösenord.

## 3. Förväntat beteende

### 3.1 — Auth-lista i data.js eller app.js

Flytta från två konstanter till en array:

```js
// I data.js (exporteras via window.APP_DATA.AUTH_USERS) eller i app.js top-scope
const AUTH_USERS = [
  {
    user: 'hsbsundsvall',
    password: 'Byggbiten2026!',
    displayName: 'HSB Sundsvall',
    kundInfo: {
      namn: 'HSB Sundsvall',
      adress: '[adress]',
      orgnr: '[orgnr]',
      kontakt: { namn: '[kontaktperson]', mejl: '[mejl]' }
    }
  },
  {
    user: '[FYLL I]',          // Dennis fyller i innan kod körs
    password: '[FYLL I]',       // Dennis fyller i
    displayName: '[FYLL I]',
    kundInfo: {
      namn: '[FYLL I]',
      adress: '[FYLL I]',
      orgnr: '[FYLL I]',
      kontakt: { namn: '[FYLL I]', mejl: '[FYLL I]' }
    }
  }
];
```

### 3.2 — `attemptLogin`-uppdatering

```js
function attemptLogin(user, pw) {
  const normalizedUser = (user || '').trim().toLowerCase();
  const match = AUTH_USERS.find(u => u.user.toLowerCase() === normalizedUser && u.password === pw);
  if (!match) {
    uiState.loginError = 'Felaktigt användarnamn eller lösenord.';
    render();
    return;
  }
  state.auth = { loggedIn: true, user: match.user, displayName: match.displayName, kundInfo: match.kundInfo };
  uiState.loginError = null;
  state.view = 'home';
  persistState();
  render();
}
```

### 3.3 — `kundInfo` exponeras till print-layout

`buildPrintData(state)` hämtar `header.kund` från `state.auth.kundInfo`. Det gör att kundens adress/orgnr automatiskt syns rätt i utskriften, oavsett vilken kund som loggat in. HSB Sundsvall ser "HSB Sundsvall [adress]", nya kunden ser sin egen info.

### 3.4 — Dennis måste fylla i användarinfo för nya kunden

**Blockerar implementation av Del II:** Dennis fyller i placeholder-raderna (`[FYLL I]`) i `AUTH_USERS[1]` innan Claude Code kör. Inkluderar minst: user, password, displayName. `kundInfo` kan vara minimal (`{ namn: '[displayName]' }`) om övriga fält inte är tillgängliga — print-layouten tolererar tomma strängar.

### 3.5 — Vad ersätts / läggs till

**Ersätts:**
- `const AUTH_USER = ...` + `const AUTH_PASSWORD = ...` borta.
- `attemptLogin()` byter slå-mot-konstant till slå-mot-array.
- `state.auth` utökas med `displayName` och `kundInfo` utöver `user` och `loggedIn`.

**Läggs till:**
- `AUTH_USERS`-array.
- Backward-kompatibel migrering: gamla localStorage-state med bara `{ loggedIn, user }` → slå upp `kundInfo` från AUTH_USERS vid renderingen, så gamla sessioner inte förlorar informationen vid omladdning.

## 4. Verifiering (Del II)

1. Logga in med `hsbsundsvall` / `Byggbiten2026!` — ska fungera som idag, print-layouten visar "HSB Sundsvall" i kund-blocket.
2. Logga ut. Logga in med nya kundens uppgifter — ska fungera, print-layouten visar nya kundens info.
3. Logga in med felaktig kombination — röd felruta med shake-animation.
4. Ladda om sidan mitt under pågående session — ska stanna inloggad med rätt displayName.

---

---

# DEL III — "Begär offert"-flödet: PDF + mejlprogram-picker + förifyllt mejl

---

## 1. Varför vi gör detta

Idag är "Begär offert"-knappen en stub som visar `window.alert('Offertförfrågan — kopplas i senare fas.')`. Dennis scope för flödet:

1. Användaren klickar "Begär offert".
2. En PDF av kalkylen genereras och laddas ner.
3. En picker-dialog frågar: "Vilket mejlprogram vill du använda?" med tre val — **native / Gmail / Outlook**.
4. Valt program öppnas med förifyllt mejl: till `dennis@byggbiten.nu`, ämne = `Kalkylnamn — YYYY-MM-DD`, brödtext = "Vi önskar skarp offert för [kalkylnamn]. Återkom gärna för mer information/platsbesök."
5. PDF:en som laddades ner i steg 2 måste **användaren själva bifoga** i det öppnade mejlet — standarden `mailto:` kan inte bifoga filer programmatiskt.

**Problem ur kundens perspektiv:** HSB-förvaltaren som byggt kalkylen vill få en offert från Byggbiten. Att tvinga dem att manuellt öppna sin mejlklient, komponera mejl, bifoga PDF, skriva ämne och brödtext är lågt trösklade för att de ska lämna appen utan att gå vidare. Vi vill att **flödet från "begär offert" till "mejlet är skrivet, jag behöver bara dra in PDF:en och trycka Skicka"** ska ta 10 sekunder.

## 2. Nuvarande beteende

`app.js` rad 1420–1423:
```js
if (actionName === 'request-quote') {
  window.alert('Offertförfrågan — kopplas i senare fas.');
  return;
}
```

Ingen PDF genereras. Ingen mejl förbereds. Knappen är effektivt död.

## 3. Förväntat beteende

### 3.1 — Steg för steg

**A. Generera PDF.** Åter-använd print-layouten från Del I — vi behöver inte en annan rendering för offert-PDF:en. Den är samma dokument.

Tekniken: öppna en ny print-dialog programmatiskt med filnamnet förslag `Kalkylbudget_[projektnamn]_[datum].pdf` via `document.title`-hack. Användaren väljer "Spara som PDF" i utskriftsdialogen. Filen hamnar i deras Downloads-mapp.

Alternativt och renare: visa användaren en instruktion **innan** mailpicker-modalen: *"1. Spara PDF:en först. 2. Välj mejlprogram. 3. Bifoga den sparade PDF:en i mejlet."* — med en knapp "Spara PDF" som triggar print-dialog, och sen en knapp "Fortsätt till mejl" som öppnar mejlpicker. Det är mer explicit och blir inte otydligt för novisen.

**Rekommendation: använd det explicita två-stegs-flödet.** Tre-stegs-modal:

```
┌─────────────────────────────────────────────────────────────────┐
│  Begär offert                                              [ × ] │
│                                                                  │
│  1. Spara kalkylen som PDF                                      │
│     PDF:en bifogas i mejlet du skickar till Byggbiten.          │
│     [ Spara PDF ]    ✓ Sparat (visas efter klick)               │
│                                                                  │
│  2. Öppna mejl i                                                │
│     [ Inbyggt mejl ]  [ Gmail ]  [ Outlook ]                    │
│                                                                  │
│  3. Bifoga PDF:en som sparades i steg 1 och tryck Skicka.       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 — PDF-namn-konvention

`document.title` sätts temporärt till `Kalkylbudget_${projektnamn}_${datum}.pdf` (snygg filnamn-strip av specialtecken) innan `window.print()` körs. Filnamnet browsers föreslår kommer från `document.title`. Återställ till original efter utskrift.

Snygg filnamn-strip:
```js
function sanitizeFilename(str) {
  return (str || 'Namnlos')
    .replace(/[åä]/gi, 'a').replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
}
```

### 3.3 — Mejlprogram-picker

Tre knappar, tre URL-format:

**Inbyggt mejl (native)** — `mailto:` länk:
```
mailto:dennis@byggbiten.nu?subject=<kodat>&body=<kodat>
```

**Gmail (webb)** — Gmail compose-URL:
```
https://mail.google.com/mail/?view=cm&fs=1&to=dennis@byggbiten.nu&su=<kodat>&body=<kodat>
```

**Outlook (webb)** — Outlook compose-URL:
```
https://outlook.office.com/mail/deeplink/compose?to=dennis@byggbiten.nu&subject=<kodat>&body=<kodat>
```

Öppna i ny flik: `window.open(url, '_blank')`.

### 3.4 — Ämne och brödtext

```js
const projektnamn = state.projektNamn || 'namnlös kalkyl';
const datum = state.datum;
const subject = `${projektnamn} — ${datum}`;
const body = `Hej Dennis,\n\nVi önskar skarp offert för ${projektnamn}. Återkom gärna för mer information eller platsbesök.\n\nKalkyl-PDF bifogas.\n\nVänliga hälsningar,\n${state.auth.displayName || state.auth.user}`;
```

URL-koda båda (`encodeURIComponent`).

### 3.5 — Dold mottagar-adress

`dennis@byggbiten.nu` är hårdkodad idag. Lägg den som konstant `const OFFERT_RECIPIENT = 'dennis@byggbiten.nu';` överst i app.js så den är trivial att ändra om Dennis flyttar eller byter företagsmejl.

### 3.6 — Modal-design

Matchar befintlig `.modal-backdrop` / `.modal`-stil. Tre steg-block, den sista är inaktiv tills steg 1 är utförd. Efter klick på "Spara PDF" visar checkmark "✓ Sparat" intill knappen. Steg 2 aktiveras.

Alternativt: låt alla tre stegen vara aktiva från början — användaren kan välja ordning. Mer flexibelt, mindre guidat. **Rekommendation: håll stegen aktiva från början**. Novisen följer numreringen; advanced-användaren bryter mönstret om hen vill. Friktion noll.

### 3.7 — Felhantering

- Native mailto kan misslyckas (ingen default-klient konfigurerad). Ingen robust detektering möjlig — `window.location = 'mailto:…'` vs `window.open` har olika beteenden på olika OS. **Lösning: `window.open(mailtoUrl)` + visa toast efter 2 sek "Om ingen mejlapp öppnades, välj Gmail eller Outlook istället."**
- Gmail/Outlook öppnar alltid i ny flik — inga fel-scenarion där.

### 3.8 — Vad läggs till

- Ny modal `<div class="modal-backdrop" data-role="offert-modal">…</div>`, renderad från app.js när `actionName === 'request-quote'`.
- Ny handler för steg-1-knappen: `actionName === 'offert-save-pdf'` → `setDocumentTitleTemp` + `window.print()`.
- Ny handler för steg-2-knapparna: `actionName === 'offert-open-native'` / `'offert-open-gmail'` / `'offert-open-outlook'`.
- Konstant `OFFERT_RECIPIENT = 'dennis@byggbiten.nu'`.
- `sanitizeFilename(str)`-helper.

### 3.9 — Vad ersätts

- Nuvarande `window.alert('…kopplas i senare fas.')` raderas.

## 4. Verifiering (Del III)

1. Bygg en kalkyl, klicka "Begär offert". Modal ska öppnas med tre steg.
2. Klicka "Spara PDF" → webbläsarens utskriftsdialog öppnas → välj "Spara som PDF" → filnamn föreslår `Kalkylbudget_[projektnamn]_2026-04-21.pdf`.
3. Efter sparande: "✓ Sparat" visas intill knappen.
4. Klicka "Inbyggt mejl" → systemets default-klient (Outlook desktop, Apple Mail, etc.) öppnas med rätt `dennis@byggbiten.nu` som mottagare, ämne `[projektnamn] — [datum]`, brödtext som specificerad.
5. Klicka "Gmail" → Gmail-kompositionsflik öppnas i webbläsaren med samma fält förifyllda.
6. Klicka "Outlook" → Outlook-kompositionsflik öppnas likaså.
7. Stäng modal med × eller klick utanför → modal stängs. Ingen oavsiktlig dataändring.
8. Namn med specialtecken (Å/Ä/Ö, mellanslag) → filnamn blir sanitized.
9. Testa på iOS Safari och Chrome Android — `mailto:` ska öppna native mejl; Gmail/Outlook-webb kan funka i browser (beroende på OS-default).

---

---

# DEL IV — Save-toast: gör feedbacken synlig och tydlig

---

## 1. Varför vi gör detta

Idag finns redan en `flashBanner('Kalkyl sparad')`-funktion som visas vid save (se `app.js` rad 1537, CSS-regel i `style.css` rad 313). Problemet: Dennis testade och upplevde att det **inte fanns någon toast** — vilket är ett tecken på att den som finns idag antingen är för diskret, försvinner för snabbt, eller visas på fel plats (överlappar med headern).

Vi **verifierar** först det nuvarande beteendet innan vi ändrar något — det kan vara så enkelt att höja synligheten (förstärka färg, längre display-time, bättre position).

## 2. Nuvarande beteende (verifieras under testsessionen)

- `flashBanner(msg)` skapar ett `<div class="flash-banner">` längst upp i `body` med CSS-animation `flashOut` efter 2,6 s (approx från CSS).
- Position: absolut-placerad, förmodligen 0 px från top (verifieras i CSS).
- Dennis upplever att den inte syns. Antingen gömd bakom mörk header, eller för kort visning, eller matchande färg mot bakgrund.

## 3. Förväntat beteende

### 3.1 — Toast-design

Tydlig, modern toast i **botten-högra hörnet** (inte top-banner som tenderar att försvinna i header-zonen). Subtil shadow, grön accent-kant till vänster (success state), sv text "Kalkylen är sparad".

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--surface-primary);
  border-left: 3px solid #3E8E55;
  padding: 14px 18px 14px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  font-size: 14px;
  font-weight: 500;
  color: var(--brand-black);
  z-index: 9999;
  animation: toastIn 200ms cubic-bezier(0.2, 0.9, 0.2, 1);
}
.toast.is-leaving { animation: toastOut 200ms ease-in forwards; }

@keyframes toastIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(12px); }
}

@media (max-width: 640px) {
  .toast { left: 16px; right: 16px; bottom: 16px; }  /* full-width på mobil */
}
```

### 3.2 — Visa-tid och stacking

- Display-tid: **3 sekunder**, inte 2,6 som idag.
- Fade-out: 200 ms.
- Om en ny toast kommer medan den gamla är synlig → ersätt (ingen stacking, ingen animation-glitch).
- Stöder olika typer: `success` (default, grön), `error` (röd), `info` (neutralt grå). För nu räcker `success`.

### 3.3 — Uppgradera befintlig `flashBanner`

Ren namnrefaktorering: `flashBanner(msg)` → `showToast(msg, type = 'success')`. Båda `saveCurrentCalc()` och `deleteProject()` anropar `showToast` istället. Eventuella andra anrop söks upp och uppdateras.

### 3.4 — Vad läggs till

- Ny CSS-klass `.toast` med `toastIn`/`toastOut`-animationer.
- Funktion `showToast(msg, type)` ersätter `flashBanner(msg)`.

### 3.5 — Vad ersätts

- `.flash-banner`-CSS-regler (rad 313-330 ungefär) raderas.
- `flashBanner`-funktion raderas och ersätts.

## 4. Verifiering (Del IV)

1. Bygg en kalkyl, klicka "Spara kalkyl" i sidebaren.
2. Toast dyker upp i botten-höger: "Kalkylen är sparad". Slide-in-animation.
3. Efter 3 sekunder fade-out.
4. Klicka save igen direkt: gammal toast ersätts omedelbart av ny, ingen dubblering.
5. På mobil (≤ 640 px): toast tar hela bredden, bottom 16px.
6. Testa även ta-bort-flow (delete project) → toast "Kalkyl borttagen" på samma plats.

---

---

# DEL V — Unsaved changes warning

---

## 1. Varför vi gör detta

Om en HSB-förvaltare bygger en 6-rums-kalkyl under en timme och sedan **råkar klicka "Återgå till hemvy"** eller "Logga ut" utan att spara — alla ändringar är borta. localStorage sparar `state` automatiskt (debounce 300 ms) men bara som "aktiv calc"; en save till `savedProjects`-listan sker bara manuellt. Går användaren tillbaka till hemvyn och öppnar en annan kalkyl, är den förra osparad-kalkylen borta.

**Problem ur användarens perspektiv:** "Jag byggde kalkylen hela dagen och nu är den borta. Varför varnade inte appen?"

Vi vill varna innan användaren gör en irreversibel navigering om den aktiva kalkylen har **osparade ändringar** jämfört med senaste snapshot i `savedProjects`.

## 2. Nuvarande beteende

- `saveCurrentCalc()` sparar en snapshot av aktiva `state.rum`, `state.projektNamn`, `state.datum` till `state.savedProjects`.
- `state` persistas kontinuerligt till localStorage — så på omladdning kommer aktiv kalkyl tillbaka.
- Men: om användaren klickar "Återgå till hemvy" → "Ny kalkyl" → all aktiv `state.rum` ersätts med tom kalkyl, utan varning. Senaste sparade snapshot finns kvar, men om användaren inte sparade senaste ändringar är de borta.
- "Logga ut" behåller savedProjects men sätter `state.auth.loggedIn = false`. Ingen varning om osparade ändringar.
- Stänga flik / reload: inget `beforeunload`-event tar hand om varningen. localStorage-state behålls tack vare debounce, så mycket räddas här — men det är inte 100 %.

## 3. Förväntat beteende

### 3.1 — Dirty-flag

`state.dirty = true` sätts när:
- Användaren lägger till / tar bort rum
- Ändrar rumsnamn, yta, takhöjd, rumstyp
- Kryssar item, följepost
- Ändrar area / count på ett item
- Ändrar `state.projektNamn`

`state.dirty = false` sätts när:
- `saveCurrentCalc()` körs framgångsrikt
- `loadProject()` körs (aktiv kalkyl ersätts med sparad snapshot)
- `new-calc` körs (användaren medvetet startar nytt — se 3.2)

`state.dirty` persistas **inte** till localStorage (det är en UI-state, inte kalkyldata). Sätts till `false` vid app-boot. Konsekvens: om användaren laddar om mitt i ett arbete rapporterar appen inte dirty vid första navigeringen — acceptabelt eftersom statet är återställt från localStorage till den senaste auto-debounce-snapshot.

### 3.2 — Varningsdialog

När användaren försöker göra irreversibel navigering **och** `state.dirty === true`:

- "Återgå till hemvy" (`go-home`)
- "Logga ut" (`logout`)
- "Ny kalkyl" (`new-calc` — bara om kalkylen redan har rum)
- "Ladda annat projekt" (`load-project`)

→ Visa en bekräftelse-dialog:

```
┌─────────────────────────────────────────────────────┐
│  Osparade ändringar                            [ × ] │
│                                                      │
│  Din kalkyl har ändringar som inte sparats. Vad     │
│  vill du göra?                                       │
│                                                      │
│            [ Spara och fortsätt ]                    │
│                                                      │
│            [ Fortsätt utan att spara ]               │
│                                                      │
│            [ Avbryt ]                                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

- **Spara och fortsätt**: kör `saveCurrentCalc()` + sen den önskade navigeringen.
- **Fortsätt utan att spara**: kör navigeringen direkt, sätt `state.dirty = false`.
- **Avbryt**: stäng dialog, gör inget.

### 3.3 — `beforeunload`-event

För att skydda mot **oavsiktlig flik-stängning eller webbläsar-navigering** (F5, Ctrl+W, typa ny URL):

```js
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = '';  // Browser visar sin default-varningstext
    return '';
  }
});
```

Chrome/Firefox visar sin egen text ("Ändringar du gjort kanske inte sparas…"). Vi kan inte anpassa den.

### 3.4 — Implementationshjälp

Lägg till `markDirty()`-funktion som sätter `state.dirty = true` + triggar evt UI-uppdatering (t.ex. en liten asterisk "*" bredvid projektnamnet i headern för att visuellt signalera osparat state). Anropa `markDirty()` från alla toggle-item / edit-area / rum-add / rum-remove / projektnamn-change-handlers.

### 3.5 — Visuell indikator

Lägg till en liten asterisk "*" direkt efter projektnamnet i calc-view-headern när `state.dirty === true`. Försvinner vid save. Ger användaren hjälp att se "jag har osparade ändringar" utan att dialogen behöver trigga.

Exempel: `Strindbergsvägen 4B *`

### 3.6 — Vad läggs till

- `state.dirty` — boolean flag.
- `markDirty()` — helper, anropad från alla muterings-sittande handlers.
- `confirmUnsavedOrProceed(actionFn)` — ny helper som visar dialog om dirty, annars kör actionFn direkt.
- Dialog-rendering + event-handlers för tre knappar.
- `beforeunload`-listener.
- CSS för asterisk (liten röd/orange prick, subtil).

### 3.7 — Vad ersätts

- `go-home`, `logout`, `new-calc`, `load-project`-handlers wrappas i `confirmUnsavedOrProceed(actionFn)`.

## 4. Verifiering (Del V)

1. Bygg en 2-rums-kalkyl. Klicka "Återgå till hemvy" utan att spara → dialog öppnas. "Avbryt" → stanna i calc-vyn. "Fortsätt utan att spara" → hemvy, ändringar borta.
2. Bygg en kalkyl. Klicka "Spara kalkyl" → toast "Sparad". Klicka "Återgå till hemvy" → **ingen dialog** (dirty = false).
3. Ändra rumsnamnet efter save → asterisk dyker upp. Klicka "Återgå till hemvy" → dialog.
4. Klicka "Spara och fortsätt" i dialog → save körs + hemvy öppnas. Tillbaka i calc och sen hemvy igen → ingen asterisk.
5. Stäng flik med osparade ändringar (Ctrl+W) → browser visar sin default-varning.
6. Ladda om sidan (F5) med osparade ändringar → browser-varning.
7. Nytt-kalkyl-flödet (från hemvyns action-card) med existerande dirty calc → dialog. Efter "Fortsätt utan att spara" → ny tom calc.

---

---

# 6. Snabbreferens — berörda filer och funktioner

| Del | Fil | Funktion / plats |
|---|---|---|
| I | `src/index.html` | `<div id="print-layout">` + print-logga-img |
| I | `src/style.css` | `@media print` + `.print-*`-klasser |
| I | `src/app.js` | `buildPrintData`, `renderPrintLayout`, `beforeprint`-listener |
| I | `src/data.js` | `wikellsId`-fält på varje item/followup |
| II | `src/app.js` (eller `data.js`) | `AUTH_USERS`-array ersätter konstanter |
| II | `src/app.js` | `attemptLogin`-uppdatering |
| II | `state.auth` | Utökas med `displayName` + `kundInfo` |
| III | `src/app.js` | `request-quote`-handler + ny modal + mejl-picker |
| III | `src/style.css` | Offert-modal-styling (återanvänder `.modal-backdrop`) |
| III | `src/app.js` | `sanitizeFilename`, `OFFERT_RECIPIENT`, mejl-URL-mallar |
| IV | `src/style.css` | `.toast` + animationer ersätter `.flash-banner` |
| IV | `src/app.js` | `showToast(msg, type)` ersätter `flashBanner(msg)` |
| V | `src/app.js` | `state.dirty`, `markDirty`, `confirmUnsavedOrProceed` |
| V | `src/app.js` | `beforeunload`-listener |
| V | `src/style.css` | Asterisk-style + dialog-style |

---

# 7. Plan innan kod — vad Claude Code ska redovisa först

Som vanligt: innan du rör en enda rad, skriv en kort plan (10–15 meningar) som svarar på:

1. Vilken ordning gör du delarna i? Rekommendation: **II (auth-lista) → I (print-layout, använder kundInfo från auth) → IV (toast, cleanup) → III (offertflöde, använder print-layout från I) → V (unsaved-warning, sista polering)**.
2. För Del I: hur strukturerar du `#print-layout`-HTML:en och `@media print`-CSS:en? Förväntas det vara ett statiskt template som fylls med data, eller dynamiskt genereras?
3. För Del I: hur exponerar du `wikellsId` i data.js — som nytt fält på varje relevant item, eller som en separat mappning?
4. För Del II: var bor `AUTH_USERS` — i data.js (exponeras via window.APP_DATA) eller i app.js top-scope? Motivera.
5. För Del II: `[FYLL I]`-placeholders kräver Dennis input innan kod kan köras. Flagga det som blocker om uppgifterna saknas — skriv **inte** egna gissningar.
6. För Del III: två-stegs-flöde (spara PDF först, sen picker) eller allt-i-ett? Rekommendation är två-stegs enligt §3.1.
7. För Del III: hur hanterar du native-mailto-fel-scenarion?
8. För Del IV: Verifiera först existerande `.flash-banner`-position och beteende. Rapportera innan du skapar ny. Kan vara så att det räcker att justera existerande — inte ersätta.
9. För Del V: vilka exakta handler-funktioner wrappas med `confirmUnsavedOrProceed`?
10. För Del V: hur undviker du att `markDirty()` triggar under ladd-flödet (`loadProject`, `syncFollowups` vid start)?
11. Tester du kör innan rapport klart — både `node --check` + Node-bootstrap + manuell UI-test + verifiera print-preview + Gmail/Outlook-URL öppnas i ny flik.
12. Vilka `.project-context/`-filer uppdateras (DESIGN.md får en §6.9 om print-layout, §6.10 om offert-flöde, §6.11 om dirty-state; DECISIONS.md får 2026-04-22-entries; ny sessionsrapport).

Vänta på Dennis bekräftelse av planen **och** på att `[FYLL I]`-raderna i AUTH_USERS är ifyllda innan du kodar.

---

---

# SAMLAD STARTPROMPT (klistras in i Claude Code)

```
Läs .project-context/prompts/2026-04-21-pdf-login-offert-och-unsaved.md noggrant
— fem sammanhängande delar:

  Del I   — PDF-export som "Kalkylbudget", dedikerad @media print-layout matchad
            mot Byggbiten-offertmall.
  Del II  — AUTH_USERS-array i stället för hårdkodade konstanter, med kundInfo
            per kund som exponeras till print-layout.
  Del III — "Begär offert"-flöde: modal med spara-PDF-steg + mejlprogram-picker
            (native / Gmail / Outlook) + förifyllt mejl till dennis@byggbiten.nu.
  Del IV  — Save-toast verifiering + ev. förstärkning av existerande flashBanner.
  Del V   — Unsaved-changes-dirty-flag + varningsdialog vid navigering + beforeunload.

Redovisa sedan en samlad implementationsplan som svarar på:

1. Vilken ordning gör du delarna i? Rekommendation: II → I → IV → III → V.
2. Del I: #print-layout strukturerad statiskt eller dynamiskt?
3. Del I: wikellsId som nytt fält på items eller separat mappning?
4. Del II: AUTH_USERS bor i data.js eller app.js?
5. Del II: [FYLL I]-placeholders — bekräfta att du VÄNTAR på Dennis uppgifter
   innan kod körs.
6. Del III: tvåstegs-flöde med spara-PDF-först-knapp?
7. Del III: native-mailto-felhantering?
8. Del IV: VERIFIERA existerande .flash-banner först innan du ersätter. Rapportera
   nuvarande beteende i planen.
9. Del V: exakt vilka handlers wrappas i confirmUnsavedOrProceed?
10. Del V: markDirty-aktivering — hur undviker du triggning under load/sync?
11. Vilka lokala tester före klart-rapport?
12. Vilka .project-context/-filer uppdateras?

Vänta på Dennis bekräftelse av planen OCH att [FYLL I]-raderna i AUTH_USERS är
fyllda innan du rör en enda rad kod.
```
