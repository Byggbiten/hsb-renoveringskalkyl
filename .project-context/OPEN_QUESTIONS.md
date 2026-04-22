# OPEN_QUESTIONS.md

Obesvarade frågor som påverkar design, funktionalitet eller leverans. Kolla om din uppgift berörs innan du antar något.

När en fråga besvaras: kopiera svaret hit under rubriken, sätt status **BESVARAD** med datum, och uppdatera relevant fil (DESIGN.md, data.js, etc.) för att reflektera svaret.

---

## Q1 — Schablonpris kök — STATUS: DELVIS BESVARAD 2026-04-20
**Beslut:** Två kök-varianter som ömsesidigt uteslutande alternativ: **Standard** och **Plus**. Schablonpriser sätts som placeholders tills Dennis har slutliga siffror.
**Nuvärde (placeholders):**
- Komplett kök standard: 150 000 kr
- Komplett kök Plus: 225 000 kr
**Kvar att besvara:** Slutliga kr-värden från Dennis.
**Blockerar:** Slutleverans. Mockup och utveckling går vidare med placeholders.

---

## Q2 — Moms: ex. eller inkl.? — STATUS: BESVARAD 2026-04-20
**Beslut:** Redovisa **exklusive moms**. Alla prisvärden och totaler är ex. moms. Tag "ex. moms" visas i total-kortet och i utskriftens sidfot.

---

## Q3 — Logga — STATUS: BESVARAD 2026-04-20
**Beslut:** Byggbitens riktiga logga används. Dennis levererade den i två versioner:
- `byggbiten_logga_transparent_beskuren.svg` (mörk fyllning, transparent bakgrund)
- `byggbiten_logga_transparent_beskuren_vit.svg` (vit fyllning, transparent bakgrund) — används i appen eftersom headern är mörk
Båda ligger i `src/assets/` som `byggbiten-logga.svg` (aktiv: den vita). Enkelt att byta vid behov.

---

## Q4 — Kontaktuppgifter för utskrift och "Begär offert" — STATUS: DELVIS BESVARAD 2026-04-22
**Beslut v1.6:** Utskriftens sidfot visar Byggbiten-block: företagsnamn, adress, telefon `070-235 65 55`, e-post `info@byggbiten.nu`, bankgiro `825-3312`, momsreg `SE556875426001`. Ombudsblocket visar Dennis Sendelbach + `dennis@byggbiten.nu` + `0704969141`. "Begär offert"-knappen öppnar trestegs-modal som förifyller mejl till `dennis@byggbiten.nu` (se Del II i promptfil `2026-04-22-pdf-offert-expand-gray.md`).
**Kvar att bekräfta:**
- Är `070-235 65 55` det aktuella företagsnumret? Om annat: byt i `SUPPLIER_INFO.tel` i `app.js`.
- HSB-kontaktperson — `CUSTOMER_INFO.kontakt` är `'[Kontaktperson hos HSB]'`-placeholder.
- Ska ombudet vara Dennis eller generisk ("Byggbiten-support"). Just nu Dennis.
**Ansvar:** Dennis.

---

## Q5 — Spärrmålning borttagen? — STATUS: ÖPPEN (provisoriskt JA)
**Fråga:** Är det OK att spärrmålning (165 kr/m²) tas bort från UI eftersom det är en specialåtgärd som inte hör hemma i en överslagskalkylator?
**Rekommendation:** JA, ta bort. Dennis hanterar spärrmålning internt när det är aktuellt.
**Nuvärde:** Bortplockad från DESIGN.md § 5.3.
**Blockerar:** Inget — provisoriskt beslut gäller tills motsägelse kommer.
**Ansvar:** Dennis att bekräfta.

---

## Q6 — Badrum: schablon-only eller per-post-läge? — STATUS: BESVARAD 2026-04-22
**Beslut 2026-04-20:** Badrum är schablon-only. Inga per-post-alternativ i v1.
**Uppdatering 2026-04-21:** Badrum splittades i Standard/Plus-schabloner.
**Slutbeslut 2026-04-22 (v1.5):** Badrum blir helt **per-post** — samma modell som sovrum/hall. 10 items (2 golv, 3 vägg med wallCalc, 3 inredning, 2 UE) + 3 rumsföljeposter (skyddstäckning, rivning 1 200 kr/m², fallspackling 2 283 kr/m²). Priser Wikells-kalibrerade via Dennis egna byggdelar 8.502/8.503/8.504. Se DECISIONS.md 2026-04-22 och promptfil `.project-context/prompts/2026-04-21-badrum-v4.md`.

---

## Q7 — Disclaimer-text exakt formulering — STATUS: ÖPPEN
**Fråga:** Godkänner Dennis följande disclaimer?
> "Uppskattning baseras på Byggbitens schablonpriser för ytskiktsrenovering 2026. Slutligt pris ges i offert efter platsbesök."

**Alternativ formulering:**
> "Detta är ett överslag. Slutligt pris sätts alltid i offert efter platsbesök."

**Blockerar:** Slutleverans.
**Ansvar:** Dennis + ev. juridisk koll hos HSB.

---

## Q8 — Hemsidereferens / screenshots — STATUS: ÖPPEN
**Fråga:** Kan Dennis lägga screenshots från byggbiten.nu (hero, färgkombinationer, typografi) i `.project-context/references/` så mockups kan matchas bättre mot hemsidans faktiska estetik?
**Bakgrund:** byggbiten.nu är JS-renderad och WebFetch får bara fram taglinen "Totalentreprenören i Norrland". Färgpalett i DESIGN.md § 4.2 är härledd från loggan.
**Blockerar:** Inget akut — mockups görs på nuvarande palett. Kan förbättras i iterationsrundan.
**Ansvar:** Dennis.

---

## Q9 — Info-dialog-innehåll per material — STATUS: DELVIS BESVARAD 2026-04-22
**Beslut v1.6:** Info-dialog-featuren aktiverades som **expanderbar panel** (chevron + fällbar panel under raden, inte modal). Datamodellen utökades till `info: { ingar: string[], ingarEj: string[], wikellsRef: string, image: string|null }`. Claude skrev utkast-innehåll för 70 av 84 items baserat på Wikells-recepten i `data.js`-kommentarer + sunt förnuft. Dennis granskar innehållet efterhand.
**Saknas ännu:**
- Bilder (`info.image`) — fortfarande `null` på alla items. Aktiveras framöver om Dennis samlar in bilder.
- Items utan info (14 st): kök-schabloner, ytterdörr, hatthylla, Övrigt-poster — får ingen chevron tills placeholders ersätts med riktigt innehåll.
- Verifiering att ingar/ingarEj-texterna stämmer mot Byggbitens praxis (Dennis läser igenom).
**Blockerar:** Inte v1 — chevron-panelen fungerar redan med nuvarande texter.
**Ansvar:** Dennis granskar texterna; levererar bilder om/när relevant.

---

## Q10 — Placeholder-priser — STATUS: UPPDATERAD 2026-04-22 (v1.7)

**v1.7-uppdatering:** Placeholder-hantering flyttad från `data.js` till `master.xlsx`. Pris-källa-kolumnen i Flik 1 är nu den enskilda sanningen — `Placeholder` visar "Preliminärt pris"-tagg i UI. 11 poster kvar med Pris-källa=Placeholder per 2026-04-22: kök-schabloner (standard/plus), ytterdörr Daloc, balkongdörr måla/ny, taklampa, eluttag, strömbrytare, radiator, dörrhandtag, slutstäd. Dennis byter dessa i master.xlsx när slutliga offerter finns. Hatthylla flyttades till HSB-förhandlat 1450 kr. Garderob_60 flyttades till HSB-förhandlat Marbodal 3600 kr. Fönstermålning flyttades till Byggbiten 1350 kr (Patrik Norlén).

**Bakgrund:** I samband med Wikells-kalibreringen 2026-04-21 + badrum-v4 2026-04-22 flyttades flera tidigare placeholders till Wikells-verifierade priser och fick `placeholder: false` (dvs. ingen "Preliminärt pris"-tagg). Följande priser är nu **Wikells-kalibrerade** och räknas som satta:

| Post | Pris | Källa |
|---|---|---|
| Ekparkett | 825 kr/m² | Wikells 15.016 |
| Klickvinyl | 755 kr/m² | Wikells 15.018 (laminat) |
| Heltäckningsmatta | 730 kr/m² | Wikells 15.020 (linoleum) |
| Klinker (hall/toa/entré) | 1 600 kr/m² | Wikells 15.015 justerat ner (Dennis-val) |
| Ny innerdörr | 5 070 kr/st | Wikells 16.056 |
| Måla befintlig innerdörr | 1 210 kr/st | Wikells 14.048 |
| Måla fönster invändigt | 990 kr/st | Wikells 14.047 |
| Garderob 60's stomme | 14 600 kr/st | Wikells 17.020 |
| Vägg kakel (toalett) | 1 160 kr/m² vägg | Wikells 15.027 |
| Badrum — klinker våtrumsgolv | 2 555 kr/m² | Wikells 15.015 (v1.5) |
| Badrum — plastmatta golv | 1 194 kr/m² | Wikells 15.023 (v1.5) |
| Badrum — kakel vägg | 2 492 kr/m² vägg | Dennis-egen 8.502 (v1.5) |
| Badrum — plastmatta vägg | 1 504 kr/m² vägg | Dennis-egen 8.503 (v1.5) |
| Badrum — våtrumsfärg vägg | 1 310 kr/m² vägg | Cowork-egen 8.504 (v1.5) |
| Badrum — WC- och duschinredning | 30 816 kr/st | Wikells 17.034 (v1.5) |
| Badrum — badrumsinredning | 9 274 kr/st | Wikells 17.032 (v1.5) |
| Badrum — våtrumsdörr målad trä | 4 655 kr/st | Wikells 16.059 — Dennis-val (v1.5) |
| Badrum — UE El | 8 000 kr/st | Byggbiten-schablon (v1.5) |
| Badrum — UE VS | 12 000 kr/st | Byggbiten-schablon (v1.5) |
| Badrum — rivning (rumsfu, alltid-on) | 1 200 kr/m² golv | Byggbiten-schablon (v1.5) |
| Badrum — fallspackling (rumsfu, alltid-on) | 2 283 kr/m² golv | Wikells 15.013 (v1.5) |
| Rivning befintligt golv (följepost) | 95 kr/m² | Wikells-snitt |
| Flytspackling undergolv (följepost) | 187 kr/m² | Wikells 15.012 |
| Skyddstäckning (rums-följepost) | 450 kr/rum | Byggbiten |

**Kvarstående placeholders** (flagga `placeholder: true` i `data.js`, "Preliminärt pris"-tagg syns i UI):

| Post | Placeholder (kr) | Plats |
|---|---|---|
| Komplett kök standard | 150 000 | Kök |
| Komplett kök Plus | 225 000 | Kök |
| Hatthylla inkl montage | 3 500 /st | Entré (Byggbiten-snitt, verifieras) |
| Ytterdörr Daloc | 28 000 /st | Entré |
| Måla befintlig balkongdörr | 1 500 /st | Övrigt |
| Ny balkongdörr komplett | 18 000 /st | Övrigt |
| Byte av taklampa / fast ljuspunkt | 1 200 /st | Övrigt |
| Byte av eluttag | 600 /st | Övrigt |
| Byte av strömbrytare | 500 /st | Övrigt |
| Byte av radiator / element | 7 500 /st | Övrigt |
| Dörrhandtag (uppgradering) | 950 /st | Övrigt |
| Slutstäd efter renovering | 5 000 /st | Övrigt |

**Blockerar:** Slutleverans. Dennis byter siffrorna i `data.js` för kvarstående placeholders.

---

## Q11 — Riktiga sparade kalkyler i hemvyn — STATUS: INFORMATIV 2026-04-20
**Status:** localStorage persisterar sparade kalkyler per användare/browser. Projektlistan i hemvyn visar bara de kalkyler användaren själv skapat på den här enheten — inget moln, ingen delning mellan datorer.
**Framtida förbättring (ej v1):** Export/import till JSON-fil, eller synk via enkel backend om flera användare ska kunna dela projekt.

---

## Q12 — Kap 29 projektgemensamt (etablering, städning, ställning, projektledning) — STATUS: ÖPPEN 2026-04-21
**Fråga:** Wikells HSB-3a-kalkyl innehåller ett helt kapitel 29 "Projektgemensamt" (etablering/avveckling, containerhyra, ställning, projektledning, kontorskostnader). I ROT-helrenoveringsmallen är det betydande belopp (tiotusentals kronor). Ska detta:
- **A.** Läggas in som automatiskt tillägg (t.ex. 8–12 % på subtotal) längst ner i totalkortet?
- **B.** Ingå tyst i de satta priserna (nuvarande beteende — 272 %-påslaget täcker OH men ej projektetablering)?
- **C.** Vara en egen "Övrigt"-rad användaren kryssar i (t.ex. "Etablering + projektledning — 15 000 kr")?
- **D.** Hanteras utanför appen (förklaring i disclaimer att offert-slutpriset inkluderar etablering)?

**Rekommendation (Claude):** D först (lägg till förklaring i disclaimer att platsbesök + offert inkluderar projektgemensamma kostnader), ev. kompletterat med C (en eller två "Övrigt"-rader för större projekt). A är farlig eftersom procentsatsen blir tvivelaktig — 8 % på en 15 000 kr-kalkyl är för mycket, 8 % på en 400 000 kr-kalkyl är för lite.

**Blockerar:** Inte v1 — appen är en överslagskalkyl och offert-slutpriset sätts alltid efter platsbesök. Men bra att dokumentera valet innan HSB börjar få "varför skiljer sig appen från offerten med 20 000 kr"-frågor.
**Ansvar:** Dennis tar ställning, ev. ihop med HSB-kontakten.

---

## Q13 — Målning per-m²-pris (144 kr) vs Wikells per-rum-UE — STATUS: ÖPPEN 2026-04-21
**Fråga:** Wikells HSB-3a-kalkyl har bara 14.038 "Ommålning väggar + tak" som per-rum-UE (47 kr/rum efter påslag) — det är en schablon som inte går att bryta ner per-m². Dagens app-pris 144 kr/m² är Byggbiten-erfarenhet men inte verifierat mot Wikells per-m²-data.
**Alternativ:**
- Behåll 144 kr/m² (nuvarande) tills bättre underlag finns.
- Byt till per-rum-schablon (t.ex. 4 000 kr/rum för tak + väggar) — enklare men förlorar granularitet.
- Hämta Wikells 14.xxx-detaljerade målningsposter från en annan Wikells-variant (ej i HSB-3a-sammanfattningen).

**Blockerar:** Inte v1. Appen fungerar med 144 kr/m². Följs upp när Dennis har tid att validera mot Wikells målningskatalog.
**Ansvar:** Dennis + Claude nästa Wikells-runda.

---

## Q14 — Uppdateringsflöde från ny Wikells .wbr — STATUS: ÖPPEN 2026-04-22
**Fråga:** När Wikells släpper ny version av Sektionsdata (1-2 ggr/år) — hur uppdateras master.xlsx? Idag finns ingen automatiserad diff-process.
**Förslag:** Nytt script `scripts/update-from-wbr.js` som:
1. Läser nuvarande master.xlsx + Flik 4 (befintliga wbr-priser)
2. Parsear ny .wbr-fil via befintliga `parse-wbr.js`
3. Jämför Mtrl/Tim/UE mellan gammal och ny per Wikells-ID
4. Skriver ut diff-rapport till stdout (och en CSV till snapshots/)
5. Väntar på Dennis bekräftelse innan master.xlsx uppdateras
**Blockerar:** Inte v1.7. Flik 4 är redan förberedd med Mtrl/Tim/UE-kolumner som gör diff enkel.
**Ansvar:** Separat prompt när behov uppstår.

---

## Q15 — `package-lock.json` — committa eller ignorera? — STATUS: ÖPPEN 2026-04-22
**Fråga:** `.gitignore` har `package-lock.json` i sig just nu — följer vissa bäst-praxis men motverkar reproducerbara builds.
**Rekommendation:** Ta bort från `.gitignore` och committa `package-lock.json` så att agenter + framtida Dennis-maskiner får exakt samma beroenden. `xlsx@0.18.5` är frusen — bör inte röras utan medveten uppgradering.
**Blockerar:** Inte v1.7.
**Ansvar:** Dennis (1-liners beslut).
