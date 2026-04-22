# AI-agent-instruktioner för HSB-Ytskiktskalkylator

Den här filen är huvudingången för alla AI-agenter som arbetar i projektet — Claude Code (CLI/desktop), Cowork, Claude på claude.ai, eller andra agenter Dennis kan prova i framtiden. Filen heter CLAUDE.md eftersom Claude Code automatiskt läser just det filnamnet vid sessionsstart, men innehållet är tänkt som en gemensam standard för alla agenter.

**Om du är en AI-agent som precis öppnat projektet — börja här.**

---

## 1. Projektkontext — filer att läsa först

Läs dessa filer i ordning innan du börjar arbeta. De ger dig hela bilden av projektet:

1. **`.project-context/DESIGN.md`** — produktdokumentet. Vision, teknisk stack, branding, datamodell, funktionalitet, UI-struktur, persistans, acceptanskriterier. Svarar på *"vad bygger vi och hur?"*. Detta är sanningen om produkten.
2. **`.project-context/AGENT_CONTEXT.md`** — mjuk kontext: Byggbitens ramar, HSB som kund, Dennis arbetsstil, praktisk miljö. Gör dig snabbt "i synk" med hur projektet fungerar i praktiken.
3. **`.project-context/DECISIONS.md`** — logg över fattade beslut och deras motiveringar, kronologiskt. Svarar på *"varför valde vi som vi gjorde?"*.
4. **`.project-context/OPEN_QUESTIONS.md`** — obesvarade frågor som kan påverka ditt arbete. Kolla om något här berör din uppgift innan du antar något.
5. **De tre senaste filerna i `.project-context/sessions/`** — vad som hänt i tidigare arbetspass, av vilken agent, med vilka resultat och öppna trådar.
6. **`.project-context/mockups/`** — HTML-mockups som utforskar design-riktningar. Läs varianter som har ändrats senast, eller den variant som är vald som "huvudriktning" enligt DECISIONS.md.
7. **`.project-context/references/`** — designreferenser, skärmbilder, logotyper, inspirationsmaterial. Titta här om uppgiften rör UI eller estetik.

---

## 2. Filäganderegel — vilken fil uppdateras när?

Det här är den viktigaste regeln för att hålla projektet rent. Varje typ av information har en **enda sanningskälla**. Upprepa aldrig samma fakta i flera filer — referera istället.

| Ändringens natur | Exempel | Uppdatera |
|---|---|---|
| **Produkten ändras** — vad kalkylatorn är eller gör | Ny post i prislistan, ändrad datamodell, ny rumstyp, ändrad acceptanskriterier | `DESIGN.md` |
| **Ett beslut fattas** — val med motivering | "Valde statiska mockups framför interaktiva", "Bytte från 3 varianter till 2 för att..." | `DECISIONS.md` (nytt beslut längst ner med datum) |
| **En fråga uppstår eller besvaras** | "Vad är schablonpris för kök?", "Ex eller inkl moms?" | `OPEN_QUESTIONS.md` |
| **Arbetssättet ändras** — rutin, konvention, kodprincip | Ny kodstilregel, ny rutin för sessionsrapporter, ny agent med i flödet | `CLAUDE.md` (denna fil) |
| **Ett arbetspass avslutas** | Oavsett vad som gjorts | Ny fil i `.project-context/sessions/` |
| **Ny mockup-variant** | Designutforskning, nytt layoutförsök | Ny fil i `.project-context/mockups/` |

**Gränsfall:** om det är oklart vilken fil som äger en ändring — lägg i `DESIGN.md` och fråga Dennis vid nästa interaktion. Aldrig i CLAUDE.md, eftersom den ska vara liten och tidlös.

**Absolut regel:** Samma fakta får inte stå på två ställen. Om DESIGN.md säger "en fristående HTML-fil som leverans" så ska CLAUDE.md inte upprepa det — den kan referera: "se DESIGN.md §3 för leveransformat". Upptäcker du dubbelinformation, rapportera det som en bugg att städa.

---

## 3. Arbetsrutiner — efter varje arbetspass

Innan du avslutar en session eller rapporterar klart — gör följande:

1. **Skapa en sessionsrapport** i `.project-context/sessions/` med filnamn `YYYY-MM-DD-kort-beskrivning.md`. Innehåll: vilken agent du är, vad du gjorde, vad som fungerade, vad som inte fungerade, öppna frågor som uppstod, och en rekommendation för nästa steg.
2. **Uppdatera rätt fil enligt äganderegeln** (se §2 ovan). Inga ändringar ska falla mellan stolarna.
3. **Uppdatera denna CLAUDE.md själv** om du upptäckt att:
   - En ny rutin borde dokumenteras
   - En ny kontextfil lagts till som andra agenter behöver känna till
   - En konvention ändrats eller lagts till
   - Äganderegeln behöver ett nytt gränsfall i tabellen
   - Något i §1 (filer att läsa först) har blivit inaktuellt

   CLAUDE.md är ett levande dokument. Om du ser att den är inaktuell, fixa det — vänta inte på att någon annan ska göra det. Lägg till en rad i ändringsloggen längst ner när du gör det.

---

## 4. Standard för mockups och promptar

### Mockups (aktuellt i fasen vi är i nu)
- Placeras i `.project-context/mockups/`. En HTML-fil per variant.
- Namngivning: `mockup-NN-kort-beskrivning.html` (t.ex. `mockup-01-stilren.html`).
- Första radens HTML-kommentar ska beskriva varianten design-filosofi i 1–3 meningar.
- Statiska som standard — ingen JS-logik förrän en riktning är vald.
- Samma förladdade mock-data i alla varianter så jämförelsen blir ren (se de tre första mockups för format).
- Inga externa CDN/fonter — allt inline, fungerar vid dubbelklick offline.

### Promptar (används senare när vi utvecklar)
Promptar i `.project-context/prompts/` följer denna struktur:
1. **Varför vi gör detta.** Problem ur användarens perspektiv, konkret exempel.
2. **Nuvarande beteende.** Hur fungerar det idag, vilka vyer/element berörs.
3. **Förväntat beteende.** Vad resultatet ska vara. Gärna visuella exempel, ASCII-mockups, konkreta scenarier. Beskriv VAD och VARFÖR — inte HUR i kod.
4. **Verifiering.** Konkreta steg för att bekräfta att implementationen fungerar, både positiv och negativ verifiering.

**Undvik:**
- Vaga instruktioner ("förbättra layouten")
- Dikterade kodlösningar (undantag: kirurgiska bugfixar där grundorsak är identifierad)

**Två typer av promptar:**
- **Feature-promptar** — ny funktionalitet, layout-ändringar. Beskriv VAD och VARFÖR. Låt agenten välja HUR.
- **Bugfix-promptar** — identifierade fel. Precis grundorsak med filnamn, radnummer och bevis.

---

## 5. Grundprinciper för kodning

- **Boring tech först.** Vanilla HTML + CSS + JavaScript. Inget ramverk i produktionsfilen.
- **Enskild HTML-fil som slutleverans.** Allt inlinat (CSS, JS, data, logga som SVG/base64). Ingen CDN, fungerar offline vid dubbelklick.
- **Under utveckling:** separata filer (src/index.html, style.css, data.js, app.js) är OK; ett enkelt build-steg buntar till `dist/kalkylator.html` vid slutleverans.
- **Credentials finns inte i detta projekt** — kalkylatorn är helt lokal, ingen server-kommunikation.
- **All UI-text på svenska.** Kod och kommentarer får vara på engelska (eller svenska när det är tydligare).
- **Desktop-first men funkar på iPad/mobil.** 720px max bredd centrerad, anpassning ner till 375px.
- **Visa planen innan implementation.** Vid större uppgifter, beskriv vad du tänker göra innan du börjar koda. Dennis föredrar att godkänna riktning först.

För fullständig stack, datamodell och prislista, se `.project-context/DESIGN.md`.

---

## 6. Om Dennis (projektägaren)

- Ägare av Byggbiten i Norrland AB. Projektledare, erfaren beställare.
- Novis på Git/GitHub — förklara git-kommandon steg för steg när de används första gången.
- Föredrar att få se planen innan implementation.
- **Uppskattar ärlig kritik framför inställsamhet.** Om du ser en bättre lösning än den han föreslår, säg det direkt. Inga tomma bekräftelser.
- Jobbar på Windows 11 Pro, oftast direkt på jobbdatorn.
- Kommunikationen är på svenska. Kod får vara på engelska.
- Arbetsstil: decisiv, snabbrörlig, gillar att batcha ändringar, uppskattar när plan presenteras innan implementation.
- Har tidigare byggt appar med Claude Code i VS Code — detta är hans första test av Claude Code utan IDE.

---

## 7. Rollfördelning mellan agenter

- **Claude Code (CLI/desktop):** arbetaren. Skriver all kod, kör kommandon, redigerar filer. Läser CLAUDE.md automatiskt vid sessionsstart.
- **Cowork:** utforskar levande webbsidor när relevanta (t.ex. byggbiten.nu om referens behövs). Agerar operativt kreativt bollplank.
- **Claude på claude.ai:** arkitektur, strategi, ärlig kritik. Dennis klistrar manuellt in relevanta filer från `.project-context/` när han startar en chattsession, eller genererar snapshots.

---

## 8. Versioner av denna fil

När du uppdaterar CLAUDE.md — lägg till en rad längst ner med datum, agent och kort beskrivning av vad som ändrats.

### Ändringslogg
- 2026-04-20 (initial, Claude Code) — skapad vid projektstart. Innehåller filstruktur-intro, äganderegel, arbetsrutiner, mockup/prompt-standard, kodprinciper, info om Dennis och rollfördelning. Mall lånad från Hubbe-projektets CLAUDE.md.
