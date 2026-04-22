# Bugfix: `src/data.js` är avbruten — hela export-hälften saknas

**Typ:** Bugfix (grundorsak identifierad, inte en ny feature)
**Skapad av:** Cowork-testningssession 2026-04-21 (UI-test avbröts när buggen upptäcktes)
**Status:** Blockerande — appen kan inte starta i ny webbläsarsession utan cache.

---

## 1. Varför vi gör detta

Dennis bad Cowork köra fullständiga UI-tester i Chrome ("lämna ingen sten ovänd") efter att Claude Code i en tidigare session rapporterat att Fas 1–7 i prompten `2026-04-21-renoveringskalkyl-foljeposter-wikells.md` var genomförda.

När Cowork skulle verifiera Scenario 4–9 upptäcktes att `src/data.js` på disk är **syntaktiskt trasig** och att nästan allt arbete som sessionsrapporten `.project-context/sessions/2026-04-21-foljeposter-wikells.md` beskriver **aldrig landat på disk**. Tidigare UI-tester (Scenario 1–3) måste ha körts mot en cache i Chromes minne.

Konsekvensen: öppnar Dennis appen i en ny Chrome-session (eller Ctrl+F5 / incognito), får han en vit skärm och ett konsolfel. Ingen av följepost-funktionaliteten, badrum-splitten eller toalett-rumstypen finns i en form som webbläsaren faktiskt kan köra.

Det här är en ren **städ-/återställnings-uppgift**. Den tidigare sessionens dokumentation (DESIGN.md v1.4, DECISIONS.md, sessionsrapporten) stämmer förmodligen som intention — det är bara det faktiska filinnehållet som saknas.

---

## 2. Nuvarande beteende (bevis)

### 2.1 Syntax

```
$ node --check /sessions/.../src/data.js
data.js:335
        // Avrundat till 1 160 kr/m² väggyta.
                                             

SyntaxError: Unexpected end of input
```

Filen är 14 352 byte, 334 rader långa. Räkneverk: **53 `{` mot 50 `}`** — tre stängare saknas.

### 2.2 Sista raderna i `data.js` (rad 325–334)

```
toalett: {
  displayName: 'Toalett',
  defaultArea: 2,
  type: 'per_post',
  icon: ICON_TOALETT,
  items: [
    GOLV_KLICKVINYL,
    GOLV_MATTA,
    GOLV_KLINKER,
    // Vägg kakel: Wikells 15.027 kakel: 303 mtrl + 0.80 tim × 250 × 3.72 + 380 UE × 1.10 = 1 162 kr/m²
    // Avrundat till 1 160 kr/m² väggyta.
```

…sen tar filen slut. Mitt i `toalett`. Kakel-item aldrig definierat, `items:`-arrayen aldrig stängd, `toalett` aldrig stängt, `ROOM_TYPES` aldrig stängt, IIFE aldrig stängd, ingen export till `window.APP_DATA`.

### 2.3 Vad som saknas enligt `app.js`

`src/app.js` rad 7–19:
```js
const {
  PUZZLE_SVG,
  ROOM_TYPES,
  ROOM_TYPE_ORDER,
  DEFAULT_CEILING_HEIGHT,
  calcItemTotal,
  calcRoomSubtotal,
  calcTotal,
  calcWallArea,
  formatKr,
  demoState,
  emptyState
} = window.APP_DATA;
```

Ytterligare properties som refereras via `window.APP_DATA.X` senare i `app.js`:
- `todayIso()` (rad 34, 1518)
- `reducedFloorArea(rum)` (rad 122)
- `calcFollowupTotal(fu, parentItem, rum, parentValt)` (rad 268, 286)
- `isRoomFollowupTriggered(rfu, rum)` (rad 284)
- `syncFollowups(rum)` (rad 1375, 1521)

**Av dessa finns enbart `calcWallArea` och `DEFAULT_CEILING_HEIGHT` i det trasiga data.js på disk.** Resten saknas helt.

`app.js` rad 1361–1372 refererar till `ROOM_TYPES.ovrigt` med `perRoom`- och `hasCount`-items — "Övrigt"-rumstypen finns inte i det trasiga data.js.

### 2.4 Tidsstämplar

```
data.js   Modify: 2026-04-20 15:00:17
app.js    Modify: 2026-04-20 17:58:16
```

`app.js` skrevs **tre timmar efter** `data.js`. Det betyder att `app.js` är den nya versionen som förväntar sig den fullständiga datamodellen från prompten `2026-04-21-renoveringskalkyl-foljeposter-wikells.md`, men `data.js` kom aldrig i mål — antingen kraschade Claude Code mitt i en Edit, eller så rapporterades arbete som inte skrevs.

### 2.5 Sessionsrapport vs. disk

Sessionsrapporten `.project-context/sessions/2026-04-21-foljeposter-wikells.md` hävdar att Fas 2 i prompten genomfördes (följepost-fabriker, delade golv-items, badrum-split, Wikells-priser, toalett, övrigt). Det **stämmer delvis** — första hälften av `data.js` fram till rad 334 matchar beskrivningen. Andra hälften (toalett-slut, övrigt, alla helpers, export) skrevs aldrig.

---

## 3. Förväntat beteende (vad fixen ska åstadkomma)

När fixen är klar ska följande gälla:

1. `node --check src/data.js` går igenom utan fel.
2. `index.html` öppnad i Chrome **utan cache** (hard reload eller incognito) laddar kalkylatorn utan konsolfel.
3. Alla åtta rumstyper går att lägga till via modalen: Vardagsrum, Sovrum, Hall, Entré, Kök, Badrum, Toalett, Övrigt.
4. Alla referenser till `window.APP_DATA.X` i `app.js` är uppfyllda (se §2.3 ovan).
5. Scenarierna 1–9 i `.project-context/prompts/2026-04-21-renoveringskalkyl-foljeposter-wikells.md` fungerar precis som sessionsrapporten beskriver att de gör (följeposter typ A + B, badrum-split, legacy-ladd, etc.).

### 3.1 Vad som ska byggas (innehåll)

**Slutför toalett** (påbörjad på rad 325):
- Befintliga items: `GOLV_KLICKVINYL`, `GOLV_MATTA`, `GOLV_KLINKER`.
- Lägg till kakel-vägg item: `{ id: 'kakel_vagg', label: 'Kakel (vägg)', price: 1160, unit: 'kr/m² vägg', wallCalc: true, category: 'Tillval' }` — Wikells 15.027, formeln står i kommentaren ovan.
- Lägg `MALNING_TAK` (toaletten har vanligtvis målat tak).
- `roomFollowups: [SKYDDSTACKNING_FU]` (skyddstäckning gäller även vid målning i toalett).
- Stäng rumstypen.

**Lägg till rumstyp `ovrigt`** (saknas helt, men `app.js` rad 1365 kräver den):
- `displayName: 'Övrigt'`
- `defaultArea: 0` (eller passande; "Övrigt" representerar ej rum utan projektgemensamma poster).
- `type: 'per_post'`
- `icon: ICON_OVRIGT` (redan definierad på rad 32).
- `items:` poster för kap 29-aktigt (etablering, projektering, städning, bortforsling, container). Minst en med `perRoom: N, hasCount: true` så `app.js` rad 1367–1371 har något att skala. Se `OPEN_QUESTIONS.md` Q12 — Dennis sa "hanteras utanför appen med disclaimer", men eftersom `app.js` refererar rumstypen måste den finnas i datamodellen även om items är placeholder. Minimalt innehåll:
  - `{ id: 'etablering', label: 'Etablering (placeholder)', price: 0, unit: 'schablon', placeholder: true, category: 'Projektgemensamt' }`
  - (Lägg gärna fler om du tolkar Q12/kap 29 vettigt — se Wikells-underlag `references/HSB-3a-kalkyl-sammanfattning.md`.)

**Stäng `ROOM_TYPES`.**

**Definiera och exportera helpers** (alla dessa används av `app.js`):

| Helper | Signatur | Beskrivning |
|---|---|---|
| `ROOM_TYPE_ORDER` | konstant-array | `['vardagsrum', 'sovrum', 'hall', 'entre', 'kok', 'badrum', 'toalett', 'ovrigt']` (ordning styr modal-layout). Vilken exakt ordning Dennis vill — se DESIGN.md §7.1 eller fråga. |
| `formatKr(v)` | `(number) → string` | `'1 234 kr'`-formatering med mellanslag som tusental-separator, svenska konventioner. |
| `todayIso()` | `() → string` | `new Date().toISOString().slice(0,10)`. |
| `calcItemTotal(item, valt, rum)` | | Räknar ut kr-belopp för en item i ett rum: m² × pris, m² vägg × pris, antal × pris, eller schablon. Tar hänsyn till `reducesFloor` så m²-items minskas med uppräknad klinker-area. Följer nuvarande spec i DESIGN.md §5.4. |
| `calcRoomSubtotal(rum)` | | Summan av alla aktiva items **+ deras följeposter (typ A) + triggade rums-följeposter (typ B)** i rummet. |
| `calcTotal(state)` | | Summa av alla `calcRoomSubtotal(rum)` för `state.rum`. |
| `reducedFloorArea(rum)` | | Summa av `area`-fält för alla checkade items med `reducesFloor: true`. Används för att dra bort klinker-arean från golv-items. |
| `calcFollowupTotal(fu, parentItem, rum, parentValt)` | | Räknar kr-belopp för en följepost. Respekterar `inheritsParentArea` (använder parent-itemets area), `inheritsReducesFloor` (använder rum.yta − reducedFloorArea), och unit (`kr/m²`, `kr/st`, `schablon`). |
| `isRoomFollowupTriggered(rfu, rum)` | `(roomFollowup, rum) → bool` | Sant om minst en av `rfu.triggeredBy`-items är checkad i rummet. |
| `syncFollowups(rum)` | `(rum) → void` | Idempotent: för varje item med `followups[]` och varje `roomFollowup`, säkerställ att `rum.valda[followupId]` finns som `{ checked: … }`. Används vid init och load. Följer spec i sessionsrapport §Fas 6 — idempotent, överskrider inte user-val när parent är checkad. |
| `demoState` | objekt | Hela demo-state som laddas om användaren väljer "Ladda demo". Rimligt att ha alla rumstyper med något checkat så man ser appen i funktion. |
| `emptyState` | objekt | `{ projektnamn: 'Ny kalkyl', datum: todayIso(), rum: [], savedProjects: [] }` eller vad DESIGN.md §5.5 anger. |

**Exportera via `global.APP_DATA = { ... alla ovanstående + ROOM_TYPES + PUZZLE_SVG + DEFAULT_CEILING_HEIGHT + calcWallArea ... }`.**

**Stäng IIFE:** `})(window);`

---

## 4. Verifiering

### 4.1 Mekanisk verifiering (måste passera innan sessionen avslutas)

```bash
node --check src/data.js
# → inget output (exit 0)

grep -c "{" src/data.js
grep -c "}" src/data.js
# → samma siffra
```

### 4.2 Boot-test

1. Öppna `src/index.html` i Chrome incognito (eller Ctrl+Shift+R).
2. Konsolen ska vara tom (inga SyntaxError, ReferenceError, TypeError).
3. Login → `hsbsundsvall` / `Byggbiten2026!` → hemvyn visas.
4. "Ny kalkyl" → modal med åtta rumstyper: Vardagsrum, Sovrum, Hall, Entré, Kök, Badrum, Toalett, Övrigt.

### 4.3 Rumstyp-verifiering

Lägg till varje rumstyp i tur och ordning. Inget får krascha. Varje rum ska:
- Visa sitt namn och ikon.
- Visa sina items med rätt Wikells-priser (830, 755, 730, 1 600 för golv; 144 för målning; 5 070 för innerdörr, etc. — exakt lista i `sessions/2026-04-21-foljeposter-wikells.md`).
- För `badrum`: visa två alternativ (standard 85 000 / plus 115 000) som radio-exkluderande.
- För `toalett`: visa klickvinyl, matta, klinker, kakel vägg, målning tak.
- För `ovrigt`: visa minst en post (kan vara placeholder).

### 4.4 Scenario-verifiering

Kör sedan Scenario 1–9 från `.project-context/prompts/2026-04-21-renoveringskalkyl-foljeposter-wikells.md`. Alla måste gå igenom utan fel.

### 4.5 Sessionsrapport

Skriv ny sessionsrapport i `.project-context/sessions/2026-04-21-datajs-fix.md` som dokumenterar:
- Vad som faktiskt landade på disk.
- `node --check` output (bevis).
- Eventuella ställningstaganden som krävts (t.ex. exakt innehåll i `demoState` eller `ovrigt.items`).
- Om något inte matchar den tidigare sessionsrapporten, förklara vad och varför.

---

## 5. Instruktioner till Claude Code (vem som än gör fixen)

1. **Verifiera alltid med `node --check src/data.js` efter varje Edit.** Tolerera inte SyntaxError även tillfälligt. Om checken fallerar, rulla tillbaka och tänk om.
2. **Fabricera inte helpers.** Läs hur `app.js` anropar dem (`grep -n "window.APP_DATA\." src/app.js`) för att se exakta argument och förväntade returtyper. Beräkningslogiken ska matcha vad DESIGN.md §5.4 och prompten `2026-04-21-renoveringskalkyl-foljeposter-wikells.md` beskriver.
3. **Ärvda defaults:** Följ `sessions/2026-04-21-foljeposter-wikells.md` Fas 3 — parent unchecked → checked ska **override** följepost-state till `{ checked: !!fu.defaultChecked }`. Det var hela poängen med §4.3b i prompten.
4. **Inga silent refactors.** Om en väsentlig ändring behöver göras utanför `data.js` (t.ex. buggar i `app.js` som blir uppenbara under testet), notera det i sessionsrapporten men rör inte `app.js` om det inte är strikt nödvändigt — Dennis vill ha en minimal fix-pass, inte en ny utvecklingsrunda.
5. **Rapportera ärligt.** Om något i den tidigare sessionsrapporten visar sig vara fel (t.ex. ett pris som inte stämmer mot Wikells-sammanfattningen), flagga det i din egen sessionsrapport istället för att kopiera det blint.

---

## 6. Efter fixen — vad Cowork ska göra härnäst

När `data.js` är hel:
1. Cowork återupptar UI-test-suiten från Scenario 4.
2. Cowork kopplar sina observationer till Dennis 5 önskemål (badrum ytmodell, plastmatta vägg/tak, sakvaror-synlighet, Beijer-kökspriser, tooltip med Wikells-struktur).
3. Dennis får en konsoliderad testrapport + diskussionsunderlag innan nästa utvecklingsrunda.
