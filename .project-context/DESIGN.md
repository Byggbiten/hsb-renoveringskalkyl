# DESIGN.md — Byggbiten Renoveringskalkyl

**Version:** 1.8 (Badrum UE-restructure + tagLabel + renoveringsprincip)
**Senast uppdaterad:** 2026-04-22
**Kund:** HSB (leverans från Byggbiten i Norrland AB)

> **Namnbyte 2026-04-21:** Appen hette tidigare "Ytskiktskalkylator". Eftersom omfattningen vuxit till att inkludera rivning, fallspackling och våtrumsförarbete (via följeposter) heter den nu **Renoveringskalkyl**. Underliggande storage-nycklar och variabelnamn i kod behålls (bakåtkompatibilitet).

---

## 1. Översikt

En interaktiv webbaserad kalkylator där HSB själva gör överslagskalkyler för typiska bostadsrättsrenoveringar. Användaren lägger till rum, anger kvadratmeter, kryssar för åtgärder (nytt golv, målning, nya dörrar, rivning, fallspackling, etc.) och ser en löpande totalsumma. Följeposter (rivning, spackling, skyddstäckning) kryssas default när de hör till åtgärden — men kan stängas av i särfall.

**Syfte för Byggbiten:** Ge HSB ett verktyg så de förstår prisbilden innan de begär offert. Det ska kännas som en tjänst Byggbiten levererar — proffsig design, tydliga priser, utskriftsvänligt. **Appen ska kännas cool och levande**, inte som ett online-Excel.

**Viktigt:** Detta är en överslagskalkylator, inte en bindande offert. Slutpris sätts alltid i offert efter platsbesök. Detta måste framgå tydligt i appen.

---

## 2. Målgrupp och användarfall

Primär användare: förvaltare på HSB som ska göra grov ekonomisk planering inför renovering av en bostadsrätt (ägarbyte, skada, planerat underhåll).

Typiska användarfall:
- "Hur mycket kostar det att lägga nytt parkettgolv och måla om i en 3:a?"
- "Vad blir det om vi också byter alla innerdörrar?"
- "Vad kostar helrenovering av badrum + nytt kök?"

Användaren är inte byggteknisk expert. Termer måste vara begripliga. Användaren ska inte behöva läsa instruktioner för att komma igång.

---

## 3. Leveransformat och teknik

### 3.1 Leveransformat
Appen levereras som **en enda fristående HTML-fil** (`renoveringskalkyl.html`) som HSB kan:
- Öppna direkt i webbläsare genom dubbelklick
- Mejla som bilaga
- Öppna på dator, iPad eller mobil utan installation

Inga externa beroenden i produktionsfilen. Allt CSS, JS, data och eventuella bilder inlinade (bilder som base64 eller SVG).

### 3.2 Teknisk stack
- **Vanilla HTML + CSS + JavaScript.** Inget ramverk.
- **Lokalt state** hanteras i JS-variabler.
- **localStorage** används för att spara användarens pågående projekt.
- **Google Fonts** kan användas under utveckling men ska bäddas in som base64 eller ersättas med system-fonts i slutlig leverans (appen ska fungera offline).

### 3.3 Projektstruktur (rekommenderad under utveckling)

```
byggbiten-kalkylator/
  src/
    index.html
    style.css
    data.js           ← priser, rumstyper, poster
    app.js            ← logik och rendering
    assets/
      logo.svg
  dist/
    kalkylator.html   ← bundlad slutlig fil (allt inlinat)
  build.js            ← Node- eller Python-script som bundlar src/ → dist/
```

Enklare upplägg (allt i en `index.html` från start) är OK om appens storlek inte motiverar splitting. Viktigast: slutleveransen är en enda fil.

### 3.4 Webbläsar-support
Moderna webbläsare (Chrome, Edge, Safari, Firefox — senaste två versionerna). Ingen IE-support. Ingen polyfill.

---

## 4. Branding och design

### 4.1 Byggbitens visuella identitet
Från logotypen framgår:
- **Färgpalett:** Svart, mörkgrå/antracit, mediumgrå, silver/ljusgrå. Ingen ljus accentfärg i logon.
- **Typografi i loggan:** gemener, rundad sanserif (påminner om Nunito / Comfortaa / Rubik).
- **Symbol:** stiliserad pusselbit — kan användas som grafisk accent i appen.

### 4.2 Föreslagen färgpalett

| Roll | Hex | Användning |
|---|---|---|
| `--brand-black` | `#1A1A1A` | Rubriker, knappar primär, totalsumma |
| `--brand-dark-gray` | `#3C3C3B` | Brödtext |
| `--brand-mid-gray` | `#7A7A79` | Sekundär text, metadata |
| `--brand-light-gray` | `#C6C6C6` | Dividers, disabled state, pusselbit-accent |
| `--surface-primary` | `#FFFFFF` | Kort-bakgrund |
| `--surface-secondary` | `#F7F6F3` | Sid-bakgrund (varm off-white) |
| `--border` | `#E5E3DC` | Kort-borders |
| `--accent-warning` | `#BA7517` | Schablon-taggar (gul-brun, ej neon) |
| `--text-on-dark` | `#F7F6F3` | Text på svart bakgrund |

Värdena är bästa gissning från logotypen — verifieras och ev. justeras mot Byggbitens profildokument om sådant finns. Ligger som CSS-variabler så de är lätta att justera.

### 4.3 Logga
Byggbitens logga är designad för svart bakgrund (pusselbit ljusgrå, text mörkgrå). På vit bakgrund fungerar inte den direkt.

**Alternativ:**
1. Be Dennis om en invers-version (transparent bakgrund, mörk text) — rätt väg för proffsig leverans.
2. Rita om loggan som SVG direkt i koden med mörka färger på transparent bakgrund.
3. Visa den befintliga loggan i en svart "header-bar" på ljus bakgrund som tillfällig lösning.

Se OPEN_QUESTIONS.md för aktuell status.

### 4.4 Typografi
- **Huvudtypsnitt:** `"Rubik"` eller `"Inter"` från Google Fonts under utveckling, inbäddat som base64 i slutleverans (eller system-font som fallback).
- **Vikter:** 400 (regular), 500 (medium). Undvik bold 700 utom i enskilda visuellt viktiga element.
- **Fallback-stack:** `'Inter', 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

### 4.5 Designprinciper

**Det ska kännas coolt och levande, inte som ett online-Excel.** Detta är en tydlig riktning: användaren ska reagera med "snyggt, detta ser ut som en app jag vill använda" — inte "jaha, ett kalkylark".

Konkret betyder det:
- **Mikro-interaktioner och transitions.** Hover-states, fade-ins vid laddning, räknare som "tickar" upp till totalsumman, smooth utfällning av rumskort.
- **Subtila skuggor och djup** är OK om de tjänar läsbarhet och premium-känsla. Släpp den tidigare "flat, inga skuggor"-regeln — vi vill snarare ha polerad modern app-estetik.
- **Generös whitespace** fortfarande prioriterat — inte tätt packat.
- **Tabular numerals** för alla prisvärden (`font-variant-numeric: tabular-nums`).
- **Sentence case,** inte Title Case, inte ALL CAPS (undantag: små labels som "EX. MOMS" i metadata).
- **Animationer ska vara fast och purposeful**, inte dröjande. Tumregel: 150–250ms för mikro-transitions, 300–500ms för entré-animationer. Easing: `cubic-bezier(0.4, 0, 0.2, 1)` eller spring-liknande.
- **Prestanda-medvetenhet:** animationer ska vara GPU-accelererade (transform, opacity), inte layout-triggande. Respektera `prefers-reduced-motion`.

---

## 5. Datamodell

### 5.1 Rumstyper

| Rumstyp | Standardyta (kvm) | Prissättning | Notering |
|---|---|---|---|
| Vardagsrum | 25 | Per post | |
| Sovrum | 15 | Per post | Första sovrum förfyller 2 innerdörrar, övriga 1 st |
| Hall | 5 | Per post | Har även Klinker (group golv) |
| Entré | 5 | Per post | Klinker som tillval (hasArea + reducesFloor), ytterdörr, hatthylla |
| Kök | 15 | Per post* | *Radio: Standard eller Plus-schablon, plus samma ytskikt som vardagsrum |
| Badrum (wc/dusch) | 5 | Per post | **v1.5:** Golv (klinker/plastmatta), Vägg (kakel/plastmatta/våtrumsfärg), WC-dusch, inredning, dörr, el, VS + 3 rumsföljeposter (skyddstäckning, rivning, fallspackling). Golv/vägg skalar mot rum.yta / calcWallArea. |
| Toalett (wc) | 2 | Per post | Har vägg-kakel (wallCalc) och porslin |
| Övrigt | (ingen) | Per post | `hideArea: true` — styckeposter som balkongdörr, el, slutstäd |

Användaren kan justera ytan efter att ha valt rumstyp. Samma rumstyp kan förekomma flera gånger (t.ex. 3 sovrum i en 4:a). Varje rum kan få ett eget **namn** (visas som rubrik + kategorinamn som subtitel).

### 5.2 Poster (åtgärder) per rumstyp

Kategorier (visas som divider i rumskortet när items skiftar kategori): `Köksinredning`, `Golv`, `Målning`, `Kakel`, `Tillval`. Poster utan kategori (t.ex. badrum-schablonen) får ingen divider.

**Språk-regel 2026-04-21:** Alla UI-labels är HSB-vänligt, renodlat och utan Wikells-tekniska termer. Exempel: "Golv ekparkett" → "Ekparkett", "Målning vägg" → "Väggar" (under Målning-kategorin), "Målning fönster inv." → "Måla fönster invändigt", "Ny innerdörr - komplett" → "Ny innerdörr", "Målning/förbättring bef. innerdörr" → "Måla befintlig innerdörr".

**Kök (per_post — radio-schabloner PLUS samma ytskikt som vardagsrum):**

*Köksinredning (group: "kok", ömsesidigt uteslutande):*
- Komplett kök standard inkl vitvaror — **[PLACEHOLDER: 150 000 kr]**
- Komplett kök Plus inkl vitvaror — **[PLACEHOLDER: 225 000 kr]**

*Följt av samma golv/målning/tillval som vardagsrum (se nedan). Schablon-grey aktiveras när en köks-schablon är vald → övriga items gråas ut (55 % opacity).*

**Badrum / wc-dusch (v1.8 per_post, Wikells-renovering + UE-schabloner för inredning):**

*Golv (group: "badrum_golv", mutex) — skalar mot rum.yta:*
- **Klinker på våtrumsgolv** — 2 555 kr/m² *(Wikells 15.015)*
- **Plastmatta våtrumsklassad** — 1 194 kr/m² *(Wikells 15.023)*

*Vägg (group: "badrum_vagg", mutex, wallCalc: true) — skalar mot calcWallArea(yta, takhojd):*
- **Kakel på vägg** — 2 492 kr/m² vägg *(Dennis-egen Wikells-byggdel 8.502)*
- **Plastmatta på vägg** — 1 504 kr/m² vägg *(Dennis-egen 8.503)*
- **Våtrumsfärg på vägg** — 1 310 kr/m² vägg *(Cowork-egen 8.504)*

*Dörr (hasCount: true, default 1):*
- **Våtrumsdörr (målad trä)** — 4 655 kr/st *(Wikells 16.059 — Dennis-val framför PP-laminerad 16.070)*

*UE-schabloner (hasCount: true, default 1) — ersätter tidigare inrednings-items enligt renoveringsprincipen (se § 11.5.9):*
- **Badrumsinredning inkl VVS-installation (UE)** — 40 000 kr/st, `tagLabel: UE-VS`, blå badge.
  Ingår: WC-stol, kommod med tvättställ, blandare, duschvägg, duschblandare, golvbrunn + avlopp, provtryckning + besiktning, montage.
- **El-installation badrum (UE)** — 20 000 kr/st (placeholder), `tagLabel: UE-El`, grön badge.
  Ingår: elgolvvärme (matta + termostat), spottar i tak, inkoppling badrumsskåp med belysning, brytare, eluttag (inkl vid spegel), besiktningsintyg.

*Rumsföljeposter:*
- ⤷ *Typ B* **Skyddstäckning** — 46 kr schablon (triggeredBy: malning — inte aktiv i badrum som saknar målningsposter; dimmad men kvar för konsistens)
- ⤷ *Typ B alltid-on* **Rivning badrum inkl inredning** — 1 200 kr/m² golv (ingen `triggeredBy` → alltid aktiv, defaultChecked)
- ⤷ *Typ B alltid-on* **Fallspackling våtrumsgolv** — 2 283 kr/m² golv *(Wikells 15.013)*

Gamla v1.3/v1.4-schabloner (`badrum_standard` / `badrum_plus`) är borttagna ur items. Sparade kalkyler som innehåller dessa nycklar visar en synlig notis-rad på badrummet: "Denna kalkyl är sparad före 2026-04-22 då badrum blev per-post. Välj om materialen för att få rätt pris." — gamla nycklar lämnas i `valda` men bidrar 0 kr eftersom items-listan inte längre refererar dem.

**Entré (per_post, samma uppsättning som vardagsrum + klinker + ytterdörr + hatthylla):**
- Se vardagsrum-items nedan
- Tillval: **Klinker (del av golv)** — 1 600 kr/m², `hasArea: true`, default 2 m², `reducesFloor: true` (dras av från golvytan vid beräkning av parkett/klickvinyl/matta)
  - ⤷ följepost typ A: "inkl. rivning av befintligt golv" — 95 kr/m² (`inheritsParentArea`), defaultChecked
  - ⤷ följepost typ A: "inkl. flytspackling undergolv" — 187 kr/m² (`inheritsParentArea`), defaultChecked
- Tillval: **Ytterdörr (Daloc säkerhets/lägenhetsdörr inkl montage)** — **[PLACEHOLDER: 28 000 kr/st]**
- Tillval: **Hatthylla inkl montage** — **[PLACEHOLDER: 3 500 kr/st]**
- Klinker förvalt ikryssad (2 m²) när entré skapas.

**Vardagsrum, sovrum, hall (per post):**

*Golv (group: "golv", radio) — alla har typ A-följeposter "inkl. rivning" och "inkl. flytspackling undergolv":*
- **Ekparkett** — 825 kr/m² *(Wikells 15.016)*. Rivning 95 kr/m² `defaultChecked: true`. Spackling 187 kr/m² `defaultChecked: false`.
- **Klickvinyl** — 755 kr/m² *(Wikells 15.018 laminat)*. Rivning on, spackling off.
- **Heltäckningsmatta** — 730 kr/m² *(Wikells 15.020 linoleum)*. Rivning on, spackling off.
- **Klinker** — 1 600 kr/m² *(Wikells 15.015 justerat ner, se DECISIONS 2026-04-21)* *(hall + toalett)*. Rivning on, spackling **on** (klinker kräver plant underlag).

*Målning (wallCalc för vägg):*
- **Tak** — 144 kr/m² (golvyta)
- **Väggar** — 144 kr/m² väggyta (omkrets × takhöjd, omkrets = `4 × √yta`)
- ⤷ *Rums-följepost typ B* **Skyddstäckning** — 450 kr/rum schablon, triggas av målning_tak eller malning_vagg, renderas i Målning-kategorin, defaultChecked vid trigger, dimmad när ingen trigger är aktiv.

*Tillval (hasCount):*
- **Ny innerdörr** — 5 070 kr/st, group: "innerdorr" *(Wikells 16.056)*
- **Måla befintlig innerdörr** — 1 210 kr/st, group: "innerdorr" (radio mot ny innerdörr) *(Wikells 14.048)*
- **Måla fönster invändigt** — 990 kr/st *(Wikells 14.047)* *(ej i hall)*
- **Garderob 60's stomme** — 14 600 kr/st *(Wikells 17.020)* *(ej i vardagsrum)*

**Toalett (per post):**
- Golv klickvinyl / heltäckningsmatta / klinker (radio, med rivning + spackling-följeposter)
- **Vägg kakel** — 1 160 kr/m² väggyta (`wallCalc: true`, kategori: Kakel) *(Wikells 15.027)*
- Målning tak + väggar (+ skyddstäckning-följepost)
- Ny innerdörr vs Måla befintlig innerdörr (radio)
- Porslin (wc-stol) — 8 600 kr/st

**Övrigt (per_post, `hideArea: true`):**
- Måla befintlig balkongdörr + Ny balkongdörr komplett (radio, placeholder)
- Byte av taklampa / fast ljuspunkt — `perRoom: 1` (förfylls med antal rum × 1)
- Byte av eluttag — `perRoom: 4` (förfylls med antal rum × 4)
- Byte av strömbrytare — `perRoom: 1`
- Byte av radiator / element
- Dörrhandtag (uppgradering)
- Slutstäd efter renovering

Alla övrigt-items är `placeholder: true`.

**Alla rum med takhöjd-baserade items** (målning väggar, kakel) får en egen **takhöjd-input** i rumskortet (default 2,4 m, editerbar).

**Rum-skapande defaults:**
- Sovrum 1 (första): innerdörr ikryssad, count 2. Sovrum 2+: innerdörr count 1.
- Entré: klinker ikryssad, area 2 m².
- Övrigt: eluttag/strömbrytare/taklampa förfylls baserat på `perRoom × (antal andra rum)`.

### 5.2a Följeposter (typ A + typ B)

Följeposter är mindre checkboxar som sitter under eller bredvid en huvudpost och räknas in i totalen när de är kryssade. Infördes 2026-04-21 för att transparent visa det förarbete som tidigare saknades i kalkylen (rivning, spackling, skyddstäckning).

**Regel:** Följeposter får inte ha egna följeposter (ingen nästling).

**Typ A — per-huvudpost:**
- Definieras på `items[].followups = [...]`.
- Aktiveras när parent-item kryssas i (parent går från unchecked → checked). Följeposterna får då det värde som deras `defaultChecked` anger.
- Inaktiveras (`checked: false`) när parent kryssas ur.
- Renderas **indenterat direkt under parent-raden** i rumskortet.
- Stöd för flaggor:
  - `inheritsParentArea: true` — använder parentens m²-input i stället för `rum.yta` (används av entre_klinker-följeposterna, där parentens `hasArea`-m² avgör).
  - `inheritsReducesFloor: true` — använder parentens reducerade golvarea (används av golv-spackling: `yta − Σ(reducesFloor.area)` i entré om klinker är ikryssad).

**Typ B — rums-scope (roomFollowups):**
- Definieras på `ROOM_TYPES[typ].roomFollowups = [...]`.
- Triggas av en eller flera items via `triggeredBy: [...]`-array. Om valfri trigger är kryssad räknas rums-följeposten som "aktiv".
- **v1.5-utökning:** Om `triggeredBy` saknas eller är tom array → alltid aktiv (alltid-on). Används av badrum-rivning och badrum-fallspackling som alltid ska räknas när rummet finns. Detta påverkar inte befintliga `SKYDDSTACKNING_FU` som har explicit `triggeredBy`.
- `defaultChecked: true` betyder att följeposten automatiskt kryssas när första trigger-item kryssas i (och kryssas ur när sista trigger kryssas ur, **om** användaren inte manuellt ändrat status).
- Användaren kan kryssa av den i särfall och då "kommer den ihåg" att vara av.
- Renderas alltid i rumskortet, i sektionen som anges av `renderInCategory`. Dimmad (55 % opacity) när ingen trigger är aktiv.
- Aktuella:
  - Skyddstäckning (alla per-post-rum utom övrigt) — triggas av målning, `unit: 'schablon'` 450 kr/rum.
  - Rivning badrum inkl inredning (badrum) — ingen triggeredBy = alltid-on, `unit: 'kr/m²'` 1 200 kr/m² golv.
  - Fallspackling våtrumsgolv (badrum) — ingen triggeredBy = alltid-on, `unit: 'kr/m²'` 2 283 kr/m² golv.
- **v1.5 — typ B med `unit: 'kr/m²'`:** `calcFollowupTotal` hanterade redan fallet via sin fallback-gren `else { yta = rum.yta }` när parentItem är null. Ingen kod-ändring krävdes för att stödja kr/m²-rumsföljeposter — men det var en ny kombination som aktiverades först i v1.5.

**syncFollowups(rum)** — graceful upgrade-funktion:
- Körs vid app-start på alla existerande rum, både aktivt state och `savedProjects`.
- Lägger till följepost-entries som saknas i `rum.valda` med korrekt defaultvärde.
- Säkerställer att gamla kalkyler (från v1.3) inte kraschar utan får nya följeposter auto-applicerade enligt deras `defaultChecked` + parent/trigger-status.
- **v1.5 + legacy badrum:** gamla nycklar som `badrum_standard`, `badrum_plus`, `badrum_standard__rivning` etc. lämnas orörda i `valda`. De refereras inte av nya `items[]` i ROOM_TYPES.badrum → bidrar 0 kr till subtotal. En visuell notis-rad renderas på rumskortet för att förklara för användaren varför priset ser annorlunda ut.

### 5.2b `defaultOnCreate` — deklarativ rumsskapande-default (v1.5)

Tidigare (≤ v1.4) hanterade app.js en hårdkodad `if (type === 'sovrum') … else if (type === 'entre') … else if (type === 'ovrigt') …`-stege för att förifylla specifika items vid rumsskapande. Det var svårt att underhålla och gjorde att badrum-v4 inte kunde återanvända mönstret.

**v1.5:** Varje rumstyp kan ha en deklarativ `defaultOnCreate`-tabell:

```js
ROOM_TYPES.sovrum.defaultOnCreate = {
  innerdorr: { checked: true, count: 1 }   // v1.5 bugfix #65: count 1, inte 2
};
ROOM_TYPES.entre.defaultOnCreate = {
  entre_klinker: { checked: true, area: 2 }
};
ROOM_TYPES.badrum.defaultOnCreate = {
  badrum_dorr:       { checked: true, count: 1 },
  badrum_ue_el:      { checked: true, count: 1 },
  badrum_ue_vs:      { checked: true, count: 1 }
  // v1.8: badrum_wc_dusch + badrum_inredning borttagna (ersatta av badrum_ue_vs).
};
```

Rumstyper utan `defaultOnCreate` (vardagsrum, hall, kök, toalett) får inget förifyllt utöver följepost-defaults via `syncFollowups`.

**Övrigt-rummets `perRoom`-skalning** är fortfarande runtime (beroende av antal befintliga rum) och hanteras som specialfall på item-nivå — `item.perRoom && item.hasCount` triggar skalning `perRoom × rumExkl` i app.js-loopen. Det är **inte** i `defaultOnCreate` eftersom värdet beror på state.

### 5.3 Avgränsning — vad som tas bort från originalexcel

Originalfilen har "spärrmålning vägg" (165 kr/m²) och separata rader för "målning tak", "målning vägg" och "målning vägg & tak" med samma pris.

**Beslut:** Tak + Väggar är separata items (olika beräkningsbaser: golvyta vs `wallCalc` väggyta) men har samma kr/m². Spärrmålning tas bort från UI (specialåtgärd, hör inte hemma i överslagskalkylator). Verifieras i OPEN_QUESTIONS.md innan slutleverans.

### 5.3a Prisunderlag — Wikells Sektionsdata + omkostnadspåslag

Från 2026-04-21 är alla priser i `data.js` härledda ur Wikells Sektionsdata (referens: `.project-context/references/HSB-3a-kalkyl-sammanfattning.md`). Formeln som används:

```
pris_per_enhet = mtrl + tim × 250 × 3.72 + ue × 1.10
```

där:
- `mtrl` = Wikells material-pris per enhet
- `tim` = Wikells arbetstid per enhet
- 250 = timlön
- 3.72 = 1 + 272 % omkostnadspåslag på arbete (Byggbitens OH)
- `ue` = Wikells UE (under-entreprenad) per enhet
- 1.10 = 1 + 10 % omkostnadspåslag på UE

Priset är det HSB betalar (offertpris), inte Byggbitens direkta kostnad.

**Undantag** (Byggbiten-erfarenhet, inte ren Wikells):
- Kök-schablon (ingen Wikells-motsvarighet)
- Ytterdörr Daloc (säkerhetsklass över Wikells standard)
- Klinker 1 600 kr/m² (medveten undervärdering av Wikells 2 544 för konkurrensläge)
- Hatthylla 3 500 kr (mer gedigen än Wikells standard)
- Badrum standard/plus (schablon-paket)
- Skyddstäckning 450 kr/rum (Wikells 14.017 är uppenbart för låg på 42 kr)
- Målning 144 kr/m² (Wikells HSB-3a-sammanfattningen saknar granulär per-m²-data)

Varje pris i `data.js` har kommentar som anger källa (Wikells-id eller "Byggbiten-erfarenhet").

### 5.4 Datastruktur i kod

```javascript
// v1.4 — Wikells-kalibrerat + följeposter.

// Factory-funktioner för golv-följeposter så varje golv-item kan återanvända samma mönster.
function floorRivningFU(parentId) {
  return {
    id: parentId + '__rivning',
    label: 'inkl. rivning av befintligt golv',
    price: 95, unit: 'kr/m²',
    defaultChecked: true,
    inheritsReducesFloor: true   // följer parentens reducerade golvarea
  };
}
function floorSpacklingFU(parentId, defaultChecked) {
  return {
    id: parentId + '__spackling',
    label: 'inkl. flytspackling undergolv',
    price: 187, unit: 'kr/m²',
    defaultChecked: !!defaultChecked,
    inheritsReducesFloor: true
  };
}

// Delade huvud-items — samma referens används av flera rum.
const GOLV_EKPARKETT = {
  id: 'golv_ekparkett', label: 'Ekparkett',
  price: 825, unit: 'kr/m²',  // Wikells 15.016
  group: 'golv', category: 'Golv',
  info: { description: null, image: null },
  followups: [
    floorRivningFU('golv_ekparkett'),
    floorSpacklingFU('golv_ekparkett', false)   // parkett: spackling default OFF
  ]
};

// ... GOLV_KLICKVINYL (755), GOLV_MATTA (730), GOLV_KLINKER (1600) — samma mönster.
// Klinker har floorSpacklingFU(..., true) — default ON.

// Rums-följepost typ B — renderas i Målning-kategorin, triggas av någon målning.
const SKYDDSTACKNING_FU = {
  id: 'skyddstackning',
  label: 'Skyddstäckning',
  price: 450, unit: 'schablon',
  defaultChecked: true,
  triggeredBy: ['malning_tak', 'malning_vagg'],
  renderInCategory: 'Målning'
};

const ROOM_TYPES = {
  vardagsrum: {
    displayName: 'Vardagsrum', defaultArea: 25, type: 'per_post',
    items: [GOLV_EKPARKETT, GOLV_KLICKVINYL, GOLV_MATTA, MALNING_TAK, MALNING_VAGG, INNERDORR, INNERDORR_MALNING, FONSTER_MALNING],
    roomFollowups: [SKYDDSTACKNING_FU]
  },
  badrum: {
    displayName: 'Badrum', defaultArea: 5, type: 'schablon',
    items: [
      {
        id: 'badrum_standard', label: 'Helrenovering badrum standard',
        price: 85000, unit: 'schablon', group: 'badrum', primary: true,
        followups: [
          { id: 'badrum_standard__rivning', label: 'inkl. rivning av befintligt badrum', price: 5500, unit: 'schablon', defaultChecked: true },
          { id: 'badrum_standard__fallspackling', label: 'inkl. fallspackling våtrumsgolv', price: 9100, unit: 'schablon', defaultChecked: true }
        ]
      },
      {
        id: 'badrum_plus', label: 'Helrenovering badrum plus',
        price: 115000, unit: 'schablon', group: 'badrum', primary: true,
        followups: [
          { id: 'badrum_plus__rivning', label: 'inkl. rivning av befintligt badrum', price: 7500, unit: 'schablon', defaultChecked: true },
          { id: 'badrum_plus__fallspackling', label: 'inkl. fallspackling våtrumsgolv', price: 13700, unit: 'schablon', defaultChecked: true }
        ]
      }
    ]
  }
  // ... entre, kok, hall, toalett, sovrum, ovrigt
};
```

Viktigt:
- Poster med samma `group` är **ömsesidigt uteslutande** inom ett rum. Exempel: `group: "golv"` (ekparkett/klickvinyl/matta/klinker), `group: "kok"` (standard/Plus), `group: "badrum"` (standard/plus), `group: "innerdorr"` (ny/måla befintlig), `group: "balkongdorr"` (ny/måla befintlig).
- Poster med `hasCount: true` visar antal-input.
- Poster med `hasArea: true` visar m²-input (eget, ej rum.yta). `reducesFloor: true` betyder att items-m² dras av från golvytan för andra group: "golv"-items i samma rum.
- Poster utan `hasCount`/`hasArea` beräknas som `pris × rum.yta` (eller `wallCalc: true` → pris × omkrets × takhöjd).
- Poster med `placeholder: true` renderas med "Preliminärt pris"-tagg i UI.
- Poster med `info: { ingar, ingarEj, wikellsRef, image }` (v1.6) renderas med chevron längst till höger på raden som fäller ut en panel. Se § 6.4 + § 7.4b nedan.
- Poster med `primary: true` är "huvudvalet" i sin grupp — styr bl.a. schablon-grey-beteendet.
- **Följeposter (§ 5.2a):** `items[].followups: [...]` för typ A, `ROOM_TYPES[typ].roomFollowups: [...]` för typ B.

### 5.5 Projektets state

```javascript
const state = {
  projektNamn: "",
  datum: "2026-04-21",
  rum: [
    {
      id: "r1",
      typ: "vardagsrum",
      yta: 25,
      takhojd: 2.4,
      valda: {
        // Huvudpost + dess typ A-följeposter:
        golv_ekparkett: { checked: true },
        golv_ekparkett__rivning: { checked: true },         // Typ A, auto från defaultChecked
        golv_ekparkett__spackling: { checked: false },      // Typ A, default off för parkett
        malning_tak: { checked: true },
        malning_vagg: { checked: true },
        innerdorr: { checked: true, count: 2 },
        // Typ B — rums-scope:
        skyddstackning: { checked: true }                   // Triggas av målning, default on
      }
    }
  ]
};
```

**Tidigare v1.3-kalkyler** (utan följepost-nycklar) uppgraderas transparent via `syncFollowups(rum)` vid app-start — saknade följepost-entries läggs till med korrekt `checked` enligt sin parent/trigger + `defaultChecked`.

---

## 6. Funktionalitet

### 6.1 Kärnflöde
1. Användaren öppnar appen → tom vy + "+ Lägg till rum"-knapp + infotext.
2. Klickar "+ Lägg till rum" → väljer rumstyp (modal eller dropdown).
3. Nytt rumskort läggs till med standardyta (animerat utfällande).
4. Användaren justerar ytan (kvm-input, steg 1).
5. Kryssar i poster. Delsumma uppdateras live (med kort fade-transition på summan).
6. Totalsumma längst ner uppdateras live (med "tick up"-animation när värdet ändras).
7. Kan lägga till fler rum eller ta bort befintliga (animerat).
8. Kan klicka "Skriv ut / spara som PDF" eller "Begär offert".

### 6.2 Funktioner som krävs (v1)
- Lägg till rum (flera av samma typ tillåts)
- Ta bort rum (med bekräftelse)
- Ändra yta per rum
- Kryssa i/ur poster per rum
- Ange antal för styck-poster
- Välja mellan golvmaterial (ömsesidigt uteslutande inom grupp)
- Namnge projektet (fritt textfält i headern)
- Spara automatiskt till localStorage (debounce 300ms)
- Ladda automatiskt från localStorage vid start (+ "Börja nytt"-knapp)
- Skriva ut / exportera som PDF via webbläsarens utskriftsfunktion

### 6.3 Funktioner som INTE byggs i v1
- Inloggning eller kontohantering
- Serverkommunikation
- Multipla projekt samtidigt
- Delning via länk
- Export till Excel
- Prishistorik eller versioner

### 6.5 Login-vy + autentisering

- App-state routar mellan tre vyer: `login` / `home` / `calc` (state.view).
- Login: split editorial-design (vänster mörk brand-kolonn, höger vit form). Vit Byggbiten-logga, hero-rubrik, användarnamn + lösenord.
- **Hårdkodad auth** (lokal app, ingen server): användarnamn `hsbsundsvall` (case-insensitive), lösenord `Byggbiten2026!`. Konstanter i `app.js` (`AUTH_USER`, `AUTH_PASSWORD`).
- Fel-respons: röd felruta med shake-animation.
- Login-tillstånd persistas till localStorage så användaren stannar inloggad vid omladdning.
- Logga ut-knapp i hemvyns header + (vid behov) i calc-vyn.

### 6.6 Hemvy (dashboard för sparade kalkyler)

- Mörk header-baner (samma gradient som login-brand) med logga + användare + logga ut.
- Hero: "VÄLKOMMEN TILLBAKA" eyebrow + "Vad vill du göra idag?"-rubrik.
- Två action-cards:
  - **Ny kalkyl** (primär, svart ikon-bakgrund) — nollställer calc + byter till calc-view.
  - **Återuppta kalkyl** (sekundär) — rullar till projekt-listan nedan. Disabled om inga sparade.
- **Senast sparade kalkyler** — lista med projekt-rader (ikon + namn + meta + total + "Ex. moms"). Klick → laddar projektet till calc-view.
- Empty-state ("Inga sparade kalkyler än") om savedProjects.length === 0.

### 6.7 Sidebar + scroll-spy (i calc-view)

- Vänsterkolumn (228 px) i `.app-shell`-grid: 228 px sidebar + 760 px main.
- Sidebar innehåller två kort:
  1. **Rum-navigator**: header "RUM" + antal, lista med rum (ikon + namn + meta), divider, "+ Lägg till rum".
  2. **Actions**: "Spara kalkyl" (primär) + "Återgå till hemvy" (ghost). Samma höjd (200 px) och bottom-alignment som total-kortet.
- **Scroll-spy**: rAF-polling av `window.scrollY` markerar aktivt rum i sidebar baserat på vilket rum som är närmast 25 % från viewport-toppen.
- Klick på sidebar-item → smooth-scrolla till rummet + koppar-ring-highlight 1,1 s.
- Sidebar är sticky (top 14 px, full viewport-höjd). Rum-listan scrollas internt vid många rum (nav flex:1 + overflow-y:auto).
- Mobil (≤ 960 px): sidebar display:none, main full bredd.

### 6.8 Drag-and-drop för rumsordning

- Liten drag-handle (6-dot grip) överst på varje rumskort.
- Pointer-event-baserat (pointerdown → pending → move >5px → active).
- Vid crossover (draggat kortets mitten passerar grannkortets mitten): state.rum reorganiseras, DOM flyttas, övriga rum FLIP-animeras (280 ms) till nya positioner. Draggat kort följer cursorn utan transition-lag.
- Vid släpp: spring-animation tillbaka till identity.
- Sidebar-ordningen speglar rum-ordningen, uppdateras efter swap.

### 6.9 Stepper-kontroller på numeriska inputs

- Upp/ner-chevron-knappar bredvid alla numeriska inputs (yta, takhöjd, antal, klinker-m²).
- Step: yta/antal/klinker = 1, takhöjd = 0,1.
- Press-and-hold: 360 ms delay, sedan repeat var 90 ms.
- Opacity 0,45 default → 1,0 vid hover/focus på fältet.

### 6.10 Nummer-animationer

- `tweenNumberTo(el, newValue, duration)` interpolerar siffror (easeOutExpo, 240–380 ms).
- `pulseNumber(el)` ger subtil scale-puls (1 → 1,045 → 1) när värdet ändras.
- Används på item-price, subtotal och total. Bootstrap-count från 0 till total vid page-load.

### 6.4 Förberett för framtid — info-dialog per material
Vissa material-poster (t.ex. "Golv ekparkett") ska i framtiden vara klickbara och öppna en dialog/modal med:
- Utförligare beskrivning av materialet
- Bild på materialet
- Ev. länk till leverantör eller teknisk spec

**v1-förberedelse:**
- Datamodellen har `info: { description, image }` per post (se § 5.4).
- I v1 är `description` och `image` `null` för alla poster — Dennis levererar innehåll senare.
- Posters utan info renderas som vanlig text (nuvarande beteende).
- Post med åtminstone `description` satt ska renderas med:
  - Subtil visuell hint om klickbarhet (info-ikon bredvid texten, eller underline-on-hover)
  - Cursor: pointer
  - Öppnar dialog med beskrivning + ev. bild vid klick
- Dialog-komponenten byggs inte i v1 (väntar på underlag) men datamodell och renderings-conditional ska vara förberedda så feature-aktiveringen blir trivial.

**Konkret i v1-UI:** Golv-posterna har info-ikon som hint (alltid synlig men subtil) så användaren ser att mer info finns att få senare.

---

## 7. UI-komponenter och layout

### 7.1 Header
- Byggbitens logga (vänster)
- Titel: "Renoveringskalkyl"
- Undertitel: "Överslag för bostadsrättsrenovering"
- Projekt-metadata (höger): fritt textfält för projektnamn + automatiskt datum

### 7.2 Rumskort
Vit (eller nära-vit) bakgrund, tunn border, rundade hörn (12px), subtil skugga:
- Rumstyp + ytanangivelse i rubriken
- Kvm-input
- "Ta bort"-knapp
- Lista med poster (checkbox + label + pris + antal-input för styck-poster)
- Delsumma längst ner

Osynliga/ogiltiga poster per rumstyp visas inte (t.ex. kakel inte i sovrum).

### 7.3 Total-kort (längst ner, ev. sticky)
- Rubrik "Total uppskattad kostnad"
- Information om moms-behandling (se OPEN_QUESTIONS)
- Stor summa, tabular numerals, animerad uppdatering
- Antal rum
- "Skriv ut" + "Begär offert"-knappar
- Disclaimer: "Uppskattning baseras på Byggbitens schablonpriser för bostadsrättsrenovering 2026. Slutligt pris ges i offert efter platsbesök."

### 7.4 Schablon-beteende
När en schablonpost (Komplett kök) kryssas i:
- Övriga poster i samma kort **gråas ut (55% opacity)** så användaren ser att de finns men inte räknas. Följeposter till schablonen är undantagna från gråningen och räknas normalt.
- Schablonen urkryssas → övriga aktiveras igen (smooth fade).

**v1.5 — badrum använder INTE schablon-grey** eftersom rumstypen nu är per-post. Istället används `group: 'badrum_golv'` och `group: 'badrum_vagg'` som vanliga mutex-grupper (som golv-grupp i sovrum).

### 7.4b Expanderbara item-rader (v1.6)
- Varje item med `info.ingar[]` eller `info.wikellsRef` renderas med en **chevron-knapp** längst till höger i `.item`-griden (5:e kolumn).
- Chevron: 28×28 klickyta, inline SVG, roterar 180° vid expansion.
- Egen `data-action="toggle-item-details"` → event-delegationen plockar action-namnet först (via `closest`), så chevron-klick triggar **inte** `toggle-item` på samma rad.
- Expand-panel: `<div class="item-details-panel">` renderas som sibling efter `.item` (inte inuti). Klasserna "INGÅR" / "INGÅR EJ" + bullet-listor + Wikells-referens längst ned.
- State: `state.expandedItems: Set<itemId>` — session-bundet, inte persisterat till localStorage. Rensas vid vyväxling (`go-home`, `new-calc`).
- Items utan relevant info (kök-schabloner, ytterdörr, Övrigt-poster) får `<span class="item-chevron-placeholder">` i 5:e kolumnen — behåller grid-layout utan chevron.

### 7.4c Gråade summor (v1.6)
- `.item-price.muted` ger ljus grå färg (`var(--brand-light-gray)`) när posten inte bidrar till totalen.
- Villkor: item unchecked; `hasCount` + count=0; följepost unchecked eller beräknad till 0 kr; typ B dimmad (ingen trigger).
- Gäller både `.item .item-price` och `.followup-row .item-price` via samma `.muted`-modifier.
- Print-layouten använder **inte** `.muted` — alla rader i print visas i samma svart.

### 7.4a Följepost-rendering (v1.4 + v1.5)
- **Typ A (per-huvudpost)** renderas i en `<div class="followup-row">` direkt under sin parent-rad, indenterad 36 px. En liten dash (`—`) markerar kopplingen visuellt.
- **Typ B (rums-scope)** renderas i den kategori som `renderInCategory` anger (typiskt Målning, eller Tillval för badrum). Rader får CSS-klassen `followup-room-scope`. När ingen trigger är aktiv får raden `.is-dimmed` (opacity 0.45) men står kvar — så användaren ser att följeposten finns men vet att den inte räknas just nu.
- Entré-animation (`followupIn`, 220 ms ease-out) när en följepost blir synlig första gången.
- **v1.5 (bugfix #66):** `data-action="toggle-followup"` sitter på yttre `<div class="followup-row">` (inte bara på `<span class="checkbox">`). Hela raden är klickbar — label, pris, checkbox och tom yta — så länge raden inte är dimmad.
  - Typ A: alltid klickbar (data-action statiskt på div).
  - Typ B: `data-action` infogas villkorligt — **endast när triggered**. Dimmade rader saknar attributet helt, så `closest('[data-action]')` i event-handlern returnerar null → klick gör ingenting.
  - CSS: `.followup-row[data-action="toggle-followup"] { cursor: pointer }` ger pointer-feedback endast på klickbara rader.

### 7.5 Responsivitet
- **Desktop:** ca 720px max bredd, centrerad.
- **Tablet (iPad):** samma layout, funkar i stående och liggande.
- **Mobil (≤ 480px):** en kolumn, inputfält lite mindre. Använd `minmax(0, 1fr)` i grid för att undvika overflow.

### 7.6 Pusselbit-accent
Pusselbit-symbolen från loggan kan användas som grafisk accent — bredvid "+ Lägg till rum"-knappen eller som subtil vattenstämpel bakom total-kortet. Placering avgörs av vald mockup-riktning.

---

## 8. Utskrift / PDF-export — "Kalkylbudget" (v1.6)

### 8.1 Dokument-identitet

Utskriften är designad som **kalkylbudget** (inte offert). Matchar Byggbitens Staben 2-offertmall i layout men har medvetna skillnader för att undvika att dokumentet uppfattas som bindande:

- Titel: **KALKYLBUDGET** (inte "OFFERT").
- Ingen "AVTALSBEKRÄFTELSE"-sektion, inga signaturrader.
- "KALKYLNAMN / PROJEKT" istället för "OFFERTNR / PROJEKT".
- Två prisspalter i tabellen: **Netto (ex moms)** och **Inkl moms** (× 1,25).
- "NÄSTA STEG"-sektion som hänvisar till Byggbiten för platsbesök.
- "INGÅR EJ" listar bygglov, föroreningar, anslutningsavgifter, boende.

### 8.2 Teknisk implementation

- **Dedikerad print-DOM:** `<div id="print-layout">` i `index.html`. `display: none` på skärm, `display: block` i `@media print`. All on-screen UI (sidebar, knappar, modals, flash-banner, expand-paneler) döljs i print via `display: none !important`.
- **Rendering:** `buildPrintData(state)` returnerar strukturerad data (header, rum, sammanställning, total). `renderPrintLayout()` bygger HTML från data och skriver in i `#print-layout`. Körs i två triggers:
  1. Skriv ut-knappens `triggerPrint()`-handler.
  2. `window.beforeprint`-listener (Ctrl+P direkt).
- **Filnamn:** `triggerPrint()` sätter `document.title` temporärt till `Kalkylbudget_<sanitiserat>_<YYYY-MM-DD>` innan `window.print()`, så webbläsaren föreslår rätt PDF-filnamn. Återställs efter 500 ms.
- **Kod-kolumn:** `extractWikellsId(info.wikellsRef)` extraherar `15.016`, `8.502`, `14.038` m.fl. via regex `/(\d{1,2}\.\d{3})/`. Tom kolumn för items utan Wikells-koppling.

### 8.3 Kund/leverantör/ombud

Tre konstanter i `app.js`:
- `CUSTOMER_INFO` — hårdkodad för HSB Sundsvall (TODO multi-kund).
- `SUPPLIER_INFO` — Byggbiten i Norrland AB inkl. org.nr, F-skatt, tel, e-post, bankgiro, momsreg.
- `OMBUD_INFO` — Dennis Sendelbach.

### 8.4 @page och sidbrytningar

- `@page { size: A4; margin: 16mm 14mm 18mm 14mm; }`.
- Sida 1: header + blocken + arbetsbeskrivning + rum-för-rum-tabeller. `.print-room { page-break-inside: avoid }` så ett rum aldrig delas över två sidor.
- Sida 2: `.print-page-break { page-break-before: always }` tvingar sammanställning + disclaimers på egen sida.
- `.print-footer` är `position: fixed; bottom: 6mm` så sidfoten upprepas på varje sida med företagsinfo.

### 8.5 Logga

Print använder **mörka** Byggbiten-loggan (`assets/byggbiten_logga_transparent_beskuren.svg`) — skärm-versionen är vit-på-mörk och syns inte på print-bakgrund.

---

## 9. Begär offert-flöde (v1.6)

### 9.1 Koncept
Knappen "Begär offert" (tidigare stub) öppnar en trestegs-modal:
1. **Spara kalkylen som PDF** — triggar samma utskriftsflöde som knappen "Skriv ut" (se § 8).
2. **Öppna mejl i** — tre knappar: "Inbyggt mejl" (mailto), "Gmail", "Outlook".
3. **Bifoga PDF:en + tryck Skicka** — instruktion; PDF kan inte bifogas programmatiskt.

### 9.2 Mejl-URL:er
- **Native:** `mailto:dennis@byggbiten.nu?subject=<kodat>&body=<kodat>`
- **Gmail:** `https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...`
- **Outlook:** `https://outlook.office.com/mail/deeplink/compose?to=...&subject=...&body=...`

Alla öppnas via `window.open(url, '_blank')`.

### 9.3 Ämne + brödtext (förifyllt)
```
subject = `${projektNamn} — ${datum}`
body = `Hej Dennis,\n\nVi önskar skarp offert för ${projektNamn}. Återkom gärna för mer information eller platsbesök.\n\nKalkyl-PDF bifogas.\n\nVänliga hälsningar,\n${state.auth.user}`
```

### 9.4 Felhantering native
`mailto`-hantering kan misslyckas om ingen default-mejlklient är konfigurerad. Ingen robust detektering finns. Lösning: direkt efter `window.open(mailto)` visas en flash-banner: *"Om mejlappen inte öppnas automatiskt, använd Gmail eller Outlook istället."* — ingen fördröjning, lätt upptäckt för användaren.

### 9.5 Konstanter
- `OFFERT_RECIPIENT = 'dennis@byggbiten.nu'` (överst i `app.js`).
- `sanitizeFilename(str)` — förenklar till `[a-zA-Z0-9_-]`, max 60 tecken, å/ä/ö → a/a/o.

---

## 9. Persistans (localStorage)

- Nyckel: `byggbiten_kalkylator_v1`.
- Debouncad 300 ms efter varje state-mutation (toggle, inputs, drag-swap, add/remove, login/logout, spara).
- Vid page-load: återställer vy + auth + data. Om `auth.loggedIn === false` → login-view. Annars → senaste vyn (home/calc).
- Snapshot-struktur:
  ```js
  {
    view: 'login' | 'home' | 'calc',
    auth: { loggedIn: boolean, user: string | null },
    savedProjects: [{ id, projektNamn, datum, rum, updatedAt }],
    currentProjectId: string | null,  // om aktiv calc är en laddad kalkyl
    projektNamn, datum, rum  // aktiv calc-state (utöver savedProjects)
  }
  ```
- **Spara-flöde:** "Spara kalkyl" (sidebar) → snapshot läggs i `savedProjects` (updates om samma id). Flash-banner "Kalkyl sparad" i 1,8 s.
- **Ladda-flöde:** Klick på projekt-rad i hemvyn → calc-state skrivs över från snapshot, view → calc.
- Bumpa nyckelnamnet (`_v2`) vid inkompatibla schemaändringar.

---

## 10. Acceptanskriterier

Appen är klar när:

- [ ] Allt innehåll på svenska (knappar, labels, disclaimers, felmeddelanden)
- [ ] Fungerar offline (alla tillgångar inbäddade)
- [ ] Allt CSS, JS och logga inline i slutlig HTML-fil
- [ ] Användare kan lägga till minst 6 rumstyper
- [ ] Samma rumstyp kan läggas till flera gånger
- [ ] Golvmaterial beter sig som ömsesidigt uteslutande grupp
- [ ] Antal-input för styck-poster fungerar (spärrar vid ≤0, max 20)
- [ ] Total uppdateras omedelbart vid ändring med animation
- [ ] Rumskort gråar ut icke-relevanta poster när schablon är vald
- [ ] localStorage persistens fungerar
- [ ] "Börja nytt"-knapp finns och fungerar
- [ ] Utskriftsvy (print CSS) ger en snygg PDF
- [ ] Byggbitens logga visas i header (i format som Dennis godkänt)
- [ ] Disclaimer "Uppskattning, inte bindande offert" synlig på skärm och utskrift
- [ ] Appen ser OK ut på iPhone (min 375px bred) och iPad
- [ ] Appen har de mikro-interaktioner och transitions som definierats (§ 4.5)
- [ ] Animationer respekterar `prefers-reduced-motion`
- [ ] `README.md` förklarar leverans
- [ ] Slutlig `dist/kalkylator.html` är < 500KB

---

## 11. Non-goals

- Inte ett internt kalkylsystem för Byggbiten — det är ett HSB-verktyg.
- Prissättningen är förenklad och medvetet grov.
- Inte en offertgenerator — "Begär offert"-knappen leder till Byggbitens vanliga offertprocess.
- Ingen server, ingen molnsync, ingen statistik — **lokal lagring per browser/enhet**.
- **Login**: hårdkodad gatekeeper, inte riktig säkerhet. Syftet är att prisinformationen inte sprids lättvindigt, inte att skydda data.

---

## 11.5 Pris-arkitektur (v1.7) — master.xlsx-driven konfiguration

Från v1.7 bor alla priser, rumstyper och rum×post-mappningar i **`.project-context/data/master.xlsx`**. `src/data.js` är skalat till schema + helpers + SVG-ikoner. App-konfigurationen genereras via build-pipeline.

### 11.5.1 Flödet

```
master.xlsx (Dennis redigerar i Excel)
    ↓ npm run build-config
app-config.json (i .project-context/data/ + kopia i src/)
    ↓ loadConfig() vid appstart (fetch i dev-läge, window.APP_CONFIG_JSON i dist)
window.APP_DATA.ROOM_TYPES (används av app.js som förut)
```

CSV-snapshots per flik skrivs till `.project-context/data/snapshots/YYYY-MM-DD/` för git-diff-spårning.

### 11.5.2 Master.xlsx — 5 flikar

1. **Priser** — 50 rader: Post-ID, Kategori, Etikett, Wikells originalnamn, Enhet, Pris (kr), Pris-källa, Wikells-ID, Mtrl/Tim/UE/Spillfaktor, Beräkning-flaggor, Wikells-artiklar (rå), Ingår (visas i app), Ingår EJ (visas i app), Wikells-ref, Anmärkning.
2. **Rumstyper** — 8 rader: Rumstyp-ID, Visningsnamn, Default-yta, Hide-area, Typ, Ikon-ID, Ordning, Anmärkning.
3. **Rum × poster** — 134 rader: Rumstyp-ID, Post-ID, Ordning, Radio-grupp, Std-vald, Std-antal, Std-area, Följepost-typ (tom/A/B), Parent-Post-ID, Trigger-Post-IDs, Rendera i kategori, Inherit reducesFloor, Inherit parentArea.
4. **Wbr-byggdelar** — 58 rader: rå Wikells-data (Kapitel.Nummer, Identitet, Artiklar, Mtrl/Tim/UE-summa, Beräknat pris). Arkiv för framtida prisdiff mot ny .wbr.
5. **Förklaring** — dokumentation: kolumnförklaringar, tillåtna dropdown-värden, Wikells-formeln, guider för "lägga till post" och "uppdatera från ny wbr".

### 11.5.3 Wikells-formeln

```
Pris = Mtrl × Spillfaktor + Tim × 930 + UE × 1.10
```

930 = 250 kr/h × 3.72 omkostnadspåslag. 1.10 = 10 % UE-påslag.

I master.xlsx ligger formeln som **Excel-formel** för enkla poster (1 artikel) så att Dennis kan se beräkningen och uppdatera Mtrl/Tim/UE om priset ändras. Komplexa byggdelar (flera artiklar) har hårdkodat pris + Anmärkning "Summa av N artiklar, se Flik 4".

### 11.5.4 Pris-källor

| Källa | Användning | Mtrl/Tim/UE |
|---|---|---|
| `Wikells` | Standardpris från Wikells Sektionsdata | Fylld (formel) eller "Summa av N artiklar" i anmärkning |
| `Byggbiten` | Byggbitens egen erfarenhet/schablon | Tom |
| `HSB-förhandlat` | Specialpriser avtalade med HSB (Marbodal, hatthylla) | Tom |
| `Beijer` | Offerter från Beijer (framtida användning) | Tom |
| `Placeholder` | Gissningsvärde som ska ersättas innan leverans | Tom |

### 11.5.5 perimeterCalc — ny beräkningsflagga för sockel/taklist

v1.7 lägger till `perimeterCalc: true` parallellt med befintlig `wallCalc: true`:

```
item med perimeterCalc: true
  → mängd = calcPerimeter(rum.yta) = 4 × √yta löpmeter
  → pris = kr/m × omkrets
```

Används av sockel (124.35 kr/m, Wikells 8.132) och taklist (132 kr/m, Wikells 8.136). Visas i 5 torra rum (sovrum, vardagsrum, hall, entré, kök). Ömsesidigt uteslutande mot `wallCalc` — valideras i build-config.

### 11.5.6 Dennis arbetsflöde

1. Öppna `.project-context/data/master.xlsx` i Microsoft Excel.
2. Redigera pris/post/rum×post-rad.
3. Spara (Ctrl+S — räknar om Wikells-formlerna).
4. I terminal: `npm run build-config`.
5. Refresha appen i webbläsaren (dev-server har no-cache).

Vid valideringsfel: build-config skriver tydligt felmeddelande med radnummer och exit-kod 1. `app-config.json` oförändrad → appen fortsätter fungera med tidigare version.

### 11.5.7 Leverans (dist)

`npm run build-dist` inlinar:
- `style.css` → `<style>`
- `app-config.json` → `<script>window.APP_CONFIG_JSON = {...}</script>`
- `data.js` → `<script>`
- `app.js` → `<script>`

Resultat: `dist/renoveringskalkyl.html` (220 KB) + `dist/assets/`. Fungerar vid dubbelklick (file://), ingen fetch.

### 11.5.9 Renoveringsprincip (v1.8, 2026-04-22)

Wikells-byggdelar ska innehålla **endast renoveringsarbete**:

- Underarbete (rivning, flytspackling, förberedelse)
- Skivmaterial (gips, golvspånskivor)
- Tätskikt (folie, cementbaserat, tätduk)
- Ytskikt (klinker, kakel, matta, färg, parkett)
- List och beslag som är del av en ytprodukt (foder, trösklar, trycken, sockellister för torra rum)

**Inredning räknas INTE som renoveringsarbete** och ska inte ligga i Wikells-byggdelar i Flik 1:

- Sanitetsporslin (WC-stol, tvättställ)
- VVS-inredning (blandare, duschvägg, duschset)
- Skåp (kommod, högskåp, väggskåp, badrumsskåp)
- Beslag på inredning (toalettpappershållare, handdukshängare, tvålhållare, torkställ, WC-borste)
- Speglar med belysning
- El-installation (golvvärme, spottar, uttag, brytare)

**Inredning bakas in i** UE-schabloner (`badrum_ue_vs`, `badrum_ue_el`) eller egna Byggbiten-poster (t.ex. `porslin` för toalett, `garderob_60` för sovrum).

Om en framtida Wikells-byggdel importeras med inrednings-artiklar — radera dessa artiklar från Flik 4 och räkna om byggdel-priset enligt Wikells-formeln.

**Bakgrund:** v1.7 hade `badrum_wc_dusch` (Wikells 17.034, 30 816 kr) och `badrum_inredning` (Wikells 17.032, 9 274 kr) som båda innehöll inrednings-artiklar (WC-stol, blandare, spegel, skåp, toalettpapper). Dessa bröt mot principen och ersattes i v1.8 av `badrum_ue_vs` (40 000 kr ex moms) och `badrum_ue_el` (20 000 kr ex moms).

### 11.5.10 `tagLabel` för UE-badges (v1.8)

Ny kolumn `tagLabel` i Flik 1 Priser. När ifylld renderas posten med en färgad badge bredvid etiketten.

Aktuella värden:

| tagLabel | CSS-klass | Färger | Användning |
|---|---|---|---|
| `UE-VS` | `.tag-ue.tag-ue-vs` | Blå (`#dbeafe` / `#1e40af`) | VVS-schablon (`badrum_ue_vs`) |
| `UE-El` | `.tag-ue.tag-ue-el` | Grön (`#d1fae5` / `#065f46`) | El-schablon (`badrum_ue_el`) |

Generisk fallback finns för framtida `tagLabel`-värden — render med `.tag`-klassen utan färgkodning.

`tagLabel` överrider INTE den befintliga "Schablon"-taggen som drivs av `unit === 'schablon'`. Båda kan samexistera på samma rad om nödvändigt.

### 11.5.11 Moms-konvention

**Alla priser i master.xlsx och app-config.json är EXKL moms.** Det gäller också UE-schablonerna (VVS 40 000 kr, El 20 000 kr). Print-layouten (Del I från v1.6) multiplicerar med 1.25 för "Inkl moms"-kolumnen. On-screen-UI visar alltid ex moms med "ex. moms"-tag i total-kortet.

### 11.5.8 Filstruktur

```
HSB-Ytskiktskalkylator/
├── src/
│   ├── index.html
│   ├── style.css
│   ├── app.js              ← async bootstrap, loadConfig → render
│   ├── data.js             ← schema + helpers + SVG-ikoner + loadConfig
│   ├── app-config.json     ← genererad kopia (gitignoreras)
│   ├── assets/
│   └── dev_server.py
├── scripts/
│   ├── build-config.js     ← master.xlsx → app-config.json
│   ├── build-dist.js       ← inline-bundler för dist/
│   └── archive/
│       ├── parse-wbr.js                    (engångs: wbr → JSON)
│       ├── initial-xlsx-from-datajs.js     (engångs: data.js → master.xlsx)
│       └── apply-dennis-corrections-2026-04-22.js (engångs: 16 prisbeslut)
├── dist/
│   └── renoveringskalkyl.html  ← fristående, inlinat
├── .project-context/data/
│   ├── master.xlsx
│   ├── app-config.json
│   ├── wbr-source/
│   │   ├── HSB-3a-ROT-helrenovering-v6.wbr
│   │   └── HSB-3a-v6-parsed.json
│   └── snapshots/YYYY-MM-DD/   ← CSV per flik för git-diff
└── package.json            ← xlsx + iconv-lite som devDependencies
```

---

## 12. Leveransprocess

1. Agent läser CLAUDE.md och följer länken hit.
2. Agent kollar OPEN_QUESTIONS.md för obesvarade designfrågor.
3. Vid större uppgifter: agent presenterar implementationsplan till Dennis först.
4. Dennis godkänner eller justerar.
5. Implementation i steg (data → rendering → interaktion → persistans → print-CSS → branding → animationer/polish).
6. Varje steg: visa Dennis resultat innan nästa.
7. När klart: leverera `dist/kalkylator.html` + `README.md`.
8. Dennis testar på Mac, iPad, iPhone innan HSB får filen.

---

## 13. Appendix A — Komplett prislista (v1.4, Wikells-kalibrerad 2026-04-21)

**Huvudposter:**

| Post | Pris | Enhet | Källa | Gäller rumstyper |
|---|---|---|---|---|
| Komplett kök standard inkl vitvaror | **PLACEHOLDER: 150 000** | schablon | Byggbiten | Kök |
| Komplett kök Plus inkl vitvaror | **PLACEHOLDER: 225 000** | schablon | Byggbiten | Kök |
| Klinker på våtrumsgolv | 2 555 | kr/m² | Wikells 15.015 | Badrum (mutex group badrum_golv) |
| Plastmatta våtrumsklassad | 1 194 | kr/m² | Wikells 15.023 | Badrum (mutex group badrum_golv) |
| Kakel på vägg | 2 492 | kr/m² vägg | Dennis-egen 8.502 | Badrum (wallCalc, mutex badrum_vagg) |
| Plastmatta på vägg | 1 504 | kr/m² vägg | Dennis-egen 8.503 | Badrum (wallCalc, mutex badrum_vagg) |
| Våtrumsfärg på vägg | 1 310 | kr/m² vägg | Cowork-egen 8.504 | Badrum (wallCalc, mutex badrum_vagg) |
| Våtrumsdörr (målad trä) | 4 655 | kr/st | Wikells 16.059 | Badrum (Dennis-val framför PP-laminerad 16.070) |
| El-installation badrum (UE) — `tagLabel: UE-El` | 20 000 | kr/st | Byggbiten-schablon | Badrum (v1.8 — placeholder) |
| Badrumsinredning inkl VVS-installation (UE) — `tagLabel: UE-VS` | 40 000 | kr/st | Byggbiten-schablon | Badrum (v1.8 — ersätter Wikells 17.032 + 17.034) |
| Ekparkett | 825 | kr/m² | Wikells 15.016 | Vardagsrum, sovrum, hall, entré, kök |
| Klickvinyl | 755 | kr/m² | Wikells 15.018 (laminat) | Vardagsrum, sovrum, hall, entré, kök, toalett |
| Heltäckningsmatta | 730 | kr/m² | Wikells 15.020 (linoleum) | Vardagsrum, sovrum, hall, entré, kök, toalett |
| Klinker | 1 600 | kr/m² | Wikells 15.015 justerat ner (Dennis) | Hall, toalett |
| Klinker (del av golv) | 1 600 | kr/m² | Wikells 15.015 justerat ner | Entré (hasArea, reducesFloor) |
| Vägg kakel | 1 160 | kr/m² vägg | Wikells 15.027 | Toalett (wallCalc) |
| Tak (målning) | 144 | kr/m² golvyta | Byggbiten | Alla per-post-rum |
| Väggar (målning) | 144 | kr/m² väggyta | Byggbiten | Alla per-post-rum (wallCalc) |
| Ny innerdörr | 5 070 | kr/st | Wikells 16.056 | Alla per-post-rum |
| Måla befintlig innerdörr | 1 210 | kr/st | Wikells 14.048 | Alla per-post-rum (radio vs ny) |
| Måla fönster invändigt | 990 | kr/st | Wikells 14.047 | Vardagsrum, sovrum, entré, kök |
| Porslin (wc-stol) | 8 600 | kr/st | Byggbiten | Toalett |
| Garderob 60's stomme | 14 600 | kr/st | Wikells 17.020 | Sovrum, hall, entré |
| Hatthylla inkl montage | **PLACEHOLDER: 3 500** | kr/st | Byggbiten | Entré |
| Ytterdörr (Daloc inkl montage) | **PLACEHOLDER: 28 000** | kr/st | Byggbiten | Entré |
| Måla befintlig balkongdörr | **PLACEHOLDER: 1 500** | kr/st | Byggbiten | Övrigt |
| Ny balkongdörr komplett | **PLACEHOLDER: 18 000** | kr/st | Byggbiten | Övrigt |
| Byte av taklampa / fast ljuspunkt | **PLACEHOLDER: 1 200** | kr/st | Byggbiten | Övrigt |
| Byte av eluttag | **PLACEHOLDER: 600** | kr/st | Byggbiten | Övrigt |
| Byte av strömbrytare | **PLACEHOLDER: 500** | kr/st | Byggbiten | Övrigt |
| Byte av radiator / element | **PLACEHOLDER: 7 500** | kr/st | Byggbiten | Övrigt |
| Dörrhandtag (uppgradering) | **PLACEHOLDER: 950** | kr/st | Byggbiten | Övrigt |
| Slutstäd efter renovering | **PLACEHOLDER: 5 000** | kr/st | Byggbiten | Övrigt |

**Följeposter typ A (per-huvudpost):**

| Följepost | Pris | Enhet | Default | Gäller |
|---|---|---|---|---|
| inkl. rivning av befintligt golv | 95 | kr/m² | ✓ on | Ekparkett, klickvinyl, matta, klinker, entre_klinker |
| inkl. flytspackling undergolv | 187 | kr/m² | Varierar | Ekparkett (off), klickvinyl (off), matta (off), klinker (on), entre_klinker (on) |

**Följeposter typ B (rums-scope):**

| Följepost | Pris | Enhet | Triggas av | Renderas i |
|---|---|---|---|---|
| Skyddstäckning | 450 | kr/rum | malning_tak, malning_vagg | Målning |
| Rivning badrum inkl inredning | 1 200 | kr/m² golv | *(ingen — alltid on i badrum)* | Tillval |
| Fallspackling våtrumsgolv | 2 283 | kr/m² golv | *(ingen — alltid on i badrum)* | Tillval |

**Beräkningsregler:**
- `wallCalc: true` → pris × omkrets × takhöjd, där omkrets = `4 × √yta` (antagande: kvadratiskt rum).
- `reducesFloor: true` (klinker) → items med `group: "golv"` i samma rum räknas på `yta − Σ(reducesFloor items.area)`.
- `hasCount` → pris × count (spärr 0–20).
- `hasArea` → pris × area (användarens m²-input).
- **Följepost typ A** `inheritsParentArea: true` → pris × parent.area (i stället för rum.yta). Används av entre_klinker-följeposterna.
- **Följepost typ A** `inheritsReducesFloor: true` → pris × (rum.yta − Σ reducesFloor). Används av golv-typernas rivning/spackling.
- **Följepost typ B** triggerad = någon `triggeredBy`-item är kryssad. Om användaren inte manuellt ändrat status följer checked triggern + defaultChecked.
- Allt ex. moms.

---

## 14. Appendix B — Designreferens

Visuell mockup-utforskning sker i `.project-context/mockups/`. Vald riktning markeras i DECISIONS.md. Inspirationsbilder, screenshots från byggbiten.nu och logga läggs i `.project-context/references/` när de finns tillgängliga.

---

## 15. Ändringslogg

- **2026-04-20 v1.1** — initial DESIGN.md skapad. Baserad på `UTVECKLINGSDOKUMENT_Ytskiktskalkylator.md` v1.0 (2026-04-20). Claude Code-meta-instruktioner flyttade till CLAUDE.md och OPEN_QUESTIONS.md. Designprincipen "flat, inga skuggor" ersatt med "coolt och levande" (mikro-interaktioner, transitions, subtila skuggor OK) efter uttalat önskemål från Dennis. Acceptanskriterier uppdaterade därefter.
- **2026-04-20 v1.2** — moms-beslut fastlagt (ex. moms). Kök utökat till två varianter (Standard + Plus, båda placeholder). Datamodell och prislista uppdaterade. Ny § 6.4 "Förberett för framtid — info-dialog per material" + `info`-fält tillagt i item-strukturen (§ 5.4). `group`-konceptet generaliserat från bara "golv" till alla ömsesidigt uteslutande grupper.
- **2026-04-20 v1.3 (MVP)** — stor utökning efter implementationsfasen:
  - Nya rumstyper: **Entré** (per_post med klinker + ytterdörr + hatthylla) och **Övrigt** (`hideArea: true`, styckesposter).
  - Kök omkonstruerat från rent schablon till per_post med radio-schabloner + samma ytskikt som vardagsrum.
  - **Målning vägg & tak** separerade → "Målning tak" (kr/m² golvyta) och "Målning vägg" (kr/m² väggyta, `wallCalc: true`). Takhöjd-input per rum (default 2,4 m).
  - Entré-klinker med `hasArea: true` + `reducesFloor: true` (dras av från golvytan för andra golv-items).
  - Innerdörr-radio: "Ny innerdörr - komplett" vs "Målning/förbättring bef. innerdörr" (båda `group: "innerdorr"`).
  - Nya tillval: Garderob 60's stomme, Hatthylla, Ytterdörr (Daloc), samt Övrigt-poster (balkongdörr, el, radiator, städ).
  - Övrigt-rum med `perRoom`-schabloner: eluttag (4/rum), taklampa + strömbrytare (1/rum). Förfylls vid skapande + tooltip förklarar.
  - **Kategori-dividers** per rumskort: Köksinredning, Golv, Målning, Kakel, Tillval.
  - **Rumsnamn-feature**: eget namn + kategorinamn som subtitel.
  - **Unika ikoner per rumstyp** (soffa, säng, hänger, dörr, gryta, badkar, wc-stol, skiftnyckel).
  - **Login-vy + hemvy + calc-view** (top-level view-routing). Hårdkodad auth (`hsbsundsvall` / `Byggbiten2026!`).
  - **Sparade kalkyler** i hemvyn (lista, ladda, ny) via localStorage.
  - **Sidebar** med rum-navigation, scroll-spy (rAF-polling), + actions-kort ("Spara kalkyl" / "Återgå till hemvy") med samma höjd som total-kortet.
  - **Drag-and-drop** för rumsordning (FLIP-animation) + **stepper-pilar** på alla numeriska inputs + **nummer-animationer** (easeOutExpo tween + pulsar).
  - **App-shell grid-layout** (228px sidebar + 760px main), sticky total-kort.
  - **Mörk header-gradient** (warm antracit → svart → djup svart) + vit Byggbiten-logga.
  - Persistens utökad till hela state-strukturen inkl. auth och savedProjects.
  - Nya OPEN_QUESTIONS: Q10 (placeholder-priser), Q11 (sparade kalkyler info).
- **2026-04-21 v1.4 (Wikells-kalibrerad + följeposter)** — stor prissättningsrunda + UX-utökning:
  - **Namnbyte** Ytskiktskalkylator → Renoveringskalkyl (titel, header, disclaimer, login-hero). Storage-nycklar oförändrade (bakåtkompatibilitet).
  - **Wikells-kalibrering** av alla huvudpriser — nya formeln `mtrl + tim × 250 × 3.72 + ue × 1.10` (272 % OH på arbete, 10 % OH på UE). Se § 5.3a. Ekparkett 610 → 825, klickvinyl 570 → 755, matta 555 → 730, innerdörr 3 900 → 5 070, måla innerdörr 950 → 1 210, fönster 1 350 → 990, garderob 8 500 → 14 600, vägg-kakel 750 → 1 160. Klinker 900 → 1 600 (medveten Wikells-sänkning, Dennis-val).
  - **Följeposter** (typ A + typ B) — ny § 5.2a. Rivning 95 kr/m² typ A på alla golv (default on). Flytspackling 187 kr/m² typ A på alla golv (default OFF för parkett/klickvinyl/matta, ON för klinker och badrum). Skyddstäckning 450 kr/rum typ B rendered in Målning-kategori, triggas av målningsposter. Badrum-schablonerna har följeposter rivning (5 500 / 7 500) + fallspackling (9 100 / 13 700).
  - **Badrum-split** standard (85 000) / plus (115 000) som radio-grupp (`group: "badrum"`). Tidigare 75 000 kr-schablon borta.
  - **Språk-städning** av UI-labels: "Golv ekparkett" → "Ekparkett", "Målning vägg" → "Väggar", "Målning fönster inv." → "Måla fönster invändigt", "Ny innerdörr - komplett" → "Ny innerdörr", "Målning/förbättring bef. innerdörr" → "Måla befintlig innerdörr". Wikells-tekniska termer bort från UI.
  - **syncFollowups(rum)** — graceful upgrade av gamla localStorage-kalkyler. Saknade följepost-entries läggs till med korrekt defaultvärde.
  - **DECISIONS.md**: 8 nya entries för 2026-04-21 (namnbyte, följepost-modell, rivningspris, spackling-default, Wikells-formel, klinker-val, skyddstäckning-pris, badrum-split).
  - **OPEN_QUESTIONS.md**: Q6 uppdaterad (badrum-split), Q10 uppdaterad med Wikells-verifierade priser (ca halva tabellen avplockad från placeholder), nya Q12 (kap 29 projektgemensamt) och Q13 (målning per-m²-underlag).
  - **data.js** version bumpad till `v=28` i index.html (cache-bust).
  - Referensfil: `.project-context/references/HSB-3a-kalkyl-sammanfattning.md` (Wikells HSB-3a ROT-helrenovering, 49-sidig PDF sammanfattad).
- **2026-04-22 v1.5 (Badrum per-post + `defaultOnCreate` deklarativt + följepost-UX)**:
  - **Badrum schablon → per-post.** Rumstyp går från `type: 'schablon'` till `type: 'per_post'`. Gamla `badrum_standard` (85 000) och `badrum_plus` (115 000) är borta. Ersätts av 10 items + 3 rumsföljeposter (se § 5.2 + Appendix A).
    - Golv mutex `group: 'badrum_golv'`: klinker 2 555 (Wikells 15.015) / plastmatta 1 194 (15.023).
    - Vägg mutex `group: 'badrum_vagg'` med `wallCalc: true`: kakel 2 492 (Dennis-egen 8.502) / plastmatta 1 504 (8.503) / våtrumsfärg 1 310 (8.504).
    - Inredning+UE (hasCount, default 1 st): WC-dusch 30 816 (17.034), inredning 9 274 (17.032), dörr 4 655 (16.059 — Dennis-val framför 16.070 PP), UE-el 8 000, UE-VS 12 000.
    - Rumsföljeposter: skyddstäckning kvar (46 kr), nya rivning 1 200 kr/m² och fallspackling 2 283 kr/m² — båda alltid-on.
    - Prissanning: 5 m² badrum med klinker+kakel+allt default ≈ 148 400 kr; plastmatta+våtrumsfärg ≈ 116 300 kr.
  - **`isRoomFollowupTriggered`-semantik utökad:** ingen/tom `triggeredBy` = alltid aktiv. Bakåtkompatibelt (SKYDDSTACKNING_FU oförändrad).
  - **`calcFollowupTotal` aktiverar tidigare oanvänt fall:** rumsföljepost med `unit: 'kr/m²'` utan parent → `rum.yta` (fallback-grenen fanns sedan v1.4 men triggerades aldrig).
  - **Legacy-notis för badrum.** Om gamla `badrum_standard`/`badrum_plus`-nycklar finns i `rum.valda` från en sparad kalkyl visas en synlig beige/orange notis-rad på rumskortet: "Denna kalkyl är sparad före 2026-04-22 då badrum blev per-post. Välj om materialen för att få rätt pris." Gamla nycklar lämnas orörda i state (bidrar 0 kr).
  - **`defaultOnCreate` deklarativt** (§ 5.2b). Sovrum/entré/badrum har alla tabellen i data.js. app.js:s if/else-stege för rumsskapande-defaults är borta — ersatt med generisk loop. Override-logik för Övrigt (`item.perRoom × rumExkl`) behålls som runtime specialfall.
  - **Bugfix #65: sovrum innerdörr count 1** (inte 2 för första sovrum). Fixat via `ROOM_TYPES.sovrum.defaultOnCreate.innerdorr.count = 1`. Hårdkodade `prevSovrum`-logiken i app.js borta.
  - **Bugfix #66: följepost-rad klickbar.** `data-action="toggle-followup"` flyttad från `<span class="checkbox">` till yttre `<div class="followup-row">`. Typ B: villkorlig `data-action` (endast när triggered) så dimmade rader är oklickbara. CSS: `cursor: pointer` via attribut-selector.
  - **DECISIONS.md**: 7 nya entries 2026-04-22 (badrum per-post, dörrval, UE-schabloner, defaultOnCreate, bugfix #65, bugfix #66, legacy-notis).
  - **OPEN_QUESTIONS.md**: Q6 → BESVARAD 2026-04-22. Q10-tabellen uppdaterad (badrum-schabloner borta från placeholder-listan, nya badrum-items listade som Wikells-kalibrerade).
- **2026-04-22 v1.6 (Kalkylbudget-PDF + offert-flöde + expanderbara poster + gråade summor)**:
  - **Del I — PDF-export som "Kalkylbudget".** Dedikerad `#print-layout` i `index.html` (statisk div, fylls dynamiskt via `renderPrintLayout()`). Fullständig `@media print`-CSS med A4-format, Byggbiten-offert-mall-matchad layout, två sidor (rumstabell + sammanställning/disclaimers), mörk logga, sticky footer med företagsinfo, Wikells-kod i första kolumnen. `buildPrintData(state)` + `extractWikellsId` + `sanitizeFilename` + `triggerPrint()` (sätter `document.title` så filnamnet blir `Kalkylbudget_<sanitiserat>_<datum>.pdf`). `beforeprint`-listener fångar Ctrl+P. Se § 8.
  - **Del II — "Begär offert"-modal.** Tidigare stub-alert ersatt med trestegs-modal: Spara PDF → Välj mejlprogram (Native/Gmail/Outlook) → Bifoga + skicka. Fyra nya action-handlers (`offert-save-pdf`, `offert-open-native`, `offert-open-gmail`, `offert-open-outlook`). Förifyllt ämne `${projekt} — ${datum}` + brödtext till `OFFERT_RECIPIENT`. URL-kodade subject/body på alla tre URL-format. Native mailto har toast-fallback "Om mejlappen inte öppnas automatiskt…". Se § 9.
  - **Del III — Expanderbara poster.** Item-rader med `info.ingar[]` eller `info.wikellsRef` får en chevron längst till höger som fäller ut `.item-details-panel` med INGÅR/INGÅR EJ/Wikells-ref. Egen `data-action="toggle-item-details"` → delegationen fångar action-namnet före `toggle-item`, ingen `stopPropagation` behövs. `state.expandedItems: Set` — session-bundet, rensas vid `go-home`/`new-calc`. Ingen persist till localStorage. 70 av 84 items har info (undantag: kök-schabloner, ytterdörr, Övrigt-poster). `info`-schemat utökat från `{description, image}` till `{ingar, ingarEj, wikellsRef, image}`.
  - **Del IV — Gråade summor.** `.item-price.muted` (ljus grå) när posten inte bidrar till totalen: item unchecked, `hasCount` + count=0, följepost unchecked/0 kr, typ B dimmad. Gäller både `.item` och `.followup-row`. Print använder **inte** `.muted` — alla rader i print visas i enhetlig svart.
  - **Nya konstanter i app.js**: `CUSTOMER_INFO` (HSB Sundsvall — TODO multi-kund), `SUPPLIER_INFO` (Byggbiten), `OMBUD_INFO` (Dennis), `OFFERT_RECIPIENT`, `MOMS_FAKTOR` 1.25.
  - **Version-bump** `?v=28` → `?v=29` i `index.html` (cache-bust).
  - **Regex för Wikells-koder**: `/(\d{1,2}\.\d{3})/` — accepterar både standardformat (15.016) och Dennis-egna (8.502/8.503/8.504).
- **2026-04-22 v1.7 (Master.xlsx-driven priskonfiguration + build-pipeline + perimeterCalc)** — största arkitekturändringen sedan v1.3:
  - **master.xlsx som sanning.** Alla priser + rumskonfiguration flyttade från hårdkodade `data.js`-konstanter till en 5-flikars Excel-fil i `.project-context/data/`. Dennis redigerar direkt, kör `npm run build-config`, refreshar. Se ny § 11.5.
  - **Build-pipeline** (två nya scripts i `scripts/`): `build-config.js` (master.xlsx → app-config.json med validering + CSV-snapshots), `build-dist.js` (inline-bundler för `dist/renoveringskalkyl.html`).
  - **Engångsscripts i `scripts/archive/`**: `parse-wbr.js` (Wikells .wbr → JSON, 138 byggdelar, 449 artiklar), `initial-xlsx-from-datajs.js` (data.js + wbr-parse → master.xlsx, ~95 % komplett), `apply-dennis-corrections-2026-04-22.js` (Dennis 16 prisbeslut).
  - **`data.js` omskriven** (707 → 300 rader): schema + helpers + SVG-ikoner + ny `loadConfig(url)`. Runtime `ROOM_TYPES` byggs från `app-config.json`. Backward compat — `window.APP_DATA.ROOM_TYPES` har identisk form som tidigare.
  - **`app.js` async bootstrap**: `await loadConfig(...)` innan `render()`. Fail-handling med tydlig error-banner om config inte laddar.
  - **Ny `perimeterCalc`-flagga** i `calcItemTotal`/`itemEnhFor`/`itemMangdFor`: mängd = `calcPerimeter(rum.yta)` löpmeter. Används av sockel (Wikells 8.132, 124.35 kr/m) + taklist (Wikells 8.136, 132 kr/m). Båda visas i 5 torra rum (sovrum, vardagsrum, hall, entré, kök). Ömsesidigt uteslutande mot `wallCalc` — valideras.
  - **Wikells-formel synlig i master.xlsx**: Pris-cellen har formel `=Mtrl*Spill + Tim*930 + UE*1.10` för enkla byggdelar. Dennis ser beräkningen och kan uppdatera Mtrl/Tim/UE. Komplexa byggdelar (flera artiklar) har hårdkodat pris + "Summa av N artiklar"-anmärkning.
  - **Två "Ingår"-nivåer i Flik 1**: `Wikells-artiklar (rå)` auto-fylls från wbr (teknisk källspårning, visas inte i appen) + `Ingår (visas i app)` (Dennis UX-text, visas i chevron-panel). Samma mönster på byggdelsnivå: `Wikells originalnamn` (auto) + `Etikett` (UX).
  - **Dennis 16 prisbeslut 2026-04-22**: ekparkett 757 (Wikells 15.016), klinker hall 2593 (Wikells 15.015), entre_klinker 1801 (Wikells 15.015 torr variant), vägg-kakel toalett 1483 (Wikells 15.027), sockel 124.35 (Wikells 8.132 nyt), fönster 1350 (Byggbiten — ersätter wbr 14.047 som bara karmar), Marbodal-garderob 3600 (HSB-förhandlat), hatthylla 1450 (HSB-förhandlat), UE el/VS 8000/12000 (Byggbiten-schabloner), skyddstäckning 450 kr/rum (Byggbiten — wbr 14.017 räknar per m²), målning 144/144 (Byggbiten-kalibrerat), badrum rivning 1200 (Byggbiten bredare scope än wbr 15.001).
  - **Nya beroenden (devDependencies)**: `xlsx@0.18.5` (SheetJS, läs/skriv XLSX), `iconv-lite@0.6.3` (iso-8859-1 för wbr-XML). Känd CVE i xlsx@0.18.5 — endast dev-sidan, Dennis egen master.xlsx, ingen användarindata — acceptabelt (dokumenterat i Flik 5 Förklaring och DECISIONS.md).
  - **Pris-källor**: Wikells 16, Byggbiten 21, HSB-förhandlat 2, Placeholder 11 (totalt 50 poster). Följeposter: typ A 40 st, typ B 9 st.
  - **CSV-snapshots per flik** i `.project-context/data/snapshots/YYYY-MM-DD/` — git-diff-bar spårning av prisändringar.
  - **Version-bump** `?v=29` → `?v=30` i `index.html`.
  - Nya regler i `.gitignore`: `node_modules/`, `dist/`, `src/app-config.json`, `package-lock.json`, `~$*.xlsx` (Excel-lockfiler).
- **2026-04-22 v1.8 (Badrum UE-restructure + tagLabel + renoveringsprincip)** — arkitekturrensning efter principskaparaudit:
  - **Ny renoveringsprincip** (se § 11.5.9): Wikells-byggdelar ska bara innehålla renoveringsarbete (rivning, ytskikt, tätskikt, list). Inredning (WC-stol, skåp, beslag, speglar, el-installation) bakas in i UE-schabloner eller egna Byggbiten-poster.
  - **Badrum-restrukturering:**
    - Borttagna: `badrum_wc_dusch` (Wikells 17.034, 30 816 kr) och `badrum_inredning` (Wikells 17.032, 9 274 kr). Båda innehöll ≥85 % inrednings-artiklar (WC-stol, blandare, tvättställ, spegel med spotlights, skåp, toalettpapper, handdukshängare etc.) vilket bröt mot principen.
    - Uppdaterade: `badrum_ue_vs` 12 000 → **40 000 kr** (ex moms, Byggbiten-schablon ersätter 17.032 + 17.034). Ingår-lista detaljerad med 8 punkter. `tagLabel: UE-VS`, blå badge.
    - Uppdaterade: `badrum_ue_el` 8 000 → **20 000 kr** (ex moms, Byggbiten-schablon, placeholder — Dennis återkommer med exakt pris). Ingår-lista detaljerad med 6 punkter. `tagLabel: UE-El`, grön badge.
    - Våtrumsdörr + golv + vägg + rumsföljeposter **oförändrade** (rent renoveringsarbete enligt audit).
  - **Ny kolumn `tagLabel`** i master.xlsx Flik 1. `build-config.js` mappar till `item.tagLabel` i app-config.json (tom sträng → undefined för att undvika JSON-skräp).
  - **UI-badges:** `renderItem()` i app.js utökad med `tagLabel`-stöd. CSS: ny `.tag-ue` + `.tag-ue-vs` (blå `#dbeafe` / `#1e40af`) + `.tag-ue-el` (grön `#d1fae5` / `#065f46`). Generisk fallback för framtida värden.
  - **Moms-konvention dokumenterad** i § 11.5.11: alla priser i master.xlsx är EXKL moms (inkl UE-schabloner). Print-layout multiplicerar med 1.25 för Inkl moms-kolumnen.
  - **Audit av andra Wikells-byggdelar:** 11/14 aktiva är rent renoveringsarbete. Noterade funn rapporterade i sessionsrapport — 16.059 "WC-behör" bedömt som dörrbeslag (behålls), 17.020 används inte längre (rekommendation: lämna i Flik 4 som historik).
  - **Badrum full default + klinker + kakel 5 m²:** 148 429 kr → **148 339 kr** (praktiskt oförändrat; tidigare 17.032+17.034 = 40 090 kr ≈ ersatt av UE-VS 40 000 kr; +20 000 kr UE-El är ny kostnad som tidigare låg dolt i 17.034:s inrednings-artiklar).
  - **Flik 5 Förklaring** utökad med renoveringsprincip, moms-konvention, UE-taggar och badrum-strukturbeskrivning (61 nya rader).
  - **Version-bump** `?v=30` → `?v=31`.
