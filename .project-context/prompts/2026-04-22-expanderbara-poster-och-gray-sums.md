# Expanderbara poster + gråade summor

Datum: 2026-04-22
Författare: Claude (Cowork) i dialog med Dennis
Status: Ready to implement

Denna prompt är **fristående** från `2026-04-21-pdf-login-offert-och-unsaved.md`. Båda kan implementeras oberoende av varandra men om båda ska in samtidigt — gör denna först, eftersom PDF-exportens Kod-kolumn använder samma `wikellsRef`-metadata.

---

## 1. Varför vi gör detta

**Problem ur användarens perspektiv:**

HSB-handläggaren (eller en privatkund) ser i kalkylatorn att ekparkett kostar 825 kr/m². Hen undrar: *"Är det bara parketten eller ingår underlag och montering?"* Idag finns inget sätt att få svar utan att ringa Byggbiten. Det undergräver förtroendet för siffran.

Dennis vill att varje post ska gå att expandera för att visa **vad som ingår** (och **vad som inte ingår**) i byggdelen, samt vilken Wikells-referens priset bygger på. Det gör kalkylen transparent och gör att kunden vågar lita på överslaget.

**Konkret exempel:**
- Ekparkett 825 kr/m² — ingår: underlagspapp, lim, socklist, montering, städning. Ingår ej: flyttning av möbler, tröskel mot angränsande rum. Referens: Wikells byggdel 15.016.
- Badrum fallspackling — ingår: flytspackel med fall, primer, rengöring. Ingår ej: tätskikt (separat post).
- Takmålning — ingår: 1 strykning med vit takfärg. Ingår ej: spackel/grundning vid underbehandling.

Ett tidigare förslag var hover-tooltip. Det är förkastat: fungerar dåligt på touch, plats för bara kort text, försvinner av sig själv. Klickbar expanderbar panel är bättre UX för både desktop och mobil.

**Andra problemet:** summa-kolumnen visar samma svarta siffra oavsett om posten är ikryssad eller ej. Det är svårt att snabbt skanna vad som faktiskt räknas med. Fix: summan gråas ut när posten inte är aktiv.

---

## 2. Nuvarande beteende

### Expanderbara poster
- Varje item renderas som en rad: checkbox + label + pris/enhet + summa
- Ingen info-ikon, ingen expanderbar vy, ingen referens till Wikells
- Datafältet `info: { description: null, image: null }` finns på vissa items men används inte
- Tooltip över hela raden finns inte

### Summor
- Summa-siffran visas i samma `color: var(--color-text)` oavsett om `item.checked === false`
- Samma sak för `hasCount`-items (innerdörr, fönster, garderober) när `count === 0` — summan "0 kr" är svart
- Inget visuellt som markerar att posten är inaktiv

---

## 3. Förväntat beteende

### 3.1 Datamodell

Utöka `info`-fältet från nuvarande `{ description, image }` till:

```js
info: {
  ingar: ['Underlagspapp 2 mm', 'Lim', 'Socklist 12 mm', 'Montering', 'Städning'],
  ingarEj: ['Flyttning av möbler', 'Tröskel mot angränsande rum'],
  wikellsRef: 'Wikells byggdel 15.016',
  image: null  // reserverat, används inte i v1
}
```

Items **utan** dessa data (eller med `info: null`) → ingen chevron, ingen expansion. Precis som idag.

**Minsta uppsättning som ska ha info i v1** (Wikells-kalibrerade poster från OPEN_QUESTIONS Q10):

Golv:
- Ekparkett (Wikells 15.016)
- Klickvinyl (Wikells 15.018)
- Heltäckningsmatta (Wikells 15.020)
- Klinker hall/toa/entré (Wikells 15.015 justerat)

Inredning/dörr/fönster:
- Ny innerdörr (Wikells 16.056)
- Måla befintlig innerdörr (Wikells 14.048)
- Måla fönster invändigt (Wikells 14.047)
- Garderob 60's stomme (Wikells 17.020)

Vägg:
- Vägg kakel toalett (Wikells 15.027)
- Takmålning (Wikells 14-serien)
- Väggmålning (Wikells 14-serien)

Badrum (v1.5):
- Klinker våtrumsgolv (Wikells 15.015)
- Plastmatta golv (Wikells 15.023)
- Rivning badrum (Wikells rivning-post)
- Fallspackling (Wikells fallspackling-post)

Dennis skriver utkasten (stor förtrogenhet med recepten). Claude granskar att texterna stämmer mot Wikells-receptet innan de committas. **Blockerar inte** denna prompt: chevron-koden måste fungera för tomt `info`-fält (dvs. inte crasha), och lägga in metadata görs i separat pass.

### 3.2 Chevron-placering

```
┌────────────────────────────────────────────────────┐
│ ☑  Ekparkett              825 kr/m²   16 500 kr  ▾ │
└────────────────────────────────────────────────────┘
```

- **Längst till höger** på raden, bredvid summan
- 32 × 32 px klickyta (räcker för tumme på mobil)
- Ikon: unicode `▾` (expanderat: `▴`) eller SVG, 12px, `var(--color-text-muted)`
- **Egen klickyta** — får INTE trigga checkbox-toggle. Använd `event.stopPropagation()` eller separat `data-action="toggle-details"`.
- Rotera 180° med CSS-transition vid expansion (mjukt, ≈150ms)

### 3.3 Expand-panel

Under raden, full bredd, animeras fram med `max-height` transition (≈200ms):

```
┌────────────────────────────────────────────────────┐
│ ☑  Ekparkett              825 kr/m²   16 500 kr  ▴ │
├────────────────────────────────────────────────────┤
│   INGÅR                                            │
│   • Underlagspapp 2 mm                             │
│   • Lim                                            │
│   • Socklist 12 mm                                 │
│   • Montering                                      │
│   • Städning                                       │
│                                                    │
│   INGÅR EJ                                         │
│   • Flyttning av möbler                            │
│   • Tröskel mot angränsande rum                    │
│                                                    │
│   Wikells byggdel 15.016                           │
└────────────────────────────────────────────────────┘
```

Stil:
- Bakgrund: aningen ljusare än radens (t.ex. `#f7f7f7`)
- Padding: 12px 16px 16px 48px (vänsterindrag så det radar in mot checkbox-kolumnen)
- Etiketter "INGÅR" / "INGÅR EJ": 11px, uppercase, letter-spacing 0.5px, semibold, muted color
- Bullet-listor: 14px, normal vikt
- Wikells-referens: 12px, muted color, längst ned
- Radsavstånd mellan sektioner: 12px

### 3.4 State

```js
state.expandedItems = new Set();  // stringer med item.id
```

- Klick på chevron: `state.expandedItems.add/delete(item.id)` + re-render
- Nollställs **endast** vid vyväxling (spara-dialog, tillbaka till hem, offert-flow) — inte vid ändring av antal, rumsvärden eller checkbox-toggle
- Persisteras **inte** i localStorage — varje session börjar med allt kollapsat

### 3.5 Gråade summor

När en post inte bidrar till totalen, gråa summa-siffran. Definition av "bidrar inte":

| Item-typ | Villkor för grå summa |
|---|---|
| Checkbox-item (de flesta) | `item.checked === false` |
| `hasCount`-item (innerdörr, fönster, garderob) | `count === 0` |
| Radio-grupp-medlem (standard/plus-kök) | Om raden inte är den valda i sin grupp |
| Rumsföljepost (skyddstäckning, rivning, fallspackling) | Om rummet inte är aktivt eller yta = 0 |

**Endast summa-siffran** gråas — etiketten, priset/enheten och chevron påverkas inte. Visuellt:

```
/* Aktiv */
.item-sum         { color: var(--color-text); }

/* Inaktiv */
.item-sum.muted   { color: var(--color-text-muted); /* ≈ #9a9a9a */ }
```

Lägg till/ta bort `.muted`-klassen i renderingen baserat på villkoret ovan.

### 3.6 Print-layout (PDF)

Expanded-state följer INTE med till print/PDF. I print visas endast kryssade poster, och `info.ingar`/`ingarEj` är inte med i standardutskriften. `wikellsRef` däremot kan användas för Kod-kolumnen i PDF-tabellen (se `2026-04-21-pdf-login-offert-och-unsaved.md` Del I) — extrahera numret ur strängen (`15.016` ur `Wikells byggdel 15.016`).

Om Dennis senare vill ha ett "visa bilaga med receptinnehåll" i PDF — separat prompt.

---

## 4. Verifiering

### Positiv verifiering
1. Öppna appen, scrolla till golv-sektionen — ekparkett, klickvinyl, heltäckningsmatta, klinker har alla chevron `▾` till höger
2. Klicka på chevron på ekparkett → panel glider ut under raden med INGÅR-lista, INGÅR EJ-lista, Wikells-referens
3. Chevron roterar till `▴`
4. Klicka igen → panel fälls ihop mjukt, chevron tillbaka till `▾`
5. Expandera tre olika poster samtidigt → alla stannar öppna tills man stänger dem individuellt
6. Växla vy (t.ex. öppna spara-dialog, stäng den, gå tillbaka) → alla expanded panels är stängda
7. Klicka på själva raden (inte chevron) → checkbox togglas, panelen påverkas inte
8. Avkryssa ekparkett när den är aktiv → summan ("16 500 kr" → "0 kr") gråas ut
9. Sätt antal innerdörrar till 0 → summan gråas ut
10. Öka innerdörrar till 1 → summan blir svart igen
11. I kök-sektionen, välj Standard → Plus-rads summa gråas ut (och vice versa)
12. Rumsföljepost (rivning badrum) när badrum-yta = 0 → summan gråas ut
13. Print/PDF-vyn påverkas inte av expanded state

### Negativ verifiering
1. Post **utan** `info.ingar` (t.ex. något som inte fått metadata ännu) visar **ingen** chevron — raden ser exakt ut som idag
2. Klick på chevron triggar **inte** checkbox-toggle (verifiera genom att kolla att `item.checked` inte ändras)
3. Dubbelklick på chevron förstör inte state (öppnar/stänger två gånger utan felaktigt delstate)
4. Expansion påverkar **inte** totalberäkningen (kontrollera att totalen är identisk före och efter expand/collapse)
5. På 375px bredd: chevron träffbar med tumme, expand-panel bryter inte layouten, horisontell scroll uppstår inte
6. Tom `info: { ingar: [], ingarEj: [], wikellsRef: '' }` (alla fält tomma men objektet finns) — hanteras elegant: INGEN chevron (kräver minst en ingar-post ELLER wikellsRef för att motivera chevron)
7. Print-knapp tryckt när panel är öppen — print-vyn visar inte panelinnehållet
8. Gråad summa blir svart **direkt** när posten reaktiveras — ingen race condition

---

## 5. Startprompt att klistra in i Claude Code

> Läs `.project-context/prompts/2026-04-22-expanderbara-poster-och-gray-sums.md` i sin helhet. Läs också `.project-context/DESIGN.md` §2 (datamodell) och §5 (UI) så du förstår hur items är strukturerade idag.
>
> Implementera i denna ordning:
>
> 1. **Datamodell först.** Uppdatera `src/data.js`: utöka `info`-fältet till `{ ingar, ingarEj, wikellsRef, image }` på minst dessa items: ekparkett, klickvinyl, heltäckningsmatta, klinker (alla varianter), ny innerdörr, måla befintlig innerdörr, måla fönster, garderob 60's, vägg kakel toalett, takmålning, väggmålning, badrum klinker våtrumsgolv, badrum plastmatta golv, rivning badrum, fallspackling. Skriv utkast till `ingar`/`ingarEj`/`wikellsRef` för varje — Dennis granskar mot Wikells innan merge.
>
> 2. **Rendering.** I `src/app.js` (eller motsvarande render-funktion): lägg till chevron-knapp på varje rad där `item.info?.ingar?.length > 0 || item.info?.wikellsRef`. Separat klickhanterare som inte triggar row-toggle.
>
> 3. **State.** Lägg `state.expandedItems = new Set()`. Nollställ vid vyväxling. Persistera inte.
>
> 4. **Expand-panel.** Rendera under raden när id finns i `state.expandedItems`. Använd `max-height` CSS-transition.
>
> 5. **Gråade summor.** Bind `.muted`-klassen på `.item-sum` enligt tabellen i §3.5. Gäller alla item-typer i appen.
>
> 6. **Verifiera.** Kör ALLA tester i §4 (positiva + negativa). Rapportera vilka som passerade och vilka som fallerade.
>
> 7. **Sessionsrapport** i `.project-context/sessions/` enligt CLAUDE.md §3.
>
> Uppdatera `DESIGN.md` §2 (datamodell utökad) och §5 (UI-beteende) i samma commit. Inga ändringar behövs i `CLAUDE.md` eller `DECISIONS.md` — detta är ren feature, inget beslut som kräver motivering (beslutet är redan fattat i denna prompt).
