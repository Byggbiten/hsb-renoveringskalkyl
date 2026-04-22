# Session 2026-04-22 (del 2) — Badrum UE-restructure + tagLabel + renoveringsprincip

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input:** Dennis klartext-specifikation (renoveringsprincip + 16-punkts badrum-omstrukturering + UI-badges)
**Kontext:** Bygger direkt vidare på 2026-04-22 (master.xlsx-migration). Samma dag, andra passet.
**Status vid sessionsslut:** Kod + master.xlsx + dokumentation färdig. 12/12 scenario-assertions PASS.

---

## TL;DR

Badrumsvyn rensas från Wikells-inredningsartiklar (17.032 + 17.034) och ersätts med två UE-schabloner (VVS 40 000 kr, El 20 000 kr ex moms) som har detaljerade ingår-listor och färgade UE-badges i UI. Ny renoveringsprincip dokumenterad i master.xlsx Flik 5 + DESIGN.md: Wikells = renovering, inte inredning.

---

## 1. Audit-rapport (Fas A)

Granskning av alla 14 aktiva Wikells-byggdelar i master.xlsx + 3 inaktiva (17.020, 17.032, 17.034) via automatiserad nyckelordsökning i wbr-artiklarnas `Benämning`:

### Rent renoveringsarbete — 11 byggdelar ✅
- 8.132 Socklar, målade
- 8.136 Taklister, målade
- 14.048 Ommålning innerdörrar
- 15.013 Våtrumsspackling i fall
- 15.015 Klinker på golv
- 15.016 Ekparkett på golv
- 15.018 Laminat på golv
- 15.020 Linoleum på golv
- 15.023 Plastmattor v-täta på golv
- 15.027 Kakel på vägg
- 16.056 Bostadsinnerdörr 9x21 målad

### Flaggade avvikelser

| Byggdel | Flaggad artikel | Min bedömning | Status |
|---|---|---|---|
| **16.059 Toalettinnerdörr** | "WC-behör" | Dörrtrycke med WC-mekanism (låsvred) — del av dörr-paketet, inte fristående inredning. Accepteras inom "beslag som är del av ytprodukt"-regeln. | **Behålls**. Notera till Dennis om han vill dubbelkolla. |
| **17.020 Skåpsinredning** | Garderobskåp B=600, Inklädnad ök skåp | Hela byggdelen är inredning. Redan ej aktiv (ersatt av Marbodal-garderob 3 600 kr HSB-förhandlat i v1.7). | **Ej åtgärd**. Ligger kvar i Flik 4 som historik. Dennis kan bestämma om den ska raderas ur Flik 4 helt. |
| **17.032 Badrumsinredning** | Badrumsskåp, handdukshängare, toalettborsthållare, toalettpappershållare, torkställ | 5 av 6 artiklar är inredning. | **Borttagen från Flik 1 + Flik 3** enligt Dennis instruktion. Ligger kvar i Flik 4 som arkiv. |
| **17.034 WC-duschinredning** | Toalettpappershållare, handdukshängare, tvålhållare, inbyggnadstvättställ, spegel m spotlights, duschvägg | 7 av 9 artiklar är inredning. | **Borttagen från Flik 1 + Flik 3** enligt Dennis instruktion. Ligger kvar i Flik 4 som arkiv. |

Inga automatiska raderingar gjordes utöver Dennis uttryckliga instruktion (17.032 + 17.034). Flik 4 (wbr-arkiv) är helt oförändrad.

---

## 2. Master.xlsx-ändringar (Fas B)

Engångsscript: `scripts/archive/apply-ue-restructure-2026-04-22.js`.

### Flik 1 Priser (50 → 48 rader)

**Borttagna:**
- `badrum_wc_dusch` (Wikells 17.034, 30 816 kr)
- `badrum_inredning` (Wikells 17.032, 9 274 kr)

**Uppdaterade:**

| Post | Före | Efter |
|---|---|---|
| `badrum_ue_vs` | Etikett "UE — VS (WC, tvättställ, dusch...)", 12 000 kr, Wikells 20.003 | Etikett "Badrumsinredning inkl VVS-installation (UE)", **40 000 kr**, Byggbiten, `tagLabel: UE-VS`, Ingår-lista 8 punkter (WC-stol, kommod, blandare, duschvägg, duschblandare, golvbrunn, provtryckning, montage), Anmärkning "Schablonpris från VVS-UE. Ersätter Wikells 17.032 + 17.034." |
| `badrum_ue_el` | Etikett "UE — El (belysning, uttag, golvvärme...)", 8 000 kr | Etikett "El-installation badrum (UE)", **20 000 kr**, Byggbiten, `tagLabel: UE-El`, Ingår-lista 6 punkter (elgolvvärme, spottar, badrumsskåp-inkoppling, brytare, eluttag, besiktningsintyg), Anmärkning "Placeholder 20 000 — Dennis återkommer med exakt pris." |

**Ny kolumn T: `tagLabel`** — tom för alla utom badrum_ue_vs ("UE-VS") och badrum_ue_el ("UE-El").

### Flik 3 Rum × poster (134 → 132 rader)
Två rader borttagna (badrum × badrum_wc_dusch, badrum × badrum_inredning).

### Flik 5 Förklaring (25 → 86 rader)
Tillagt:
- Renoveringsprincipen (vad som ska ingå i Wikells vs inredning)
- Moms-konvention (alla priser ex moms, inkl UE-schabloner)
- UE-taggar (UE-VS blå, UE-El grön)
- Badrum-struktur efter 2026-04-22 omstrukturering

---

## 3. Kod-ändringar (Fas C + D)

### `scripts/build-config.js`
Läser `tagLabel`-kolumn från Flik 1, mappar till `item.tagLabel` i `app-config.json`. Tom sträng → undefined (inga null-fält i JSON).

### `src/app.js` (`renderItem`)
```js
if (item.tagLabel === 'UE-VS') {
  tags.push('<span class="tag tag-ue tag-ue-vs">UE-VS</span>');
} else if (item.tagLabel === 'UE-El') {
  tags.push('<span class="tag tag-ue tag-ue-el">UE-El</span>');
} else if (item.tagLabel) {
  tags.push(`<span class="tag">${escapeHtml(item.tagLabel)}</span>`);
}
```
Befintlig `isSchablon`/`isPlaceholder`-logik oförändrad. Båda kan samexistera.

### `src/style.css` (nya klasser)
- `.tag-ue { font-weight: 700 }`
- `.tag-ue-vs { color: #1e40af; background: #dbeafe; border: 1px solid rgba(30, 64, 175, 0.2) }` — blå
- `.tag-ue-el { color: #065f46; background: #d1fae5; border: 1px solid rgba(6, 95, 70, 0.2) }` — grön

Valda färger distinkta från befintliga `.tag-schablon` (varm brun) och `.tag-placeholder` (grå).

### `src/index.html`
Cache-bust: `?v=30` → `?v=31`.

---

## 4. Verifiering (Fas E)

### Build-config output
```
48 poster (Wikells: 14, Byggbiten: 21, HSB-förhandlat: 2, Placeholder: 11)
8 rumstyper
132 rum×post-mappningar
Följeposter: typ A 40, typ B 9
```

### Scenario-tester (12/12 PASS)

1. ✅ Badrum har 8 items (var 10)
2. ✅ `badrum_wc_dusch` borttagen
3. ✅ `badrum_inredning` borttagen
4. ✅ `badrum_ue_vs` pris 40 000 kr
5. ✅ `badrum_ue_el` pris 20 000 kr
6. ✅ `badrum_ue_vs.tagLabel` = "UE-VS"
7. ✅ `badrum_ue_el.tagLabel` = "UE-El"
8. ✅ UE-VS ingår-lista innehåller "WC-stol"
9. ✅ UE-El ingår-lista innehåller "Golvvärme"
10. ✅ Badrum 5 m² full default + klinker + kakel = **148 339 kr** (exakt förväntat)
11. ✅ Endast 2 items har `tagLabel` (ingen bindestreck-överspill)
12. ✅ Dist-bygge fungerar, 216 KB

### Beräkningsjämförelse

| Konfiguration | v1.7 | v1.8 | Delta |
|---|---|---|---|
| Badrum 5 m² full default + klinker + kakel | 148 429 kr | **148 339 kr** | −90 kr |

Förklaring av delta:
- Tidigare WC-dusch 30 816 + Inredning 9 274 = 40 090 kr
- Nu UE-VS 40 000 = −90 kr skillnad på VVS-sidan
- UE-El 20 000 var redan 8 000 tidigare → +12 000 kr *extra*
- **Netto:** +19 910 kr skulle förväntats, men i v1.7 hade UE-El också 8 000 kr ingång + tidigare UE-VS 12 000 kr
- Totalt: (40 000 − 12 000) + (20 000 − 8 000) + (−30 816 − 9 274) = 28 000 + 12 000 − 40 090 = **−90 kr**

Exakt match — priset är praktiskt oförändrat, bara omfördelat.

---

## 5. Moms-klargörning

Dennis klargjorde under sessionen: **alla priser i master.xlsx är EXKL moms**, inklusive UE-schablonerna 40 000 / 20 000. Print-layoutens inkl-moms-kolumn multiplicerar med 1.25. On-screen-UI visar ex moms med "ex. moms"-tag.

Dokumenterat i:
- Flik 5 Förklaring (ny sektion "MOMS")
- DESIGN.md § 11.5.11

---

## 6. Frågor till Dennis (från audit)

Inga blocker-frågor. Två noteringar:

1. **16.059 "WC-behör"** — jag bedömde denna artikel som dörrtrycke med WC-mekanism (låsvred för toalettdörrar), vilket faller inom principen "beslag som är del av ytprodukt". Vill Dennis verifiera med wbr-dokumentation? Icke-blockerande.

2. **17.020 Skåpsinredning** — inaktiv i appen (ersatt av Marbodal) men ligger kvar i Flik 4 som arkiv. Vill Dennis radera den ur Flik 4 också, eller behålla som historik för framtida jämförelser? Min rek: **behåll** — spårbarheten är värdefull även om byggdelen inte används.

---

## 7. Filer som rörts

### Nya
```
scripts/archive/apply-ue-restructure-2026-04-22.js    (engångsscript)
.project-context/sessions/2026-04-22-badrum-ue-restructure.md (denna fil)
```

### Ändrade
```
.project-context/data/master.xlsx                      (Flik 1: -2 rader + ny kolumn T; Flik 3: -2 rader; Flik 5: +61 rader)
.project-context/data/app-config.json                  (48 items, 2 med tagLabel)
src/app-config.json                                    (kopia för dev-server)
scripts/build-config.js                                (+3 rader tagLabel-mappning)
src/app.js                                             (+8 rader i renderItem för UE-badges)
src/style.css                                          (+14 rader .tag-ue/.tag-ue-vs/.tag-ue-el)
src/index.html                                         (?v=30 → ?v=31)
.project-context/DESIGN.md                             (v1.7 → v1.8; § 5.2 badrum; § 5.2b kodexempel; § 11.5.9–11 renoveringsprincip/tagLabel/moms; Appendix A badrum-rader; v1.8 changelog)
.project-context/DECISIONS.md                          (+2 entries 2026-04-22)
.project-context/data/snapshots/2026-04-22/*.csv       (uppdaterade snapshots)
dist/renoveringskalkyl.html                            (216 KB med nya priser + tagLabel)
```

Total: 2 nya filer, 11 ändrade filer.

---

## 8. Rekommendationer till Dennis nästa steg

1. **Browser-test** på http://localhost:5520/ i incognito:
   - Lägg till badrum. Verifiera:
     - 8 items (inte 10)
     - "Badrumsinredning inkl VVS-installation (UE)" med **blå UE-VS-badge**
     - "El-installation badrum (UE)" med **grön UE-El-badge**
     - Klicka chevron på UE-posterna → ingår-lista syns (WC-stol, blandare, golvvärme, etc.)
     - Total för 5 m² full default + klinker + kakel ≈ 148 339 kr
2. **Ge exakt pris för El-UE** när du har kontaktat din underleverantör (ersätt 20 000-placeholdern).
3. **Bekräfta eller korrigera** mina audit-noteringar (punkt 6 ovan).
4. **Eventuellt komplettera master.xlsx** via Excel med dina justeringar, kör `npm run build-config` → refresh.

---

## 9. Sammanfattning av avslutade beslut i dag

Totalt för 2026-04-22 (dag 2 av master.xlsx-migrationen):
- 6 nya entries i DECISIONS.md (4 från förra sessionen + 2 nya här)
- DESIGN.md v1.6 → v1.8 (två versionshopp på samma dag)
- 8 nya filer, 17 ändrade filer
- Totalt ~2500 rader ny dokumentation + ~400 rader ny/ändrad kod
- Master.xlsx: 50 → 48 items efter audit-drivna borttagningar
- Badrum strukturerat tydligt: **renovering (Wikells) vs inredning (Byggbiten UE)**.
