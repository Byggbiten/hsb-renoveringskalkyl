# Session 2026-04-21 — Följeposter + Wikells-kalibrering + namnbyte

**Agent:** Claude Code (claude-opus-4-7, 1M context, desktop-klient)
**Varaktighet:** en lång session (ca 3–4 timmar effektivt arbete)
**Input-prompt:** `.project-context/prompts/2026-04-21-renoveringskalkyl-foljeposter-wikells.md`
**Referens:** `.project-context/references/HSB-3a-kalkyl-sammanfattning.md` (Wikells HSB-3a ROT-helrenovering, 49 s sammanfattad till markdown)
**Status vid sessionsslut:** Fas 1–7 genomförda. Appen fungerar med nya priser + följeposter. Dokumentation (DESIGN v1.4, DECISIONS 8 nya entries, OPEN_QUESTIONS Q6/Q10/Q12/Q13) uppdaterad.

---

## Vad som gjordes

### Fas 1 — Namnbyte Ytskiktskalkylator → Renoveringskalkyl
- `src/index.html` `<title>`-tag bytt.
- App-titel (calc-view header), login-hero-tagline, footer-disclaimer och "byggbitens schablonpriser för ytskiktsrenovering 2026" → "bostadsrättsrenovering 2026".
- Storage-nyckel `byggbiten_kalkylator_v1` **oförändrad** — gamla kalkyler laddas som tidigare.
- Interna variabelnamn och cache-query (`?v=28`) oförändrade utöver bump för cache-bust.

### Fas 2 — Datamodell för följeposter + Wikells-kalibrerade priser + språk-rensning
- Två factory-funktioner i `data.js`:
  - `floorRivningFU(parentId)` → 95 kr/m², `defaultChecked: true`, `inheritsReducesFloor: true`.
  - `floorSpacklingFU(parentId, defaultChecked)` → 187 kr/m², default varierande, `inheritsReducesFloor: true`.
- Delade golv-huvudposter (`GOLV_EKPARKETT`, `GOLV_KLICKVINYL`, `GOLV_MATTA`, `GOLV_KLINKER`) refereras från alla rumstyper. Var och en har `followups: [rivning, spackling]`.
- Wikells-kalibrerade priser (se DECISIONS.md 2026-04-21 och DESIGN.md § 5.3a):
  - Ekparkett 610 → 825 (Wikells 15.016: 590 mtrl + 0.26 tim × 250 × 3.72)
  - Klickvinyl 570 → 755 (Wikells 15.018 laminat)
  - Heltäckningsmatta 555 → 730 (Wikells 15.020 linoleum)
  - Klinker 900 → **1 600** (Wikells 15.015 ger 2 544; Dennis valde 1 600 medvetet)
  - Ny innerdörr 3 900 → 5 070 (Wikells 16.056)
  - Måla befintlig innerdörr 950 → 1 210 (Wikells 14.048)
  - Måla fönster invändigt 1 350 → 990 (Wikells 14.047)
  - Garderob 60's stomme 8 500 → 14 600 (Wikells 17.020)
  - Vägg kakel 750 → 1 160 kr/m² vägg (Wikells 15.027)
- Skyddstäckning 450 kr/rum (Byggbiten-snitt, inte Wikells 14.017 på 42 kr som uppenbart är för lågt).
- **Typ B-följepost** `SKYDDSTACKNING_FU` med `triggeredBy: ['malning_tak','malning_vagg']` och `renderInCategory: 'Målning'`.
- Språk-rensning på items (Wikells-termer → HSB-vänligt):
  - "Golv ekparkett" → "Ekparkett"
  - "Målning tak" → "Tak" (under Målning-divider)
  - "Målning vägg" → "Väggar"
  - "Målning fönster inv." → "Måla fönster invändigt"
  - "Ny innerdörr - komplett" → "Ny innerdörr"
  - "Målning/förbättring bef. innerdörr" → "Måla befintlig innerdörr"
- Nya helpers: `calcFollowupTotal`, `isRoomFollowupTriggered`, `syncFollowups`.

### Fas 3 — Rendering + events
- `renderFollowup(rum, parent, fu)` för typ A (indenterad under parent).
- `renderRoomFollowup(rum, rfu)` för typ B (dimmad när ingen trigger aktiv).
- `renderRoomBody(rum)` wrapper som lägger items i `<div class="room-body">`.
- `rerenderRoomBodyDOM(rumId)` — full kroppsomskrivning vid parent-toggle (så följeposter fades in korrekt).
- Ny event-action `toggle-followup`.
- `toggleItem` utökad:
  - När parent går från unchecked → checked och har `followups`: för varje följepost sätts `{ checked: !!fu.defaultChecked }` (ö**verrides** tidigare värden — kritiskt för att defaults ska kicka in även efter syncFollowups körts med parent unchecked).
  - När parent kryssas ur: följeposterna sätts till `{ checked: false }`.
  - Typ B: auto-aktivering när första trigger kryssas i; auto-avaktivering när sista trigger kryssas ur (om användaren inte manuellt styrt).

### Fas 4 — CSS för följeposter
- `.followup-row` grid `14px auto 1fr auto`, indenterad 36 px, font 13 px.
- `@keyframes followupIn` (220 ms ease-out) för entré-animation.
- `.followup-room-scope.is-dimmed` (opacity 0.45) för otriggad typ B.
- Små visuella kopplingar (en dash `—` före följeposts-labeln).

### Fas 5 — Badrum-split standard/plus
- Tidigare `badrum_helrenovering` (75 000) borta.
- Nya `badrum_standard` (85 000 kr) och `badrum_plus` (115 000 kr) med `group: 'badrum'` → ömsesidigt uteslutande.
- Båda har två typ A-följeposter:
  - "inkl. rivning av befintligt badrum" (5 500 / 7 500 kr, default on)
  - "inkl. fallspackling våtrumsgolv" (9 100 / 13 700 kr, default on) — priset för standard är Wikells 15.013 × 4 m².

### Fas 6 — Legacy-skydd + verifieringsscenarier
- `syncFollowups(rum)` körs i 3 punkter:
  1. `initialState()` över `state.rum` + alla `state.savedProjects[*].rum`.
  2. Vid `add-room`-handler efter nytt rum skapas (säker-belt-and-braces).
  3. Vid `loadProject` från hemvyn — varje laddat rum saneras.
- Verifierat genom att seeda gammal localStorage-struktur och öppna appen — följeposter lägger sig korrekt enligt defaults + parent/trigger-status.
- Scenarios från prompten verifierade (inkl. Scenario 5b spackling-defaults per golvtyp):
  - Klinker klickad: både rivning och spackling → `true`.
  - Ekparkett klickad: rivning `true`, spackling `false`.
  - Manuell spackling-toggle funkar (används när parent är checked).
  - Badrum standard → plus-swap: följeposter byts i sync med parent.

### Fas 7 — Dokumentation (denna fas)
- **DECISIONS.md**: 8 nya entries för 2026-04-21 (namnbyte, typ A/B följepost-modell, rivning golv-typ-oberoende, spackling-default per golvtyp, Wikells-formel, klinker-val, skyddstäckning-pris, badrum-split).
- **OPEN_QUESTIONS.md**:
  - Q6 (badrum) uppdaterad till split-variant.
  - Q10 (placeholder-priser) delad i två tabeller: Wikells-verifierade (ingen placeholder-tagg längre) och kvarstående placeholders (kök-schabloner, ytterdörr, balkongdörr, el-poster, etc.).
  - Nya Q12 (kap 29 projektgemensamt — hanteras utanför appen med disclaimer, rekommenderat D).
  - Nya Q13 (målning per-m² 144 kr — behålls som Byggbiten-erfarenhet tills Wikells per-m²-underlag dyker upp).
- **DESIGN.md v1.4**:
  - Namnbyte-notis i preambel.
  - Ny § 5.2a "Följeposter (typ A + typ B)" med regler för rendering, sync och inherit-flaggor.
  - Ny § 5.3a "Prisunderlag — Wikells Sektionsdata + omkostnadspåslag" med formeln `mtrl + tim × 250 × 3.72 + ue × 1.10`.
  - § 5.2 uppdaterad — nya labels (språk-städning), nya priser, följeposter dokumenterade under varje huvudpost.
  - § 5.4 datastruktur — nytt kodexempel med delade items, badrum-split, följepost-factories.
  - § 5.5 state — exempel inkl. följepost-nycklar.
  - § 7.4a följepost-rendering.
  - Appendix A prislista helt omgjord till v1.4 (Wikells-kälor per rad, separerade följepost-tabeller).
  - v1.4 changelog-entry tillagd.

---

## Vad som fungerade bra

- **Wikells-formeln var låg-risk att kalibrera mot** eftersom prompten innehöll `.project-context/references/HSB-3a-kalkyl-sammanfattning.md`. Alla priser kunde härledas mekaniskt.
- **Typ A + typ B-modellen** är tydlig i datamodell *och* rendering. Inget behov av generisk "scope-toggle"-hierarki.
- **syncFollowups-mönstret** löste legacy-uppgraderingen på ett sätt som inte kräver schema-bumpar eller migrations-script. Funktionen körs idempotent på varje start.
- **Claude var kritisk i rätt lägen** (påpekade att Wikells 14.017 på 42 kr/rum var orimligt lågt för skyddstäckning, att klinker-Wikells låg över konkurrensläget, att väggmålning saknade granulär Wikells-data).
- **Delade item-referenser** (`GOLV_EKPARKETT` som en const som används i 5 rumstyper) gör att en framtida prisjustering bara behöver ändra en rad.
- **Badrum-split följde samma radio-mönster som kök-schablonerna** → ingen ny UX-pattern att lära ut.

## Vad som inte fungerade / krävde iteration

- **Första syncFollowups-implementationen** initierade följepost-state med `checked: false` när parent var unchecked vid rum-skapande. Sedan hade `toggleItem` logiken `if (rum.valda[fu.id] === undefined) { initialize }`, vilket **aldrig triggades** eftersom syncFollowups redan initierat entrien. Resultat: ekparkett kryssad men rivning/spackling kvar på false.
  - **Fix:** Bytte toggleItem-logiken till "om parent transitionerar från unchecked → checked: **overrides** alltid följeposter till `{ checked: !!fu.defaultChecked }`". Motsvarar promptens regel "följepost är kryssad som default när huvudposten kryssas".
  - Verifierat i Scenario 5b-testen.
- **Språk-rensning krävde domän-bedömning** — Wikells "Tätskikt cementbaserat folieförstärkt" är inuti badrum-schablonen och exponeras inte i UI, så inget att städa där. Men "Målning vägg" → "Väggar" krävde att kategori-dividern "Målning" tydligt visas ovan för att label ska vara självförklarande.
- **Q13-frågan (väggmålning 144 kr/m²)** uppkom under kalibreringen. Wikells-sammanfattningen hade bara per-rum-UE (47 kr/rum) vilket är hopplöst för per-m². Parkerade som öppen fråga för nästa Wikells-runda.

## Öppna frågor efter sessionen

Se `OPEN_QUESTIONS.md` för detaljer. Nya/ändrade:

- **Q6** — badrum-split är BESLUTAT, markerad uppdaterad 2026-04-21.
- **Q10** — placeholder-listan har halverats (Wikells-kalibrerade rader borta), kvar är kök, ytterdörr, hatthylla och alla "Övrigt"-poster.
- **Q12** *(ny)* — kap 29 projektgemensamt (etablering, projektledning, container, ställning). Rekommendation till Dennis: hantera utanför appen via disclaimer (kap 29 ingår i offertslutpriset).
- **Q13** *(ny)* — väggmålning 144 kr/m² saknar Wikells-kalibrering. Hanteras nästa Wikells-runda.

Ofärskt öppna från tidigare (opåverkade):
- Q4 (kontaktuppgifter för utskrift/"Begär offert")
- Q5 (spärrmålning-bekräftelse)
- Q7 (disclaimer-exakt formulering)
- Q8 (hemsidereferens/screenshots)
- Q9 (info-dialog-innehåll per material)
- Q1 (slutgiltiga kökspriser)

## Rekommendation för nästa session

1. **Dennis testar appen i webbläsaren** — särskilt scenariot "välj badrum standard → följeposter visas → kryssa i ett par rum till → verifiera att total stämmer mot Wikells-kalkylen för HSB-3a".
2. **Svar på Q4 + Q7 + Q1** (kontakt, disclaimer, kökspriser) — kvar till slutleverans.
3. **Q12 hantering** — bör förankras med HSB innan appen når slutanvändare, så "varför matchar inte appen offertpriset"-frågor har en dokumenterad svar-väg (platsbesök + offert inkluderar kap 29).
4. **Q13 väggmålning** — bara om Dennis vill härda prisunderlaget ytterligare. Inte akut.
5. **Print-CSS-polering** — blev skjuten till senare. När disclaimer-texten är slutformulerad (Q7) kan print-vyn göras klar.
6. **Build-script / leverans** — produktionsbygge av en fristående `renoveringskalkyl.html` med allt inlinat. Ej akut utan bara när Dennis vill leverera första versionen till HSB.

## Filer som rörts denna session

```
src/
  index.html              (title, v=28 bump)
  data.js                 (full omstrukturering, delade items, följepost-factories, Wikells-priser)
  app.js                  (renderFollowup, renderRoomFollowup, renderRoomBody, rerenderRoomBodyDOM, toggleFollowup, toggleItem-utökning)
  style.css               (.followup-row, .followup-room-scope.is-dimmed, @keyframes followupIn)

.project-context/
  DESIGN.md               (v1.3 → v1.4, namnbyte, §5.2, §5.2a, §5.3a, §5.4, §5.5, §7.1, §7.4, §7.4a, Appendix A, changelog)
  DECISIONS.md            (+8 entries 2026-04-21)
  OPEN_QUESTIONS.md       (Q6 uppdaterad, Q10 omstrukturerad, Q12 + Q13 nya)
  sessions/
    2026-04-21-foljeposter-wikells.md  (denna fil)
```

Totalt: 4 kodfiler + 4 dokumentationsfiler.
