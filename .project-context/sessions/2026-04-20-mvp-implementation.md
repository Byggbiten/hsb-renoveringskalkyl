# Session 2026-04-20 (del 2) — MVP-implementation

**Agent:** Claude Code (claude-opus-4-7, 1M context, desktop-klient)
**Varaktighet:** ca 4–5 timmar (samma dag som projektstart-sessionen, efter att mockup-04 valts)
**Status vid sessionsslut:** Funktionellt komplett MVP med login + hemvy + kalkylator + persistens. Slutleverans kräver bara print-CSS, riktiga priser och build-script.

---

## Vad som gjordes

### Fas A — Datalager + skelett (src/)
- `src/index.html`, `src/data.js`, `src/app.js`, `src/style.css` upprättade.
- Full prislista i `data.js` med alla 7 rumstyper (kök utökat från schablon till per_post med standard + Plus, entré omdesignad från schablon till per_post med samma uppställning som vardagsrum + klinker).
- SVG-ikoner per rumstyp i `data.js` (`ICON_VARDAGSRUM`, `ICON_KOK`, `ICON_BADRUM` osv).
- `dev_server.py` (ThreadingHTTPServer, no-cache-headers) för att lösa browser-cachen under utveckling.

### Fas B — Rendering från state + tom-state
- `renderEmptyState()` med "Börja din kalkyl"-välkomstvy.
- Växling mellan tom och fylld vy.
- `?empty=1` / `?demo=1` query-params för dev-testning.

### Fas C — Interaktion
- Event-delegation via `document.addEventListener('click' / 'input' / 'pointerdown')`.
- Granulära DOM-uppdateringar (`updateItemDOM`, `updateRoomPricesDOM`, `updateTotalDOM`, `updateSubtotalDOM`) istället för full re-render för att undvika flimmer.
- `toggleItem` med group-radio-beteende + schablon-grey.
- In-place input-handling för yta, takhöjd, antal, projektnamn, rumsnamn.
- Add-room modal med alla 8 rumstyper (inkl. Entré, Övrigt).
- Room-remove med `window.confirm`.
- Siffror animeras via `tweenNumberTo` (easeOutExpo) + `pulseNumber` (subtil scale-puls vid uppdatering).

### Drag-and-drop (FLIP)
- `.room-drag-handle` (6-dots grip) överst på varje rumskort.
- Pointer-event-baserat: pointerdown → pending → move >5px → active → swap vid crossover.
- FLIP-animation (First-Last-Invert-Play) på syskon när DOM reorganiseras.
- Efter drop: spring-animation tillbaka till identity.
- Fixar som krävdes:
  - `cardIn` entry-animation orsakade retrigger när `.is-dragging` togglades → löste med `animation: backwards` fill-mode istället för `forwards`, och senare migrering till en ren `.entering`-klass som tas bort efter bootstrap.
  - CSS transition på `.room` interfererade med inline transform → stängde av transition på draggat element.

### Målning vägg/tak separerade
- `MALNING_TAK` (kr/m² golvyta) och `MALNING_VAGG` (kr/m² väggyta, `wallCalc: true`).
- Väggyta beräknas som `4 × √yta × takhojd` (antar kvadratiskt rum).
- `rum.takhojd` default 2,4 m, editerbar per rum via egen input.

### Klinker i entré (reducesFloor)
- `entre_klinker` är `hasArea: true` med egen m²-input (default 2 m², förvalt ikryssad).
- `reducesFloor: true` → klinkerns m² dras av från golvytan vid beräkning av övriga golv-items.
- Exempel: entré 5 m², klinker 2 m² → ekparkett räknas på 3 m² = 1 830 kr (610×3).

### Stepper-pilar
- Upp/ner-chevron-knappar bredvid numeriska inputs (yta = steg 1, takhöjd = steg 0,1, styck-antal = steg 1, klinker-m² = steg 1).
- Press-and-hold med repeat efter 360 ms, 90 ms mellan steg.
- GPU-accelererade hover/active-states.

### Kategori-dividers
- `category`-fält per item. `renderRoom` injicerar divider när kategori byts.
- Kategorier: Köksinredning, Golv, Målning, Tillval, Kakel. Badrum-schablon utan kategori → ingen divider.

### Nya items
- **Ny innerdörr - komplett** (omdöpt från "Innerdörr komplett") och **Målning/förbättring bef. innerdörr** — radio-grupp `innerdorr` (placeholder 950 kr).
- **Garderob 60's stomme** i sovrum/hall/entré (placeholder 8 500 kr).
- **Hatthylla inkl. montage** i entré (placeholder 3 500 kr).
- **Ytterdörr (Daloc säkerhets/lägenhetsdörr inkl. montage)** i entré (placeholder 28 000 kr).

### Ny rumstyp: Övrigt
- `hideArea: true` — varken yta eller takhöjd visas.
- Innehåller: balkongdörr (förbättring/ny, radio), taklampa, eluttag, strömbrytare, radiator, dörrhandtag, slutstäd.
- **Schablon-förifyllt:** `perRoom`-fält på item + `tooltip`-text. När Övrigt-rum skapas räknas antal befintliga rum (exkl. Övrigt), counts sätts automatiskt: eluttag = 4/rum, taklampa = 1/rum, strömbrytare = 1/rum. Tooltip förklarar beräkningen.

### Sovrum-defaults
- Första sovrum som skapas: innerdörr ikryssad, count 2.
- Efterföljande sovrum: innerdörr ikryssad, count 1.

### Rumsnamn
- Varje rum har `namn`-fält (valfritt). Default placeholder = kategorinamn.
- När eget namn skrivs in: visas som rubrik, kategorinamnet som liten subtitel ("Kategori Vardagsrum").
- Live-uppdaterar även sidebar-item-name.

### Byggbitens logga
- Mörk (original) version kopierad till `src/assets/`. Inkluderad med vit bakgrunds-path.
- Senare ersatt av `byggbiten_logga_transparent_beskuren_vit.svg` — transparent, vit fyllning. Passar mörk header.

### Header-kort
- Fusionerade `.header` + `.meta` i gemensamt `.header-card` med divider-span mellan.
- Mörk gradient (warm antracit → svart → djup svart) med koppar-glow och inre ljushighlight upptill — inte platt-kolsvart.
- Vita texter, vit logga.

### Unika rum-ikoner
- Soffa, säng, hängare, dörr, gryta, badkar, wc-stol, skiftnyckel — alla i 24×24 stroke-baserade SVG (Lucide/Heroicons-stil).

### Sidebar + scroll-spy
- `.app-shell` grid: 228 px sidebar + 760 px main (max 1 080 px, centrerad).
- Sidebar sticky top 14 px, full viewport-höjd.
- Rum-listan fyller tillgänglig höjd (flex), scrollas internt vid många rum.
- Scroll-spy: rAF-polling av `window.scrollY` → uppdaterar aktiv sidebar-item (preview-iframen firar inte standard scroll-event, därav rAF).
- Klick på item: smooth-scroll till rummet + koppar-ring-highlight 1,1 s.
- Mobil (≤960 px): sidebar display:none, main full bredd.

### Sticky total-kort + sidebar-actions
- Total-kortet `position: sticky; bottom: 14 px`. Kompakterad padding/fontstorlek (48 px → 32 px total-amount) så det inte skymmer.
- Sidebar-actions (Spara kalkyl + Återgå till hemvy) i ett eget kort längst ner i sidebar, samma höjd (200 px) och bottom-alignment som total-kortet.

### Login (split editorial)
- Vänster: mörk brand-kolonn med logga, eyebrow "FÖR HSB SUNDSVALL", rubrik "Renoverings­kalkyl för bostadsrätten — på 30 sekunder.", lead-text, footer med Byggbiten-info.
- Höger: vit form-panel med användarnamn + lösenord + primär mörk knapp.
- Hårdkodad auth: användarnamn `hsbsundsvall` (case-insensitive) / lösenord `Byggbiten2026!`.
- Fel-respons: röd felruta med shake-animation.

### Hemvy (mörk header + val-cards + projektlista)
- Mörk header-baner (samma gradient som login-brand) med logga + användare + "Logga ut"-knapp.
- Hero: "VÄLKOMMEN TILLBAKA" eyebrow + "Vad vill du göra idag?" rubrik.
- Två action-cards: "Ny kalkyl" (primär, svart ikon-bakgrund) och "Återuppta kalkyl" (disabled om inga sparade finns).
- "Senast sparade kalkyler"-sektion med projekt-rader (ikon + namn + meta + total + "Ex. moms").
- Empty-state ("Inga sparade kalkyler än") om savedProjects.length === 0.

### Persistens (localStorage)
- `localStorage['byggbiten_kalkylator_v1']` sparar hela state (view, auth, savedProjects, currentProjectId, projektNamn, datum, rum).
- Debouncad 300 ms efter varje mutation.
- Vid page-load: återställer view + auth + data. Om ej inloggad → login.

### Ny sessions-rapport + dokumentation
- Denna fil.
- DESIGN.md uppdaterad (parallell commit).
- OPEN_QUESTIONS.md uppdaterad.

---

## Öppna frågor (OPEN_QUESTIONS)

Status efter idag:
- **Q1 Kökspris** — delvis besvarad (två varianter beslutade, priser placeholder).
- **Q2 Moms** — BESVARAD (ex. moms).
- **Q3 Logga** — BESVARAD (transparent vit SVG inlagd).
- **Q4 Kontaktuppgifter / Begär offert-länk** — ÖPPEN.
- **Q5 Spärrmålning borttagen** — provisoriskt ja.
- **Q6 Badrum per-post** — nej, bara schablon (beslutat).
- **Q7 Disclaimer-text** — ÖPPEN.
- **Q8 Hemsidereferens** — ÖPPEN men inte blockerande.
- **Q9 Info-dialog-innehåll** — ÖPPEN, framtida feature.
- Nya Q10: **Placeholder-priser** (garderob, hatthylla, ytterdörr, innerdörr-målning, balkongdörrar, eluttag/strömbrytare/taklampa, slutstäd, entré-schablon ersattes med per-post).

---

## Vad fungerade

- **Iterativ mockup → implementation-process.** Mockups 01–04 gav Dennis något konkret att reagera på, och valet av stil (split-login från 02 + hemvy från 01) gjorde implementation straight-forward.
- **Hubbe-stilens dokumentation** gjorde det lätt att hålla koll på beslut, öppna frågor och designjustering parallellt med kod.
- **Granulära DOM-uppdateringar** eliminerade flimmer när state ändras — nyckel-UX-krav från Dennis.
- **FLIP-animation** för drag-and-drop gav den "levande" känslan som önskades.
- **Sticky layout** (total + sidebar-actions bottom-alignment) låste visuell balans.
- **Dev-servern med no-cache-headers** räddade mycket tid eftersom preview-iframen annars cachar JS aggressivt.

---

## Vad fungerade inte / knepigheter

- **@keyframes-upptäckten.** Saknad `@keyframes fadeUp` i CSS gjorde att hemvyns action-cards och hero stannade på `opacity: 0`. Upptäcktes först när Dennis rapporterade "hemvyn saknar mycket".
- **Grid-kolumn kollapsar när sidebar display:none.** När `.sidebar.is-empty` göms tas den bort från grid-layouten och main-kolumnen kollapsar till första kolumnens bredd. Löst genom att alltid visa sidebar (med tom nav-lista när inga rum).
- **Preview-iframen pausar rAF och scroll-events.** Scroll-spy fungerade inte i synthetic tester men fungerar i riktig browser. Löst genom rAF-polling istället för scroll-event, som fungerar när iframen är aktiv.
- **Byggbitens logotyp exporterad med vit bakgrunds-path.** Första versionen hade inte transparent bakgrund. Dennis exporterade om och skickade den vita varianten.

---

## Rekommendation för nästa session

**Slutleverans-kritiskt:**
1. **Print-CSS (@media print)** — kalkylen som PDF-vänlig utskrift. Dölj sidebar/knappar/modal, visa ren A4-layout med projektnamn, datum, alla rum+poster, total, disclaimer, Byggbiten-kontakt i sidfot.
2. **Riktiga priser** — byt ut alla `placeholder: true`-värden (kök standard/Plus, garderob, hatthylla, ytterdörr, innerdörr-målning, balkongdörrar, eluttag, strömbrytare, taklampa, slutstäd).
3. **Build-script** — bundla `src/` → `dist/kalkylator.html`. Inlinea CSS, JS, SVG, ev. fonter (base64). Verifiera att dubbelklick fungerar offline.

**Därefter:**
4. Kontaktuppgifter + disclaimer-formulering (Q4, Q7).
5. "Begär offert"-knapp → koppla till riktig destination.
6. Info-dialog-feature (klickbara material-rader, dialog med beskrivning + bild).
7. Radera/döp om sparade projekt från hemvy.
8. Mobilresponsivitet-polish (sidebar-fallback bättre än display:none?).

---

## Tekniska noteringar för framtida agenter

- **Versionsbump i `index.html`** (`?v=NN` på script-tags) behövs vid JS-ändringar pga browser-cache — dev_server.py har no-cache-headers men riktiga fil-URL:er ändå kan cachas.
- **Scroll-spy-metoden** använder `requestAnimationFrame`-polling av `window.scrollY` i stället för `scroll`-event. Gör inte om till scroll-event — det stödjs inte överallt i preview-iframes.
- **Sidebar ska ALLTID visas i calc-view.** Tidigare buggar pga grid-kolumn-kollaps när sidebar göms.
- **Storage-key:** `byggbiten_kalkylator_v1`. Bumpa `_v2` om state-schemat ändras inkompatibelt.
- **Auth-konstanter** ligger överst i `app.js` (`AUTH_USER`, `AUTH_PASSWORD`). Lätt att byta.
- **Dev-flaggor** i URL: `?empty=1` och `?demo=1` hoppar över login + seeder calc med tom/demo-data.
