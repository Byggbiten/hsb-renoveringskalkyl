# AGENT_CONTEXT.md

Mjuk kontext för AI-agenter som jobbar i projektet. DESIGN.md förklarar VAD som ska byggas — den här filen förklarar HUR det fungerar i praktiken och vem som sitter i andra änden.

---

## Projektet i en mening

Byggbiten i Norrland AB bygger en ytskiktskalkylator till kunden HSB — levereras som en fristående HTML-fil som HSB-förvaltare öppnar genom dubbelklick för att göra överslagskalkyler vid renovering.

## Varför projektet finns

HSB förvaltare behöver grov ekonomisk förkänsla av vad en typisk ytskiktsrenovering kostar innan de begär offert. Istället för att ringa Byggbiten för varenda spekulativ fråga får de ett verktyg som ger dem en uppskattning på 30 sekunder. Byggbiten tjänar på det eftersom:
1. HSB kommer med mer realistiska förväntningar när de faktiskt begär offert.
2. Verktyget är en "synlig" leverans som stärker relationen med HSB.
3. Det är ett litet gåvoobjekt som kostar Byggbiten lite men ger HSB mycket.

**Det är inte** en offertgenerator. Det är ett överslagsverktyg. Slutpris sätts alltid i offert efter platsbesök. Appen måste vara tydlig med det.

---

## Byggbitens ram — estetik och tonalitet

- **Visuell identitet:** svart/grå/silver-palett. Pusselbit som symbol. Rundad gemen sanserif-logga. Seriös totalentreprenör-känsla utan att vara stel.
- **Hemsida:** byggbiten.nu — JS-renderad, svår att scrapa. Be Dennis om screenshots eller länkar om du behöver kolla något specifikt.
- **Det ska kännas proffsigt och levande.** Dennis har uttryckt explicit att det inte ska kännas som ett "online-Excel". Mikro-interaktioner, transitions, smooth utfällningar förväntas. Se DESIGN.md § 4.5.
- **Svenskt språk i UI, engelsk kod.** Sentence case, inte ALL CAPS. Varma, raka formuleringar utan jargong.

---

## HSB som slutkund

- **HSB Bostad**-förvaltare är primär användare. Ej byggteknisk expert. Måste kunna använda utan instruktioner.
- HSB är momsdragande förening (påverkar "ex. moms / inkl. moms"-frågan).
- Dennis överlämnar filen direkt till sin HSB-kontakt. Ingen vidarelicens eller HSB-anpassad branding krävs utöver disclaimer.
- Priserna är Byggbitens och känsliga. HTML-fil är inte kryptoskydd (priser går att läsa ur källkoden), men den psykologiska tröskeln är tillräcklig.

---

## Dennis arbetsstil

- **Ägare:** Dennis Sendelbach, Byggbiten i Norrland AB (Sundsvall).
- **Roll i projektet:** beställare och arkitekt, inte utvecklare. Specificerar vad som ska byggas men skriver inte kod själv.
- **Decisiv.** Väljer riktning snabbt, gillar att batcha ändringar, uppskattar när plan presenteras innan kod.
- **Föredrar ärlighet framför inställsamhet.** Om du ser en bättre lösning än den han föreslår — säg det direkt. Tomma bekräftelser irriterar honom.
- **Jobbar på Windows 11 Pro** i bash-shell, oftast direkt på jobbdatorn. Unix-sökvägar i bash, inte Windows-sökvägar.
- **Kommunikation på svenska.** Kod och kommentarer på engelska är OK.
- **Novis på Git.** Om git-kommandon används — förklara stegvis första gången.
- **Först gången han testar Claude Code utan VS Code.** Den vanliga flödet har varit Claude Code-CLI inne i VS Code-terminal. Nu testas desktop/web-klienten.

---

## Praktisk miljö

- **Projektmapp:** `C:\Users\denni\Desktop\Apps\HSB-Ytskiktskalkylator\`
- **OS:** Windows 11 Pro, shell = bash (inte cmd/PowerShell) — använd Unix-syntax.
- **Leverans:** En enda HTML-fil som dubbelklickas. Fungerar offline.
- **Utveckling:** Vilken editor Dennis föredrar spelar inte så stor roll — han är flexibel. Claude Code skriver direkt i filsystemet.
- **Ingen CI, ingen git ännu.** Om git behöver sättas upp senare — guida Dennis stegvis.
- **Ingen backend.** Hela appen är klientsida. localStorage sparar state.

---

## Tonalitet i det som levereras

- Svenska, konkret, varm-saklig.
- Inga utropstecken i UI-text. Inga "Grattis!" eller "Fantastiskt!".
- "Uppskattning" > "Offert". "Överslag" > "Kalkyl".
- Siffror ska vara läsbara: `152 400 kr`, inte `152400 kr`.

---

## När du är osäker

1. Kolla OPEN_QUESTIONS.md först — frågan kanske redan är flaggad.
2. Om beslutet påverkar produkten → fråga Dennis eller lägg till i OPEN_QUESTIONS.
3. Om beslutet är tekniskt trivialt → gör ditt bästa val och dokumentera det i DECISIONS.md eller sessionsrapporten.
4. Missa inte: Dennis vill se planen innan större implementation.

---

## Ändringslogg

- 2026-04-20 (Claude Code) — skapad vid projektstart.
