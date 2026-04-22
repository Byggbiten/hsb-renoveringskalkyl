# PDF-export, begära offert, expanderbara poster, gråade summor

**Typ:** Feature-prompt, fyra sammanhängande delar (I–IV)
**Författare:** Cowork-sessionen med Dennis, 2026-04-22
**Berör:** `src/app.js`, `src/style.css`, `src/index.html`, `src/data.js`
**Omfattning:** UX-slipning av sista kvartsmilen — PDF-leverans som kalkylbudget, offertförfrågan-flöde, expanderbara poster med Wikells-metadata, och visuell feedback på inaktiva summor.
**Ersätter:** `2026-04-21-pdf-login-offert-och-unsaved.md` (login, save-toast och unsaved-warning är bortplockade) och `2026-04-22-expanderbara-poster-och-gray-sums.md` (inkorporerad här).

Alla fyra delar kan implementeras i samma session. Ordningsrekommendation står i startprompten längst ner.

---

# DEL I — PDF-export som "Kalkylbudget", inte skärmdump

## 1. Varför vi gör detta

Idag gör "Skriv ut / spara som PDF"-knappen bara `window.print()` utan `@media print`-stilmall. Resultatet är en skärmdump: sidebaren, knappar, scrollbar, headern, allt följer med. Det ser amatörigt ut och kommunicerar inte "Byggbiten levererar detta" till slutkunden.

Kunden är HSB. HSB skriver ut kalkylen eller mejlar den till styrelsen. Första sidan avgör om kalkylen uppfattas som **ett professionellt underlag från en proffs-entreprenör** — eller som en webbskärmdump. Dennis har en skarp Byggbiten-offert (`10368 Staben 2 - Varmförråd (4).pdf`) med tydligt avsändarblock, kundblock, tabell med kod/benämning/enh/mängd/pris/netto/inkl-moms, och separat villkorssida med signatur-rader. Det är vår designreferens — med **en avgörande skillnad:** kalkylatorn producerar en **kalkylbudget**, inte en bindande offert. Dokumenttiteln, disclaimers och avtalsbekräftelsen måste skilja dem åt.

**Problem ur kundens perspektiv:** HSB-förvaltaren har byggt en 4-rums-kalkyl på 450 tkr. Hen trycker "Skriv ut" och får en sida där sidebaren dyker upp till vänster, tabellen är trasig över sidbrytningen, och pusselbiten i headern är full storlek. Kunden ser inte Byggbitens avsändaradress. Det går inte att vidarebefordra till styrelsen.

## 2. Nuvarande beteende

- `app.js` rad 1415–1417: `if (actionName === 'print') { window.print(); return; }`
- `style.css` saknar `@media print` helt.
- Utskriften får hela sidans layout inklusive sidebar, mörk header, action-knappar, drag-handles, flash-banner, scroll-bar. Sidbrytning är slumpmässig.
- Byggbiten-loggan som används på skärmen är vit-på-mörk (`byggbiten-logga.svg` vit-version från Q3) och syns därför inte på vit print-bakgrund.
- Dokumentet har ingen tydlig titel — högst upp står "Renoveringskalkyl" från `<h1>` utan kontext.

## 3. Förväntat beteende

### 3.1 Dedikerad print-layout i DOM

Lägg till en `<div id="print-layout">…</div>` som är **`display: none` på skärm** och **`display: block` i `@media print`**. All övrig sida göms i print (sidebar, header, knappar, interaktiva element, expand-paneler från Del III).

**Sida 1 — Header + metadata + arbetsbeskrivning + tabell per rum:**

```
┌────────────────────────────────────────────────────────────────────┐
│ [Byggbiten-logga mörk]         KALKYLBUDGET      Kalkyldatum       │
│                                                   2026-04-22        │
│                                                                      │
│ KALKYLNAMN / PROJEKT                 KUND                            │
│ Strindbergsvägen 4B — 3 rok          HSB Sundsvall                   │
│                                      [adress]                        │
│                                                                      │
│ LEVERANTÖR                           KONTAKT                         │
│ Byggbiten i Norrland AB              [kontakt-namn hos kund]         │
│ Regementsvägen 4                                                     │
│ 852 38 Sundsvall                                                     │
│ Org/personnummer: 556875-4260                                        │
│ Godkänd för F-skatt                                                  │
│                                                                      │
│ OMBUD / KALKYLANSVARIG                                               │
│ Dennis Sendelbach                                                    │
│ dennis@byggbiten.nu   0704969141                                     │
│                                                                      │
│ ────────────────────────────────────────────────────────────────── │
│                                                                      │
│ ARBETSBESKRIVNING                                                    │
│ Kalkylbudget för renovering av bostadsrätten. Omfattar: [rum-lista  │
│ kommaseparerad]. Kalkylen är baserad på Byggbitens kalibrerade      │
│ schablonpriser och utgör ej bindande pris.                           │
│                                                                      │
│ ────────────────────────────────────────────────────────────────── │
│                                                                      │
│ [Sovrum 1 — 12 m²]                                                   │
│ Kod    Benämning                Enh   Mängd   Pris/enh  Netto  Inkl │
│ ────   ──────────────────────   ───   ─────   ────────  ─────  ──── │
│ 15.016 Ekparkett                m²    12,0        825   9 900 12 375│
│ ⤷      inkl. rivning av golv    m²    12,0         95   1 140  1 425│
│ 14.011 Måla tak                 m²    12,0        144   1 728  2 160│
│ 14.012 Måla väggar              m² v  28,1        144   4 046  5 058│
│ ⤷      skyddstäckning           st     1,0        450     450    562│
│ 16.056 Ny innerdörr             st     1,0      5 070   5 070  6 338│
│                                            Rum-total  22 334 27 918 │
│                                                                      │
│ [Sovrum 2 — 10 m²] ...                                               │
│                                                                      │
│ [Footer sida 1]                                                      │
│ Byggbiten i Norrland AB | Regementsvägen 4, 852 38 Sundsvall         │
│ Tfn 070-235 65 55 | E-post info@byggbiten.nu                         │
│ Bankgiro 825-3312 | Momsreg SE556875426001              1 (2)        │
└────────────────────────────────────────────────────────────────────┘
```

**Sida 2 — Sammanställning + disclaimers + nästa steg (inga signaturrader):**

```
┌────────────────────────────────────────────────────────────────────┐
│ [Byggbiten-logga mörk]         KALKYLBUDGET      Kalkyldatum       │
│                                                                      │
│ SAMMANSTÄLLNING                                                      │
│ Rum                              Netto (kr)        Inkl moms (kr)   │
│ ─────────────────────────       ───────────       ───────────────   │
│ Sovrum 1                            22 334                27 918    │
│ Sovrum 2                            18 420                23 025    │
│ Vardagsrum                          45 300                56 625    │
│ Badrum                             145 800               182 250    │
│ ─────────────────────────       ───────────       ───────────────   │
│ TOTALT                             231 854               289 818    │
│                                                                      │
│ ────────────────────────────────────────────────────────────────── │
│                                                                      │
│ OM DENNA KALKYLBUDGET                                                │
│ Kalkylbudgeten är en vägledande prisuppskattning baserad på         │
│ Byggbitens schablonpriser för ytskiktsrenovering 2026. Slutligt     │
│ pris sätts i offert efter platsbesök.                                │
│                                                                      │
│ INGÅR EJ                                                             │
│ * Bygglovskostnader                                                  │
│ * Föroreningar eller extraåtgärder mark                              │
│ * Anslutningsavgifter                                                │
│ * Hyra av tillfälligt boende under renovering                        │
│                                                                      │
│ NÄSTA STEG                                                           │
│ Vid intresse av skarp offert — kontakta Byggbiten för platsbesök.   │
│ Vi återkommer med bindande pris inom 5 arbetsdagar.                  │
│                                                                      │
│ [Footer sida 2]                                                      │
│ ... samma som sida 1 ...                               2 (2)         │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Medvetna skillnader mot referens-PDF:n

- **Titeln är "KALKYLBUDGET"** (inte "OFFERT") — tydligt för att undvika att den uppfattas som bindande.
- **"Godkänd för F-skatt"** behålls i leverantörblocket (fortfarande sant).
- **Ingen "AVTALSBEKRÄFTELSE"-sektion och inga signaturrader.** Ersätts med "OM DENNA KALKYLBUDGET" + "NÄSTA STEG".
- **"OFFERTNR / PROJEKT" byts till "KALKYLNAMN / PROJEKT"** och visar `state.projektNamn`.
- **Priser visas i två kolumner: Netto (ex moms) + Inkl moms 25 %.** Appens on-screen-totaler är ex moms enligt Q2, men på print är det klargörande att visa båda — HSB tänker inkl moms när de planerar kassaflöde.
- **Kod-kolumnen visar Wikells-koden** (t.ex. 15.016, 14.048). Kopplas till `info.wikellsRef` från Del III. Poster utan wikells-motsvarighet (schablon-kök, UE, erfarenhetsposter) får tom Kod-kolumn eller "Schablon" som platshållare.

### 3.3 Kunddata i print-headern

Eftersom login-utökningen är bortplockad i denna prompt — kunddata i print-headern är **hårdkodad för HSB Sundsvall** i denna iteration. Strukturera dock print-headern så att data plockas från en konstant eller state-objekt som är lätt att extrahera till multi-kund-stöd senare:

```js
const CUSTOMER_INFO = {
  namn: 'HSB Sundsvall',
  adress: '[konkret adress — Dennis fyller i]',
  orgnr: '[konkret orgnr — Dennis fyller i]',
  kontakt: '[kontaktperson hos HSB]'
};
```

Denna konstant blir en `TODO` tills multi-kund-prompt körs. Visar "HSB Sundsvall" oavsett vilken användare som loggar in, tills vidare.

### 3.4 `@media print` CSS-regler

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
  .item-details-panel { display: none !important; }  /* expand-paneler från Del III göms */

  #print-layout { display: block; }

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

  .print-room { page-break-inside: avoid; }
}
```

### 3.5 Ny print-logga

Den vita loggan fungerar inte på vit print-bakgrund. Använd **den mörka versionen** (`byggbiten_logga_transparent_beskuren.svg` från Q3) inlinad i `#print-layout` via `<img class="print-logo">`. Hålls separat från skärmens logga.

### 3.6 Print-datagenerering

Ny funktion `buildPrintData(state)` returnerar strukturerad data för renderingen:

```js
{
  header: {
    kalkylNamn: state.projektNamn || '(namnlös kalkyl)',
    datum: state.datum,
    kund: CUSTOMER_INFO,
    leverantor: { /* hårdkodad Byggbiten */ }
  },
  rum: [
    {
      namn: 'Sovrum 1',
      yta: 12,
      rader: [
        { kod: '15.016', label: 'Ekparkett', enh: 'm²', mangd: 12.0, prisEnh: 825, netto: 9900, inklMoms: 12375, isFollowup: false },
        { kod: '', label: 'inkl. rivning av befintligt golv', enh: 'm²', mangd: 12.0, prisEnh: 95, netto: 1140, inklMoms: 1425, isFollowup: true }
      ],
      rumTotalNetto: 22334,
      rumTotalInkl: 27918
    }
  ],
  sammanstallning: [
    { rum: 'Sovrum 1', netto: 22334, inkl: 27918 }
  ],
  totalNetto: 231854,
  totalInkl: 289818
}
```

Funktionen återanvänder existerande `calcItemTotal`, `calcFollowupTotal`, `calcRoomSubtotal` — adderar bara inkl-moms-kolumner (multiplicerar netto med 1.25).

### 3.7 Rendering

Ny funktion `renderPrintLayout()` fyller `#print-layout`-divens innehåll från `buildPrintData(state)`. Kör i `beforeprint`-eventet så den alltid är uppdaterad vid utskrift men inte räknas vid vanliga on-screen-renders:

```js
window.addEventListener('beforeprint', () => { renderPrintLayout(); });
```

### 3.8 Datastrukturen — Wikells-koder

Del III utökar `info`-fältet till `{ ingar, ingarEj, wikellsRef, image }`. Print-tabellen använder **samma `wikellsRef`-fält**. Extrahera numret ur strängen `"Wikells byggdel 15.016"` → `"15.016"`:

```js
function extractWikellsId(ref) {
  if (!ref) return '';
  const m = ref.match(/(\d{2}\.\d{3})/);
  return m ? m[1] : '';
}
```

Poster utan `info.wikellsRef` → tom Kod-kolumn i print.

### 3.9 Vad läggs till / ersätts

**Läggs till:**
- `<div id="print-layout">` i `index.html` (eller skapas dynamiskt i JS).
- `@media print`-regler i `style.css`.
- `buildPrintData`, `renderPrintLayout`, `extractWikellsId`, `CUSTOMER_INFO` i `app.js`.
- Inline SVG eller `<img>` för mörk print-logga.
- `beforeprint`-listener.

**Rörs inte:** kalkyllogik, datamodell (utöver `info.wikellsRef` från Del III), state-struktur.

## 4. Verifiering (Del I)

1. Öppna appen, bygg en 4-rums-kalkyl (sovrum, vardagsrum, badrum, hall).
2. Tryck Ctrl+P. Print-preview visar:
   - Sida 1: mörk Byggbiten-logga, "KALKYLBUDGET"-titel, kalkylnamn, kund (HSB Sundsvall), leverantör, kontakt. Tabell per rum med Wikells-koder, mängd, pris/enh, netto, inkl moms. Rum-totaler.
   - Sida 2: sammanställning + disclaimers + "NÄSTA STEG". Footer med företagsinfo.
3. Testa "Spara som PDF" via webbläsarens print-dialog. PDF:en ska vara 2 sidor, snygg, utan sidebar/header/knappar.
4. Kalkyl med övriga-rum (utan yta/kvm): tabellraderna visar "st" i Enh-kolumnen, rätt count.
5. Följepost kryssad: indenterat med `⤷`-prefix.
6. Tom projektnamn: visar "(namnlös kalkyl)".
7. 7 rum: sidbrytningar hamnar **mellan** rum, inte mitt i ett rum.
8. Inkl moms = exakt netto × 1.25.
9. Expand-paneler från Del III är **inte** synliga i print även om de är öppna på skärm.

---

# DEL II — "Begär offert"-flödet: PDF + mejlprogram-picker + förifyllt mejl

## 1. Varför vi gör detta

Idag är "Begär offert"-knappen en stub: `window.alert('Offertförfrågan — kopplas i senare fas.')`. Avsett flöde:

1. Användaren klickar "Begär offert".
2. Kalkylen sparas ner som PDF via samma mekanism som Del I.
3. Picker-dialog frågar: "Vilket mejlprogram vill du använda?" — native / Gmail / Outlook.
4. Valt program öppnas med förifyllt mejl: till `dennis@byggbiten.nu`, ämne = `Kalkylnamn — YYYY-MM-DD`, brödtext = "Vi önskar skarp offert för [kalkylnamn]. Återkom gärna för mer information/platsbesök."
5. PDF:en ska **användaren bifoga själv** i det öppnade mejlet — `mailto:` kan inte bifoga filer programmatiskt.

**Problem ur kundens perspektiv:** HSB-förvaltaren som byggt kalkylen vill begära offert. Att tvinga dem att manuellt öppna mejlklient, komponera mejl, bifoga PDF, skriva ämne och brödtext är lågt trösklade för att de ska lämna appen. Vi vill att flödet "begär offert → mejlet är skrivet, jag behöver bara dra in PDF:en och trycka Skicka" ska ta 10 sekunder.

## 2. Nuvarande beteende

`app.js` rad 1420–1423:
```js
if (actionName === 'request-quote') {
  window.alert('Offertförfrågan — kopplas i senare fas.');
  return;
}
```

## 3. Förväntat beteende

### 3.1 Trestegs-modal

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

Alla steg aktiva från början — novisen följer numreringen, advanced-användaren bryter mönstret. Ingen friktion.

### 3.2 PDF-namn-konvention

`document.title` sätts temporärt till `Kalkylbudget_${projektnamn}_${datum}.pdf` innan `window.print()` — webbläsare föreslår filnamn från `document.title`. Återställs efter utskrift.

```js
function sanitizeFilename(str) {
  return (str || 'Namnlos')
    .replace(/[å]/gi, 'a').replace(/[ä]/gi, 'a').replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
}
```

### 3.3 Mejlprogram-picker — URL-format

**Inbyggt mejl (native):**
```
mailto:dennis@byggbiten.nu?subject=<kodat>&body=<kodat>
```

**Gmail (webb):**
```
https://mail.google.com/mail/?view=cm&fs=1&to=dennis@byggbiten.nu&su=<kodat>&body=<kodat>
```

**Outlook (webb):**
```
https://outlook.office.com/mail/deeplink/compose?to=dennis@byggbiten.nu&subject=<kodat>&body=<kodat>
```

Alla öppnas med `window.open(url, '_blank')`.

### 3.4 Ämne och brödtext

```js
const projektnamn = state.projektNamn || 'namnlös kalkyl';
const datum = state.datum;
const subject = `${projektnamn} — ${datum}`;
const body = `Hej Dennis,\n\nVi önskar skarp offert för ${projektnamn}. Återkom gärna för mer information eller platsbesök.\n\nKalkyl-PDF bifogas.\n\nVänliga hälsningar,\n${state.auth?.user || ''}`;
```

URL-koda båda (`encodeURIComponent`).

### 3.5 Konstant för mottagaradress

```js
const OFFERT_RECIPIENT = 'dennis@byggbiten.nu';
```

Överst i `app.js`. Trivialt att ändra om Dennis byter företagsmejl.

### 3.6 Felhantering

- Native `mailto` kan misslyckas (ingen default-klient). Ingen robust detektering möjlig.
- **Lösning:** `window.open(mailtoUrl)` + visa toast efter 2 s "Om ingen mejlapp öppnades, välj Gmail eller Outlook istället."
- Gmail/Outlook öppnar alltid i ny flik — inga fel-scenarion.

### 3.7 Vad läggs till / ersätts

**Läggs till:**
- Modal `<div class="modal-backdrop" data-role="offert-modal">…</div>`.
- Handler `offert-save-pdf` → sätt `document.title` + `window.print()`.
- Handlers `offert-open-native` / `offert-open-gmail` / `offert-open-outlook`.
- Konstanter `OFFERT_RECIPIENT`, `sanitizeFilename`.

**Ersätts:** `window.alert('…')` raderas.

## 4. Verifiering (Del II)

1. Bygg en kalkyl, klicka "Begär offert" → modal öppnas med tre steg.
2. Klicka "Spara PDF" → utskriftsdialog → "Spara som PDF" → filnamn `Kalkylbudget_[projektnamn]_2026-04-22.pdf`.
3. Efter sparande: "✓ Sparat" intill knappen.
4. "Inbyggt mejl" → systemets default-klient öppnas med rätt mottagare/ämne/brödtext.
5. "Gmail" → Gmail-kompositionsflik öppnas i webbläsaren med förifyllda fält.
6. "Outlook" → Outlook-kompositionsflik öppnas likaså.
7. Stäng modal med × eller klick utanför → modal stängs, ingen dataändring.
8. Namn med Å/Ä/Ö/mellanslag → filnamn sanitizeras.
9. Testa på iOS Safari och Chrome Android.

---

# DEL III — Expanderbara poster (metadata: vad ingår / ingår ej / Wikells-ref)

## 1. Varför vi gör detta

HSB-handläggaren (eller privatkunden) ser att ekparkett kostar 825 kr/m² och undrar: *"Är det bara parketten eller ingår underlag och montering?"* Idag finns inget sätt att få svar utan att ringa Byggbiten. Det undergräver förtroendet för siffran.

Dennis vill att varje post ska gå att expandera för att visa **vad som ingår** (och **vad som inte ingår**), samt vilken Wikells-referens priset bygger på. Det gör kalkylen transparent — kunden vågar lita på överslaget utan att ringa.

**Konkret exempel:**
- Ekparkett 825 kr/m² → ingår: underlagspapp, lim, socklist, montering, städning. Ingår ej: flyttning av möbler, tröskel mot angränsande rum. Referens: Wikells 15.016.
- Takmålning → ingår: 1 strykning med vit takfärg. Ingår ej: spackel/grundning vid underbehandling.
- Badrum fallspackling → ingår: flytspackel med fall, primer, rengöring. Ingår ej: tätskikt (separat post).

Tidigare förslag om hover-tooltip är förkastat — fungerar dåligt på touch, plats för bara kort text, försvinner av sig själv. Klickbar expanderbar panel är bättre UX för både desktop och mobil.

## 2. Nuvarande beteende

- Item-raden: checkbox + label + pris/enhet + summa.
- Ingen info-ikon, ingen expanderbar vy, ingen referens till Wikells.
- Datafältet `info: { description: null, image: null }` finns på vissa items men används inte.

## 3. Förväntat beteende

### 3.1 Datamodell

Utöka `info`-fältet:

```js
info: {
  ingar: ['Underlagspapp 2 mm', 'Lim', 'Socklist 12 mm', 'Montering', 'Städning'],
  ingarEj: ['Flyttning av möbler', 'Tröskel mot angränsande rum'],
  wikellsRef: 'Wikells byggdel 15.016',
  image: null  // reserverat, används inte i v1
}
```

Items **utan** dessa data (eller med `info: null`) → ingen chevron, ingen expansion.

**Minsta uppsättning som ska ha info i v1** (Wikells-kalibrerade poster enligt OPEN_QUESTIONS Q10):

Golv: ekparkett (15.016), klickvinyl (15.018), heltäckningsmatta (15.020), klinker (15.015).
Inredning/dörr/fönster: ny innerdörr (16.056), måla befintlig innerdörr (14.048), måla fönster (14.047), garderob 60's (17.020).
Vägg: vägg kakel toalett (15.027), takmålning (14-serien), väggmålning (14-serien).
Badrum (v1.5): klinker våtrumsgolv (15.015), plastmatta golv (15.023), rivning badrum, fallspackling.

**Claude Code skriver första utkast** till `ingar`/`ingarEj` baserat på Wikells-recepten som finns dokumenterade i `data.js`-kommentarer och byggarfarenhet. Dennis granskar och rättar. Detta **blockerar inte** kodning — chevron-logiken måste fungera för tomt `info` utan att krascha.

### 3.2 Chevron-placering

```
┌────────────────────────────────────────────────────┐
│ ☑  Ekparkett              825 kr/m²   16 500 kr  ▾ │
└────────────────────────────────────────────────────┘
```

- **Längst till höger** på raden, bredvid summan.
- 32 × 32 px klickyta (tumme-vänlig).
- Ikon: unicode `▾` (expanderat: `▴`) eller SVG, 12px, muted color.
- **Egen klickyta** — får INTE trigga checkbox-toggle. `event.stopPropagation()` eller separat `data-action="toggle-details"`.
- Rotera 180° med CSS-transition vid expansion (≈150ms).

### 3.3 Expand-panel

Under raden, full bredd, animeras fram med `max-height` transition (≈200ms):

```
┌────────────────────────────────────────────────────┐
│ ☑  Ekparkett              825 kr/m²   16 500 kr  ▴ │
├────────────────────────────────────────────────────┤
│   INGÅR                                            │
│   • Underlagspapp 2 mm                             │
│   • Lim                                            │
│   • Socklist 12 mm                                 │
│   • Montering                                      │
│   • Städning                                       │
│                                                    │
│   INGÅR EJ                                         │
│   • Flyttning av möbler                            │
│   • Tröskel mot angränsande rum                    │
│                                                    │
│   Wikells byggdel 15.016                           │
└────────────────────────────────────────────────────┘
```

Stil:
- Bakgrund aningen ljusare än radens (t.ex. `#f7f7f7`).
- Padding: 12px 16px 16px 48px (indraget mot checkbox-kolumnen).
- Etiketter "INGÅR" / "INGÅR EJ": 11px, uppercase, letter-spacing 0.5px, semibold, muted.
- Bullet-listor: 14px, normal.
- Wikells-referens: 12px, muted, längst ned.
- Avstånd mellan sektioner: 12px.

### 3.4 State

```js
state.expandedItems = new Set();  // strängar med item.id
```

- Klick på chevron: `state.expandedItems.add/delete(item.id)` + re-render.
- Nollställs **endast** vid vyväxling (spara-dialog, hemvy, offert-modal) — inte vid ändring av antal, rumsvärden eller checkbox.
- Persisteras **inte** i localStorage. Session-bunden.

### 3.5 Integration med print-layout (Del I)

Print-layoutens Kod-kolumn extraherar från `info.wikellsRef` via `extractWikellsId()`. Expand-panelerna själva visas **inte** i print (se § 3.4 i Del I: `display: none !important`).

### 3.6 Klick-hantering

Viktigt: chevron-knappen får egen `data-action`, t.ex. `data-action="toggle-item-details"`, och i handlern:

```js
if (actionName === 'toggle-item-details') {
  event.stopPropagation();  // hindra row-click-handlern
  const id = el.dataset.itemId;
  if (state.expandedItems.has(id)) state.expandedItems.delete(id);
  else state.expandedItems.add(id);
  render();
  return;
}
```

## 4. Verifiering (Del III)

**Positiv:**
1. Golv-sektion: ekparkett, klickvinyl, heltäckningsmatta, klinker har alla chevron `▾` till höger.
2. Klicka chevron på ekparkett → panel glider ut med INGÅR/INGÅR EJ/Wikells-referens.
3. Chevron roterar till `▴`.
4. Klicka igen → panel fälls ihop, chevron tillbaka till `▾`.
5. Expandera tre poster samtidigt → alla öppna tills individuellt stängs.
6. Växla vy (t.ex. begär offert → avbryt) → alla expand-paneler är stängda.
7. Klicka själva raden (inte chevron) → checkbox togglas, panelen påverkas inte.

**Negativ:**
1. Post utan `info.ingar` visar **ingen** chevron.
2. Klick på chevron triggar **inte** checkbox-toggle.
3. Dubbelklick på chevron förstör inte state.
4. Expansion påverkar **inte** totalberäkningen.
5. På 375px bredd: chevron träffbar med tumme, panel bryter inte layouten.
6. Tom `info: { ingar: [], ingarEj: [], wikellsRef: '' }` (objektet finns men är tomt) — **ingen** chevron (kräver minst en `ingar`-post ELLER `wikellsRef` för att motivera chevron).
7. Print-knapp med öppen panel → panel visas inte i print.

---

# DEL IV — Gråade summor när posten är inaktiv

## 1. Varför vi gör detta

Idag visas summa-kolumnen i samma svarta färg oavsett om posten är ikryssad. Det är svårt att snabbt skanna vad som faktiskt räknas med i kalkylen. När man avkryssar en post blir summan "0 kr" men i full svart — ser ut som att den fortfarande bidrar.

Fix: summa-siffran gråas ut när posten inte bidrar till totalen. Gör totalsammanställningen visuellt mer pålitlig.

## 2. Nuvarande beteende

Summa-siffran visas i `color: var(--color-text)` oavsett state. Gäller checkbox-items, `hasCount`-items (innerdörr/fönster/garderob) när `count === 0`, radio-grupp-medlemmar som inte är valda, och rumsföljeposter vid inaktiva rum.

## 3. Förväntat beteende

### 3.1 Definition av "bidrar inte"

| Item-typ | Villkor för grå summa |
|---|---|
| Checkbox-item (de flesta) | `item.checked === false` |
| `hasCount`-item (innerdörr, fönster, garderob) | `count === 0` |
| Radio-grupp-medlem (standard/plus-kök) | Raden är inte den valda i sin grupp |
| Rumsföljepost (skyddstäckning, rivning, fallspackling) | Rummet är inte aktivt eller yta = 0 |

### 3.2 Visuell stil

```css
/* Aktiv */
.item-sum         { color: var(--color-text); }

/* Inaktiv */
.item-sum.muted   { color: var(--color-text-muted); /* ≈ #9a9a9a */ }
```

**Endast summa-siffran** gråas — etiketten, priset/enheten och chevron (från Del III) påverkas inte.

### 3.3 Implementation

Lägg till/ta bort `.muted`-klassen i renderingen baserat på villkoret ovan. Görs i samma funktion som renderar item-raden — inga nya render-hooks.

## 4. Verifiering (Del IV)

1. Avkryssa ekparkett när den är aktiv → summan gråas ut direkt.
2. Kryssa den igen → summan blir svart igen.
3. Sätt antal innerdörrar till 0 → summan gråas ut.
4. Öka till 1 → summan blir svart.
5. I kök-sektionen, välj Standard → Plus-radens summa gråas ut (och vice versa).
6. Rumsföljepost (rivning badrum) när badrum-yta = 0 → summan gråas ut.
7. Gråad summa blir svart **direkt** vid reaktivering — ingen fördröjning.
8. Print-layouten påverkas **inte** av gråningen (alla kryssade poster visas i samma svart färg).

---

# Snabbreferens — berörda filer

| Del | Fil | Funktion / plats |
|---|---|---|
| I | `src/index.html` | `<div id="print-layout">` + `<img class="print-logo">` |
| I | `src/style.css` | `@media print` + `.print-*`-klasser |
| I | `src/app.js` | `buildPrintData`, `renderPrintLayout`, `extractWikellsId`, `CUSTOMER_INFO`, `beforeprint`-listener |
| II | `src/app.js` | Offert-modal, `offert-save-pdf`/`offert-open-*`-handlers, `OFFERT_RECIPIENT`, `sanitizeFilename` |
| II | `src/style.css` | Offert-modal-styling (återanvänder `.modal-backdrop`) |
| III | `src/data.js` | `info: { ingar, ingarEj, wikellsRef, image }` på minst 14 items |
| III | `src/app.js` | `state.expandedItems`, `toggle-item-details`-handler, expand-panel-rendering |
| III | `src/style.css` | `.item-chevron`, `.item-details-panel`, rotation-animation |
| IV | `src/app.js` | `.muted`-klass-logik i item-rendering |
| IV | `src/style.css` | `.item-sum.muted` |

---

# Plan innan kod

Innan en rad kod rörs — redovisa en kort plan (10–15 meningar) som svarar på:

1. **Ordning:** Rekommendation: **III (datamodell + chevron, grundlägger `wikellsRef` som Del I använder) → I (print-layout) → IV (gråade summor, liten) → II (offertflöde, använder print från Del I)**.
2. **Del I:** `#print-layout` statiskt i index.html eller dynamiskt genererat i JS? Motivera.
3. **Del I:** `CUSTOMER_INFO`-konstanten — var placeras den och hur dokumenteras den som TODO för multi-kund-stöd?
4. **Del I:** Hur hanteras rum utan yta (övriga-rum) i tabell-kolumnen "Enh"?
5. **Del II:** Fil-sparnings-flödet — säker på att `document.title`-hacket fungerar i Chrome/Firefox/Safari? Finns fallback?
6. **Del II:** Hur hanteras felscenario där native `mailto` inte öppnar någon klient?
7. **Del III:** `ingar`/`ingarEj`-utkast — skriver du dem baserat på Wikells-kommentarer i data.js + sunt förnuft, eller väntar du på att Dennis skriver först? Rekommendation: **du skriver utkast, Dennis granskar efter**.
8. **Del III:** Hur säkerställer du att chevron-klick INTE triggar row-click? `stopPropagation` eller separat `data-action`?
9. **Del III:** `state.expandedItems` — persistera till localStorage eller rent session-bunden? Rekommendation: **session-bunden**.
10. **Del IV:** Finns det fall där "bidrar inte till totalen" är svårt att avgöra (t.ex. tillvals-poster som alltid syns men bara bidrar vid viss vald variant)?
11. **Tester:** vad kör du lokalt före klart-rapport? Minst: `node --check` på alla JS-filer, manuell UI-test, print-preview-verifiering, Gmail/Outlook-URL öppnas i ny flik.
12. **Dokumentation:** vilka `.project-context/`-filer uppdateras? (DESIGN.md §2 datamodell + §5 UI + §6 print-layout; DECISIONS.md 2026-04-22-entry; sessionsrapport i `sessions/`).

Vänta på Dennis bekräftelse av planen innan kod skrivs.

---

# SAMLAD STARTPROMPT (klistras in i Claude Code)

```
Läs .project-context/prompts/2026-04-22-pdf-offert-expand-gray.md noggrant
— fyra sammanhängande delar:

  Del I   — PDF-export som "Kalkylbudget", dedikerad @media print-layout
            matchad mot Byggbiten-offertmall.
  Del II  — "Begär offert"-flöde: modal med spara-PDF-steg + mejlprogram-picker
            (native / Gmail / Outlook) + förifyllt mejl till dennis@byggbiten.nu.
  Del III — Expanderbara poster: chevron ▾ på varje rad, klick fäller ut panel
            med INGÅR / INGÅR EJ / Wikells-ref. Datamodell utökas med
            info: { ingar, ingarEj, wikellsRef, image }.
  Del IV  — Gråade summor: .muted på .item-sum när posten inte bidrar
            (avkryssad, count=0, oval radio, inaktivt rum).

Läs också .project-context/DESIGN.md §2 (datamodell) och §5 (UI), samt
OPEN_QUESTIONS.md Q10 för Wikells-kalibrering.

Redovisa sedan en samlad implementationsplan som svarar på:

1. Ordning? Rekommendation: III → I → IV → II.
2. Del I: #print-layout statiskt i index.html eller dynamiskt?
3. Del I: CUSTOMER_INFO-placering + TODO-dokumentation?
4. Del I: rum utan yta — hur hanteras Enh-kolumnen?
5. Del II: document.title-hacket — fungerar på alla browsers? Fallback?
6. Del II: native mailto-felscenario?
7. Del III: ingar/ingarEj-utkast — du skriver eller Dennis? Rekommendation: du.
8. Del III: chevron-klick isolerat från row-click — hur?
9. Del III: expandedItems persistas till localStorage? Rekommendation: nej.
10. Del IV: edge cases för "bidrar inte till totalen"?
11. Vilka lokala tester före klart-rapport?
12. Vilka .project-context/-filer uppdateras?

Vänta på Dennis bekräftelse av planen innan kod skrivs.
```
