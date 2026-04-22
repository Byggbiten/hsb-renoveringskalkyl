# SCHEMA.md — app-config.json + master.xlsx

**Målgrupp:** Framtida utvecklare och agenter som vill förstå datamodellen utan att läsa `build-config.js`.

## 1. `app-config.json` — genererat från master.xlsx

Genereras av `scripts/build-config.js`. Konsumeras av `src/data.js` via `loadConfig(url)`.

### Top-level

```jsonc
{
  "version": "1.7.0",
  "generated": "2026-04-22T08:47:00Z",
  "sourceFile": "master.xlsx",
  "items":     { ... },   // post-ID → item-objekt
  "roomTypes": { ... },   // rumstyp-ID → rumstyp-objekt
  "roomOrder": [...]      // ordning i rumsväljar-modal
}
```

### `items[id]`

Varje unik post i appen (huvud-items + följeposter). 50 st per 2026-04-22.

```jsonc
{
  "id":         "golv_ekparkett",
  "label":      "Ekparkett",               // vad slutkund ser
  "price":      757,                        // kr (ex moms)
  "unit":       "kr/m²",                    // kr/m², kr/st, kr/m² vägg, kr/m, schablon
  "category":   "Golv",                     // UI-sektion + print-kategori
  "source":     "Wikells",                  // Wikells | Byggbiten | HSB-förhandlat | Beijer | Placeholder
  "wikellsId":  "15.016",                   // "" om ingen Wikells-koppling
  "flags":      ["hasCount", "wallCalc"],   // array; aliases speglas till root
  "hasCount":   false,                      // alias från flags[]
  "wallCalc":   false,
  "perimeterCalc": false,
  "reducesFloor": false,
  "placeholder": false,
  "hasArea":    false,
  "inheritsParentArea":     false,
  "inheritsReducesFloor":   false,
  "ingar":      ["Underlagspapp 2 mm", ...],  // UX-text för expand-panel
  "ingarEj":    ["Flyttning av möbler", ...], // UX-text för expand-panel
  "wikellsRef": "Wikells byggdel 15.016",     // visnings-referens
  "rawArticles": ["Ekparkett 14 mm", ...],    // fallback om ingar är tom
  "note":       "Enligt Wikells 15.016. ..."  // Anmärkning (internt)
}
```

### `roomTypes[id]`

Varje rumstyp. 8 st.

```jsonc
{
  "id":          "sovrum",
  "displayName": "Sovrum",
  "defaultArea": 15,                  // m² vid rum-skapande (0 om hideArea)
  "hideArea":    false,               // true = övrigt-rum (inga m²-inputs)
  "type":        "per_post",
  "iconId":      "ICON_SOVRUM",       // resolveras till SVG i data.js
  "items": [
    { "id": "golv_ekparkett", "order": 10, "group": "golv",
      "followups": [
        { "id": "golv_ekparkett__rivning", "defaultChecked": true,
          "inheritsReducesFloor": true, "inheritsParentArea": false }
      ]
    },
    { "id": "innerdorr", "order": 90, "group": "innerdorr" },
    // ... fler items, sorterade på order
  ],
  "roomFollowups": [
    { "id": "skyddstackning", "defaultChecked": true,
      "triggeredBy": ["malning_tak", "malning_vagg"],
      "renderInCategory": "Målning" }
  ],
  "defaultOnCreate": {
    "innerdorr": { "checked": true, "count": 1 }
  }
}
```

### `roomOrder`

Array av rumstyps-ID i visningsordning. Styr modal-layout.

## 2. master.xlsx — 5 flikar

Sanningskällan. Redigeras i Microsoft Excel.

### Flik 1: Priser (50 rader)

| Kolumn | Typ | Notis |
|---|---|---|
| Post-ID | text (unik) | snake_case |
| Kategori | dropdown | Golv, Vägg, Tak, Lister, Målning, Kakel, Tillval, Inredning, Rivning, Förberedelse, UE, Köksinredning, Övrigt |
| Etikett | text | UX-visning |
| Wikells originalnamn | text | Auto från wbr `<Identitet>` |
| Enhet | dropdown | kr/m², kr/st, kr/m² vägg, kr/m, schablon |
| Pris (kr) | formel eller nummer | Se § 2.1 |
| Pris-källa | dropdown | Wikells, Byggbiten, HSB-förhandlat, Beijer, Placeholder |
| Wikells-ID | text | Format `kap.nnn`, t.ex. `15.016` eller `8.502` |
| Mtrl (kr) | number | Endast för enkla Wikells (1 artikel) |
| Tim (h) | number | Endast för enkla Wikells |
| UE (kr) | number | Endast för enkla Wikells |
| Spillfaktor | number | Default 1.0. Wikells har ofta 1.07–1.1 |
| Beräkning-flaggor | text (flerval) | hasCount, hasArea, wallCalc, perimeterCalc, reducesFloor, placeholder, inheritsParentArea, inheritsReducesFloor |
| Smart-mappning | text | Fritext (används inte av build-config) |
| Wikells-artiklar (rå) | text (multiline) | Semi-separerade, auto från wbr |
| Ingår (visas i app) | text (multiline) | Semi-separerade, Dennis UX-text |
| Ingår EJ (visas i app) | text (multiline) | Semi-separerade |
| Wikells-ref (visningstext) | text | T.ex. "Wikells byggdel 15.016" |
| Anmärkning | text | Intern, visas inte i UI |

#### 2.1 Pris-kolumnens format

**Enkla Wikells** (1 artikel, diff mot wbr ≤ 50 kr):
```
Excel-formel: =I{N}*L{N} + J{N}*930 + K{N}*1.10
Cell innehåller både .f (formel) och .v (beräknat värde)
```

**Komplexa Wikells** (flera artiklar):
```
Hårdkodat värde i .v, ingen formel.
Anmärkning: "Summa av N artiklar, se Flik 4"
Mtrl/Tim/UE/Spill lämnas tomma
```

**Icke-Wikells** (Byggbiten/HSB-förhandlat/Beijer/Placeholder):
```
Hårdkodat värde i .v, ingen formel.
Wikells-ID + Mtrl/Tim/UE/Spill lämnas tomma.
```

### Flik 2: Rumstyper (8 rader)

| Kolumn | Notis |
|---|---|
| Rumstyp-ID | snake_case (sovrum, badrum, etc.) |
| Visningsnamn | "Sovrum" |
| Default-yta (m²) | Number, tom om hide-area |
| Hide-area | ja/nej |
| Typ | per_post (endast värde som används idag) |
| Ikon-ID | ICON_SOVRUM, ICON_VARDAGSRUM, etc. (måste matcha konstant i data.js) |
| Ordning | number för modal-sortering |
| Anmärkning | intern |

### Flik 3: Rum × poster (134 rader — HJÄRTAT)

En rad per post-visning i en specifik rumstyp. Samma post i 5 rum = 5 rader.

| Kolumn | Notis |
|---|---|
| Rumstyp-ID | FK → Flik 2 |
| Post-ID | FK → Flik 1 |
| Ordning | Sortering inom rumstypen (10, 20, 30...) |
| Radio-grupp | Mutex-nyckel, t.ex. "golv" — tom = vanlig checkbox |
| Std-vald | ja/nej — default-checked vid rum-skapande |
| Std-antal | Number (om hasCount) |
| Std-area | Number (om hasArea), t.ex. entré-klinker=2 |
| Följepost-typ | tom, A (per-parent), B (rumsscope) |
| Parent-Post-ID | För typ A |
| Trigger-Post-IDs | Kommaseparerat för typ B |
| Rendera i kategori | För typ B |
| Inherit reducesFloor | ja/nej (typ A golv-följepost) |
| Inherit parentArea | ja/nej (typ A entre-klinker-följepost) |

### Flik 4: Wbr-byggdelar (58 rader)

Rå Wikells-data från `.wbr`-filen. Används **inte** av appen direkt — referens för framtida diff vid ny wbr.

| Kolumn | Notis |
|---|---|
| Kapitel.Nummer | T.ex. 15.016 |
| Identitet | Wikells-namn |
| Enhet | m², st, m, etc. |
| Artiklar | Multiline: "DatabasArtikelID Benämning (mtrl X, tim Y, UE Z, åtgång N, spill S)" per rad |
| Mtrl-summa | Summa över aktiva artiklar × åtgång × spill |
| Tim-summa | Summa tim × åtgång |
| UE-summa | Summa UE × åtgång |
| Beräknat pris (kr) | Resulterande pris efter omkostnadsformeln |
| Senast uppdaterad | ISO-datum |
| Källa-wbr | Filnamn för spårning |

### Flik 5: Förklaring (86 rader text)

Dokumentation. Läses av människor, ignoreras av build-config.

## 3. Wikells-formeln

```
Pris = Mtrl × Spillfaktor + Tim × 930 + UE × 1.10
```

- `930` = 250 kr/h × 3.72 omkostnadspåslag (Byggbitens timkostnad)
- `1.10` = 10 % UE-påslag

Dennis har bekräftat formeln 2026-04-21 (se DECISIONS.md).

## 4. Validering

`build-config.js` kastar fel (exit 1) vid:

- Duplicerat Post-ID i Flik 1
- Saknade `Post-ID` / `Etikett` / `Kategori` / `Enhet` / `Pris-källa` / `Pris (kr)`
- Ogiltig Kategori / Enhet / Pris-källa / Följepost-typ (inte i dropdown-listan)
- Ogiltig Beräkning-flagga
- `perimeterCalc` + `wallCalc` samtidigt (ömsesidigt uteslutande)
- `Pris (kr)` är inte nummer
- Formel-cell utan beräknat värde (`cell.f` utan `cell.v`)
- Rum × poster refererar Post-ID som inte finns i Flik 1
- Rum × poster refererar Rumstyp-ID som inte finns i Flik 2
- Parent-Post-ID / Trigger-Post-ID inte i Flik 1
- Duplicerad (Rumstyp, Post, Parent)-trio
- Flera `Std-vald=ja` i samma radio-grupp inom samma rumstyp

Varnar (utan exit) vid:

- Wikells-post utan Mtrl/Tim + Spill + utan förklarande anmärkning
- Rumstyp utan Ikon-ID

## 5. Uppdateringsflöden

### 5.1 Lägga till en ny post

1. Hitta Wikells-byggdelen i Flik 4 (eller bestäm att det är en Byggbiten-post).
2. Lägg till rad i Flik 1: Post-ID, Etikett, Pris, Pris-källa, Enhet, ev. Mtrl/Tim/UE/Spill.
3. Lägg till en rad i Flik 3 för varje rumstyp där posten ska visas.
4. Ctrl+S i Excel.
5. `npm run build-config`.
6. Refresha appen.

### 5.2 Ändra ett pris

1. Öppna Flik 1 i Excel.
2. Ändra `Mtrl`, `Tim`, `UE` eller `Spillfaktor` (för Wikells-formel-poster) eller `Pris (kr)` direkt (för hårdkodade poster).
3. Ctrl+S.
4. `npm run build-config`.
5. Refresha appen.

### 5.3 Ta bort en post

1. Ta bort raden i Flik 3 från alla rumstyper där posten finns.
2. Ta bort raden i Flik 1.
3. `npm run build-config` (valideringen fångar om du glömt något).

### 5.4 Uppdatera från ny Wikells .wbr

Se `.project-context/OPEN_QUESTIONS.md` Q14 — automatiseras i framtida prompt. Manuell process:

1. Kopiera ny wbr-fil till `.project-context/data/wbr-source/`.
2. Kör `node scripts/archive/parse-wbr.js <wbr-path> <out-json-path>`.
3. Jämför med tidigare parsed JSON (diff-tool eller kolla Flik 4-kolumnen `Senast uppdaterad`).
4. Uppdatera relevanta Mtrl/Tim/UE i Flik 1 — Excel räknar om formler automatiskt vid Ctrl+S.
5. Uppdatera Flik 4 (kan göras via ett hjälpscript om önskvärt).
6. `npm run build-config`.
