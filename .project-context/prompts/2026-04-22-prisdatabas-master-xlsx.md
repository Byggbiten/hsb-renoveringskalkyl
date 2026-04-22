# Master-Excel som pris- och post-databas

**Datum:** 2026-04-22
**Typ:** Arkitekturändring (stor)
**Omfattning:** Fas 1 + Fas 2 på en gång — bygg master.xlsx OCH refaktorera appen att läsa från den.
**Förutsättning:** Prompt `2026-04-21-fix-datajs-avbruten.md` ska köras FÖRST om `src/data.js` fortfarande är trunkerad. Verifiera med `node --check src/data.js` och `wc -l src/data.js` (ska vara >500 rader när den är komplett).

---

## §1 Varför vi gör detta

Idag finns alla priser, poster, rumstyper, följeposter, mappningar, radio-grupper och metadata hårdkodade i `src/data.js`. Det fungerar men har växt till en punkt där det är ohållbart:

- **Dennis kan inte själv uppdatera priser.** Han är projektledare, inte utvecklare, och vill äga pris-data i Excel-format.
- **Priserna kommer från flera källor** (Wikells Sektionsdata, Byggbiten-erfarenhet, HSB-förhandlade priser, Beijer-offerter, placeholders). Det finns ingen tydlig spårbarhet mellan pris och källa.
- **När Wikells släpper ny version** (1–2 ggr/år) behövs en strukturerad process för att jämföra gamla vs nya priser och selektivt uppdatera.
- **Relationer är svåra att läsa ut** — vilken post hör till vilken rumstyp, vilken är följepost till vilken, vilka är i samma radio-grupp, vilken är placeholder.

Lösningen: **En master-Excel äger all pris- och post-data.** Appen bygger sin konfiguration från Excelen via ett build-script. När Dennis ändrar i Excelen och refreshar appen ser han sina ändringar. När Wikells uppdaterar priser laddar Dennis ned en ny wbr, skickar till agent som diffar mot master-Excelen och applicerar valda ändringar.

**Kritisk notering:** Detta är en stor refaktor. Den bryter appen om master.xlsx är felaktigt strukturerad. Validera HÅRDA vid build — hellre att build failar med tydligt felmeddelande än att appen laddas med trasig data.

---

## §2 Nuvarande beteende

### 2.1 Datamodell i data.js

`src/data.js` exporterar ett globalt `window.APP_DATA`-objekt med:

- `ROOM_TYPES` — dictionary med 8 rumstyper (`vardagsrum`, `sovrum`, `hall`, `kok`, `badrum`, `toalett`, `entre`, `ovrigt`).
- Hjälpfunktioner: `calcItemTotal`, `calcWallArea`, `calcPerimeter`, `syncFollowups`, `reducedFloorArea`, `todayIso`.

Varje rumstyp har:
```js
{
  displayName: 'Sovrum',
  defaultArea: 15,             // default golvyta i m²
  type: 'per_post',            // eller 'schablon' (ingen används idag)
  icon: ICON_SOVRUM,           // inline SVG-sträng
  hideArea: false,             // Övrigt = true (inga m², bara styck)
  items: [GOLV_EKPARKETT, ...],      // lista av post-objekt
  roomFollowups: [SKYDDSTACKNING_FU], // lista av typ-B-följeposter (rumsscope)
  defaultOnCreate: {           // överrider defaultvärden när rum av typen skapas
    innerdorr: { checked: true, count: 1 }
  }
}
```

### 2.2 Post-objekt-struktur

Varje item (post) kan ha följande fält:

| Fält | Typ | Beskrivning |
|---|---|---|
| `id` | string | Unik post-ID, t.ex. `'golv_ekparkett'` |
| `label` | string | Visas i UI |
| `price` | number | Pris per enhet i kr (ex. moms) |
| `unit` | string | Enhetsetikett: `'kr/m²'`, `'kr/st'`, `'kr/m² vägg'`, `'schablon'`, `'kr/m'` (ny för socklar) |
| `category` | string | UI-sektion: `'Golv'`, `'Målning'`, `'Vägg'`, `'Tillval'`, `'Inredning'`, osv. |
| `group` | string (opt) | Radio-grupp-nyckel. Poster med samma `group`-värde i samma rumstyp är ömsesidigt uteslutande. T.ex. alla golv i sovrum har `group: 'golv'`. |
| `hasCount` | boolean (opt) | Posten har antal (input-fält), inte yta. Används för st-poster. |
| `hasArea` | boolean (opt) | Posten har egen yta (input-fält), inte rumsyta. T.ex. kakelväggar i badrum. |
| `wallCalc` | boolean (opt) | Yta räknas automatiskt som `calcWallArea(rum.yta, rum.takhojd) = 4 × √yta × takhöjd`. Används för väggmålning och sockel/taklist (men för dessa blir det bara omkretsen, se §3.2). |
| `reducesFloor` | boolean (opt) | Inte använd direkt idag — istället används via `group: 'golv'` + följepost-arv. Men fältet finns som konceptuellt flagg. |
| `placeholder` | boolean (opt) | Posten visas med "Preliminärt pris"-tagg. För kök-standard/plus, hatthylla, etc. |
| `info` | object (opt) | Expanderbar panel-data: `{ ingar: [], ingarEj: [], wikellsRef: '', image: null }`. Används av chevron-expand-flödet. |
| `followups` | array (opt) | Lista av typ-A-följeposter (per-parent, se §2.3). |

### 2.3 Följeposter

**Typ A (per-parent, indenterat under förälder):** definieras på item-nivå via `followups:[]`. Exempel: rivning och spackling följer med golv-posten.
```js
{
  id: 'golv_ekparkett__rivning',
  label: 'inkl. rivning av befintligt golv',
  price: 95, unit: 'kr/m²',
  defaultChecked: true,
  inheritsReducesFloor: true,   // mängd = reducerad golvyta
  inheritsParentArea: false     // mängd = parent.area (för hasArea-poster)
}
```
Rad-rendering: typ A visas indraget **direkt under** föräldraposten.

**Typ B (rums-scope, triggas av andra items):** definieras på rumstyp-nivå via `roomFollowups:[]`. Exempel: skyddstäckning triggas om någon målningspost är vald.
```js
{
  id: 'skyddstackning',
  label: 'Skyddstäckning',
  price: 450, unit: 'schablon',
  defaultChecked: true,
  triggeredBy: ['malning_tak', 'malning_vagg'],
  renderInCategory: 'Målning',
  info: { ... }
}
```
Rad-rendering: typ B renderas som egen rad i `renderInCategory`-sektionen. Dimmas (muted) om ingen trigger är vald.

### 2.4 Radio-grupper (ömsesidigt uteslutande poster)

När flera items har samma `group:`-värde inom en rumstyp renderas de som radio-knappar istället för checkbox (t.ex. GOLV_EKPARKETT, GOLV_KLICKVINYL, GOLV_MATTA i sovrum — `group: 'golv'`).

**OBS:** `group` är per rumstyp — en post kan vara radio-medlem i ett rum och fristående i ett annat. (I praktiken är alla golv alltid radio idag.)

### 2.5 Beräkning

`calcItemTotal(item, valt, rum)` räknar ut kostnaden:
- Om `hasCount`: `price × count`
- Om `hasArea`: `price × area`
- Om `wallCalc`: `price × calcWallArea(rum.yta, rum.takhojd)`
- Annars: `price × rum.yta`

Följeposters mängd räknas i `followupMangdFor(fu, parentItem, rum, parentValt)`:
- `kr/m² × inheritsReducesFloor` → reducerad golvyta
- `kr/m² × inheritsParentArea` → parent.area (för hasArea-parent)
- `kr/m² × annars` → rum.yta
- `schablon` → 1 (alltid en gång per rum)

### 2.6 Fil-struktur idag

```
src/
├── index.html
├── style.css
├── app.js            — UI, events, rendering
├── data.js           — ROOM_TYPES + helpers (ca 600 rader)
└── dev_server.py     — enkel Python HTTP-server
```

Leverans: allt inlinas i `dist/renoveringskalkyl.html` (build-steg existerar inte ännu, kommer skapas i denna prompt).

---

## §3 Förväntat beteende

### 3.1 Filstruktur efter refaktor

```
.project-context/
└── data/
    ├── master.xlsx              ← SANNINGSKÄLLAN (Dennis redigerar)
    ├── app-config.json          ← Genererad från master.xlsx (commitad)
    └── snapshots/               ← CSV-per-flik för git-diff
        └── YYYY-MM-DD/
            ├── priser.csv
            ├── rumstyper.csv
            ├── rum-poster.csv
            └── wbr-byggdelar.csv

scripts/
├── build-config.js              ← xlsx → app-config.json + snapshots
└── build-dist.js                ← inline app-config.json i dist-HTML

src/
├── index.html
├── style.css
├── app.js
├── data.js                      ← förenklat: laddar JSON, exponerar helpers
└── dev_server.py
```

**Beroenden:** `npm install` för `xlsx` (SheetJS, läs Excel i Node). Lägg till `package.json` om inte finns. `xlsx` är det enda tunga beroendet. Inga andra.

### 3.2 Master.xlsx — fem flikar

**ALLA kolumner ska vara noggrant namngivna. Build-scriptet läser via kolumnnamn, inte position.** Första raden i varje flik = kolumnrubriker. Font: Arial. Frys översta raden.

#### Flik 1: **Priser**

Varje rad = en unik post i appen (både Wikells-härledda och egna).

| Kolumn | Typ | Tillåtna värden / format | Exempel |
|---|---|---|---|
| `Post-ID` | text (unik) | snake_case | `golv_ekparkett`, `sockel`, `badrum_vagg_kakel` |
| `Kategori` | text (dropdown) | `Golv`, `Vägg`, `Tak`, `Lister`, `Målning`, `Tillval`, `Inredning`, `Rivning`, `Förberedelse`, `UE`, `Övrigt` | `Golv` |
| `Etikett` | text | **Visningsnamn i appen** (vad slutkund ser). Dennis redigerar. | `Ekparkett` |
| `Wikells originalnamn` | text | **Auto-fylls av initial-extraktor från wbr `<Identitet>`-fältet.** Används INTE i appen — bara för källspårning parallellt med `Wikells-artiklar (rå)`. För egna poster (Byggbiten, HSB-förhandlat, Beijer): lämna tom. | `Ekparkett på golv` |
| `Enhet` | text (dropdown) | `kr/m²`, `kr/st`, `kr/m² vägg`, `kr/m`, `schablon` | `kr/m²` |
| `Pris (kr)` | number ELLER formel | Se §3.3 | `=H2*I2 + J2*930 + K2*1.1` eller `825` |
| `Pris-källa` | text (dropdown) | `Wikells`, `Byggbiten`, `HSB-förhandlat`, `Beijer`, `Placeholder` | `Wikells` |
| `Wikells-ID` | text | Format `kap.nnn` eller tomt. Slår upp pris i Flik 4. | `15.016` |
| `Mtrl (kr)` | number | Materialpris per enhet (Wikells). Används i formel-pris. | `487` |
| `Tim (h)` | number | Timmar per enhet (Wikells). Används i formel-pris. | `0.29` |
| `UE (kr)` | number | Underentreprenör per enhet (Wikells). Används i formel-pris. | `0` |
| `Spillfaktor` | number | Defaultvärde 1.0. Wikells-artiklar har ofta 1.07–1.1. | `1.07` |
| `Beräkning-flaggor` | text (flerval, kommaseparerat) | `hasCount`, `hasArea`, `wallCalc`, `reducesFloor`, `placeholder` | `hasCount` |
| `Smart-mappning` | text | Fritext om posten ärver eller ersätter annan. | — |
| `Wikells-artiklar (rå)` | text (multiline) | **Auto-fylls av initial-extraktor från wbr.** Fulla Wikells-benämningar, semi-separerade. Används som REFERENS/källa — visas INTE i appen. | `Klinkerplatta vit glaserad 20x20 cm; Sättbruk C15 mineraliskt 25 kg; Fogmassa mineralfärgad cementbaserad; Klinkersockel H=100 vit glaserad` |
| `Ingår (visas i app)` | text (multiline) | Dennis förenkling — **detta är det som visas i expand-panelen i appen.** Kan kopieras/förenklas från Wikells-artiklar (rå). Semi-separerade. | `Klinkerplattor; Sättbruk och fog; Klinkersockel 10 cm` |
| `Ingår EJ (visas i app)` | text (multiline) | Vad som INTE ingår. Dennis fri text — ingen motsvarande källa i Wikells. | `Möbelflyttning; Tröskel mot angränsande rum` |
| `Wikells-ref (visningstext)` | text | Kort visnings-referens i expand-panelen. | `Wikells byggdel 15.016` |
| `Anmärkning` | text | Intern anteckning (visas inte i UI). | `Kalibrerad 2026-04-21` |

**Varför två kolumner på TVÅ nivåer — samma princip, olika nivå:**

| Nivå | Rå källspårning (auto) | UX-visning (Dennis redigerar) |
|---|---|---|
| **Byggdel** | `Wikells originalnamn` (t.ex. "Ekparkett på golv") | `Etikett` (t.ex. "Ekparkett") |
| **Artiklar** | `Wikells-artiklar (rå)` (t.ex. "Ekparkett 14 mm; Underlagspapp; Foam-underlag") | `Ingår (visas i app)` (t.ex. "Ekparkett 14 mm; Underlagspapp") |

- Wikells-benämningar är långa och tekniska ("Klinkerplatta vit glaserad 20x20 cm", "Ekparkett på golv") — olämpligt för slutkund (HSB-förvaltare).
- Men Dennis behöver se råa benämningar när han **granskar eller uppdaterar** — annars tappar vi spårbarhet mellan appens visade text och Wikells-källan.
- Initial-extraktor fyller ALLA fyra kolumnerna automatiskt. Dennis kan sedan förenkla `Etikett` och `Ingår (visas i app)` när han hinner.
- **Fallback om Dennis inte hunnit förenkla:** app.js använder `Etikett` direkt (aldrig `Wikells originalnamn`). Om `Ingår (visas i app)` är tom → visa `Wikells-artiklar (rå)` istället. Sämre UI men fungerande.
- **För egna poster** (Daloc-dörr, Beijer-offerter, Byggbiten-schabloner): `Wikells originalnamn` och `Wikells-artiklar (rå)` lämnas tomma. Bara `Etikett` + `Ingår (visas i app)` + `Ingår EJ` fylls.

**Formelpris (viktig):** för rader med `Pris-källa = Wikells` ska `Pris (kr)`-cellen vara en **formel** som räknar ur omkostnadsformeln:

```
Pris = Mtrl × Spillfaktor + Tim × 930 + UE × 1.10
```

där 930 = 250 × 3.72 (timkostnad inkl. påslag, per Wikells omkostnadskonfiguration per `DESIGN.md §5.2`). Detta ger transparens: Dennis ser vad som bygger priset och kan granska. Använd `xlsx`-pakets formelstöd (eller öppna i Excel och lägg in formler manuellt — se verifiering).

För `Byggbiten`, `HSB-förhandlat`, `Beijer`, `Placeholder`: hårdkoda värdet direkt i `Pris (kr)`. Mtrl/Tim/UE/Spillfaktor kan lämnas tomma.

#### Flik 2: **Rumstyper**

| Kolumn | Typ | Exempel |
|---|---|---|
| `Rumstyp-ID` | text (unik) | `sovrum` |
| `Visningsnamn` | text | `Sovrum` |
| `Default-yta (m²)` | number (eller tom om `hide-area`) | `15` |
| `Hide-area` | boolean (`ja`/`nej`) | `nej` |
| `Typ` | text (dropdown) | `per_post` (endast värdet som används idag) |
| `Ikon-ID` | text | Ska matcha konstant i data.js (`ICON_SOVRUM`). Se §3.4. |
| `Ordning` | number | Visningsordning i rumstypsväljaren |
| `Anmärkning` | text | Intern |

#### Flik 3: **Rum × poster** (mappningen — HJÄRTAT av app-konfigurationen)

Varje rad = en post-visning i en specifik rumstyp. En post som visas i 5 rum → 5 rader.

| Kolumn | Typ | Beskrivning / Exempel |
|---|---|---|
| `Rumstyp-ID` | text (FK → Flik 2) | `sovrum` |
| `Post-ID` | text (FK → Flik 1) | `golv_ekparkett` |
| `Ordning` | number | Ordning i UI inom rumstypen (10, 20, 30...) |
| `Radio-grupp` | text (opt) | Radio-nyckel. Tom = checkbox. T.ex. `golv`. Poster i samma radio-grupp i samma rumstyp är ömsesidigt uteslutande. |
| `Std-vald` | boolean (`ja`/`nej`) | Default-checked vid rum-skapande? |
| `Std-antal` | number (opt) | Default count (om `hasCount`). T.ex. 1 för innerdörr i sovrum. |
| `Följepost-typ` | text (dropdown) | Tom ELLER `A` (per-parent) ELLER `B` (rumsscope) |
| `Parent-Post-ID` | text (om typ A) | Post-ID för föräldern, t.ex. `golv_ekparkett`. |
| `Trigger-Post-IDs` | text (om typ B, kommaseparerat) | T.ex. `malning_tak,malning_vagg`. |
| `Rendera i kategori` | text (om typ B) | T.ex. `Målning`. Vilken UI-sektion följeposten syns i. |
| `Inherit reducesFloor` | boolean (om typ A) | `ja` = mängd är reducerad golvyta |
| `Inherit parentArea` | boolean (om typ A) | `ja` = mängd är parent.area |

**Exempel-rader för sovrum:**
```
sovrum | golv_ekparkett  | 10  | golv  | ja  | —   | —   | —              | —                  | —        | —     | —
sovrum | golv_klickvinyl | 11  | golv  | nej | —   | —   | —              | —                  | —        | —     | —
sovrum | golv_matta      | 12  | golv  | nej | —   | —   | —              | —                  | —        | —     | —
sovrum | floorRivningFU  | 13  | —     | ja  | —   | A   | golv_ekparkett | —                  | —        | ja    | nej
sovrum | floorRivningFU  | 14  | —     | ja  | —   | A   | golv_klickvinyl| —                  | —        | ja    | nej
sovrum | floorRivningFU  | 15  | —     | ja  | —   | A   | golv_matta     | —                  | —        | ja    | nej
sovrum | malning_tak     | 20  |       | nej | —   | —   | —              | —                  | —        | —     | —
sovrum | malning_vagg    | 21  |       | nej | —   | —   | —              | —                  | —        | —     | —
sovrum | skyddstackning  | 22  |       | ja  | —   | B   | —              | malning_tak,malning_vagg | Målning | — | —
sovrum | innerdorr       | 30  | innerdorr | nej | 1  | —   | —              | —                  | —        | —     | —
sovrum | innerdorr_malning | 31 | innerdorr | nej | —  | —   | —              | —                  | —        | —     | —
sovrum | fonster_malning | 40  |       | nej | —   | —   | —              | —                  | —        | —     | —
sovrum | garderob_60     | 50  |       | nej | —   | —   | —              | —                  | —        | —     | —
```

**Notera:** typ A-följeposter blir flera rader (en per förälder). Det är avsiktligt — samma post kan ha olika Std-vald eller Inherit-flaggor beroende på vilken förälder den hänger av. Typ B-följeposter har bara en rad per rumstyp (rumsscope = en gång).

#### Flik 4: **Wbr-byggdelar** (rå Wikells-data, arkiv för diff)

| Kolumn | Typ | Exempel |
|---|---|---|
| `Kapitel.Nummer` | text | `15.016` |
| `Identitet` | text | `Ekparkett på golv` |
| `Enhet` | text | `m²` |
| `Artiklar` | text (flera rader) | `H5.1731000 Ekparkett 14 mm (mtrl 487, tim 0.29); H5.xxx Underlagspapp (mtrl 12, ...)` |
| `Mtrl-summa` | number | 499 |
| `Tim-summa` | number | 0.29 |
| `UE-summa` | number | 0 |
| `Beräknat pris (kr)` | number / formel | `=E2*1 + F2*930 + G2*1.1` eller hårdkodat |
| `Senast uppdaterad` | date | `2026-04-22` |
| `Källa-wbr` | text (filnamn) | `HSB-3a-ROT-helrenovering-v6.wbr` |

Första versionen: populera från `.project-context/references/HSB-3a-kalkyl-sammanfattning.md` + wbr-filen (se §3.5 nedan). Totalt ~58 byggdelar. Flik 4 används INTE av appen direkt — den är underlag för framtida prisuppdateringar.

#### Flik 5: **Förklaring**

Dokumentation. En sida med:
- Vad varje kolumn i respektive flik betyder
- Tillåtna dropdown-värden
- Wikells omkostnadsformel (30 ord)
- Följepost-typer A vs B
- Radio-grupp-logik
- Hur man lägger till en ny post (5-stegs-guide)
- Hur man uppdaterar priser från ny wbr (pekar på `scripts/build-config.js --help`)

### 3.3 Build-pipeline — `scripts/build-config.js`

Node-script. Kör med `node scripts/build-config.js` (eller via `npm run build-config`).

**Funktionalitet:**
1. Läs `.project-context/data/master.xlsx` med `xlsx`-paketet.
2. Validera varje flik:
   - Alla Post-ID i Flik 3 finns i Flik 1.
   - Alla Rumstyp-ID i Flik 3 finns i Flik 2.
   - Alla Parent-Post-ID i Flik 3 (typ A) finns i Flik 1.
   - Alla Trigger-Post-IDs (typ B) finns i Flik 1.
   - Inga duplicerade Post-ID i Flik 1.
   - Inga duplicerade (Rumstyp-ID, Post-ID, Parent-Post-ID)-trios i Flik 3.
   - Alla Enheter är i tillåten lista.
   - Alla Kategorier är i tillåten lista.
   - Alla Pris-källor är i tillåten lista.
   - Alla Följepost-typ-värden är i tillåten lista.
   - Formler i `Pris (kr)`-kolumnen ska vara evaluerade (xlsx-paketet läser `v` = calculated value, inte `f`-formel).
3. Vid fel: skriv TYDLIGT felmeddelande till stderr, exit-kod 1. Format:
   ```
   ❌ VALIDERINGSFEL i .project-context/data/master.xlsx
   
   Flik "Rum × poster", rad 47:
     Post-ID "golv_ekparkettt" finns inte i Flik 1.
     Rättningsförslag: stavfel? Avsedd post kanske "golv_ekparkett"?
   ```
4. Vid lyckad validering: bygg `app-config.json` med strukturen:
   ```json
   {
     "version": "2026-04-22",
     "generated": "2026-04-22T14:30:00Z",
     "sourceFile": "master.xlsx",
     "items": {
       "golv_ekparkett": {
         "id": "golv_ekparkett",
         "label": "Ekparkett",
         "price": 825,
         "unit": "kr/m²",
         "category": "Golv",
         "info": { "ingar": [...], "ingarEj": [...], "wikellsRef": "...", "image": null }
       },
       ...
     },
     "followups": {
       "floorRivningFU": {
         "id": "floorRivningFU",
         "label": "inkl. rivning av befintligt golv",
         "price": 95,
         "unit": "kr/m²"
       },
       ...
     },
     "roomTypes": {
       "sovrum": {
         "displayName": "Sovrum",
         "defaultArea": 15,
         "hideArea": false,
         "type": "per_post",
         "iconId": "ICON_SOVRUM",
         "items": [
           {
             "id": "golv_ekparkett",
             "order": 10,
             "group": "golv",
             "defaultChecked": false
           },
           ...
           {
             "id": "innerdorr",
             "order": 30,
             "group": "innerdorr",
             "defaultChecked": false,
             "defaultCount": 1
           },
           ...
         ],
         "followupsA": [
           { "id": "floorRivningFU", "parent": "golv_ekparkett", "defaultChecked": true, "inheritsReducesFloor": true, "inheritsParentArea": false },
           ...
         ],
         "roomFollowups": [
           { "id": "skyddstackning", "triggeredBy": ["malning_tak","malning_vagg"], "renderInCategory": "Målning", "defaultChecked": true }
         ]
       },
       ...
     }
   }
   ```
5. Skriv `app-config.json` till `.project-context/data/app-config.json`.
6. Skriv CSV-snapshot till `.project-context/data/snapshots/YYYY-MM-DD/*.csv` (en fil per flik). Detta är den git-diff-bara spårningen.
7. Skriv rapport till stdout:
   ```
   ✅ Byggd app-config.json
   - 31 poster (Wikells: 19, Byggbiten: 6, Beijer: 3, Placeholder: 3)
   - 8 rumstyper
   - 47 rum×post-mappningar
   - 12 följeposter (A: 9, B: 3)
   - Snapshot: .project-context/data/snapshots/2026-04-22/
   ```

### 3.4 Data.js — refaktor

`src/data.js` ska inte längre hårdkoda priser. Istället:

1. Exponera hjälpfunktioner: `calcItemTotal`, `calcWallArea`, `calcPerimeter`, `syncFollowups`, `reducedFloorArea`, `todayIso`.
2. Exponera ikon-konstanter: `ICON_SOVRUM`, `ICON_VARDAGSRUM`, etc. (oförändrat).
3. Exponera `loadConfig(url)` som `fetch`:ar `app-config.json` och bygger `ROOM_TYPES` i samma form som idag. Returnerar Promise.
4. `app.js` `bootstrap()` ska `await APP_DATA.loadConfig('data/app-config.json')` innan rendering startas. Visa loading-state eller render fail-banner om fetch misslyckas.

**Viktigt — backward compat:** `window.APP_DATA.ROOM_TYPES` och `item`-objektens form ska vara **identisk** med dagens efter loadConfig körts. Målet: `app.js` ska inte behöva ändras (förutom bootstrap-async-wrapping). Om något måste ändras i app.js: minimalt, dokumenterat.

### 3.5 Första master.xlsx — innehåll

Bygg master.xlsx från nuvarande `src/data.js`. **VIKTIGT — om data.js är trunkerad**: följ `2026-04-21-fix-datajs-avbruten.md` FÖRST, så att data.js är komplett innan extraktion.

Förutom vad som finns i data.js, inkludera:

**A. Badrum-v4-poster** (från prompt `2026-04-21-badrum-v4.md`, Wikells-kalibrerade):
- `badrum_golv_klinker` — 2555 kr/m² (Wikells 15.015) — badrum
- `badrum_golv_plastmatta` — 1194 kr/m² (Wikells 15.023) — badrum
- `badrum_vagg_kakel` — 2492 kr/m² vägg (Wikells 8.502) — badrum, `hasArea: true`
- `badrum_vagg_plastmatta` — 1504 kr/m² vägg (Wikells 8.503) — badrum, `hasArea: true`
- `badrum_vagg_farg` — 1310 kr/m² vägg (Wikells 8.504) — badrum
- `badrum_wc_dusch` — 30816 kr/st (Wikells 17.034) — badrum, `hasCount: true`
- `badrum_inredning` — 9274 kr/st (Wikells 17.032) — badrum
- `badrum_dorr` — 4655 kr/st (Wikells 16.059) — badrum
- `badrum_ue_el` — 8000 kr/st (Byggbiten UE-schablon) — badrum
- `badrum_ue_vs` — 12000 kr/st (Byggbiten UE-schablon) — badrum
- `badrum_rivning_fu` — 1200 kr/m² (Byggbiten, typ A-följepost till badrum-golv-poster)
- `badrum_fallspackling_fu` — 2283 kr/m² (Wikells 15.013, typ A-följepost till badrum-golv-poster, default ON för klinker, OFF för plastmatta)

Toalett-posten `kakel_vagg` (Wikells 15.027 — 1160 kr/m² vägg) ska också läggas in — den saknas idag pga trunkering.

**B. Socklar och taklister** (från wbr, saknas helt i appen idag):
- `sockel` — Wikells 8.132 — 124 kr/m (löpmeter), Enhet `kr/m`, Kategori `Lister`.
  - Ny beräkningsflagga: `hasLinearMeter: true` (eller använd `wallCalc` med `ceilingHeight = 1` och dra av för dörrar? — nej, det blir hacky). **Rekommendation:** inför ny flagga `perimeterCalc: true` som ger mängden = `calcPerimeter(rum.yta) - dorrAvdrag`, där `dorrAvdrag = antalDorrarIRummet × 1`. Men antalet dörrar är komplext — förenkla: mängd = `calcPerimeter(rum.yta)` utan avdrag. Dennis kan justera golvyta-inputen om han vill.
  - Alternativ: bara `unit: 'kr/m'` med `wallCalc: true` och läs bara omkretsen (ej × takhöjd). Välj det renare — inför `perimeterCalc: true` som ny flagga. Dokumentera i app.js `calcItemTotal` och `itemEnhFor`.
  - Visa i alla torra rum: sovrum, vardagsrum, hall, entré, kök. **Inte** badrum/toalett (där ingår klinkersockel i golvet).
- `taklist` — Wikells 8.136 — 132 kr/m. Samma logik som sockel. Visa i samma rum.
  - Inget dörravdrag (taklist är hela omkretsen).

**C. Övriga existerande poster** — läs från data.js. Alla ska komma med exakt som de är idag.

**Mappning data.js → Flik 1-kolumner för ALLA poster (Wikells-härledda och egna):**

| data.js-fält | Flik 1-kolumn |
|---|---|
| `id` | `Post-ID` |
| `label` | `Etikett` |
| `price` | `Pris (kr)` (för egna poster; för Wikells-poster skrivs formel — se nedan) |
| `unit` | `Enhet` |
| `category` | `Kategori` |
| `info.ingar` | `Ingår (visas i app)` ← **Dennis nuvarande app-formulering. Behåll exakt som den är idag.** |
| `info.ingarEj` | `Ingår EJ (visas i app)` ← **Behåll exakt som idag.** |
| `info.wikellsRef` | `Wikells-ref (visningstext)` |
| `info.image` | (ignoreras i v1 — bilder hanteras separat senare) |

**Viktigt:** `Ingår (visas i app)`-texten är **Dennis-formulerad och välkalibrerad för slutkunds-UX**. Den ska INTE ersättas med rå-texten från wbr, bara behållas. Rå-texten från wbr hamnar i den **parallella kolumnen** `Wikells-artiklar (rå)` för källspårning.

För Wikells-härledda poster fylls DESSUTOM dessa kolumner automatiskt från wbr-parsen:
- `Wikells originalnamn` ← wbr `<Identitet>` (t.ex. "Ekparkett på golv")
- `Wikells-artiklar (rå)` ← wbr `<ArtikelRad>/<Benämning>` semi-separerade (t.ex. "Ekparkett 14 mm; Underlagspapp; Foam-underlag")
- `Mtrl (kr)`, `Tim (h)`, `UE (kr)`, `Spillfaktor` ← summerade från wbr-artiklarna
- `Pris (kr)` ← formel om 1 artikel, annars hårdkodad summa + anmärkning "Summa av N artiklar, se Flik 4"

**C.1 Egna poster (icke-Wikells)** — om data.js idag innehåller poster som inte är Wikells-härledda (t.ex. Daloc-dörr, Beijer-offerter, Byggbiten-schabloner, UE-schabloner), extrahera dem med följande mönster:

| Kolumn | Värde för egen post |
|---|---|
| `Post-ID` | oförändrat från data.js |
| `Etikett` | oförändrat (redan UX-vänlig) |
| `Wikells originalnamn` | **tom** |
| `Pris (kr)` | hårdkodat värde från data.js (INTE formel) |
| `Pris-källa` | `Byggbiten` eller `HSB-förhandlat` eller `Beijer` eller `Placeholder` — välj ärligt |
| `Wikells-ID` | **tom** |
| `Mtrl (kr)` / `Tim (h)` / `UE (kr)` / `Spillfaktor` | **tomma** |
| `Wikells-artiklar (rå)` | **tom** |
| `Ingår (visas i app)` | det som ligger i `info.ingar` idag |
| `Ingår EJ (visas i app)` | det som ligger i `info.ingarEj` idag |
| `Wikells-ref (visningstext)` | det som ligger i `info.wikellsRef` idag (kan vara "Byggbiten-schablon" etc.) |

**Framtid:** när Dennis vill lägga till en ny egen post (t.ex. ny leverantör, HSB-förhandlat produktval) gör han det genom att lägga en ny rad i Flik 1 med Pris-källa ≠ Wikells, + motsvarande rum×post-rader i Flik 3. Ingen kodändring krävs. Dokumentera detta flöde i Flik 5 (Förklaring) som en 5-stegs-guide "Lägga till egen post".

**D. Wbr-filen själv** (för Flik 4):
Placera `.project-context/data/wbr-source/HSB-3a-ROT-helrenovering-v6.wbr` (kopiera från `.../Downloads/Wikells-Kalkyl-Rot/TEST/HSB-3a-ROT-helrenovering-v6.wbr` om inte redan där). Parsea med ett litet engångsscript (inte committat) för att populera Flik 4. Spara parsed JSON som `.project-context/data/wbr-source/HSB-3a-v6-parsed.json` för framtida diff.

**Wbr-format** (FYI):
- Zip-fil, innehåller `Kalkyl.xml` (iso-8859-1-kodad).
- Struktur: `<KalkylPost>` = byggdel, `<ArtikelRad>` = artikel inuti byggdel.
- Nyckelfält: `<DatabasByggdelID>` (t.ex. `15.016`), `<Identitet>`, `<Enhet>`, `<ArtikelRad>` med `<MaterialPris>`, `<Tid>`, `<UE>`, `<SpillKoefficient>`, `<Åtgång>`.
- Omkostnadsformel: `pris = Σ(MaterialPris × Spill × Åtgång) + Σ(Tid × 930 × Åtgång) + Σ(UE × 1.1 × Åtgång)` per byggdel.

### 3.6 Dev-workflow — "ändra i master.xlsx och se ändringen i appen"

Dennis arbetsflöde ska vara:

1. Öppna `.project-context/data/master.xlsx` i Excel.
2. Ändra ett pris, lägg till en post, ändra en rad i Flik 3.
3. Spara Excelen.
4. Säg till agent (Claude Code eller Cowork): **"uppdatera konfigen"** (eller `npm run build-config` från terminal).
5. Agent kör `node scripts/build-config.js`.
6. Refresha appen i browsern.
7. Ser ändringen.

**Utöka `dev_server.py`** så att den, när den startas med `--watch`-flagga, övervakar `master.xlsx` och kör `build-config.js` automatiskt när filen ändras. Och (valfritt) pushar ett WebSocket/SSE till appen som triggar `location.reload()`. Detta är bonus — om det blir komplicerat, hoppa det och nöj dig med manuell refresh.

### 3.7 Leverans — `scripts/build-dist.js`

Inline-bygg för `dist/renoveringskalkyl.html`:
1. Läs `src/index.html`.
2. Inline `style.css` som `<style>...</style>` i `<head>`.
3. Läs `app-config.json` och inline som `<script>window.APP_CONFIG_JSON = {...};</script>` innan `data.js`.
4. Modifiera `data.js` så att om `window.APP_CONFIG_JSON` finns, använd det direkt utan fetch. Inline `data.js` och `app.js` som `<script>...</script>`.
5. Skriv `dist/renoveringskalkyl.html` (en fristående fil, fungerar offline vid dubbelklick).
6. Valfritt: minify. Inte obligatoriskt — läsbarhet > storlek för detta projekt.

---

## §4 Verifiering

### 4.1 Build-pipeline smoke test

1. Kör `node scripts/build-config.js`. Output ska vara `✅ Byggd app-config.json` med korrekt antal poster/rumstyper.
2. Öppna `app-config.json`. Validera:
   - Alla 31+ poster finns.
   - Varje rumstyp har korrekt `items`-array i rätt ordning.
   - Följeposter matchar strukturen i data.js idag.
3. Öppna `master.xlsx` i Excel. Ändra pris på `golv_ekparkett` från 825 till 900. Spara.
4. Kör `node scripts/build-config.js` igen. Verifiera att `app-config.json` nu har `"price": 900` för ekparkett.
5. Öppna CSV-snapshot i `.project-context/data/snapshots/YYYY-MM-DD/priser.csv` — verifiera att filen är git-diff-bar.

### 4.2 Valideringsfel

1. Öppna `master.xlsx`, ändra ett Post-ID i Flik 3 till något som inte finns i Flik 1 (t.ex. `golv_ekparket_stavfel`). Spara.
2. Kör `node scripts/build-config.js`. Output ska vara rött felmeddelande med radnummer och förslag.
3. Exit-kod ska vara 1.
4. `app-config.json` ska **inte** ha uppdaterats (så appen fortsätter fungera med gammal config).

### 4.3 App-smoke i browser

1. Starta dev-servern: `python src/dev_server.py`.
2. Öppna appen i browser. Verifiera:
   - Alla rumstyper visas i rumstypsväljaren.
   - Lägg till Sovrum, verifiera alla poster visas i rätt ordning.
   - Checka Ekparkett — följeposter (rivning, spackling) visas indraget.
   - Checka Målning tak — Skyddstäckning-följepost visas i Målning-sektionen (dimmad innan någon målning valts).
   - Siffror stämmer mot data.js-version (ingen regression).
3. Öppna Övrigt-rum. Verifiera att `hideArea` fortfarande funkar (ingen m²-input).
4. Öppna Badrum. Verifiera att alla badrum-v4-poster visas och stämmer.
5. Öppna Kök/Hall/Sovrum/Vardagsrum. Verifiera att **sockel** och **taklist** visas som nya poster i Lister-kategorin. Kolla att mängden räknas som omkrets (4 × √yta), inte yta eller st.

### 4.4 Smart-refresh test

1. Ändra i master.xlsx — t.ex. byt `Etikett` för `malning_tak` från "Tak" till "Tak (2 strykningar)".
2. Kör `node scripts/build-config.js`.
3. Refresha appen.
4. Verifiera att nya etiketten syns i UI.

### 4.5 Dist-bygge

1. Kör `node scripts/build-dist.js`.
2. Öppna `dist/renoveringskalkyl.html` via **dubbelklick** (file://-protokoll, inget dev-server).
3. Appen ska fungera fullt ut offline. Ingen fetch, inga nätverksberoenden.

### 4.6 Git-diff-spårning

1. Gör en prisändring i master.xlsx.
2. Kör build-config.
3. `git status` ska visa:
   - `master.xlsx` (binär, svårläst diff)
   - `app-config.json` (JSON-diff, läsbart)
   - `snapshots/YYYY-MM-DD/priser.csv` (CSV-diff, idealiskt)
4. `git diff app-config.json` ska visa exakt vad som ändrats.

---

## §5 Vad som INTE är i scope

- **Admin-UI i appen** för att redigera priser via browser. Kommer i Fas 3 (om behov uppstår).
- **Diff-rapport från ny wbr** (`scripts/update-from-wbr.js`). Separat prompt när Fas 1+2 är stabila.
- **Automatisk uppladdning av master.xlsx från Cowork till projektmappen**. Dennis sparar filen i projektmappen manuellt.
- **Multi-kund-priser** (olika priser för olika HSB-förvaltare). Kommer först när behovet är reellt.
- **UI-ändringar** — appens utseende och UX ska förbli identisk efter refaktorn. Alla pending-buggar (#62, #63, #65, #66, #67) hanteras i separata promptar.

---

## §6 Riskavstämning

**Stora risker** som Claude Code måste hantera aktivt:

1. **Om validering missar något subtilt fel**, bryts appen tyst. Därför: HÄLLA valideringslogik på rött, inte grönt. Om tveksam — fail.
2. **Formler i Pris-kolumnen** kan ge olika värden i Excel vs JSON om xlsx-paketet inte evaluerar formler korrekt. **Verifiera**: öppna master.xlsx i Excel, notera pris för ekparkett; kör build; öppna app-config.json; priserna ska matcha exakt.
3. **`data.js` trunkering** — om trunkering inte är åtgärdad, kommer master.xlsx vara ofullständig. Kontrollera `wc -l src/data.js` INNAN extraktion. Om <500 rader, kör `2026-04-21-fix-datajs-avbruten.md` först.
4. **Rum × post-mappningen är 47+ rader**. Om Claude Code genererar automatiskt ur data.js, verifiera manuellt att sovrums kvantitet stämmer mot nuvarande UI.
5. **Sockel/taklist är ny datamodell-flagga** (`perimeterCalc` eller liknande). Kräver app.js-ändring i `calcItemTotal`, `itemEnhFor`, `followupMangdFor`. Skriv testfall först.

---

## §7 Leveranskriterier (DoD)

- [ ] `.project-context/data/master.xlsx` finns och innehåller 5 korrekt strukturerade flikar.
- [ ] Socklar och taklister är nya poster i Flik 1, med rätt rum×post-rader i Flik 3.
- [ ] `scripts/build-config.js` genererar korrekt `app-config.json` utan fel.
- [ ] `scripts/build-dist.js` skapar en fristående `dist/renoveringskalkyl.html`.
- [ ] `src/data.js` refaktorerad till att konsumera JSON. Ingen hårdkodad pris-data kvar.
- [ ] Appen fungerar identiskt i browsern efter refaktor (alla verifieringssteg i §4 passerar).
- [ ] CSV-snapshot skapad för första byggen.
- [ ] `DESIGN.md` uppdaterad med ny arkitektur (§5 eller ny §) som beskriver master.xlsx → app-config.json → app-flödet.
- [ ] `DECISIONS.md` har ny entry som motiverar master.xlsx-arkitekturen och beslut om formel-priser, socklar/taklister som ny datamodell.
- [ ] `OPEN_QUESTIONS.md` uppdaterad — stryk frågor som denna prompt besvarat.
- [ ] Sessionsrapport i `.project-context/sessions/YYYY-MM-DD-master-xlsx-migration.md`.

---

## §8 Startpromt för Claude Code

Starta med:
> Läs CLAUDE.md och denna prompt (`.project-context/prompts/2026-04-22-prisdatabas-master-xlsx.md`). Läs `src/data.js` och `src/app.js` i sin helhet. Verifiera att data.js är komplett (`wc -l src/data.js` ≥ 500). Om trunkerad — kör `2026-04-21-fix-datajs-avbruten.md` först.
>
> Redogör sedan för mig (innan du kodar) hur du tänker:
> 1. Hur ska `perimeterCalc`-flaggan implementeras i app.js för socklar/taklister?
> 2. Hur ska xlsx-paketet läsa formler (värde vs formel-cell)?
> 3. Hur hanterar du att radio-gruppen `golv` nu spänner över 4 poster i hall men bara 3 i sovrum — är det bara en rendering-fråga eller behöver något i datamodellen?
> 4. Ska `defaultOnCreate` (sovrum: innerdorr count=1) läggas som rad i Flik 3 (via "Std-antal"-kolumn) eller som separat flik? Motivera.
>
> När jag svarat — bygg.
