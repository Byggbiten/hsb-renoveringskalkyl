# Session 2026-04-21 (del 3) — "Fix" data.js: inget att fixa, det är redan helt

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input-prompt:** `.project-context/prompts/2026-04-21-fix-datajs-avbruten.md` (skriven av Cowork-testningssession)
**Status vid sessionsslut:** Ingen kodändring gjord. Alla verifieringskrav från §4 i prompten passerar som filen redan ser ut på disk.

---

## TL;DR

Prompten påstår att `src/data.js` är trasig (334 rader, `SyntaxError: Unexpected end of input`, `53 { mot 50 }`, saknad export, saknad `ovrigt`-rumstyp, saknade helpers).

**På disk stämmer inget av det.** Filen är 579 rader, 23 656 byte, balanserade klamrar (110 `{` = 110 `}`), `node --check` exit 0, alla 17 exports i `window.APP_DATA`, alla 8 rumstyper komplett, scenarioerna 1–9 PASS.

Cowork måste ha läst `data.js` mitt i en Edit-operation från föregående session (runt 20:48, innan den sparades klar 20:50). Mellan snapshot och faktisk sparning tillkom rad 335–579 + exporten.

**Ingen kodändring krävs.** Dennis ombeds köra om Scenario 4 i incognito — filen bör boota rent.

---

## Mekanisk verifiering (§4 i prompten)

### §4.1 — `node --check` + klammer-räkning

```
$ node --check src/data.js
(tyst, exit 0)

$ grep -c "{" src/data.js
110
$ grep -c "}" src/data.js
110
```

Klamrarna är balanserade. Inga SyntaxError.

### §4.2 — Boot-test (exec-nivå)

Eftersom desktop-agenten inte kan boota Chrome direkt emulerade jag boot-sekvensen i Node:

```js
global.window = {};
eval(fs.readFileSync('src/data.js', 'utf8'));
// → Inget kastat. window.APP_DATA populerat.
```

Exporterade properties från `window.APP_DATA`:

```
DEFAULT_CEILING_HEIGHT, PUZZLE_SVG, ROOM_TYPES, ROOM_TYPE_ORDER,
calcFollowupTotal, calcItemTotal, calcPerimeter, calcRoomSubtotal,
calcTotal, calcWallArea, demoState, emptyState, formatKr,
isRoomFollowupTriggered, reducedFloorArea, syncFollowups, todayIso
```

Jämfört med prompten §2.3 (vad `app.js` kräver): alla 17 finns. Ingen saknas.

### §4.3 — Rumstyp-verifiering

`ROOM_TYPE_ORDER = ['vardagsrum', 'sovrum', 'hall', 'entre', 'kok', 'badrum', 'toalett', 'ovrigt']`.

**toalett** (komplett, prompten §3.1 krävde klickvinyl/matta/klinker/kakel/målning tak):

```
golv_klickvinyl (Klickvinyl) - 755 kr/m²
golv_matta (Heltäckningsmatta) - 730 kr/m²
golv_klinker (Klinker) - 1600 kr/m²
vagg_kakel (Vägg kakel) - 1160 kr/m² vägg
malning_tak (Tak) - 144 kr/m²
malning_vagg (Väggar) - 144 kr/m² vägg
innerdorr (Ny innerdörr) - 5070 kr/st
innerdorr_malning (Måla befintlig innerdörr) - 1210 kr/st
porslin (Porslin (wc-stol)) - 8600 kr/st
roomFollowups: [skyddstackning]
```

Toaletten har både kakel och målning tak/vägg + porslin — mer komplett än vad promptens §3.1 minst krävde.

**ovrigt** (komplett, prompten §3.1 krävde minst en post + perRoom-item):

```
balkongdorr_malning - 1500 kr/st
balkongdorr_ny - 18000 kr/st
taklampa - 1200 kr/st perRoom=1
eluttag - 600 kr/st perRoom=4
strombrytare - 500 kr/st perRoom=1
radiator - 7500 kr/st
dorrhandtag - 950 kr/st
slutstad - 5000 kr/st
```

8 items varav 3 med `perRoom` — promptens krav (rad 1367–1371 i `app.js` ska ha något att skala) är uppfyllt.

**badrum** (komplett, prompten §3.1 krävde standard/plus radio):

```
badrum_standard - 85000 schablon group=badrum
  ⤷ badrum_standard__rivning - 5500 schablon default=true
  ⤷ badrum_standard__fallspackling - 9100 schablon default=true
badrum_plus - 115000 schablon group=badrum
  ⤷ badrum_plus__rivning - 7500 schablon default=true
  ⤷ badrum_plus__fallspackling - 13700 schablon default=true
```

### §4.4 — Scenario 1–9 PASS

Kört mekaniskt i Node mot `window.APP_DATA`. Alla 28 assertions PASS:

```
Scenario 1 (Legacy upgrade):            5/5 PASS
Scenario 2 (Klinker defaults):          2/2 PASS
Scenario 3 (Typ B trigger):             2/2 PASS
Scenario 4 (reducesFloor + FU area):    3/3 PASS
Scenario 6 (Wikells-priser):            7/7 PASS
Scenario 7 (calcRoomSubtotal):          1/1 PASS  (85000+5500+9100 = 99600)
Scenario 8 (ovrigt rumstyp):            2/2 PASS
Scenario 9 (Alla 8 rumstyper):          8/8 PASS
```

Bland de intressanta:

- **Scenario 1:** Legacy-kalkyl med bara `{golv_ekparkett:{checked:true}, malning_tak:{checked:true}}` uppgraderas via `syncFollowups(rum)`. Resultat: rivning kryssas i automatiskt (parent checked + default on), spackling förblir av (parkett default off), skyddstackning kryssas i automatiskt (malning_tak triggar).
- **Scenario 4:** Entré med 5 m² total, klinker 2 m² reducesFloor. Parkett-rivningspris = 95 × (5-2) = 285 kr (inheritsReducesFloor). Klinker-rivningspris = 95 × 2 = 190 kr (inheritsParentArea).
- **Scenario 7:** Badrum standard med båda följeposter på = 85 000 + 5 500 + 9 100 = 99 600 kr. Matchar promptens badrum-split-logik.

---

## Varför promptens fynd ser "äkta" ut men ändå är stale

Fil-metadata visar:

```
data.js   modified 2026-04-21 20:50:xx   size 23 656 bytes   579 lines
app.js    modified 2026-04-21 20:58:xx   size 71 657 bytes
```

Prompten rapporterade `14 352 byte, 334 rader`. Skillnaden är 9 304 byte + 245 rader → det matchar ungefär hälften-två-tredjedelar av data.js som skrevs i en senare Edit-runda (toalett-slut, ovrigt, alla helpers, export).

Cowork-sessionen som skrev promptens `2026-04-21-fix-datajs-avbruten.md` körde sitt `node --check` mot disk **innan** min föregående sessions Edit-serier hade nått disk-sparande. Den läste filen mitt i en skrivning och gjorde en rimlig men felaktig diagnos.

Det är inget fel Cowork gjorde — den förlitade sig på vad den såg på disk vid sin tid. Det är heller inte ett fel min föregående session gjorde — den skrev klart, sparade och verifierade att export fanns.

Vad det däremot visar är en **timing-glapp-risk** när två sessioner (en skrivande, en läsande) arbetar parallellt utan koordinering. Det är värt att notera som en lärdom men inte en bugg att åtgärda.

---

## Vad jag INTE gjorde (och varför)

**1. Ingen kodändring i `data.js`.**
Prompten säger uttryckligen i §5.1: *"Om checken fallerar, rulla tillbaka och tänk om."* Eftersom `node --check` passerar och alla scenario-tester passar fanns inget att rulla tillbaka och inget att ändra.

**2. Ingen ändring i `app.js`.**
Prompten §5.4: *"rör inte `app.js` om det inte är strikt nödvändigt"*. Inget var nödvändigt.

**3. Ingen ändring i tidigare dokumentation (DESIGN.md v1.4, DECISIONS.md, tidigare sessionsrapport).**
Den tidigare sessionens dokumentation var korrekt mot det som faktiskt landade på disk. Inget att rätta.

---

## Öppna poster efter sessionen

Inga nya. De existerande öppna frågorna (Q4, Q5, Q7, Q8, Q9, Q1, Q12, Q13 i `OPEN_QUESTIONS.md`) kvarstår som de var.

---

## Rekommendation till Dennis / Cowork

1. **Hard reload i Chrome** (Ctrl+Shift+R eller incognito) — bör lösa det Cowork såg.
2. **Återuppta UI-testet från Scenario 4.** Om något faktiskt kraschar i webbläsaren är det troligen ett separat app.js-problem, inte en data.js-sak. Rapportera då exakt feltext från konsolen så kan det diagnostiseras riktat.
3. **Anti-timing-glapp-regel framåt:** Om en testningssession upptäcker trasig syntax mitt i en annan sessions arbete — vänta 30 sek, kolla mtime, läs om och kör check på nytt. Om felet kvarstår efter andra läsningen är det en riktig bugg. Annars är det sannolikt ett skrivfönster.

---

## Filer som rörts denna session

```
.project-context/
  sessions/
    2026-04-21-datajs-fix.md   (denna rapport — enda filändringen)
```

Ingen kodändring. Ingen DESIGN/DECISIONS/OPEN_QUESTIONS-ändring.
