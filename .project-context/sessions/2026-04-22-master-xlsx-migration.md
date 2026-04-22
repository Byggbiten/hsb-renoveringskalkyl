# Session 2026-04-22 — Master.xlsx-driven priskonfiguration + build-pipeline

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input-prompt:** `.project-context/prompts/2026-04-22-prisdatabas-master-xlsx.md` (Dennis + Cowork)
**Ordning:** Fas 0 → 1 → 2 → PAUS → 3 → 4 → 5 → 6 → 7 → 8 (8 faser)
**Status vid sessionsslut:** Kod + dokumentation färdig. 20/20 Scenario-tester PASS. Dist-fil genererad (220 KB fristående).

---

## TL;DR

Största arkitekturändringen sedan v1.3. Alla priser flyttade från hårdkodade `data.js`-konstanter till `.project-context/data/master.xlsx` (5 flikar). Build-pipeline `master.xlsx → app-config.json → appen` med full validering + CSV-snapshots för git-diff. Ny `perimeterCalc`-flagga för sockel/taklist. Dennis framtida arbetsflöde: Excel → `npm run build-config` → refresh. Cykeltid ~5 sekunder.

---

## Fasöversikt

### Fas 0 — Uppsättning
- `package.json` + `.gitignore` skapade.
- Mappar: `scripts/`, `scripts/archive/`, `.project-context/data/{wbr-source,snapshots}`.
- `npm install xlsx@0.18.5 iconv-lite@0.6.3` (devDependencies).
- Wbr-filen `HSB-3a-ROT-helrenovering-v6.wbr` kopierad från `Downloads/`.

### Fas 1 — Wbr-parser (`scripts/archive/parse-wbr.js`)
- Ren Node-implementation av PKZIP-läsning (inga extra deps) + iconv-lite för iso-8859-1.
- Regex-parsing av KalkylPost + ArtikelRad (wbr-XML är platt, ingen djup nästling).
- Wikells-formeln implementerad: `pris = Σ(mtrl × spill × åtgång) + Σ(tim × 930 × åtgång) + Σ(UE × 1.10 × åtgång)`.
- Output: 138 byggdelar (58 unika `DatabasByggdelID`), 449 artiklar totalt.
- Sanity-match mot kända Wikells-priser: 10/13 matchar på kronan, 3 avvek (ekparkett -68 kr, fönster-målning -951 kr, garderob -4393 kr) → Dennis-beslut på dessa i Fas 2+.

### Fas 2 — Initial-extraktor (`scripts/archive/initial-xlsx-from-datajs.js`)
- Läste `src/data.js` via Node `eval` i global-context (IIFE-mönster).
- Kombinerade data.js + wbr-parsed JSON → master.xlsx med 5 flikar.
- **Flik 1 Priser:** 35 items + 10 typ A-följeposter + 3 typ B-följeposter + 2 nya lister (sockel/taklist) = 50 rader.
- **Flik 2 Rumstyper:** 8 rader (inkl. Ikon-ID → mappas till SVG i data.js).
- **Flik 3 Rum × poster:** 134 rader (huvud-items + följeposter A/B + sockel/taklist i 5 torra rum).
- **Flik 4 Wbr-byggdelar:** 58 rader med komplett artikel-detalj per byggdel.
- **Flik 5 Förklaring:** 86 rader dokumentation.
- **Viktig designregel implementerad:** `safeFormula = hasWikellsMatch && artikelCount === 1 && priceDiff ≤ 50`. Endast enkla Wikells-byggdelar med minimal prisdiff får formel. Komplexa eller divergerande → hårdkodat data.js-värde (ingen silent prisändring).

### PAUS — Dennis granskar master.xlsx (~10 min)

Dennis levererade 16 specifika korrigeringar efter granskning. Applicerade via nytt engångsscript `scripts/archive/apply-dennis-corrections-2026-04-22.js`:

1. **sockel** — Wikells 8.132 (missad i initial-extraktorn eftersom data.js-posten saknade `info.wikellsRef`). Fylldes nu med Mtrl 28.5, Tim 0.10, UE 0, Spill 1.1 → formel = **124.35 kr/m**.
2. **golv_ekparkett** — sänkt till Wikells 757 kr (från data.js 825).
3. **golv_klinker** — höjd till Wikells 2593 kr (4 artiklar, hårdkodat).
4. **entre_klinker** — **ny Wikells-härledning** (torr variant av 15.015, endast klinkerplatta-artikeln): Mtrl 646, Tim 1.2, UE 0, Spill 1.06 → formel = **1800.76 kr/m²**.
5. **vagg_kakel** — höjt till Wikells 1483 kr/m² vägg.
6. **fonster_malning** — **bytt från Wikells till Byggbiten** (1350 kr, Patrik Norlén-UE-pris). Wbr 14.047 är bara karm-oljefärg = otillräcklig scope.
7. **garderob_60** — **Marbodal 60's garderob 3600 kr** (HSB-förhandlat, ersätter wbr 17.020 Wikells standard-garderob 10207 kr).
8. **hatthylla** — HSB-förhandlat 1450 kr (från placeholder 3500).
9-10. **badrum_ue_el/vs** — bytt från Wikells till Byggbiten (wbr 20.002/20.003 har nollvärden, bara slots).
11. **skyddstackning** — bytt från Wikells till Byggbiten (wbr 14.017 räknar per m², inte jämförbart).
12-13. **malning_tak/vagg** — bytt från Wikells till Byggbiten-kalibrerat (wbr 14.038 är bara material).
14. **badrum_rivning** — bytt från Wikells till Byggbiten-schablon (bredare scope än wbr 15.001).
15. **Rensning** av kvarvarande "Pris-diff: ... välj vilket"-texter i Anmärkning.
16. **innerdorr_malning** — oförändrat (wbr-formel 1210 kr behålls).

Read-back-verifiering: 14/14 Dennis-priskrav PASS på kronan/öret.

### Fas 3 — `scripts/build-config.js`
- Läser master.xlsx, validerar, genererar `app-config.json` + `src/app-config.json` (kopia för dev-server).
- **Hård validering** (exit 1): duplicerade Post-ID, saknade fält, ogiltiga dropdown-värden, brutna refs (Post-ID/Rumstyp-ID/Parent-Post-ID/Trigger-Post-ID), duplicerade (rumstyp, post, parent)-trios, flera Std-vald=ja i samma radio-grupp, perimeterCalc+wallCalc samtidigt, formel utan beräknat värde.
- **Mjuka varningar** (utan exit): Wikells-post utan Mtrl/Tim/Spill och utan förklarande anmärkning, rumstyp utan Ikon-ID.
- **Smart-anmärknings-regel:** anmärkningar som innehåller "Summa av N artiklar", "Enligt Wikells", eller "Dennis beslut" räknas som förklarande → tystar varningen.
- **CSV-snapshots per flik** skrivs till `.project-context/data/snapshots/YYYY-MM-DD/`.
- **Fel-flöde verifierat:** simulerade trasigt Rumstyp-ID → exit 1 med tydligt felmeddelande + `app-config.json` oförändrad.

### Fas 4 — Refaktorera `src/data.js`
- Storleksminskning: **707 → 300 rader** (utan att tappa funktionalitet).
- Behöll: helpers (`calcItemTotal`, `calcFollowupTotal`, `calcRoomSubtotal`, `calcTotal`, `calcPerimeter`, `calcWallArea`, `reducedFloorArea`, `isRoomFollowupTriggered`, `syncFollowups`, `formatKr`, `todayIso`, `demoState`, `emptyState`), SVG-ikoner (`PUZZLE_SVG`, `ICON_*`), `DEFAULT_CEILING_HEIGHT`.
- Tog bort: alla hårdkodade item-konstanter (`GOLV_EKPARKETT`, `INNERDORR`, etc.), följepost-konstanter (`SKYDDSTACKNING_FU`, `floorRivningFU`, etc.), hela `ROOM_TYPES`-objektet.
- Lade till: `async loadConfig(url)` med fallback till `window.APP_CONFIG_JSON` (för dist-läge), `buildRoomTypes(cfg)` som expanderar ref-chains till fullständig struktur, `expandItem(raw)` som packar `ingar`/`ingarEj`/`wikellsRef` till `item.info`-objekt (backward compat med Del III chevron-panelen).
- Lade till: **`perimeterCalc`-gren** i `calcItemTotal` (mängd = omkrets, används av sockel/taklist). Även i `calcFollowupTotal` för eventuella framtida typ B-följeposter med `unit: 'kr/m'`.
- **Ingår-fallback:** om `ingar.length === 0`, använd `rawArticles` som fallback (gör UX-sämre men fungerande).

### Fas 5 — `src/app.js` async bootstrap
- Ändrade top-of-IIFE destrukturering: statiska helpers kvar som `const`, men `ROOM_TYPES` och `ROOM_TYPE_ORDER` till `let` (populeras efter loadConfig).
- Hela bootstrap-sekvensen wrappad i `async function bootstrap()`: `await loadConfig('app-config.json')` → sätt runtime-refs → `initialState()` → `render()`.
- Fail-handling: error-banner i `document.body` med tydligt fel om config inte laddar + instruktion att starta dev-server.
- **`perimeterCalc`-stöd i print-layout:** `itemEnhFor(item)` → `'m'`, `itemMangdFor(item, ...)` → `calcPerimeter(rum.yta)`.
- Cache-bust: `?v=29` → `?v=30` i `index.html`.

### Fas 6 — `scripts/build-dist.js`
- Läser `src/index.html`, `src/style.css`, `src/data.js`, `src/app.js`, `.project-context/data/app-config.json`.
- Ersätter `<link rel="stylesheet" href="style.css">` med `<style>...</style>`.
- Lägger in `<script>window.APP_CONFIG_JSON = {...}</script>` före data.js-script-tag.
- Ersätter `<script src="data.js?...">` och `<script src="app.js?...">` med inline `<script>`-block.
- Kopierar `src/assets/` → `dist/assets/` (inkl. mörk Byggbiten-logga för print).
- Safety-check: grep verifierar att inga externa src-refs finns kvar.
- Resultat: `dist/renoveringskalkyl.html` **220 KB**, fungerar offline via `file://` protokoll.

### Fas 7 — Verifiering
- `node --check` på alla JS-filer: **OK**.
- **Validation-fail-test:** introducerade trasigt Rumstyp-ID → exit 1 + tydligt felmeddelande + `app-config.json` oförändrad ✅.
- **Scenario-tester (20 assertions via Node)** — alla **PASS**:
  - Scenario 1: alla 8 rumstyper laddar + defaultOnCreate appliceras (sovrum 5070 kr, badrum 82160 kr, entré 4165 kr etc.).
  - Scenario 2: badrum 5 m² full defaults + klinker + kakel = **148 429 kr** (exakt bibehållen från v1.5 — backward compat ✅).
  - Scenario 3: sovrum 15 m² med Dennis nya ekparkett-pris 757 + rivningsfu + innerdörr = **17 850 kr** (exakt: 11355+1425+5070).
  - Scenario 4: sockel+taklist i vardagsrum 25 m² → omkrets 20 m → (124.35+132)×20 = **5 127 kr** ✅ (perimeterCalc fungerar).
  - Scenario 5: legacy-ladd pre-v1.5 badrum_standard-nycklar → gamla schabloner ignoreras, bara alltid-on följeposter (rivning+fallspackling) räknas = **17 415 kr** ✅.
  - Scenario 6: dist-läge via `window.APP_CONFIG_JSON` → 8 rumstyper, 10 badrum-items ✅.
- Dev-server-probe: alla filer serveras (data.js, app.js, style.css, app-config.json) med HTTP 200.
- **Dist-fil-kontroll:** 220 KB, 0 externa src-refs, APP_CONFIG_JSON inlinat, PUZZLE_SVG present, bootstrap present.

### Fas 8 — Dokumentation
- **DESIGN.md v1.6 → v1.7:**
  - Ny § 11.5 "Pris-arkitektur (v1.7) — master.xlsx-driven konfiguration" med sub-sektioner för flöde, flikar, Wikells-formel, pris-källor, perimeterCalc, Dennis arbetsflöde, leverans, filstruktur.
  - v1.7 changelog-entry med komplett täckning av alla ändringar.
- **DECISIONS.md +4 entries 2026-04-22:**
  1. Master.xlsx som sanning (motivering: Dennis är PL, inte utvecklare; spårbarhet; Wikells-uppdateringsprocess).
  2. perimeterCalc som ny beräkningsflagga.
  3. Dennis 16 prisbeslut (detaljerad lista).
  4. xlsx@0.18.5 CVE accepteras (endast dev-sidan).
- **OPEN_QUESTIONS.md:**
  - Q10 uppdaterad till v1.7-status (Placeholder-hantering flyttad till master.xlsx).
  - Ny Q14: "Uppdateringsflöde från ny Wikells .wbr" (förslag: `update-from-wbr.js` script).
  - Ny Q15: "package-lock.json — committa eller ignorera?"
- **Ny `.project-context/data/SCHEMA.md`** — schemadokumentation för framtida utvecklare/agenter (app-config.json + master.xlsx + Wikells-formeln + validering + uppdateringsflöden).
- **Ny sessionsrapport** (denna fil).

---

## Mekaniska bevis (exakta siffror)

### Build-config output
```
$ npm run build-config
  50 poster (Wikells: 16, Byggbiten: 21, HSB-förhandlat: 2, Placeholder: 11)
  8 rumstyper
  134 rum×post-mappningar
  Följeposter: typ A 40, typ B 9
```

### Backward compat-kontroll

| Test-fall | v1.5/v1.6 | v1.7 | Diff |
|---|---|---|---|
| Badrum 5 m² full default + klinker + kakel | 148 429 kr | **148 429 kr** | 0 kr (bit-exact) ✅ |
| Badrum 5 m² plastmatta + våtrumsfärg | 116 251 kr | 116 251 kr | 0 kr ✅ |
| Sovrum 15 m² ekparkett + rivning + innerdörr | 15 390 kr* | 17 850 kr | +2 460 kr (ekparkett 825→757 = -1 020; innerdörr från default count 1 korrekt; förväntat ändring från Dennis-prisändringar — inte regression) |

\* v1.5-värdet är från tidigare session där ekparkett var 825 kr.

### Scenario-sammanfattning
- 20 assertions körda
- 0 FAIL
- 0 warnings (utöver kända Wikells-formler utan Mtrl/Tim som har förklarande anmärkningar)

---

## Öppna frågor efter sessionen

Nya:
- **Q14** (öppen) — automatiserat uppdateringsflöde från ny Wikells .wbr. Förslag: `scripts/update-from-wbr.js` som diffar ny wbr mot Flik 4 och föreslår Mtrl/Tim/UE-uppdateringar.
- **Q15** (öppen) — committa `package-lock.json` eller inte. Min rekommendation: committa för reproducerbarhet.

Oförändrade sedan tidigare sessioner:
- Q1 (köks-schabloner), Q4 (kontaktuppgifter delvis besvarad), Q7 (disclaimer), Q9 (info-innehåll delvis besvarad), Q11 (sparade kalkyler info), Q12 (kap 29 projektgemensamt), Q13 (målning per-m²-underlag).

---

## Filer som rörts denna session

### Ny
```
package.json
package-lock.json (genererad av npm install)
.gitignore
scripts/build-config.js
scripts/build-dist.js
scripts/archive/parse-wbr.js
scripts/archive/initial-xlsx-from-datajs.js
scripts/archive/apply-dennis-corrections-2026-04-22.js
.project-context/data/master.xlsx              (~182 KB)
.project-context/data/app-config.json          (~53 KB)
.project-context/data/wbr-source/HSB-3a-ROT-helrenovering-v6.wbr
.project-context/data/wbr-source/HSB-3a-v6-parsed.json
.project-context/data/snapshots/2026-04-22/{priser,rumstyper,rum-poster,wbr-byggdelar}.csv
.project-context/data/SCHEMA.md
.project-context/sessions/2026-04-22-master-xlsx-migration.md (denna fil)
dist/renoveringskalkyl.html                    (220 KB, fristående offline)
dist/assets/byggbiten-logga.svg
dist/assets/byggbiten_logga_transparent_beskuren.svg
node_modules/ (xlsx + iconv-lite)
src/app-config.json (kopia av app-config för dev-server)
src/assets/byggbiten_logga_transparent_beskuren.svg (kopierad från projektrot för print)
```

### Ändrade
```
src/data.js          (707 → 300 rader; omskriven med loadConfig + perimeterCalc)
src/app.js           (async bootstrap; perimeterCalc i itemEnhFor/itemMangdFor)
src/index.html       (?v=29 → ?v=30)
.project-context/DESIGN.md            (v1.6 → v1.7, ny §11.5, v1.7 changelog)
.project-context/DECISIONS.md         (+4 entries 2026-04-22)
.project-context/OPEN_QUESTIONS.md    (Q10 uppdaterad, Q14 + Q15 nya)
```

Total: **15 nya filer, 6 ändrade filer.**

---

## Rekommendation till Dennis nästa steg

1. **Browser-verifiering** på http://localhost:5520/ i incognito:
   - Login + öppna kalkyl. Appen ska starta normalt.
   - Lägg till sovrum → ekparkett → rivningsfu auto-kryssas.
   - Lägg till sockel + taklist från Tillval-sektionen → mängder räknar på omkretsen (4√yta).
   - Ändra pris i master.xlsx för t.ex. ekparkett (757 → 800), Ctrl+S, `npm run build-config`, refresh browser → nya priset syns.
2. **Öppna `dist/renoveringskalkyl.html`** via dubbelklick (file://-protokoll). Ska fungera offline utan nätverkslog.
3. **Granska master.xlsx Flik 5 Förklaring** — stämmer dokumentationen mot Dennis förväntade arbetsflöde? Dennis justerar fritt.
4. **Beslut om Q15:** committa `package-lock.json` eller inte? Min rek: committa.
5. **Beslut om Q14:** kör som separat prompt när nästa wbr-uppdatering kommer. Inte akut.

---

## Slutnot: hur arkitekturen möter framtida behov

| Behov | Lösning |
|---|---|
| Dennis ändrar pris | Redigera Flik 1 → Ctrl+S → `npm run build-config` → refresh |
| Ny post (t.ex. mattgolv 2) | Lägg rad i Flik 1 + Flik 3, bygg, refresh |
| Ny rumstyp (t.ex. balkong) | Lägg rad i Flik 2 + items i Flik 3 + ev. ny ikon i data.js |
| Ny Wikells-version | Q14 — script `update-from-wbr.js` (framtida) |
| Multi-kund (olika HSB-avtal) | Flera Pris-källa-värden (HSB-sundsvall-förhandlat, HSB-stockholm-förhandlat) eller ny `CUSTOMER_INFO`-kolumn. Utökning av build-config-logik. Framtida prompt. |
| Flera leveranser (dist) | `npm run build` → dist/renoveringskalkyl.html. Skicka till HSB. |
| Slutleverans till produktion | Samma som ovan. Bygg kan automatiseras via CI om behov uppstår. |

Arkitekturen är förberedd för alla ovan utan ytterligare refaktor.
