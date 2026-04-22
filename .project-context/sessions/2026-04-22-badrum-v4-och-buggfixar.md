# Session 2026-04-22 — Badrum v4 + bugfix #65 + bugfix #66

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input-prompt:** `.project-context/prompts/2026-04-21-badrum-v4.md` (Cowork, med Dennis)
**Ordning:** Del II → Del I → Del III, följt av dokumentation
**Status vid sessionsslut:** Kod + dokumentation färdig. Mekanisk verifiering: 40+ assertions PASS. Browser-verifiering återstår för Dennis.

---

## TL;DR

- **Del II (bugfix #65 + bonus):** Sovrum innerdörr count 1 (inte 2). Hårdkodad if/else-stege i app.js ersatt med deklarativ `ROOM_TYPES[typ].defaultOnCreate`-tabell i data.js.
- **Del I (badrum v4):** Badrum `type: 'schablon'` → `'per_post'`. 10 items + 3 rumsföljeposter. Wikells-kalibrerat (Dennis-egna byggdelar 8.502/8.503/8.504). Legacy-notis för sparade pre-v1.5-kalkyler.
- **Del III (bugfix #66):** `data-action` flyttad från checkbox-span till `<div class="followup-row">`. Typ B villkorlig (bara när triggered). Hela följepost-raden klickbar.
- **Dokumentation:** DESIGN.md v1.4 → v1.5, DECISIONS.md +8 entries, OPEN_QUESTIONS Q6 → BESVARAD, Q10-tabell utökad.

---

## Vad som gjordes, del för del

### Del II — Bugfix #65 + `defaultOnCreate`-deklarativt

**data.js:**
- Sovrum fick `defaultOnCreate: { innerdorr: { checked: true, count: 1 } }`.
- Entre fick `defaultOnCreate: { entre_klinker: { checked: true, area: 2 } }`.

**app.js:**
- Hela `if (type === 'sovrum') { … prevSovrum === 0 ? 2 : 1 … } else if (type === 'entre') { … } else if (type === 'ovrigt') { … }`-blocket (rad ~1354–1372) raderat.
- Ersatt med generisk loop som läser `ROOM_TYPES[type].defaultOnCreate` + runtime `perRoom`-skalning för Övrigt (item.perRoom × rumExkl).

**Verifiering (8/8 PASS):**
- Sovrum #1 & #2: `innerdorr.count === 1` ✅
- Entré: `entre_klinker.checked === true, area === 2` ✅
- Övrigt efter 3 andra rum: taklampa=3, eluttag=12, strombrytare=3 ✅
- `grep prevSovrum src/app.js` = 0 träffar (gammalt kodspår borta)

### Del I — Badrum schablon → per-post (v4)

**Nya items i `ROOM_TYPES.badrum.items` (10 st):**

| Post | Pris | Enhet | Egenskaper |
|---|---|---|---|
| Klinker våtrumsgolv | 2 555 | kr/m² | group: badrum_golv |
| Plastmatta våtrumsklassad | 1 194 | kr/m² | group: badrum_golv |
| Kakel på vägg | 2 492 | kr/m² vägg | wallCalc, group: badrum_vagg |
| Plastmatta på vägg | 1 504 | kr/m² vägg | wallCalc, group: badrum_vagg |
| Våtrumsfärg på vägg | 1 310 | kr/m² vägg | wallCalc, group: badrum_vagg |
| WC- och duschinredning | 30 816 | kr/st | hasCount, default 1 |
| Badrumsinredning | 9 274 | kr/st | hasCount, default 1 |
| Våtrumsdörr (målad trä) | 4 655 | kr/st | hasCount, default 1 (Dennis-val 16.059) |
| UE — El | 8 000 | kr/st | hasCount, default 1 |
| UE — VS | 12 000 | kr/st | hasCount, default 1 |

**Nya roomFollowups:**
- Skyddstäckning (typ B, kvar från v1.4): 46 kr/rum, triggered by malning — dimmad i badrum eftersom badrum saknar målningsposter.
- Rivning badrum inkl inredning: 1 200 kr/m² golv, **ingen triggeredBy → alltid aktiv**, defaultChecked.
- Fallspackling våtrumsgolv: 2 283 kr/m² golv, alltid aktiv.

**Tolkningsval (med Dennis OK):**
- `hasArea: true` borttaget från alla golv/vägg-items → de skalar strikt mot `rum.yta` (golv) eller `calcWallArea(rum.yta, rum.takhojd)` (vägg via wallCalc). Ingen per-rad m²-input.
- `useWallArea` ej införd — befintlig `wallCalc: true` har identisk semantik och återanvänds.
- Inga golv/vägg-items pre-selekterade i `defaultOnCreate` — kunden väljer aktivt.

**Arkitekturändringar:**
- `isRoomFollowupTriggered(rfu, rum)` utökad: ingen/tom `triggeredBy` → returnera `true`. Bakåtkompatibelt (SKYDDSTACKNING_FU har explicit triggeredBy, oförändrad).
- `calcFollowupTotal` behövde **inte** ändras. Fallback-grenen `else { yta = rum.yta }` fanns sedan v1.4 men aktiverades först nu (ingen tidigare room-scope fu hade `unit: 'kr/m²'`).
- `renderLegacyBadrumNotice(rum)` ny funktion i app.js. Renderas mellan `.room-head` och `.room-body` när gamla `badrum_standard`/`badrum_plus`-nycklar finns i state.

**CSS-tillägg:**
- `.room-legacy-notice` + `.room-legacy-notice-icon` — varm beige/orange info-banner med ikon.

**Verifiering (17/17 PASS):**
- Struktur: `type === 'per_post'`, `items.length === 10`, inga gamla id, inga hasArea på golv/vägg, wallCalc på alla vägg ✅
- **Scenario A** (5 m², klinker + kakel, allt default): **148 428,90 kr** (mina förväntade 148 429 ±5 kr) ✅
- **Scenario B** (5 m², plastmatta + våtrumsfärg): **116 250,79 kr** ✅
- **Scenario C** (yta 5→8 m²): Δ = 18 114 kr exakt (klinker 7 665 + rivning 3 600 + fallspackling 6 849) ✅
- **Scenario D** (takhöjd 2.4→2.7 med kakel): Δ = 6 686,74 kr (matchar `4√5 × 0.3 × 2492`) ✅
- **Scenario E** (alla 8 rumstyper laddar): samtliga PASS ✅
- **Legacy-ladd:** gamla nycklar bevaras, syncFollowups kraschar ej, subtotal = 17 415 kr (rivning + fallspackling alltid-on, gamla schabloner 0 kr) ✅

Skillnad mot promptens §4.2-sifforr: prompten föreslog Scenario A ≈ 144 800 kr ±500 med "anta väggyta 20 m² för enkelhet". Min siffra 148 429 kr använder faktisk `calcWallArea(5, 2.4) = 21.47 m²` — diffen 3 663 kr matchar (21.47 - 20) × 2492 = 3 664 kr. Appen räknar mer exakt än promptens handsumma.

### Del III — Bugfix #66 (följepost-rad klickbar)

**app.js-ändringar:**
- `renderFollowup` (typ A): `data-action="toggle-followup"` + `data-followup-id` flyttade från `<span class="checkbox">` till yttre `<div class="followup-row">`. Checkbox-spannen nu rent visuell.
- `renderRoomFollowup` (typ B): Samma flytt, men `data-action` injiceras via `const rowAction = triggered ? ' data-action="toggle-followup"' : ''`. Dimmade rader saknar `data-action` helt → `closest('[data-action]')` returnerar null → klick gör ingenting.

**CSS:**
- `.followup-row[data-action="toggle-followup"] { cursor: pointer; }` + hover-tint på label. Pointer dyker upp bara när raden är klickbar — dimmade typ B-rader får ingen pointer automatiskt.

**Verifiering:**
- `node --check src/app.js` OK.
- Rendered HTML-samples (mekaniskt inspekterade):
  - Typ A: `<div class="followup-row" data-action="toggle-followup" data-followup-id="golv_ekparkett__rivning">…<span class="checkbox checked"></span>…` ✅
  - Typ B triggered: `data-action` present på div ✅
  - Typ B dimmad: ingen `data-action`, `is-dimmed`-klass kvar ✅
- Event-handlern i app.js är oförändrad (använder `closest('[data-action]')` → fångar nya data-action-platsen gratis).

---

## Vad som fungerade

- **Ordning II → I → III var rätt.** `defaultOnCreate`-mönstret från Del II plockades upp direkt i Del I:s badrum (5 items). Hade jag gjort Del I först skulle jag behövt retrofitta sovrum/entré samtidigt — mer risk.
- **`calcFollowupTotal`-fallback var redan på plats.** Det sparade tid — prompten §7.3 varnade för "ny kombination" men `else { yta = rum.yta }` fanns sedan v1.4. Det enda som behövdes var att bekräfta att `parentItem &&`-guards fångar upp null-fallet. Mekaniskt testat: det fungerar.
- **`isRoomFollowupTriggered`-utökningen var minimal.** Två rader kod (one-line guard + kommentar) för att stödja "alltid-on"-fallet. Bakåtkompatibel.
- **Promptens radnummer var lätt off (±5 rader) men strukturellt korrekta.** Sanity-check mot disk innan implementation fångade upp glappen utan drama.

## Vad som krävde avvikelse från prompten / tolkning

- **`hasArea: true` på badrum-golv/vägg-items:** Prompten §3.3 hade listan; §7.2 sa de skalar mot rum.yta. Dennis klargjorde i svaret: **ta bort hasArea**. Gjort. Golv räknas nu enbart `pris × rum.yta` utan per-rad m²-input.
- **`useWallArea` vs `wallCalc`:** Prompten §3.3 använde `useWallArea`; §7.1 erkände att det var en felskrivning och `wallCalc` är den riktiga flaggan. Jag följde §7.1.
- **`defaultChecked` på typ B utan `triggeredBy`:** För att rivning/fallspackling ska kryssas automatiskt vid rumsskapande behövde jag utöka `isRoomFollowupTriggered` — "tom/saknad triggeredBy = alltid triggerad". Utan denna fix satte `syncFollowups` `checked: false` eftersom `triggered && defaultChecked = false && true = false`.

## Öppna frågor efter sessionen

Inga nya. Tidigare öppna kvar:
- Q4 — kontaktuppgifter för utskrift
- Q5 — spärrmålning-bekräftelse
- Q7 — disclaimer-text
- Q8 — hemsidereferens
- Q9 — info-dialog-innehåll (blir relevant när Dennis vill lägga till tooltip på "Våtrumsdörr målad trä" etc.)
- Q10 — återstående placeholders (köks-schabloner + ytterdörr + Övrigt-poster)
- Q12 — kap 29 projektgemensamt (kvar, rekommenderat D: disclaimer)
- Q13 — målning per-m²-underlag (kvar)

## Rekommendation för nästa steg

1. **Dennis UI-test i http://localhost:5520/** (incognito för att undvika gammal cache):
   - Lägg till sovrum → verifiera innerdörr-count 1
   - Lägg till badrum → verifiera 10 items + 3 rumsföljeposter (rivning+fallspackling alltid-on, skyddstäckning dimmad)
   - Kryssa klinker + kakel i badrum → verifiera total ~148 400 kr
   - Ändra yta från 5 till 8 → verifiera att klinker+rivning+fallspackling räknar om
   - Ändra takhöjd → verifiera att kakel räknar om
   - Klicka på följepost-*etiketten* (inte checkbox) → verifiera toggle
   - Klicka på prissiffra på typ A-följepost → verifiera toggle
   - Ladda legacy-kalkyl (manipulera localStorage med `badrum_standard`) → verifiera notis-rad + 0 kr bidrag från gamla schabloner
2. **Cowork återupptar UI-testsuiten** och kopplar resultat till Dennis 5 önskemål (badrum ytmodell, plastmatta vägg/tak, sakvaror-synlighet, Beijer-kökspriser, tooltip med Wikells-struktur).
3. **Slutleverans-blockerande frågor** (Q1 slutliga kökspriser, Q7 disclaimer, Q4 kontakt) — ta Dennis och HSB när testerna är klara.

## Filer som rörts denna session

```
src/
  data.js                     (+94 rader ≈ badrum-omskrivning, defaultOnCreate på 3 rumstyper, isRoomFollowupTriggered-utökning)
  app.js                      (rumsskapande-loop omskriven, renderLegacyBadrumNotice + renderFollowup/renderRoomFollowup data-action-flytt)
  style.css                   (.room-legacy-notice + .followup-row[data-action] cursor: pointer)

.project-context/
  DESIGN.md                   (v1.4 → v1.5, §5.2 badrum omgjord, §5.2a typ B-utökning, §5.2b defaultOnCreate, §7.4/§7.4a bugfix-noter, Appendix A uppdaterad, v1.5 changelog)
  DECISIONS.md                (+8 entries för 2026-04-22)
  OPEN_QUESTIONS.md           (Q6 → BESVARAD 2026-04-22, Q10-tabell utökad med 13 badrum-rader)
  sessions/
    2026-04-22-badrum-v4-och-buggfixar.md   (denna fil)
```

Total: 3 kodfiler + 4 dokumentationsfiler. Inga filer skapade utöver sessionsrapporten.

## Mekanisk sanering vid sessionsslut

```
$ node --check src/data.js           → exit 0
$ node --check src/app.js            → exit 0
$ grep -c "prevSovrum" src/app.js    → 0 (gammalt kodspår borta)
$ curl -s -o /dev/null -w "%{http_code}  %{size_download}\n" http://localhost:5520/data.js   → 200  27 240
$ curl -s -o /dev/null -w "%{http_code}  %{size_download}\n" http://localhost:5520/app.js    → 200  72 816
```

Dev-server (PID 1788 på port 5520) levererar färska filer med no-cache headers.
