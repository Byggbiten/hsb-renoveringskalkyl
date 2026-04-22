# DECISIONS.md

Logg över fattade beslut och deras motiveringar, kronologiskt. Nytt beslut läggs till längst ner med datum.

Format per beslut:
```
## YYYY-MM-DD — Kort titel
**Beslut:** Vad bestämdes.
**Motivering:** Varför.
**Alternativ övervägda:** Vad vi valde bort och varför.
**Konsekvenser:** Vilka följdändringar blir det.
```

---

## 2026-04-20 — Hubbe-stil projektstruktur
**Beslut:** Använd `.project-context/`-struktur (DESIGN.md, AGENT_CONTEXT.md, DECISIONS.md, OPEN_QUESTIONS.md, mockups/, sessions/, references/, prompts/, snapshots/) — samma som i Hubbe-projektet.
**Motivering:** Dennis använder redan denna struktur i Hubbe och gillar filäganderegeln. Den är tillräckligt robust för att flera agenter (Claude Code, Cowork, claude.ai) ska kunna hoppa in.
**Alternativ övervägda:**
- TimeTracker-stilens flata struktur (CLAUDE.md + USERS_GUIDE.md + PROMPT_FAS[N].md) — enklare men växer lätt rörig.
- Lättare variant (bara CLAUDE.md + DESIGN.md + sessions/) — för liten för projektet.
**Konsekvenser:** Alla nya dokument respekterar äganderegeln. Befintliga filer (UTVECKLINGSDOKUMENT_..., Priser.xlsx, Konversation...) behålls i roten som källmaterial.

---

## 2026-04-20 — Mockup-fas före utveckling
**Beslut:** Producera 3 statiska HTML-mockup-varianter i `.project-context/mockups/` innan någon riktig utveckling startar. Iterera på den vinnande varianten, sedan övergå till utveckling.
**Motivering:** Dennis vill låsa in design/känsla innan djupare utveckling. Tre varianter gör jämförelse tydlig och minskar risken att vi fastnar i en estetik som inte sitter.
**Alternativ övervägda:**
- 1 mockup + iteration — mindre utforskning, risk att vi missar bättre riktning.
- Semi-interaktiv prototyp direkt — tar längre per variant, vinner man inget på i design-diskussion.
- Hoppa över mockup och bygga direkt — risk att vi bygger fel känsla.
**Konsekvenser:** Statiska mockups räcker (ingen JS-logik). Samma förladdade data i alla tre så skillnaden är ren design. Nästa fas är urval + iteration.

---

## 2026-04-20 — "Cool och levande", inte online-Excel
**Beslut:** Appen ska kännas som en modern, polerad webbapp — mikro-interaktioner, transitions, subtila skuggor OK. Den tidigare designprincipen i utvecklingsdokumentet ("flat, inga skuggor eller gradienter") är ersatt.
**Motivering:** Dennis sade explicit att appen ska kännas cool och imponerande, inte som ett online-Excel. Detta är en signal om att premium-känsla är viktigare än asketisk flat design. Byggbiten tjänar på att HSB tycker verktyget är snyggt.
**Alternativ övervägda:** Behålla den ursprungliga flat-principen — risken är att appen känns stum och opersonlig.
**Konsekvenser:**
- DESIGN.md § 4.5 omformulerad.
- Acceptanskriterier uppdaterade med "mikro-interaktioner och transitions finns".
- `prefers-reduced-motion` måste respekteras.
- Animationer ska vara GPU-accelererade (transform/opacity), 150–250ms mikro, 300–500ms entré.
- Mockup-03 tar riktningen till "wow"-nivå medan mockup-01 och -02 är mer återhållsamma.

---

## 2026-04-20 — Tre statiska mockup-varianter och deras filosofi
**Beslut:** Skapa tre mockups med olika estetiska tolkningar:
1. `mockup-01-stilren.html` — minimal / tidlös, Stripe/Linear-inspirerad, polerade transitions.
2. `mockup-02-byggbransch.html` — solid hantverkarkänsla, pusselbit-accent, Byggbiten-palett fullt ut.
3. `mockup-03-premium.html` — extra levande wow-nivå, spring-animations, premium-känsla.
**Motivering:** Dennis har tydliga signaler (byggbranch-känsla via pusselbiten, cool/levande) men inga hårda låsningar på enskild stil. Tre varianter täcker spannet mellan "ren" och "kraftig" så urval blir lätt.
**Alternativ övervägda:** Endast en "byggbransch"-riktning eftersom det verkar mest on-brand — men då tappar vi jämförelsen mot en renare stil.
**Konsekvenser:** Varje mockup har samma data (Brf Parken lgh 14, 3 rum) så jämförelsen är ren.

---

## 2026-04-20 — Vald riktning: mockup-02 stil + mockup-03 wow
**Beslut:** Fortsätt iterera på mockup-02:s stilgrund (ljus bakgrund, svart header med pusselbit-ordmärke, off-white paneler, koppar-orange schablon-accent) kombinerat med mockup-03:s wow-effekter (shimmer-border runt total-kortet, spring-animations vid entry, gradient-fill på titel/totalsumma, bouncy checkbox, hover-lift på rum-kort, roterande pusselbit-accent vid hover, easeOutExpo count-up, 90°-rotation på plus-ikon vid hover, logoReveal med scale+rotate).
**Motivering:** Mockup-02 har rätt Byggbiten-identitet (ljus hantverkarkänsla, pusselbit-accent, inte dark mode). Mockup-03 har rätt energi (cool/levande, inte online-Excel). Kombinationen ger proffsig Byggbiten-leverans som samtidigt känns imponerande.
**Alternativ övervägda:**
- Gå direkt på mockup-03 — ger wow men dark mode känns inte riktigt rätt för HSB-förvaltare som bläddrar under dagtid.
- Gå direkt på mockup-02 — säkert men riskerar att kännas statiskt.
**Konsekvenser:**
- Ny fil `mockup-04-byggbransch-wow.html` skapas. Originalen (01, 02, 03) behålls orörda som referens.
- Nästa feedback-runda iterateras på mockup-04.
- När mockup-04 sitter: fortsätt med att besvara OPEN_QUESTIONS (kökspris, moms, logga, disclaimer) och gå över till riktig utveckling.

---

## 2026-04-20 — Ex. moms, förenklad SVG, två kök-varianter, förberedd info-dialog
Sammanfattning av fyra relaterade beslut från samma session:

**1. Moms — exklusive.** Alla priser redovisas ex. moms. HSB är momsdragande förening. Tag "ex. moms" visas i total-kortet och utskriftens sidfot.

**2. Logga — förenklad SVG (provisoriskt).** Fortsätt med inline-SVG (pusselbit + "byggbiten" ordmärke) till dess Dennis levererar invers-version. SVG:n ligger som en funktion och kan bytas ut utan att resten av koden påverkas.

**3. Kök — två ömsesidigt uteslutande varianter.** "Komplett kök standard" (placeholder 150 000) och "Komplett kök Plus" (placeholder 225 000). Båda markerade med "Preliminärt pris"-tagg tills Dennis ger slutliga siffror. Generaliserar `group`-konceptet: tidigare bara för golv, nu för alla ömsesidigt uteslutande val inom ett rum.

**4. Förberedd info-dialog-feature.** Vissa material-poster (t.ex. "Golv ekparkett") ska senare kunna klickas → dialog med beskrivning + bild öppnas. **v1 implementerar inte dialogen**, men datamodellen får `info: { description, image }` på alla golv-poster och rendering har subtil info-ikon som hint. När Dennis senare fyller på beskrivningar/bilder aktiveras featuren utan större omstrukturering. "Golv parkett" byter etikett till "Golv ekparkett" för att matcha Dennis språkbruk.

**Motivering (samlad):** Dennis gav tydliga direktiv i en enda runda. Samtliga beslut är låga-risk och låser upp utvecklingsfasen. Info-dialog-förberedelsen är särskilt viktig eftersom det är billigt att baka in nu men dyrt att retrofit:a senare.

**Konsekvenser:**
- DESIGN.md § 5.2, § 5.4, § 6.4 uppdaterade.
- OPEN_QUESTIONS Q1, Q2, Q3 markerade BESVARAD/DELVIS BESVARAD. Q9 (info-innehåll per material) tillagd.
- Mockup-04 uppdateras för att visa två kök-alternativ + info-ikon-hint på golvrader.
- Utvecklingsfasen kan dra igång med placeholders där Dennis ännu inte gett exakt värde.

---

## 2026-04-21 — Namnbyte Ytskiktskalkylator → Renoveringskalkyl
**Beslut:** Appen byter namn och alla synliga texter från "Ytskiktskalkylator" till "Renoveringskalkyl". Underliggande storage-keys och variabelnamn i kod behålls (bakåtkompatibilitet).
**Motivering:** Scopet har vuxit bortom bara ytskikt — följeposter inkluderar rivning, fallspackling, våtrumsförarbete. "Renoveringskalkyl" är mer ärligt mot det appen faktiskt räknar.
**Konsekvenser:** `<title>`, app-title, footer, disclaimer, login-hero-text och sessions-kommentarer ändrade. Storage-key `byggbiten_kalkylator_v1` oförändrad — gamla kalkyler laddas som vanligt.

---

## 2026-04-21 — Följepost-modellen (typ A + typ B) i stället för scope-toggle
**Beslut:** Inför "följeposter" — checkboxar som sitter under huvudposter, är kryssade som default, inkluderas i kalkylen, och kan avkryssas i särfall. Två typer:
- **Typ A (per-huvudpost)**: bundet till en specifik item. Ex: "inkl. rivning av befintligt golv" under "Ekparkett". Visas indenterat direkt under parent. Aktiveras/deaktiveras av sin parent.
- **Typ B (rums-scope)**: bundet till rummet, triggat av en eller flera items. Ex: "Skyddstäckning" i MÅLNING-sektionen triggas av valfri målningspost. Visas alltid i sin `renderInCategory`-sektion men dimmad när ingen trigger är aktiv.
**Motivering:** Patriks ursprungsunderlag underprissatte verkligheten — rivning, förarbete och skyddstäckning saknades. Alternativet "scope-toggle per rum" (ytskikt vs helrenovering) skulle ge krångligare UX och dölja vad som ingår. Följeposter är transparenta: användaren ser exakt vilka tillägg som räknas in och kan justera i särfall.
**Alternativ övervägda:**
- Scope-toggle per rum: dolde detaljerna, svårare att förklara bort enskilda poster.
- Fast inräknade tillägg (ingen checkbox): tog bort kundens kontroll helt.
**Konsekvenser:**
- `followups` på items i `data.js`. `roomFollowups` på rumstyper.
- `syncFollowups(rum)` säkerställer att äldre sparade kalkyler uppgraderas utan crash (gracefully lägger till defaults).
- Rendering visar typ A indenterat + typ B dimmad/aktiv i rätt kategori.
- Regel: följeposter får inte ha egna följeposter (ingen nästling).

---

## 2026-04-21 — Rivnings-pris golv-typ-oberoende
**Beslut:** "inkl. rivning av befintligt golv" som typ A-följepost på alla golv-huvudposter (ekparkett, klickvinyl, matta, klinker) har **samma pris 95 kr/m²**, oavsett vilket nytt golv som läggs.
**Motivering:** Wikells har olika rivningstider per golvtyp (laminat 0.05 tim/m², linoleum 0.12, klinker 0.32) men skillnaden är irrelevant i offertstadium. En förenkling spar datamodell och förklaringsjobb. Snitt-tid 0.10 tim/m² × 250 × 3.72 = 93 → 95 kr/m² (Byggbiten-snitt).
**Konsekvenser:** Om klinkerrivning senare visar sig kraftigt underprissatt kan vi splitta till golv-typ-specifik rivning. Ingen arkitekturell förändring behövs — bara prisuppdatering per item.

---

## 2026-04-21 — Spackling-default beroende på golvtyp
**Beslut:** "inkl. flytspackling undergolv" som typ A-följepost på alla golv-huvudposter, men **defaultChecked varierar**:
- **Klinker (hall/toalett/entré):** `defaultChecked: true`. Klinker kräver plant underlag.
- **Ekparkett, klickvinyl, heltäckningsmatta:** `defaultChecked: false`. Dessa läggs normalt ovanpå befintligt stabilt underlag.
- **Badrum:** `inkl. fallspackling våtrumsgolv` `defaultChecked: true` (branschpraxis för våtrum).
**Motivering:** Medveten avvikelse från rivnings "alla-är-på"-regel. Spackling-behovet varierar kraftigt i verkligheten och en one-size-fits-all default skulle ge felräknade kalkyler.
**Konsekvenser:** Dokumenteras som medveten avvikelse i DESIGN.md § 5.2. Om användaren vill lägga spackling på parkett-golv kan de kryssa i manuellt.

---

## 2026-04-21 — Wikells som primärt prisunderlag + omkostnadspåslag i formel
**Beslut:** Alla priser i `data.js` härleds ur Wikells Sektionsdata-kalkylen (HSB-3a-kalkyl-sammanfattning.md). Formel:
```
pris_per_enhet = mtrl + tim × 250 × 3.72 + ue × 1.10
```
Där 3.72 = 1 + 272% omkostnadspåslag på arbete, 1.10 = 1 + 10% omkostnadspåslag på UE. Priset är det HSB betalar (efter påslag). Patriks ursprungspriser ersätts.
**Motivering:** Wikells är branschstandard och ger reproducerbar prissättning. Omkostnadspåslagen måste inkluderas i app-priset eftersom det är offertpriset till slutkund, inte direkt-kostnad.
**Undantag:** Där Wikells saknar direkt motsvarighet (kök-inredning, ytterdörr Daloc, garderob-specifika modeller, badrum-varianter, skyddstäckning-schablon) används "Byggbiten-erfarenhet" och markeras i kodkommentar.
**Konsekvenser:** Flera priser har ökat (innerdörr 3 900 → 5 070, ekparkett 610 → 825, matta 555 → 730). Andra har minskat (klinker medvetet sänkt från Wikells 2 500 → 1 600 för konkurrensläge).

---

## 2026-04-21 — Klinker 1 600 kr/m² (medveten undervärdering av Wikells)
**Beslut:** Klinker får **1 600 kr/m²** trots att Wikells fullkalibrering ger ~2 544 kr/m² (711 mtrl + 1.50 tim × 250 × 3.72 + 408 UE × 1.10).
**Motivering:** Dennis bedömer att Wikells klinker-pris ligger över Byggbitens faktiska kostnadsläge (inköp via partner, inte spot). 1 600 är ett konkurrenskraftigt offertpris som täcker faktisk marginal.
**Konsekvenser:** Avvikelse dokumenterad i `data.js`-kommentar. Gäller GOLV_KLINKER (hall, toalett) och entre_klinker-tillvalet.

---

## 2026-04-21 — Skyddstäckning 450 kr/rum (Byggbiten-erfarenhet)
**Beslut:** Rums-scope-följepost "Skyddstäckning" får **450 kr/rum** som schablon, trots att Wikells 14.017 ger 42 kr UE/rum (≈46 kr efter påslag).
**Motivering:** Wikells 14.017 är underskattad och uppenbart otillräcklig för plast + tape + tid för skyddstäckning av möbler/golv i ett riktigt renoveringsprojekt. 450 kr/rum är Byggbitens erfarenhetsbaserade snitt.
**Konsekvenser:** Dokumenteras som Byggbiten-erfarenhet i `data.js`. Ej flaggat `placeholder: true` eftersom det är ett satt pris.

---

## 2026-04-21 — Badrum-split standard (85 000 kr) / plus (115 000 kr)
**Beslut:** Dagens 75 000 kr-schablon ersätts med två ömsesidigt uteslutande varianter (`group: 'badrum'`):
- **Helrenovering badrum standard** — 85 000 kr schablon. Följeposter: rivning (5 500 kr default-on), fallspackling (9 100 kr default-on).
- **Helrenovering badrum plus** — 115 000 kr schablon. Följeposter: rivning (7 500 kr), fallspackling (13 700 kr).
**Motivering:** 75 000 för komplett helrenovering var orealistiskt lågt. Wikells-sammanfattningen pekar på 80–130 tkr för ett riktigt badrum beroende på storlek och nivå. Split i två matchar kök-mönstret (standard/plus) och ger HSB tydlig variabilitet.
**Konsekvenser:** Gamla kalkyler med `badrum_helrenovering` kryssad kommer att visa 0 kr efter uppgradering — användaren måste välja nya standard eller plus. Dokumenteras som known-issue.

---

## 2026-04-22 — Badrum schablon → per-post (v4)
**Beslut:** Badrum-schablonerna `badrum_standard` (85 000 kr) och `badrum_plus` (115 000 kr) ersätts med **per-post-modell** (10 items + 3 rumsföljeposter). Skalar mot faktisk golv-/väggyta. Rumstyp byter `type: 'schablon'` → `type: 'per_post'`.
**Motivering:** Schabloner underpriseerade stora badrum och överpriseerade små (3 m² gästbadrum vs 8 m² huvudbadrum fick samma pris). Med Dennis nya Wikells-byggdelar (8.502 kakel, 8.503 plastmatta vägg, 8.504 våtrumsfärg) finns nu underlag för riktiga kr/m². Ett 5 m² full-maxad badrum (klinker + kakel + allt default) landar på ~148 400 kr; plastmatta + våtrumsfärg ~116 300 kr. Spannet matchar promptens Wikells-sanity-check.
**Alternativ övervägda:** Schablon-split i fler nivåer (S/M/L/XL) — men det är fortfarande schablon, inte pris-per-verklighet.
**Konsekvenser:** Gamla kalkyler med `badrum_standard`/`badrum_plus` får synlig notis i rumskortet och 0 kr tills användaren väljer nya material. Se DESIGN.md § 5.2 + Appendix A.

---

## 2026-04-22 — Våtrumsdörr Wikells 16.059 (målad trä) framför 16.070 (PP-laminerad)
**Beslut:** Default-dörr i badrum är **16.059 Toalettinnerdörr målad** (4 655 kr/st), inte 16.070 PP-laminerad (15 316 kr/st).
**Motivering:** Cowork rekommenderade 16.070 som "marknadsstandard". Dennis invände — de flesta HSB-renoveringar klarar sig med en vanlig målad innerdörr och är prismedvetna. Att default-uppgradera till PP gör kalkylen onödigt hög. Kund som vill uppgradera gör det via offert-diskussionen, inte appens default.
**Konsekvenser:** Spar 10 661 kr per badrum på default-kalkylen. Label i UI: "Våtrumsdörr (målad trä)" — ingen fotnot i v1.5, tooltip-forklaring planeras till Q9.

---

## 2026-04-22 — UE el 8 000 / VS 12 000 som separata poster i badrum
**Beslut:** Badrum har två explicita UE-poster: **UE — El** 8 000 kr/st och **UE — VS** 12 000 kr/st. Båda är Byggbiten-schabloner som normaliserar Wikells 20.002/20.003 (som är per-projekt-komplexa).
**Motivering:** El och VS är två separata hantverks-discipliner och två separata underleverantörer. Att bryta ner dem från en gemensam "UE-schablon" ger transparens mot kund och låter kalkylen också avspegla fall där bara ena gruppen jobbar (t.ex. fräscha upp men inte flytta avlopp).
**Konsekvenser:** Både default-kryssade via `defaultOnCreate`. Kan kryssas av individuellt om projektet inte kräver båda.

---

## 2026-04-22 — `defaultOnCreate` deklarativt i data.js (arkitektur)
**Beslut:** Rumsskapande-defaults flyttas från hårdkodad if/else-stege i `app.js` till deklarativ `ROOM_TYPES[typ].defaultOnCreate`-tabell i `data.js`. Gäller sovrum (innerdörr count 1), entré (klinker 2 m²), badrum (5 inredning/UE-items).
**Motivering:** App.js hade en if (sovrum) / else if (entre) / else if (ovrigt)-kedja som var svår att skala och blandade datamodell med kontroll-logik. Deklarativ tabell gör det enkelt att lägga till fler rumsspecifika defaults utan att röra app.js.
**Alternativ övervägda:** Behåll app.js if/else — fungerar men motverkar separation-of-concerns. Full schema-baserad plugin-arkitektur — överkill för detta projekt.
**Konsekvenser:** app.js-loop kortare (~9 rader vs 22). Övrigt-rummets `perRoom`-skalning kvar som runtime-specialfall på item-nivå eftersom den beror på state (antal befintliga rum). Ska en ny rumstyp läggas till räcker det att definiera items + defaultOnCreate i data.js.

---

## 2026-04-22 — Bugfix #65: sovrum innerdörr default count = 1
**Beslut:** Första sovrummet får `innerdorr.count = 1`, inte 2 som tidigare. Andra+ sovrum oförändrat (1).
**Motivering:** Antagandet att första sovrum är genomgångsrum med 2 dörrar stämmer inte i svensk lägenhetsstandard — varje sovrum har normalt **en** dörr ut mot hall. Default 2 gav 10 140 kr i dolt överpris som kunden riskerade att missa.
**Konsekvenser:** Uppgraderade sparade kalkyler (som har count 2 lagrat i localStorage) bibehåller sitt värde — det är bara nyskapade sovrum som får count 1. Dennis kan justera gamla kalkyler manuellt om så önskas. Implementerat via `defaultOnCreate`-mönstret (se entry ovan).

---

## 2026-04-22 — Bugfix #66: följepost-rader klickbara hela raden
**Beslut:** `data-action="toggle-followup"` flyttas från `<span class="checkbox">` (18 px target) till yttre `<div class="followup-row">`. Hela raden (label, pris, checkbox, tom yta) blir klickbar. Typ B rumsföljeposter: `data-action` sätts villkorligt — *endast* när `triggered`. Dimmade rader förblir oklickbara.
**Motivering:** Dennis testade appen som novis och beskrev följepost-avkryssning som friktion ("man missar alltid rutan"). 18 px är under WCAG-rekommenderade 44×44 för touch. Att hela raden togglas förstärker också mentalmodellen "raden är ett val".
**Alternativ övervägda:** Alternativ B (dubblerad event-listener) — mer kod, samma effekt. Att göra samma för vanliga item-rader — håll fokus, items har input-fält som kräver extra event-stop-logik.
**Konsekvenser:** Pure HTML+CSS-ändring. Event-delegationen i app.js rör sig inte (använder redan `closest('[data-action]')`). CSS: ny `.followup-row[data-action="toggle-followup"] { cursor: pointer }` + hover-tint på label.

---

## 2026-04-22 — Legacy-notis för sparade badrum-kalkyler (pre-v1.5)
**Beslut:** Sparade kalkyler med gamla `badrum_standard`/`badrum_plus`-nycklar visar en synlig beige/orange notis-rad på badrumskortet: *"Denna kalkyl är sparad före 2026-04-22 då badrum blev per-post. Välj om materialen för att få rätt pris."* Gamla nycklar lämnas orörda i `rum.valda` men refereras inte av nya items → bidrar 0 kr.
**Motivering:** Automatisk pris-migrering (t.ex. gammal 85 000 schablon → nya default-items) skulle tyst ändra kundens sparade kalkyl — brott mot förtroende. Synlig notis tvingar kund att aktivt välja om och får då rätt pris. Gamla nycklar sparas för eventuell framtida undersökning eller debug.
**Alternativ övervägda:** Silent migrering. Hårt raderande av gamla nycklar. Båda övergivna till förmån för transparent notis.
**Konsekvenser:** Användare med sparade pre-v1.5 kalkyler ser 0 kr på rumsubtotalen för badrum (utöver rivning + fallspackling som är alltid-on → 17 415 kr för 5 m²) tills de väljer nya golv/vägg/inredning. Notis-rad försvinner efter att användaren kryssar första nya badrum-item och uncheckar/kvarlämnar gammal schablon.

---

## 2026-04-22 — `isRoomFollowupTriggered`: saknad `triggeredBy` = alltid aktiv
**Beslut:** `isRoomFollowupTriggered(rfu, rum)` returnerar `true` om `rfu.triggeredBy` saknas eller är tom array. Bakåtkompatibelt: existerande `SKYDDSTACKNING_FU` har explicit `triggeredBy` och påverkas inte.
**Motivering:** Badrum-rivning och badrum-fallspackling ska alltid räknas i ett badrum (ingen trigger-post). Alternativet — att kräva en dummy-trigger som alltid är kryssad — var fuligt. Semantiken "ingen villkorslista = alltid aktiv" är intuitiv och fri från specialfall.
**Konsekvenser:** Framåt får nya rumsföljeposter utan `triggeredBy` "alltid-on"-beteende. Om det behövs en följepost som aldrig är aktiv räcker det med `defaultChecked: false` + icke-matchande triggers.

---

## 2026-04-22 — PDF-export som "Kalkylbudget", inte "Offert"
**Beslut:** Print-layouten är en dedikerad `#print-layout`-div som döljs på skärm och visas endast i `@media print`. Dokumentet har titeln **KALKYLBUDGET**, två prisspalter (netto + inkl moms), Wikells-kod i första tabellkolumnen, och en separat sida 2 med sammanställning + disclaimers. **Inga signaturrader, ingen "AVTALSBEKRÄFTELSE"-sektion.**
**Motivering:** Kalkylatorn producerar en överslagsräkning, inte en bindande offert. Tidigare `window.print()` utan `@media print`-stilmall gav en amatörig skärmdump med sidebar, knappar och trasiga sidbrytningar — sänker Byggbitens upplevda professionalism när HSB vidarebefordrar dokumentet till styrelse. Matchar referensoffertens layout ("Staben 2 — Varmförråd.pdf") men med tydliga skillnader som kommunicerar "budget, inte offert".
**Alternativ övervägda:** Tredjepartsbibliotek (jsPDF, html2canvas) — ger mer kontroll men blåser upp deliverablens storlek och bryter "en självförsörjande HTML-fil"-kravet. `@media print` är native, fungerar offline, och täcker 100 % av behovet.
**Konsekvenser:** CUSTOMER_INFO är hårdkodad för HSB Sundsvall tills multi-kund-prompten körs (TODO dokumenterat i `app.js`). `extractWikellsId`-regex accepterar både `15.016` och Dennis-egna `8.502`-format. Filnamn sätts via `document.title`-temp-hack som fungerar i Chrome/Firefox/Edge — Safari kan ha inkonsistens men det är kosmetiskt (utskriften själv fungerar ändå).

---

## 2026-04-22 — Begär offert-flöde: trestegs-modal, ingen auto-bifogning
**Beslut:** "Begär offert"-knappen öppnar modal med tre steg: (1) Spara PDF, (2) Välj mejlprogram (Native/Gmail/Outlook), (3) Bifoga PDF + skicka. PDF:en bifogas **manuellt av användaren** — tekniska gränser (mailto kan inte bifoga) gör auto-bifogning omöjlig.
**Motivering:** Alternativet att tvinga användaren att själv komponera mejl, hitta PDF:en och skriva ämne är för högt trösklat (lämna-appen-risk). Trestegs-modal med förifyllda mejl tar användaren 90 % av vägen utan server eller bakend. Tre mejlprogram täcker 95 %+ av HSB-förvaltares setup (Outlook webb är default för många företag, Gmail för andra, native mailto för Mac-användare).
**Alternativ övervägda:** Backend-tjänst som skickar mejlet direkt via SMTP — kräver server, bryter "fristående HTML-fil"-kravet. Endast mailto-länk — fungerar inte för användare utan default-mejlklient. Modal med bara en knapp som öppnar generiskt mailto — skadar användningen för Gmail/Outlook-användare.
**Konsekvenser:** Native-knappen har toast-fallback ("Om mejlappen inte öppnas automatiskt, använd Gmail eller Outlook istället") eftersom mailto-failure inte kan detekteras. `OFFERT_RECIPIENT = 'dennis@byggbiten.nu'` är konstant i app.js — trivialt att byta om Dennis ändrar företagsmejl.

---

## 2026-04-22 — Expanderbara item-rader (chevron + panel)
**Beslut:** Item-rader med `info.ingar[]` eller `info.wikellsRef` får en chevron längst till höger. Klick fäller ut en `.item-details-panel` under raden med INGÅR / INGÅR EJ / Wikells-referens. Datamodellen utökas från `info: {description, image}` till `info: {ingar, ingarEj, wikellsRef, image}`. 70 av 84 items fick info i v1.6; Claude skrev utkast baserat på Wikells-recepten, Dennis granskar efterhand.
**Motivering:** HSB-förvaltaren ser "Ekparkett 825 kr/m²" och undrar vad som ingår. Tidigare fanns inget sätt att få svar utan att ringa. Det undergräver förtroende. Hover-tooltip är förkastad — dålig mobil, ingen plats för bullet-listor. Klickbar expanderbar panel fungerar på alla plattformar och låter användaren öppna flera samtidigt för jämförelse.
**Alternativ övervägda:** Permanent synliga infotexter under varje item — blir för mycket text. Separat "info"-vy per post — extra navigation, hoppar ut ur kontexten.
**Konsekvenser:** Chevron-klick använder egen `data-action="toggle-item-details"` och fångas av event-delegationen före `toggle-item`. Ingen `stopPropagation` behövs. `state.expandedItems: Set` är session-bundet (rensas vid vyväxling) — inte persisterat till localStorage, eftersom expansions är kortlivade per-session-preferenser utan värde att bevara mellan sessioner. Print döljer paneler via `display: none !important` i `@media print`.

---

## 2026-04-22 — Gråade summor när post inte bidrar (.muted)
**Beslut:** `.item-price.muted` (ljusgrå) för items/följeposter som inte räknas in i totalen. Gäller item unchecked, `hasCount`+count=0, följepost unchecked/0 kr, typ B dimmad (ingen trigger).
**Motivering:** Tidigare var summa-siffran svart oavsett state → svårt att snabbt skanna vad som faktiskt räknas. Kryssar man av en post stod "0 kr" kvar i full svart som om den fortfarande bidrog — förvirrande. Grå färg gör totalen mer pålitlig visuellt.
**Konsekvenser:** Print använder **inte** muted — alla kryssade poster i utskriften visas i enhetlig svart. Det skulle vara fel att exportera "grå 0 kr"-rader i en PDF som vidarebefordras till styrelsen. Muted-logiken bor i `mutedForItem()` (för items) och direkt i `renderFollowup`/`renderRoomFollowup` (för följeposter).

---

## 2026-04-22 — Master.xlsx som sanning för priser, app-config.json som genererad artefakt
**Beslut:** Alla priser, rumstyper och rum×post-mappningar flyttas från hårdkodade `data.js`-konstanter till **`.project-context/data/master.xlsx`** (5 flikar). `scripts/build-config.js` läser, validerar och genererar `app-config.json`. `data.js` skalas till schema + helpers + SVG-ikoner + `loadConfig()`. App.js wrappas i async bootstrap.
**Motivering:** Dennis är projektledare, inte utvecklare. Att behöva redigera JS-kod för att ändra ett pris är orimligt och felbenäget. Wikells släpper nya priser 1–2 ggr/år — vi behöver en strukturerad process för diff + uppdatering. Excel är Dennis hemmaplan. Två-nivå-källspårning (Wikells originalnamn + artiklar i rå, Etikett + Ingår i UX-form) ger både tekniker och användare rätt vy.
**Alternativ övervägda:**
- **JSON-fil Dennis redigerar direkt** — enklare pipeline men JSON är mindre tillgängligt för icke-utvecklare. Kommentarer, formler och validering är svårare. Förkastat.
- **Admin-UI i appen** — hög bygg-kostnad, kräver localStorage-overrides, låser arbetsflödet till en webbläsare. Kommer som Fas 3 om behov uppstår.
- **Backend/databas** — bryter "fristående HTML-fil"-kravet, kräver server. Överdimensionerat i nuläget.
**Konsekvenser:**
- Master.xlsx måste öppnas i Microsoft Excel (inte LibreOffice) för att Wikells-formler ska räknas om korrekt. Dokumenterat i Flik 5 Förklaring.
- `node_modules/` + `dist/` + `src/app-config.json` läggs i `.gitignore`. `package-lock.json` kan antingen committas (rekommenderat för reproducerbarhet) eller ignoreras.
- Dev-workflow: Ctrl+S i Excel → `npm run build-config` → refresh i browsern. ~5 sekunder total.
- Validation-fel i build-config ger exit 1 och bevarar befintlig app-config.json så appen fortsätter fungera med tidigare version.
- CSV-snapshots per flik i `snapshots/YYYY-MM-DD/` ger git-diff-bar historik av prisändringar.

---

## 2026-04-22 — perimeterCalc som ny beräkningsflagga (parallell med wallCalc)
**Beslut:** Ny flagga `perimeterCalc: true` för items som skalar mot omkretsen (sockel, taklist). Mängd = `calcPerimeter(rum.yta) = 4 × √yta` löpmeter. Pris = kr/m × omkrets. Implementeras parallellt med befintlig `wallCalc` (väggyta = omkrets × takhöjd) — ömsesidigt uteslutande.
**Motivering:** Sockel och taklist saknades helt i appen före v1.7. De skalar mot omkretsen, inte mot golvyta eller väggyta. Att införa ny flagga i stället för att "omfamna" wallCalc gör semantiken tydlig: väggyta = omkrets × takhöjd, sockel = omkrets.
**Alternativ övervägda:**
- `wallCalc` + `linearOnly: true` — tvåstegsflagga, rörig.
- `hasLinearMeter: true` — otydligt namn.
- Manuell `hasArea: true` med default = omkretsen — för krångligt, förlorar "automatisk skalning mot rum.yta".
**Konsekvenser:** Ny Enhet `kr/m` (löpmeter) i Excel-dropdown. Ny Kategori `Lister`. Print-layouten visar `'m'` i Enh-kolumnen via itemEnhFor. Inget dörravdrag från omkretsen — enkelhet > exakthet för överslagskalkyl. Sockel/taklist visas i 5 torra rum (sovrum, vardagsrum, hall, entré, kök), inte badrum/toalett där klinkersockel ingår i golv-posten.

---

## 2026-04-22 — Dennis 16 prisbeslut för master.xlsx första version
**Beslut:** 16 specifika pris- och källändringar mot initial-extraktorns utkast. Sammanfattning:
- **Sänkningar till Wikells-värden:** ekparkett 825 → 757, klinker hall 1600 → 2593 (räknade ur 4 artiklar), vägg-kakel toalett 1160 → 1483.
- **Höjningar/nya:** sockel 0 → 124.35 (Wikells 8.132, 1 artikel, formel), entre_klinker 1600 → 1801 (Wikells 15.015 torr variant, endast klinkerplatta-artikel).
- **Byggbiten/HSB-förhandlat i stället för Wikells:** fönster 990 → 1350 (Patrik Norlén-UE-pris, wbr 14.047 är bara karmar), Marbodal-garderob 14600 → 3600 (HSB-avtal), hatthylla → 1450 (HSB-avtal), UE el/VS (8000/12000 Byggbiten-schabloner, wbr 20.002/20.003 är tomma slots), skyddstäckning 450 kr/rum (Byggbiten — wbr 14.017 räknar per m²), målning 144 tak/vägg (Byggbiten-kalibrerat — wbr 14.038 är bara material), badrum rivning 1200 kr/m² (Byggbiten bredare scope än wbr 15.001 som bara är klinker).
- **Oförändrat:** innerdorr_malning 1210 kr behåller wbr 14.048-formeln.
**Motivering:** Initial-extraktorn gjorde rätt jobb (kopplade data.js → wbr), men vissa wbr-byggdelar hade annat scope än vad data.js-priserna avsåg. Dennis byggteknologi-domänkunskap krävdes för att välja rätt pris-källa per post. Alla beslut dokumenterade i master.xlsx Anmärkning-kolumn + i engångsscriptet `scripts/archive/apply-dennis-corrections-2026-04-22.js`.
**Konsekvenser:** Ekparkett, klinker och vägg-kakel är nu billigare (ekparkett) eller dyrare (klinker, vägg-kakel) än tidigare app-versioner. Användare som sparat kalkyler före 2026-04-22 ser nya priser när de öppnar sin kalkyl — ingen silent migrering, samma logik som tidigare prisändringar. `app-config.json` + CSV-snapshot committas som del av ändringen för git-diff-spårning.

---

## 2026-04-22 — xlsx@0.18.5 accepteras trots CVE-varning
**Beslut:** npm-paketet `xlsx@0.18.5` har kända säkerhetsproblem (prototype pollution, ReDoS). Accepteras som dev-dep i `package.json` i stället för att byta till `xlsx@0.20+` från SheetJS CDN.
**Motivering:** Paketet körs endast lokalt på Dennis dator mot Dennis egen master.xlsx. Ingen extern input, ingen webbrunt tid, ingen användar-upload. Risken är obefintlig för detta usecase. `xlsx@0.20+` kräver installation via CDN-URL (`npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`) som gör package.json svårare att återställa och bryter standard npm-flödet.
**Konsekvenser:** `npm install` visar en varning vid varje kör, som är acceptabel. Om appen i framtiden tillåter upload av XLSX-filer från slutanvändare — byt paket omedelbart. Dokumenterat i Flik 5 (Förklaring) och DESIGN.md v1.7 changelog.

---

## 2026-04-22 — Renoveringsprincip: Wikells-byggdelar innehåller bara renoveringsarbete
**Beslut:** Wikells-byggdelar i Flik 1 (och därmed `app-config.json.items` med Pris-källa=Wikells) ska innehålla **endast** rivning, underarbete, skivmaterial, tätskikt, ytskikt, samt list/beslag som är del av en ytprodukt (foder, trösklar, dörrtrycken, sockellister). Inredning (WC-stol, blandare, skåp, speglar, duschväggar, toalettpappershållare, handdukshängare, el-installationer som golvvärme/spottar) räknas **inte** som renoveringsarbete och bakas in i UE-schabloner (`badrum_ue_vs`, `badrum_ue_el`) eller dedikerade Byggbiten-poster (`porslin` för toalett, `garderob_60` för sovrum).
**Motivering:** En Wikells-byggdel som heter "WC-duschinredning" (17.034) innehåller 9 artiklar där 7 är ren inredning (tvättställ, handdukshängare, toalettpapper, spegel, duschvägg etc.). Priset 30 816 kr representerar alltså mest inredning, inte renovering. När HSB-förvaltaren granskar kalkylen förväntar hen sig att "renoveringskostnaden" är tydligt separerad från "inrednings-inköp". Dessutom varierar inredningsval mycket mellan projekt — en schablon är mer ärlig än en Wikells-artikel-lista.
**Alternativ övervägda:**
- **Behåll Wikells-byggdelarna som är** — enklare, men döljer vad priset egentligen täcker och gör det omöjligt att byta en inrednings-artikel utan att röra Wikells-formeln.
- **Bryt ned varje Wikells-byggdel till sina artiklar som egna poster** — transparent men explosion i antalet items (artiklar × rum), svårt att underhålla.
- **UE-schabloner med bundlad ingår-lista** (vald) — enkelt för kund, matchar verklig fakturering (VVS-UE skickar en total-summa), Dennis kan justera priset i master.xlsx utan att röra Wikells-data.
**Konsekvenser:**
- `badrum_wc_dusch` (Wikells 17.034, 30 816 kr) och `badrum_inredning` (17.032, 9 274 kr) **borttagna** från Flik 1 + Flik 3. Deras Wikells-rader i Flik 4 lämnas som arkiv (används inte).
- `badrum_ue_vs` höjd från 12 000 → **40 000 kr** med detaljerad ingår-lista (8 punkter).
- `badrum_ue_el` höjd från 8 000 → **20 000 kr** med detaljerad ingår-lista (6 punkter) — placeholder tills Dennis får exakt pris.
- Nya badrum-subtotalen ≈ 148 339 kr för 5 m² full default + klinker + kakel (praktiskt oförändrat från v1.7 148 429 kr).
- Principen dokumenterad i Flik 5 Förklaring + DESIGN.md § 11.5.9.
- Audit-kontroll av andra Wikells-byggdelar: 11/14 aktiva är rent renoveringsarbete. Funn som flaggades: 16.059 "WC-behör" (accepteras som dörrbeslag inom ytprodukt-regeln), 17.020 (ej längre aktivt). Se sessionsrapport 2026-04-22-badrum-ue-restructure.

---

## 2026-04-22 — tagLabel-kolumn för UE-badges i UI
**Beslut:** Ny kolumn `tagLabel` i master.xlsx Flik 1. När ifylld renderas posten med en färgad badge bredvid etiketten. Två värden används idag: `UE-VS` (blå) och `UE-El` (grön). Generisk fallback för framtida värden.
**Motivering:** Efter badrum-restruktureringen blev det viktigt att kunden visuellt skiljer mellan vad som är Wikells-renovering (inkl tim+material enligt Wikells-formeln) och vad som är Byggbiten-UE-schablon (fast pris från under-entreprenörs-offert). En badge ger ≤1 sekunds beslut: "Detta är en UE-post, det är sannolikt där jag kan förhandla ned priset genom egen UE-upphandling." Färgkod (blå för VVS, grön för El) matchar byggbranschbranschens konvention.
**Alternativ övervägda:**
- **Separate visual component (ikon)** — mer UI-kod, svårare att få att fungera i print-layouten.
- **Prefix i Etikett** ("UE-VS: Badrumsinredning inkl VVS-installation") — rörig, påverkar sorteringsordning.
- **Tag i kategori-kolumnen** — bryter kategorin som används för UI-dividers.
**Konsekvenser:**
- `build-config.js` mappar `tagLabel` → `item.tagLabel`. Tom sträng → undefined (inga JSON-nullskräp).
- `renderItem()` i app.js har explicit klass-mappning för `UE-VS`/`UE-El` + generisk fallback.
- `.tag-ue`, `.tag-ue-vs`, `.tag-ue-el` i style.css. Distinkta färger från befintliga `.tag-schablon` (brun) och `.tag-placeholder` (grå).
- Bevarar befintlig `isSchablon` → "Schablon"-tagg för `unit === 'schablon'`. Båda kan samexistera.
- Framtida UE-typer (t.ex. `UE-Kyl`, `UE-VVS-stam`) kräver bara ny CSS-klass + en rad till i `renderItem()`.
