# Prompt: Renoveringskalkyl — följeposter + Wikells-priser

**Datum:** 2026-04-21
**Skriven av:** Claude (Cowork), tillsammans med Dennis
**Kontext:** Stor omställning av appens scope och prisunderlag

---

## 1. Varför vi gör detta

Appen har hittills hetat Ytskiktskalkylator och byggts runt Patrik Norléns prisunderlag — siffror som han plockat från Wikells Sektionsdata blandat med erfarenhetssiffror. Efter en avstämning i Byggbitens ledningsgrupp har två problem tagit form:

Det första är att underlaget saknar för många poster. Patrik har bara tagit med själva ytskiktet (lägga nytt golv, måla om, byta dörr) men inte det som alltid kommer med verkligheten — rivning av det gamla, skyddstäckning vid målning, flytspackling där det behövs, förarbete i våtrum. Det betyder att en kalkyl från appen idag nästan alltid underprissätter verkligheten, vilket är dåligt både för Byggbitens marginaler och för HSB:s förtroende i offerten.

Det andra är att badrum bara finns som en enda schablonpost på 75 000 kr för komplett helrenovering. Det räcker inte. Ett riktigt badrum som ska rivas, få nytt avlopp, tätskiktas, kaklas och möbleras med nytt porslin landar i verkligheten på 80–130 tkr beroende på storlek och nivå. Schablonen är för slö.

Dennis och Claude gjorde under april 2026 en fullständig Wikells-kalkyl för en typisk HSB-3a (ROT-helrenovering) och sammanfattade resultatet i en markdown-fil som nu finns under `.project-context/references/HSB-3a-kalkyl-sammanfattning.md`. Den filen är prisunderlaget för denna prompt.

Samtidigt landade ett designbeslut som är centralt för hela den här ändringen: i stället för att lägga till en toggle per rum som låter användaren välja mellan "ytskikt" och "helrenovering", använder vi **följeposter** — checkboxar som sitter under huvudpostar, är kryssade som default, inkluderas i kalkylen, och kan avkryssas i särfall. Det matchar verkligheten (om man byter golv så river man det gamla, punkt) och bevarar appens befintliga DNA av smarta defaults (som `reducesFloor`).

## 2. Vad vi vill åstadkomma (överblick)

Efter implementation ska:

Användaren kunna klicka på t.ex. "Golv ekparkett" i ett sovrum och se att en följepost, "inkl. rivning av befintligt golv", automatiskt blir kryssad under med sitt eget pris visat som egen rad. Om användaren avkryssar följeposten försvinner dess kostnad från delsumman men huvudposten förblir vald. Omvänt — kryssar man ur huvudposten så försvinner både huvudpost och följepost.

Användaren kunna klicka på "Målning tak" och/eller "Målning vägg" och se att en följepost, "Skyddstäckning", aktiveras för rummet. Den posten är kopplad till rummet (inte till en enskild huvudpost), och den aktiveras så snart minst en av målnings-posterna är kryssad och avaktiveras när alla är avkryssade. Priset syns som egen rad i rummets delsumma.

Alla priser i appen vara kalibrerade mot Wikells-kalkylen i `references/HSB-3a-kalkyl-sammanfattning.md`. Patrik Norléns ursprungssiffror ersätts. Där Wikells inte har en direkt motsvarighet (t.ex. garderobs-stomme, ytterdörr, viss köksinredning) behålls dagens pris men flaggas i kodkommentar som "Byggbiten-erfarenhet" så att det syns tydligt vad som är härlett och vad som inte är det.

Badrum-schablonen ska delas i två varianter med Wikells-härledda priser: en standard (mindre badrum, ~3–5 m²) och en större (~5–8 m²). Båda ska ha följeposter för rivning och förarbete som är kryssade som default.

Appen ska byta namn från "Ytskiktskalkylator" till "Renoveringskalkyl". Det gäller rubrik i appen, titel i `<title>`-tag, huvudrubriker, filnamn där det är rimligt, och alla synliga texter som använder "ytskikts-" eller "ytskiktskalkyl".

Flera Wikells-poster har för tekniska namn för Byggbitens målgrupp (HSB som beställare, inte byggmästare). Dessa ska översättas till enklare språk. Exempel som illustration — inte uttömmande lista: "Tätskikt cementbaserat folieförstärkt" blir "Tätskikt våtrum", "Invändig målning väggar 2 strykningar latex" blir "Målning vägg", "Rivning beklädnad/ytskikt våtrumsgolv" blir "Rivning befintligt våtrumsgolv". Agenten bedömer själv vilka termer som är för tekniska och förenklar dem med bibehållen betydelse.

## 3. Nuvarande beteende

Idag beter sig appen så här:

Man väljer en rumstyp från en modal, rummet läggs till med standard-ytor (sovrum 15 m², vardagsrum 25 m², kök 15 m², hall 5 m², entré 5 m², badrum 5 m², toalett 2 m², övrigt som styck). För varje rum (utom badrum som är schablon-bara) visas en lista med möjliga åtgärder grupperade i sektioner: Golv, Målning, Tillval. Vissa åtgärder är per m² (räknas ut från rummets yta), vissa är per styck (har en antal-kontroll bredvid), vissa är schabloner med fast pris. Golvalternativen är ömsesidigt uteslutande — väljer man parkett så avmarkeras klickvinyl automatiskt. Vissa golv (t.ex. klinker i entré) är kopplade till `reducesFloor` — när de är aktiva drar de från den yta som de andra golven räknas på.

Badrum har idag en enda rad, "Helrenovering badrum", som är en fast schablon på 75 000 kr.

Totalsumman visas i orange box nere till höger, uppdateras live, exklusive moms. Kalkyler sparas i localStorage och kan återupptas från hemvyn.

Priserna härrör från Patrik Norléns underlag i `Priser.xlsx`, delvis Wikells-influerat men utan konsekvent härledning.

Namn på app och rubriker: "Ytskiktskalkylator", "Överslag för bostadsrättsrenovering", "Byggbitens schablonpriser för ytskiktsrenovering 2026".

## 4. Förväntat beteende efter implementation

### 4.1 Namnbyte

Appen heter nu "Renoveringskalkyl". Alla synliga texter som refererar till "ytskikt" eller "ytskiktskalkyl" eller "Ytskiktskalkylator" uppdateras. Underliggande kodidentifierare (t.ex. variabelnamn i `data.js`) får gärna behålla "app" eller byta till något renoverings-neutralt — agentens val — men all användarvänd text byts konsekvent.

Exempel på texter som ska ändras:
- Sidtitel och `<title>`-tag
- Rubrik i huvud-headern ("Ytskiktskalkylator" → "Renoveringskalkyl")
- Underrubrik ("Överslag för bostadsrättsrenovering" — behåll eller justera utifrån agentens bedömning)
- Botten-text vid totalsumman ("Byggbitens schablonpriser för ytskiktsrenovering 2026" → motsvarande men för renovering)
- Alla andra strings som innehåller "ytskikt"

### 4.2 Följepost-mekanik (kärnändring)

Varje huvudpost i datamodellen kan ha noll, en eller flera följeposter. En följepost är en konceptuell under-post som:

- har eget id, eget namn, eget pris, egen enhet (m² eller schablon),
- renderas som en indenterad rad direkt under sin huvudpost i UI,
- är kryssad som default när huvudposten kryssas (men kan avkryssas av användaren),
- avkryssas helt och dess kostnad tas bort om användaren avkryssar huvudposten,
- räknas in i delsumman på samma vägar som huvudposten (om den är aktiv),
- behåller sitt eget pris synligt i UI så att användaren alltid ser vad följeposten bidrar med,
- respekterar `reducesFloor` om huvudposten har det (följeposten skalar med samma yta).

Det finns **två typer** av följeposter:

**Typ A — per-huvudpost-följepost.** Kopplad till en specifik huvudpost. Exempel: "inkl. rivning av befintligt golv" under "Golv ekparkett". Aktiveras/deaktiveras enbart av sin huvudpost.

**Typ B — rums-scope-följepost.** Kopplad till rummet som helhet men triggad av en eller flera huvudposter. Syns som egen rad i den sektion där triggarna bor (t.ex. "Skyddstäckning" under MÅLNING-sektionen). Aktiveras så snart minst en trigger är kryssad, deaktiveras när alla triggrar är avkryssade. Visas alltid (inte bara när aktiv) så att användaren kan se att den finns och förstå när den beräknas — men har 0 kr / inaktivt-tillstånd när ingen trigger är aktiv.

**Vad som inte ska vara möjligt:** följeposter får inte ha egna följeposter. En följepost är alltid på nivå 1 under en huvudpost eller rum. Om en komplicerad kedja behövs (t.ex. rivning av klinkergolv kräver flytspackling som kräver ...) så löser vi det genom att lägga flera parallella följeposter direkt på huvudposten, inte genom nästling.

### 4.3 Rivnings-modell — rekommenderad enkelhet

Rivning av befintligt golv ska vara en följepost på varje golv-huvudpost (ekparkett, klickvinyl, matta, klinker). Priset per m² får vara **samma oavsett vilket nytt golv som läggs**. Vi skippar alltså komplikationen med att klinker-rivning är dyrare än parkett-rivning — det är en rimlig förenkling för offertstadium. Agenten härleder ett medelpris från Wikells-kalkylen.

Detta enkelhetsval dokumenteras i `DECISIONS.md`. Om vi senare ser att det blir för slött kan vi göra rivningen golv-typ-specifik.

### 4.3b Spackling / förarbete undergolv — följepost med golv-specifik default

Spackling av undergolv är en egen följepost (typ A) och ska finnas på varje golv-huvudpost. **Men till skillnad från rivningen är default-läget olika beroende på golvtyp**, eftersom behovet av spackling skiljer sig markant.

Regeln är:

- **Klinker:** `defaultChecked: true`. Klinker kräver plant, stabilt underlag och i praktiken nästan alltid flytspackling (eller motsvarande avjämning) innan läggning. Det ska vara med som default.
- **Ekparkett, klickvinyl, laminat, heltäckningsmatta, linoleum:** `defaultChecked: false`. Dessa golv läggs normalt ovanpå befintligt stabilt underlag utan spackling. Spackling kan kryssas i manuellt när särfall kräver det, men det är inte standard.

För **badrum** gäller separat regel: **fallspackling** (spackling med fall mot golvbrunn) är en följepost på badrums-huvudposterna (både standard och plus) och ska vara `defaultChecked: true`. Ett renoverat badrum kräver i princip alltid nytt fall mot brunnen — det ligger i våtrumsbranschens praxis.

Namngivning i UI:
- Under golv-huvudposter: **"inkl. flytspackling undergolv"** (eller liknande tydligt namn som agenten bedömer).
- Under badrums-huvudposter: **"inkl. fallspackling våtrumsgolv"** (eller motsvarande).

Priset härleds från Wikells-kalkylen (se `references/HSB-3a-kalkyl-sammanfattning.md`) på samma sätt som övriga följeposter.

Detta default-mönster (olika `defaultChecked` per huvudpost) dokumenteras i `DECISIONS.md` som en medveten avvikelse från rivningens "alla är på"-regel — motiverat av att spackling faktiskt varierar kraftigt i verklighet.

### 4.4 Skyddstäckning — det klassiska rums-scope-exemplet

Skyddstäckning är en följepost av typ B (rums-scope). Den triggas av:
- "Målning tak"
- "Målning vägg"
- eventuellt andra målnings-relaterade poster som agenten identifierar

Den är **en enda post per rum** även om flera målnings-poster är aktiva samtidigt. Priset är en schablon per rum (från Wikells), inte per m². (Eller per m² rumsyta — agenten bedömer utifrån Wikells-data vad som är rimligast.)

Posten syns alltid under MÅLNING-sektionen som egen rad, även när ingen målning är kryssad. När ingen målning är kryssad är posten inaktiv (0 kr, greyed-out checkbox). När en målningspost kryssas blir skyddstäckningen automatiskt kryssad och dess pris synligt. Användaren kan manuellt avkryssa den i särfall (t.ex. "vi har egen skyddstäckning i det här projektet"), men måste då aktivt klicka ur — default är på.

### 4.5 Priskalibrering från Wikells

Alla befintliga priser i `src/data.js` ersätts enligt Wikells-kalkylen. Agenten har följande källa: `.project-context/references/HSB-3a-kalkyl-sammanfattning.md`. Det är en fullständig ROT-helrenoverings-kalkyl för en HSB-3a där varje byggdel redovisas per rum med mtrl-pris, tim, UE, och totalsumma inklusive alla omkostnadspåslag (272 % på arbete, 10 % på UE).

För att härleda ett kr/m² eller kr/st-pris för en given app-post: ta Wikells totalsumma för motsvarande byggdel och dividera med den mängd (m² eller st) som användes i kalkylen. Exempel:

- Wikells "Läggning ekparkett 14 mm" i sovrum 14 m² ger totalt X kr. Pris per m² = X / 14.
- Wikells "Målning vägg 2 strykningar" i sovrum med väggyta Y m² ger totalt Z kr. Pris per m² = Z / Y.
- Wikells "Ny innerdörr komplett" i hall (1 st) ger totalt W kr. Pris per st = W.

För **följeposter** (rivning, skyddstäckning, förarbete) härleds priset på samma sätt. T.ex. "Rivning befintligt golv" per m² = Wikells rivningspost i sovrumskalkylen dividerat med golvyta.

**Viktigt:** Wikells-kalkylen är gjord på en specifik 3a med specifika ytor. När priser per m² härleds från den så är det en kr/m²-siffra som ska skalas till andra rum med andra ytor. Det är samma princip som appen redan använder — inget nytt.

**Där Wikells inte räcker till:** kök-inredning 150k/225k, garderob 8500, ytterdörr 28000, badrum-varianter. För dessa får agenten använda dagens placeholder-priser från `DESIGN.md` (se OPEN_QUESTIONS.md Q10) och markera dem i kommentar som "Byggbiten-erfarenhet — ersätts när slutligt pris är satt". Agenten behöver INTE härleda dessa från Wikells.

**Badrums-splitten** är viktig och görs separat: dagens 75k-schablon byts till:
- "Helrenovering badrum standard" (för 3–5 m² badrum, ~85 000 kr härlett från Wikells)
- "Helrenovering badrum plus" (för 5–8 m² badrum, ~110 000–120 000 kr härlett från Wikells eller som Byggbiten-skön siffra om Wikells-datan inte räcker)

Båda varianterna får följeposter för rivning och våtrumsförarbete (default-on, kan avkryssas).

### 4.6 Språklig förenkling

Wikells byggdelsnamn är skrivna för yrkeskalkylatorer. Målgruppen för Byggbitens appen är HSB-beställare (fastighetsförvaltare, ibland styrelser) som INTE är byggmästare. Alla nya posters namn ska vara på tydlig svenska utan yrkesjargong.

Principer:
- Korta och beskrivande namn.
- Ingen förkortad byggteknik ("folieförstärkt cementbaserat tätskikt" → "tätskikt").
- Ingen onödig teknisk precision i själva posten-namnet — detaljerna kan ligga i (framtida) info-dialog.
- Om samma sak finns i två Wikells-poster som skiljer sig tekniskt men är likvärdiga för beställaren — slå ihop dem till en.

Agenten får själv bedöma exakt formulering. Dennis föredrar svensk bygg-prosa över översatt engelska. "Väggmålning" snarare än "Vägg målning", "Nytt klinkergolv" snarare än "Golv klinker".

### 4.7 Exempel på hur ett rum ser ut efter implementation

Detta är en ASCII-illustration av hur ett sovrum kan se ut med de nya mekanikerna. Agenten får själv bestämma exakt visuell utformning.

```
SOVRUM                          15 m²     takhöjd 2,4 m

GOLV
☑ Ekparkett                                    7 920 kr
   └ ☑ inkl. rivning av befintligt golv         1 650 kr
☐ Klickvinyl                                   7 380 kr
☐ Heltäckningsmatta                            7 170 kr

MÅLNING
☑ Tak                                            720 kr
☑ Väggar                                       3 091 kr
   Skyddstäckning                                680 kr    ← rums-scope, auto-aktiv

TILLVAL
☐ Ny innerdörr komplett                  0 st    3 900 kr
☐ Måla befintlig innerdörr               0 st      950 kr

DELSUMMA                                      13 961 kr
```

När användaren avkryssar huvudposten "Ekparkett" så försvinner både dess 7 920 kr OCH rivnings-följepostens 1 650 kr. När användaren avkryssar båda målningsposterna försvinner skyddstäckningens 680 kr. Allt konsekvent och transparent.

## 5. Vad som INTE ska ändras

Detta är kritiska befintliga beteenden som måste bevaras oförändrade:

- **Gruppering / ömsesidigt uteslutande.** Golvalternativen fortsätter vara en grupp där bara ett kan vara valt åt gången.
- **`reducesFloor`-logiken.** Klinker i entré fortsätter reducera den yta som parkett/vinyl beräknas på. Den här mekaniken är appens DNA och får inte påverkas av följepost-införandet.
- **Total-boxen nere till höger.** Samma plats, samma live-uppdatering, samma ex. moms.
- **Persistens via localStorage.** Datamodellens utökning får inte bryta tidigare sparade kalkyler — befintliga kalkyler ska kunna laddas även om de saknar de nya följepost-fälten (graceful upgrade: följeposter läggs till med default-on när äldre kalkyl laddas).
- **Hemvy och kalkyl-lista.** Fungerar som idag.
- **Utskrift / spara som PDF.** Fungerar som idag — men följeposter ska synas på utskriften på samma sätt som i UI (indenterade under huvudpost, rums-scope under rätt sektion).
- **Mobile-anpassning.** 720px max bredd centrerad, fungerar ner till 375px.
- **Ex. moms.** Ingen förändring.

## 6. Verifiering — hur du vet att det blev rätt

När implementationen är klar, verifiera genom att köra igenom dessa scenarier manuellt:

**Scenario 1 — Golvbyte med rivning.**
Lägg till ett sovrum (15 m²). Kryssa i "Ekparkett". Verifiera att en följepost "inkl. rivning av befintligt golv" automatiskt blir ikryssad under med sitt eget pris synligt. Verifiera att delsumman stämmer. Avkryssa följeposten. Verifiera att endast huvudpostens pris är kvar i delsumman. Avkryssa huvudposten. Verifiera att både huvudpost och följepost är avkryssade.

**Scenario 2 — Byte mellan golv.**
Med sovrummet ovan, kryssa i "Ekparkett" (med rivning). Klicka sedan på "Klickvinyl". Verifiera att ekparkett avmarkeras (inklusive dess rivnings-följepost) och att klickvinyl blir markerat med egen rivnings-följepost aktiverad.

**Scenario 3 — Målning och skyddstäckning.**
I sovrummet, kryssa i "Målning tak". Verifiera att "Skyddstäckning" rums-scope-följepost dyker upp som aktiv rad under MÅLNING med sitt pris. Kryssa även i "Målning vägg". Verifiera att skyddstäckningen är fortfarande bara EN post (inte dubblerad). Kryssa ur "Målning tak". Verifiera att skyddstäckning är kvar (väggmålning är fortfarande aktiv). Kryssa ur "Målning vägg" också. Verifiera att skyddstäckning försvinner från beräkningen (men raden kan vara synlig som inaktiv).

**Scenario 4 — Entré med reducesFloor bevarad.**
Lägg till en entré (5 m²). Verifiera att klinker-ytan fortfarande reducerar ekparkett-ytan som tidigare. Kryssa i ekparkett och öka/minska klinker-mängden. Verifiera att ekparkett-priset ändras i takt med klinker-ändringen (som i nuvarande app). Lägg till rivning-följeposten på ekparkett. Verifiera att även rivningens pris skalar med samma reducerade yta.

**Scenario 5 — Badrum split.**
Lägg till ett badrum. Verifiera att två alternativ visas: "Helrenovering badrum standard" och "Helrenovering badrum plus". Kryssa i standard. Verifiera att följeposter för rivning och våtrumsförarbete är aktiva som default. Verifiera särskilt att **fallspackling våtrumsgolv är defaultChecked = true**. Avkryssa förarbete. Verifiera att dess pris försvinner.

**Scenario 5b — Spackling-default beroende på golvtyp.**
Lägg till en entré (5 m²). Kryssa i "Klinker". Verifiera att rivnings-följeposten är defaultChecked = true OCH att flytspacklings-följeposten är defaultChecked = true. Kryssa ur klinker och kryssa i "Ekparkett" istället. Verifiera att rivnings-följeposten fortfarande är defaultChecked = true, men att flytspacklings-följeposten nu är defaultChecked = false. Gör samma test med klickvinyl och matta — båda ska ha spackling default = false. Verifiera även att användaren kan manuellt kryssa i spackling på ett parkett-golv om de vill.

**Scenario 6 — Persistens.**
Spara en kalkyl. Gå till hemvyn. Öppna den igen. Verifiera att alla huvudposter OCH följeposter har samma tillstånd som innan.

**Scenario 7 — Äldre kalkyl laddas.**
Om du har tillgång till en kalkyl sparad före denna implementation (t.ex. "HSB Brf Testgården — Lgh 3a test"): ladda den. Verifiera att den laddas utan fel. Följeposterna ska antingen vara default-aktiva (säkraste standard) eller inte finnas alls i den laddade kalkylen — men appen ska inte krascha.

**Scenario 8 — Utskrift.**
Klicka "Skriv ut / spara som PDF" efter att ha gjort en kalkyl med följeposter aktiva. Verifiera att följeposter syns på utskriften på ett läsbart sätt.

**Scenario 9 — Priskalibrering sanity-check.**
Jämför totalsumman för en helrenoverad HSB-3a (alla rum, alla följeposter aktiva, inkl. badrum plus och kök standard) mot Wikells-kalkylens totalsumma i `references/HSB-3a-kalkyl-sammanfattning.md`. De ska ligga inom ca ±15 % av varandra. Större avvikelser tyder på att priskalibreringen missat något. (Notera: Wikells-kalkylen inkluderar kap. 29 projektgemensamt på ~30 tkr — det ska vi INTE ta med i appen nu, enligt Dennis beslut. Räkna bort det från Wikells totalen vid jämförelse.)

## 7. Dokumentationsuppdateringar (enligt CLAUDE.md §2 äganderegeln)

Efter implementation ska följande filer uppdateras:

**`DESIGN.md`** — produktdokumentet. Uppdatera:
- Namnet (Ytskiktskalkylator → Renoveringskalkyl) överallt
- Datamodell-sektionen (lägg till följepost-strukturen: typ A och typ B, fält-beskrivningar)
- Prislistan (byt till Wikells-härledda siffror, notera Byggbiten-erfarenhet där det gäller)
- UI-sektionen (beskriv följepost-renderingen)
- Acceptanskriterier (uppdatera om några ändrats)

**`DECISIONS.md`** — lägg till nya beslut längst ner med datum:
- Beslut om att byta namn till Renoveringskalkyl (varför)
- Beslut om följepost-modellen i stället för scope-toggle (varför)
- Beslut om att rivnings-pris är golv-typ-oberoende (varför — enkelhet)
- Beslut om Wikells som primärt prisunderlag (ersätter Patrik Norléns)
- Beslut om badrum-split i två varianter

**`OPEN_QUESTIONS.md`** — stäng frågor som besvarats av denna implementation (t.ex. Q10 om placeholders), lägg till nya om något nytt dyker upp.

**`CLAUDE.md`** — oförändrad, ingen ändring i arbetssätt.

**Sessionsrapport** i `.project-context/sessions/` — skapa en ny fil med datum och beskrivning av vad som gjorts, vad som fungerade, vad som inte fungerade, öppna frågor, rekommendation för nästa steg.

## 8. Öppna frågor som INTE ska besvaras i denna prompt

För att inte göra den här prompten ännu större — följande är också kända problem/frågor men ska hanteras i separata promptar senare:

- **Checkbox-vs-antal-friktion:** idag räknas styck-poster inte in om bara antalet ökas — användaren måste också kryssa checkboxen. Bör fixas så att öka antal från 0 auto-kryssar checkboxen. Separat ärende.
- **Info-dialogen tom:** (i)-ikonerna säger bara "Mer info kommer snart". Innehåll behövs eller ikonerna tas bort. Separat ärende.
- **Spara-knappens feedback saknas:** en toast "Sparad ✓" skulle bekräfta sparningen. Separat ärende.
- **Hall-rumstypen:** Dennis har uttryckt tveksamhet om den ska finnas. Agenten behöver INTE ta bort den i denna prompt, men om det är självklart att den är redundant i förhållande till Entré, logga observationen i sessionsrapporten.
- **Projektgemensamma kostnader (Wikells kap 29):** etablering, arbetsledning, byggavfall — ca 30 tkr för en typisk 3a. Dennis har beslutat att skjuta på detta tills vidare. Inkludera INTE i denna prompt.

## 9. Arbetssätt

Följ CLAUDE.md §6: visa planen innan implementation. Innan du börjar koda, sammanfatta i chatten vilken strategi du tänker välja (särskilt för datamodellen — hur exakt `followups`, `triggeredBy` och liknande ska se ut i `data.js`) och bed om Dennis godkännande. Gå sedan vidare.

Prioritera i följande ordning om tiden blir knapp:
1. Rename + datamodell-förändringar (strukturell grund)
2. Följepost-mekanik för golv (rivning + spackling med golv-specifik default)
3. Följepost-mekanik för målning (skyddstäckning — rums-scope)
4. Priskalibrering från Wikells
5. Språklig förenkling
6. Badrum-split (inkl. fallspackling default-on)

Dokumentation av ändringarna sker parallellt när naturliga milstolpar nåtts — inte som sista steg.

Lycka till.
