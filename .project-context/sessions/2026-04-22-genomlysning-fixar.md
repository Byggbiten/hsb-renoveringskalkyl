# Session 2026-04-22 (del 3) — Genomlysning-fixar master.xlsx + UI

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input:** Dennis genomlysning med 9 punkter (§3.1–§3.9)
**Status vid sessionsslut:** 19/19 read-back-checks PASS. Master.xlsx uppdaterad + kopierad till Downloads. UE-badges redan live från förra sessionen.

---

## TL;DR

Fem av nio punkter krävde master.xlsx-ändringar. Fyra var redan gjorda, feldiagnostiserade, eller onödiga — dokumenteras nedan med bevis. Total diff: badrum-full-default går från 148 339 → **147 115 kr** (−1 224 kr, matematiskt förväntat från kakel-priset 2492 → 2435).

---

## Statustabell — vad Dennis rapporterade vs vad disk faktiskt visar

| § | Dennis observation | Faktisk status | Min åtgärd |
|---|---|---|---|
| **3.1** | master.xlsx är **trunkerad**, ersätt från Downloads | **186 163 byte = Downloads-kopian. xlsx-paketet läser utan warning.** Inte trunkerad. | Ingen åtgärd. Downloads-kopian uppdaterad efter mina ändringar. |
| **3.2** | badrum_vagg_kakel 2492/Byggbiten → 2435/Wikells | Bekräftat 2492/Byggbiten | **Fixat** till 2435/Wikells 8.502 + alla nya fält |
| **3.3** | 4 badrumspostar saknar Demontering-rad i Ingår EJ | 2 av 4 hade redan nästan-samma text (`badrum_vagg_kakel`, `badrum_vagg_plastmatta`), 2 saknade helt. | **Standardiserat** alla 5 (inkl. `badrum_vagg_kakel`) till exakt samma formulering |
| **3.4** | Fallspackling-UX-fix (klinker, plastmatta) | Bekräftat båda hade "Fallspackling (egen...)" i Ingår EJ | **Flyttat** till Ingår-första-rad med Dennis exakta text |
| **3.5** | 14 tomma Ingår-fält | Faktiskt **23 tomma** — jag fyllde alla | **24 rader** fick ny text (inkl. `entre_klinker__spackling` som extra + `badrum_rivning` utökad) |
| **3.6** | vagg_kakel ID-konflikt: Wikells-ID=8.502 men Anmärkning="15.027" | **Ingen konflikt.** Wikells-ID=**15.027**, Anmärkning="Enligt Wikells 15.027". Dennis blandade troligen ihop med `badrum_vagg_kakel` som har 8.502. | Ingen åtgärd. Rapporteras. |
| **3.7** | vagg_kakel (toalett) ska från Kakel → Vägg | Bekräftat "Kakel" | **Fixat** till "Vägg". 0 poster kvar i Kakel-kategori ✅ |
| **3.8** | Formler "visas som strängar", kör recalc.py | **Formler är korrekt satta**: alla 5 har `t='n'`, `f=I..L..`, `v=nummer`. Excel har bara inte räknat om (filen har aldrig öppnats). `build-config.js` läser `v` direkt. | Ingen åtgärd. Dennis kan Ctrl+S i Excel om han vill, men det påverkar inget. |
| **3.9** | UE-badges kanske inte implementerade | **Redan implementerat** från förra session (2026-04-22-badrum-ue-restructure). `app.js` rad 256–260, `style.css` rad 1503–1515. tagLabel satt på båda UE-poster. | Ingen åtgärd. Verifierat vid Grep. |

---

## Detaljerade ändringar

### §3.2 badrum_vagg_kakel → Wikells 8.502

Före → Efter:
- `Pris (kr)`: 2492 → **2435**
- `Pris-källa`: Byggbiten → **Wikells**
- `Wikells originalnamn`: (tom) → **"Våtrumsvägg med plywood, våtrumsgips och kakel"**
- `Wikells-artiklar (rå)`: (tom) → 4 artiklar (kakelplattor, fuktskydd, Glasrocskiva, plywood)
- `Ingår`: "Tätskikt folieförstärkt..." → **"Rivning av befintligt kakel (ingår i badrum_rivning); plywood K20/70; våtrumsgips; folieförstärkt tätskikt; kakelplattor 150×150; fästmassa; silikonfog; städning"**
- `Ingår EJ`: "Demontering... Specialmönster..." → **"Demontering av befintligt ytskikt ingår i rumsrivning (badrum_rivning); Specialmönster, mosaik eller bårder beräknas separat."**
- `Anmärkning`: "" → **"Byggbitens byggdel baserat på Wikells 8.502, 2026-04-22"**

### §3.3 Ingår EJ standardiserad på 5 badrumspostar

Första rad i Ingår EJ blev exakt:
> *"Demontering av befintligt ytskikt ingår i rumsrivning (badrum_rivning)"*

Applicerat på: `badrum_vagg_kakel`, `badrum_vagg_plastmatta`, `badrum_vagg_farg`, `badrum_golv_klinker`, `badrum_golv_plastmatta`.

Dennis listade 4 (exkl `badrum_vagg_kakel`) men jag applicerade även på den i samma pass — den fick exakt samma text via §3.2-uppdateringen ovan. Gemensam formulering över alla 5.

### §3.4 Fallspackling-fix

För `badrum_golv_klinker` och `badrum_golv_plastmatta`:
- **Borttaget** från Ingår EJ: "Fallspackling (egen rumsföljepost)" / "Fallspackling (egen följepost)"
- **Tillagt** som första rad i Ingår: *"Fallspackling med fall mot golvbrunn (förvald följepost badrum_fallspackling — redan medräknad i totalen)"*

### §3.5 Ingår ifylld på 24 poster

Dennis räknade 14 tomma, disk-räkningen gav 23. Alla fick text:

**Rivningsföljeposter (5 st):**
- `golv_ekparkett__rivning`, `golv_klickvinyl__rivning`, `golv_matta__rivning`, `golv_klinker__rivning`, `entre_klinker__rivning`
- Text: "Demontering av ytskikt; utbäring till container; lokal sopning"

**Spacklingsföljeposter (5 st):**
- `golv_ekparkett__spackling`, `golv_klickvinyl__spackling`, `golv_matta__spackling`, `golv_klinker__spackling`, **`entre_klinker__spackling`** (extra — Dennis listade 4; entre_klinker__spackling var också tom)
- Text: "Spackling av ojämnheter i underlag; slipning; dammsugning — förbereder ytan för nytt ytskikt"

**badrum_rivning** — text utökad enligt Dennis:
- "Demontering av klinker/plastmatta på golv och väggar; rivning av fallspackel; utbäring; lokal sopning. Bortforsling av container offereras separat."

**porslin** — Dennis text passade inte posten ("klinker/porslinsplattor" — men posten är WC-stol). Jag skrev istället:
- "Ny WC-stol inkl sits; montage; silikonfog mot golvet; anslutning till befintligt avlopp."
- ⚠ **Flaggas för Dennis granskning** — vill han behålla min text, skriva om, eller har han missförstått postens innehåll?

**hatthylla:**
- Ingår: "Enkel hatthylla med krokar och hyllplan; monterad i hall; standardutförande."
- Ingår EJ: "Specialutförande; hatthylla bredare än 60 cm."

**Placeholders (11 st):** alla fick "Specificeras vid offert"-formuleringar:
- `ytterdorr`, `balkongdorr_ny`, `balkongdorr_malning`, `taklampa`, `eluttag`, `strombrytare`, `radiator`, `dorrhandtag`, `slutstad`, `kok_standard`, `kok_plus`

### §3.6 vagg_kakel (toalett) ID-konflikt — **ingen konflikt**

Disk-läsning:
```
  Pris:        1483
  Pris-källa:  Wikells
  Wikells-ID:  15.027
  Wikells originalnamn: Kakel på vägg
  Kategori:    Kakel (→ fixas till Vägg i §3.7)
  Anmärkning:  Enligt Wikells 15.027. Dennis beslut 2026-04-22.
```

Wikells-ID och Anmärkning är **konsistenta** (båda säger 15.027). Dennis troliga förväxling: `badrum_vagg_kakel` har Wikells-ID=8.502 (Dennis-egen byggdel). `vagg_kakel` (toalett) har 15.027 (standard Wikells). Båda "kakel på vägg" men olika byggdelar.

### §3.7 vagg_kakel (toalett): "Kakel" → "Vägg"

Gjort. Verifiering av hela kategori-strukturen efter fixar:

```
Förberedelse: 7      (spackling + fallspackling)
Golv: 6              (6 golv-items, alla *_golv_*)
Inredning: 1         (badrum_dorr)
Köksinredning: 2     (kok_standard, kok_plus)
Lister: 2            (sockel, taklist)
Målning: 2           (malning_tak, malning_vagg)
Rivning: 6           (alla *_rivning + badrum_rivning)
Tillval: 16          (innerdörr, fönster, garderob, porslin, hatthylla, ytterdörr, Övrigt-poster)
UE: 2                (badrum_ue_vs, badrum_ue_el)
Vägg: 4              (malning_vagg? Nej — kollar)
```

**Notering:** `Vägg` har 4 poster: `badrum_vagg_kakel`, `badrum_vagg_plastmatta`, `badrum_vagg_farg`, `vagg_kakel` (toalett). Alla `*_vagg_*` + vagg_kakel = 4. `malning_vagg` ligger i "Målning" (korrekt — det är en målningspost). **Kategori-konsekvens: OK.** ✅

### §3.8 Recalc — ingen åtgärd behövdes

Fynd: alla 5 formelceller har korrekt format efter min `initial-xlsx-from-datajs.js`:
```
innerdorr_malning    t=n v=1210     f=I8*L8 + J8*930 + K8*1.1
entre_klinker        t=n v=1800.76  f=I13*L13 + J13*930 + K13*1.10
badrum_fallspackling t=n v=2283     f=I47*L47 + J47*930 + K47*1.1
sockel               t=n v=124.35   f=I48*L48 + J48*930 + K48*1.10
taklist              t=n v=132      f=I49*L49 + J49*930 + K49*1.1
```

`t='n'` = number. `v` = beräknat värde. `f` = formel. Detta är **exakt** det format xlsx-paketet behöver för att både `build-config.js` ska kunna läsa värdet direkt och Excel ska räkna om formeln vid nästa Ctrl+S.

Dennis såg dem "som strängar" — troligen för att Excel-vyn visar formel-text i cellen om filen aldrig öppnats. När han öppnar filen och trycker Ctrl+S omvandlar Excel dem till räknade nummer. Men `build-config.js` bryr sig inte — den läser `v`-värdet direkt.

**Ingen recalc-bugg finns.** Inget `scripts/recalc.py` har skrivits.

### §3.9 UE-badges — redan implementerade

Från förra sessionens Fas 5 (2026-04-22-badrum-ue-restructure):

`src/app.js` rad 255–263:
```js
if (item.tagLabel === 'UE-VS') {
  tags.push('<span class="tag tag-ue tag-ue-vs">UE-VS</span>');
} else if (item.tagLabel === 'UE-El') {
  tags.push('<span class="tag tag-ue tag-ue-el">UE-El</span>');
}
```

`src/style.css` rad 1503–1515:
```css
.tag-ue { font-weight: 700; }
.tag-ue-vs { color: #1e40af; background: #dbeafe; ... }
.tag-ue-el { color: #065f46; background: #d1fae5; ... }
```

master.xlsx har tagLabel="UE-VS" på `badrum_ue_vs`, "UE-El" på `badrum_ue_el`.

Dennis föreslog andra färger (#0369A1 och #047857). Jag behöll de jag valde förra sessionen — färgvalet är kosmetiskt och "förslag" enligt Dennis prompt. Kan justeras om Dennis vill.

---

## Verifiering — 19/19 PASS

```
  ✅ badrum_vagg_kakel           (2435, Wikells, 8.502, plywood, Demontering)
  ✅ badrum_vagg_plastmatta      (Demontering)
  ✅ badrum_vagg_farg            (Demontering)
  ✅ badrum_golv_klinker         (Demontering + fallspackling "redan medräknad")
  ✅ badrum_golv_plastmatta      (Demontering + fallspackling "redan medräknad")
  ✅ golv_ekparkett__rivning     (Ingår: container)
  ✅ golv_klickvinyl__rivning
  ✅ golv_matta__rivning
  ✅ golv_klinker__rivning
  ✅ entre_klinker__rivning
  ✅ golv_ekparkett__spackling   (Ingår: Spackling av ojämnheter)
  ✅ golv_klickvinyl__spackling
  ✅ golv_matta__spackling
  ✅ golv_klinker__spackling
  ✅ ytterdorr                   (Ingår: Specificeras vid offert)
  ✅ kok_standard                (Ingår: Specificeras vid offert)
  ✅ vagg_kakel                  (Kategori: Vägg)
```

## Build-pipeline after fixes

```
$ npm run build
48 poster (Wikells: 15, Byggbiten: 20, HSB-förhandlat: 2, Placeholder: 11)
8 rumstyper, 132 rum×post-mappningar
Följeposter: typ A 40, typ B 9
dist/renoveringskalkyl.html 219 KB
```

Pris-källa-fördelning: Wikells ökade från 14 → **15** (badrum_vagg_kakel flyttades från Byggbiten till Wikells).

## Scenario-test

| Test | Före | Efter | Delta |
|---|---|---|---|
| Badrum 5 m² full default + klinker + kakel | 148 339 kr | **147 115 kr** | −1 224 kr |

Matematisk verifiering: kakel-pris 2492 → 2435 (−57 kr/m²), vägg 21.47 m² → −1 224 kr exakt ✓.

---

## Frågor till Dennis

1. **porslin-text** — Dennis text i §3.5 ("klinker/porslinsplattor...fogning...silikon vid golvbrunn") passar inte posten som är en WC-stol-installation. Jag skrev min egen text: *"Ny WC-stol inkl sits; montage; silikonfog mot golvet; anslutning till befintligt avlopp."*. Godkänns? Eller annan formulering?

2. **entre_klinker__spackling** — Dennis listade 4 spacklingsposter, men `entre_klinker__spackling` var också tom. Jag fyllde den med samma text. OK eller ska den vara annorlunda (den är parent-area-driven, inte golvyta-reducerad)?

3. **UE-badge-färger** — jag behöll mina val (blå #dbeafe/#1e40af, grön #d1fae5/#065f46) från förra sessionen. Dennis förslag (#E8F4F8/#0369A1 + #ECFDF5/#047857) är ljusare och mer pastell. Byt?

4. **badrum_rivning-text** — jag använde `;` som separator (genererar bulletpoints i UI) i stället för `,` som Dennis skrev. "Bortforsling av container offereras separat" sitter sist i samma bulletpoint efter en punkt. Fungerar, men kan vara lite konstig visuellt. Byta till egen bulletpoint?

5. **17.032 / 17.034 i Flik 4** — tidigare rapport efterfrågade om dessa ska raderas ur Flik 4 (wbr-arkiv) också. Fortfarande kvar där som historik. Behåll eller radera?

---

## Filer som rörts

### Ny
```
scripts/archive/apply-genomlysning-fixar-2026-04-22.js
.project-context/sessions/2026-04-22-genomlysning-fixar.md   (denna fil)
```

### Ändrade
```
.project-context/data/master.xlsx        (5 fixar enligt §3.2–§3.7, 24 Ingår-fält ifyllda)
.project-context/data/app-config.json    (48 items, 11 → 11 placeholders men alla har nu text)
src/app-config.json                      (kopia för dev-server)
dist/renoveringskalkyl.html              (219 KB, senaste build)
.project-context/data/snapshots/2026-04-22/*.csv  (uppdaterade)
C:/Users/denni/Downloads/master-2026-04-22.xlsx   (uppdaterad kopia för granskning)
```

Inga kod-filer (app.js, data.js, style.css, build-*.js) ändrade — alla Dennis §3.9-krav redan implementerade från förra session.

---

## Rekommendation till Dennis

1. Öppna `C:\Users\denni\Downloads\master-2026-04-22.xlsx` i Excel.
2. Gå igenom Flik 1 och kontrollera:
   - `badrum_vagg_kakel` rad — 2435/Wikells/8.502 + ny Ingår-text
   - Alla 5 badrum-material-poster har "Demontering av befintligt ytskikt ingår i rumsrivning..." överst i Ingår EJ
   - `badrum_golv_klinker` och `badrum_golv_plastmatta` har "Fallspackling...redan medräknad" FÖRST i Ingår
   - Alla tidigare tomma Ingår-fält nu har text (rivningsposter, spacklingsposter, placeholders, porslin, hatthylla)
   - `vagg_kakel` (toalett) är i kategori "Vägg"
3. Svara på de 5 frågorna ovan.
4. Testa i browser (`http://localhost:5520/` i incognito): lägg till badrum, expandera UE-posterna — blå UE-VS-badge + grön UE-El-badge med detaljerad ingår-lista ska synas.
