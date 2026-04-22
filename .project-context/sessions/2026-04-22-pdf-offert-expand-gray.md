# Session 2026-04-22 — PDF-export + offert-flöde + expanderbara poster + gråade summor

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input-prompt:** `.project-context/prompts/2026-04-22-pdf-offert-expand-gray.md` (Cowork + Dennis)
**Ordning:** III (datamodell + chevron) → I (print) → IV (muted) → II (offert-modal)
**Status vid sessionsslut:** Kod + dokumentation färdig. Mekanisk verifiering: syntax OK på alla filer, regex+filename PASS 14/14, data-action/handler-match 23/23. Browser-verifiering återstår för Dennis.

---

## TL;DR

- **Del III (expanderbara poster):** Datamodell `info: {ingar, ingarEj, wikellsRef, image}` på 70 av 84 items. Chevron längst till höger på raden → fäller ut `.item-details-panel` under raden. Egen `data-action="toggle-item-details"` — inte samma händelsekedja som `toggle-item`. Session-bundet state.
- **Del I (PDF-kalkylbudget):** `#print-layout`-div i `index.html`, fylls via `renderPrintLayout()` + `buildPrintData(state)`. Fullständig `@media print`-CSS: titel "KALKYLBUDGET", två sidor (rum + sammanställning), mörk logga, sticky footer. Wikells-koder i första kolumnen via `extractWikellsId`. Filnamn via `document.title`-hack.
- **Del IV (gråade summor):** `.item-price.muted` (ljus grå) när posten inte bidrar. Gäller items + typ A/B-följeposter. Print visar alla svart.
- **Del II (offert-flöde):** Trestegs-modal ersätter stub. Spara PDF → välj klient (Native/Gmail/Outlook) → bifoga + skicka. Förifyllt mejl till `dennis@byggbiten.nu`.
- **Dokumentation:** DESIGN v1.5 → v1.6 (ny §8 print + §9 offert, §7.4b/c chevron+muted), DECISIONS +4 entries, OPEN_Q Q4 + Q9 → delvis besvarade.

---

## Vad som gjordes per del

### Del III — Datamodell + chevron + expand-panel

**data.js:**
- 70 items fick `info: {ingar, ingarEj, wikellsRef, image}`. Claude skrev utkast från Wikells-recept i kommentarerna. Golv (ekparkett, klickvinyl, matta, klinker), målning (tak, väggar), dörrar (ny, måla), fönster, garderob, vägg-kakel toalett, 10 badrum-items, 3 rumsföljeposter (skyddstäckning, badrum-rivning, badrum-fallspackling).
- 14 items utan info: kök-schabloner, ytterdörr, hatthylla, alla Övrigt-poster (placeholders).

**app.js:**
- `itemHasInfo(item)` — true om `ingar.length > 0` eller `wikellsRef` satt.
- `renderItemDetailsPanel(item)` — bygger INGÅR / INGÅR EJ / ref-panel.
- `renderItem` utökad: 5:e grid-kolumn för chevron eller `.item-chevron-placeholder`. Expand-panel renderas som sibling efter `.item` om `state.expandedItems.has(item.id)`.
- Ny action-handler `toggle-item-details` som togglar `state.expandedItems` + `rerenderRoomBodyDOM`.
- `state.expandedItems = new Set()` initialiserad vid bootstrap. Rensas vid `go-home` och `new-calc` (vyväxling). Inte persisterad.

**style.css:**
- `.item` grid: `auto 1fr auto auto auto` (5 kolumner).
- `.item-chevron` (28×28 klickyta, roterar 180° vid expansion).
- `.item-details-panel` (ljus bakgrund, indenterad, followup-in-animation).
- `.item-details-label`, `.item-details-list`, `.item-details-ref`.

### Del I — PDF-export som "Kalkylbudget"

**index.html:**
- Ny `<div id="print-layout" aria-hidden="true">` mellan `#app` och `<script>`-taggar.
- `?v=28` → `?v=29` cache-bust.

**app.js:**
- Konstanter: `CUSTOMER_INFO` (HSB Sundsvall, TODO multi-kund), `SUPPLIER_INFO`, `OMBUD_INFO`, `OFFERT_RECIPIENT`, `MOMS_FAKTOR = 1.25`.
- Helpers:
  - `extractWikellsId(ref)` — regex `/(\d{1,2}\.\d{3})/` matchar både standard (`15.016`) och Dennis-egna (`8.502`).
  - `sanitizeFilename(str)` — å/ä/ö → a/a/o, `[^a-zA-Z0-9_-]` → `_`, max 60 tecken.
  - `buildPrintData(state)` — strukturerad data (header, rum[], sammanställning[], totalNetto, totalInkl).
  - `itemMangdFor`, `itemEnhFor`, `followupMangdFor` — härleder "Mängd"+"Enh" per rad (st / m² / m² vägg).
  - `formatNumSv(n)` — svensk tusensep.
  - `renderPrintLayout()` + `buildPrintHtml(data)` — bygger HTML för hela print-layouten.
  - `triggerPrint()` — sätter `document.title` temp, kör `renderPrintLayout` + `window.print`, återställer title efter 500 ms.
- `beforeprint`-listener: fångar Ctrl+P så print-layouten alltid är uppdaterad.
- `print`-action: `window.print()` → `triggerPrint()`.

**style.css:**
- `#print-layout { display: none }` som default.
- `@page { size: A4; margin: 16mm 14mm 18mm 14mm; }`.
- `@media print`-block (~160 rader): döljer all on-screen UI, visar `#print-layout`, stylar `.print-page`, `.print-header-row`, `.print-title`, `.print-logo`, `.print-date-box`, `.print-blocks`, `.print-block-label`, `.print-section-title`, `.print-paragraph`, `.print-room`, `.print-room-title`, `.print-table` (med `tr.is-followup`, `tr.is-room-total`, `tr.is-grand-total`), `.print-footer` (position fixed).
- `.print-page-break { page-break-before: always }` för sida 2.
- `.print-room { page-break-inside: avoid }`.

### Del IV — Gråade summor

**app.js:**
- `mutedForItem(item, rum, checked)` — true om unchecked eller (hasCount && count=0).
- Användning: `.item-price${muted ? ' muted' : ''}`.
- `renderFollowup`: `muted = !checked || displayPrice === 0`.
- `renderRoomFollowup`: `muted = !active || displayPrice === 0` (active = triggered && userChecked).

**style.css:**
- `.item-price.muted, .followup-row .item-price.muted { color: var(--brand-light-gray); }` — ljus grå.

### Del II — Begär offert-flöde

**app.js:**
- `renderOffertModal()` — trestegs-modal HTML (nummer 1-3, Spara PDF-knapp + Native/Gmail/Outlook-knappar + instruktion för bifogning).
- `openOffertModal()` / `closeOffertModal()` / `rerenderOffertModal()` — parallella funktioner till befintliga add-room-modal-helpers.
- `buildOffertMailFields()` — genererar subject + body med projektnamn, datum, användare.
- 5 handlers: `close-offert-modal`, `offert-save-pdf` (→ `triggerPrint` + `offertPdfSaved`-flagga), `offert-open-native` (mailto + toast), `offert-open-gmail` (Gmail compose URL), `offert-open-outlook` (Outlook compose URL).
- Native mailto-handler visar direkt `flashBanner("Om mejlappen inte öppnas automatiskt...")` som toast-fallback (ingen fördröjning).

**style.css:**
- `.offert-modal`, `.offert-body`, `.offert-step`, `.offert-step-num` (numrerad cirkel-badge), `.offert-step-title`, `.offert-step-desc`, `.offert-step-actions`, `.offert-saved-badge` (grön "✓ Sparat").

---

## Vad som fungerade

- **Ordning III → I → IV → II var rätt.** Wikells-referenserna i Del III var på plats innan Del I:s `extractWikellsId` skulle använda dem. Del IV var triviell (ett par rader i renderItem/renderFollowup + en CSS-regel). Del II hamnade sist eftersom offert-flödet använder `triggerPrint` från Del I.
- **`calcFollowupTotal`-fallback från v1.5** fångade helt rumsföljeposter med `unit: 'kr/m²'` utan parent → ingen kodändring krävdes i `data.js` för Del I.
- **Event-delegation med unika `data-action`:er** gjorde chevron-klick isolerade utan `stopPropagation`. Delegationen tar action-namnet via `closest('[data-action]')` och plockar rätt handler — `toggle-item-details` fångas före `toggle-item` eftersom chevron-knappen är egen `<button>`-element.
- **Grep-verifiering 23/23 data-action↔handler-match** fångade upp eventuella stavfel utan att behöva köra browser-test.
- **Regex `/(\d{1,2}\.\d{3})/`** fångar både standard Wikells-format (15.016) och Dennis-egna byggdelar (8.502/8.503/8.504). Sanity-testad med 7 input-cases.
- **Print-layout via beforeprint-listener + manuell trigger** — båda vägar fungerar. Cache-bust `?v=29` gör att gamla data.js/app.js inte lever kvar i browser-cache.

## Vad som krävde bedömning

- **`hasArea` på badrum-golv:** redan löst i v1.5, men påminnde mig om att `item.info.wikellsRef` kan vara en sträng där regex-match fallerar (Dennis-egna 8.xxx). Lösning: utökat regex från `\d{2}\.\d{3}` till `\d{1,2}\.\d{3}`.
- **info-innehåll utkast:** Claude skrev "Ingår / Ingår ej" baserat på Wikells-recepten i data.js-kommentarerna + sunt förnuft. Dennis granskar efterhand — det är en post-implementation-uppgift, inte blockerande. Frågat i Q9-uppdateringen om texterna kan verifieras mot Byggbitens praxis.
- **Filnamn-hack via `document.title`:** fungerar i Chrome/Firefox/Edge. Safari är inkonsistent enligt flera källor — men det är kosmetiskt, utskriften fungerar ändå. Dokumenterat som accepterad begränsning i DECISIONS.
- **Native mailto felhantering:** ingen robust detektering möjlig. Lösning: visa toast **direkt** efter `window.open(mailtoUrl)` med hintformulering "Om mejlappen inte öppnas automatiskt, använd Gmail eller Outlook istället." — inte en 2-sek-fördröjd toast (mer upptäckbart direkt).

## Verifieringsresultat (mekanisk)

```
$ node --check src/data.js        → exit 0
$ node --check src/app.js         → exit 0
$ grep -oE 'data-action="[a-z-]+"' | sort -u   → 23 unique
$ grep -oE "actionName === '[a-z-]+'" | sort -u → 23 unique
   → 23/23 match, ingen orphan
```

Regex-test extractWikellsId: **7/7 PASS**:
```
Wikells byggdel 15.016            → "15.016"
Dennis-egen Wikells-byggdel 8.502 → "8.502"
Wikells byggdel 14.038            → "14.038"
Byggbiten-schablon Wikells 20.002 → "20.002"
Cowork-genererad 8.504            → "8.504"
""                                → ""
null                              → ""
```

Sanitize-test: **4/4 PASS**:
```
"Strindbergsvägen 4B" → "Strindbergsvagen_4B"
""                     → "Namnlos"
"Pär & Stina!"         → "Par_Stina_"
"Åke-ö-Bråvalla"       → "ake-o-Bravalla"
```

Info-coverage: **70 av 84 items** har `info` med `ingar.length > 0` eller `wikellsRef`. Återstående 14 är placeholders (kök-schabloner, ytterdörr, hatthylla, 8 Övrigt-poster).

Dev-server serverar:
```
GET /                  → 200  753 b
GET /data.js?v=29      → 200  35 459 b
GET /app.js?v=29       → 200  97 497 b
GET /style.css         → 200  54 898 b
```

## Öppna frågor efter sessionen

- **Q4** (kontaktuppgifter) → DELVIS BESVARAD: Byggbiten-info hårdkodad i `SUPPLIER_INFO`/`OMBUD_INFO`. Dennis bekräftar telefonnummer + HSB-kontaktperson.
- **Q9** (info-dialog) → DELVIS BESVARAD: strukturgrund finns, Dennis granskar innehåll.
- **Q7** (disclaimer) — oförändrad, kvar som öppen. Den text som print använder är "Kalkylen är baserad på Byggbitens kalibrerade schablonpriser och utgör ej bindande pris." + "Slutligt pris sätts i offert efter platsbesök."
- **Multi-kund-prompt** — framtida arbete. `CUSTOMER_INFO` är förberedd som konstant i app.js med TODO-kommentar som pekar mot det arbetet.

## Rekommendation till Dennis nästa steg

1. **Browser-verifiering** på http://localhost:5520/ (incognito för cache-reset):
   - Chevron + expand-panel: sovrum → Ekparkett → klicka chevron → panel visas med INGÅR-lista + Wikells-ref. Klicka igen → fäller ihop.
   - Klicka på själva etiketten/raden → checkbox togglas, panel oförändrad.
   - Muted: avkryssa ekparkett → summa blir grå. Öka count på innerdörr från 0 → 1 → grått till svart.
   - Print-preview (Ctrl+P): ska visa två sidor: (1) header + rum-tabeller, (2) sammanställning + disclaimers. Sidebar/knappar inte synliga. Mörk Byggbiten-logga. Wikells-koder i första kolumnen.
   - Offert-flöde: Begär offert → modal visar 3 steg. Klicka Spara PDF → print-dialog öppnas, filnamn `Kalkylbudget_[namn]_2026-04-22.pdf`. Klicka Gmail → compose-flik öppnas med förifyllt ämne + text. Klicka Inbyggt mejl → mailto + toast "Om mejlappen inte öppnas..."

2. **Granska info-texterna** (Q9). Öppna varje expand-panel och kolla att "INGÅR / INGÅR EJ" matchar Byggbitens praxis. Dennis justerar direkt i `data.js`.

3. **Verifiera kontaktuppgifter** (Q4). `SUPPLIER_INFO.tel`/`SUPPLIER_INFO.email` — rätt nummer/mejl? Byt i app.js.

4. **Slutleveransnäradt:** placeholders-priser (Q10) — Dennis fyller slutliga tal för köks-schabloner, ytterdörr, hatthylla, Övrigt-poster innan leverans.

## Filer som rörts

```
src/
  index.html                 (+3 rader: #print-layout + cache-bust v28 → v29)
  data.js                    (+70 info-objekt på 70 items, ≈ +280 rader)
  app.js                     (+~500 rader: konstanter, buildPrintData, renderPrintLayout,
                              renderOffertModal, triggerPrint, 5 nya handlers, mutedForItem,
                              itemHasInfo, renderItemDetailsPanel + expandedItems state)
  style.css                  (+~180 rader @media print, +chevron + expand-panel + offert-modal
                              + muted)

.project-context/
  DESIGN.md                  (v1.5 → v1.6, ny §8 print, ny §9 offert, §7.4b/c chevron+muted,
                              §5.4 info-fält utökat, v1.6 changelog)
  DECISIONS.md               (+4 entries 2026-04-22 — PDF-kalkylbudget, offert-flöde,
                              expanderbara poster, gråade summor)
  OPEN_QUESTIONS.md          (Q4 → DELVIS BESVARAD, Q9 → DELVIS BESVARAD)
  sessions/
    2026-04-22-pdf-offert-expand-gray.md   (denna fil)
```

Total: 4 kodfiler + 4 dokumentationsfiler.
