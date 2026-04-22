# Session 2026-04-22 (del 4) — Batch 1 UX-korrigeringar + Hall → Korridor

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input:** Dennis "Svar + kör batch 1" efter UX-genomlysning
**Status:** 24/24 master.xlsx read-back PASS. getDisplayPrice `perimeterCalc`-gren tillagd. Downloads-kopian uppdaterad.

---

## Utförda ändringar

### 0. Hall → Korridor

- Flik 2: Visningsnamn "Hall" → **"Korridor"**. Rumstyp-ID bevarat som `hall` (bakåtkompat för sparade kalkyler — rum.typ='hall' matchar fortfarande `ROOM_TYPES.hall`).
- Flik 5: ny sektion "RUMSTYPER: Korridor vs Entré" med förklaring av skillnaden.
- Ingen legacy-migrering krävs (rummet laddar som "Korridor" automatiskt).

### B. Labels städade

| Post | Före | Efter |
|---|---|---|
| `kok_standard` | "Komplett kök standard inkl vitvaror" | **"Kök standard"** |
| `kok_plus` | "Komplett kök Plus inkl vitvaror" | **"Kök plus"** |
| `ytterdorr` | "Ytterdörr (Daloc säkerhets/lägenhetsdörr inkl montage)" | **"Ytterdörr (Daloc)"** |
| `entre_klinker` | "Klinker (del av golv)" | **"Klinker"** |
| `badrum_ue_vs` | "Badrumsinredning inkl VVS-installation (UE)" | **"Badrumsinredning inkl VVS-installation"** |
| `badrum_ue_el` | "El-installation badrum (UE)" | **"El-installation badrum"** |

För `entre_klinker`: "del av golv"-informationen flyttad till Ingår första rad:
> *"Läggs som del av golvet — resterande yta använder valt material (ekparkett/klickvinyl/matta)"*

UE-posterna: "(UE)" borta från labeln eftersom badgen redan säger UE-VS / UE-El.

### C. `badrum_dorr` kategori

"Inredning" → **"Tillval"**.

### D. `badrum_vagg_farg` ref

"Cowork-genererad 8.504 (samma mönster som 8.502/8.503)" → **"Byggbiten-kalibrerad byggdel 8.504"**. Neutral terminologi utan intern utvecklingsreferens.

### E. Golv-poster rivning/spackling (Dennis-variant)

Applicerat på `golv_ekparkett`, `golv_klickvinyl`, `golv_matta`, `golv_klinker`:

**Rivning** (defaultChecked:true för alla) → flyttad till **Ingår** första rad:
> *"Rivning av befintligt golv — förvald följepost, redan medräknad i totalen"*

**Spackling:**
- Parkett/klickvinyl/matta (defaultChecked:false) → omformulerad i **IngårEj**:
  > *"Flytspackling vid ojämnt underlag — tillval, kryssa i följeposten om underlaget kräver det"*
- `golv_klinker` (defaultChecked:true) → **Ingår** som andra rad:
  > *"Flytspackling undergolv — förvald följepost, redan medräknad i totalen"*

Gamla "(egen följepost)"-formulering raderad från IngårEj.

**Notera:** `entre_klinker` berördes inte av E-fixen (Dennis specificerade bara de 4 huvud-golvposterna). Dess `entre_klinker__spackling` är defaultChecked:true, men Ingår/IngårEj innehåller inte "(egen följepost)"-formulering eftersom den aldrig fick det från initial-extraktorn. Flaggas som potentiell framtida konsekvensfråga.

### F. Klickvinyl / Heltäckningsmatta — Wikells-sökning + Alt 3

**Sökresultat i `HSB-3a-ROT-helrenovering-v6.wbr`:**
- `klickvinyl` / `LVT` / `SPC` / `WPC` / `vinylklick` / `plastmatta.*klick` → **0 träffar**
- `heltäckningsmatta` / `textilgolv` / `mattgolv` / `nålfilt` → **0 träffar**
- `linoleum` → finns som 15.020 (Linoleum på golv) + 15.007 (rivs)

**15.xxx-byggdelar i HSB-3a-wbr:** 15.016 Ekparkett, 15.018 Laminat, 15.020 Linoleum, 15.015 Klinker, 15.022 Plastmattor på golv, 15.023 Plastmattor våtrums, 15.027 Kakel vägg, 15.031 Plastmattor vägg + 6 rivnings-poster. Ingen separat klickvinyl/textilmatta.

**Slutsats:** HSB-3a-wbr:en saknar klickvinyl och heltäckningsmatta som egna byggdelar. Klickvinyl (LVT/SPC) är en modern golvkategori som Wikells HSB-3a-mallen inte fångat.

**Applicerat Alt 3** (Dennis fallback):
- `golv_klickvinyl`: Pris 755 behålls, Pris-källa Wikells → **Byggbiten**, Wikells-ID rensad, Wikells-ref → **"Byggbiten-kalibrerad (benchmark Wikells 15.018 laminat)"**
- `golv_matta`: Pris 730 behålls, Pris-källa Wikells → **Byggbiten**, Wikells-ID rensad, Wikells-ref → **"Byggbiten-kalibrerad (benchmark Wikells 15.020 linoleum)"**
- Båda får Anmärkning: *"Klickvinyl/heltäckningsmatta saknas som egen byggdel i Wikells HSB-3a. Pris kalibrerat mot laminat/linoleum."*
- Mtrl/Tim/UE/Spillfaktor rensade. Ev. formel i Pris-cellen borttagen (bara värde kvar).

Pris-källa-fördelning efter F: Wikells **13** (−2), Byggbiten **22** (+2), HSB-förhandlat 2, Placeholder 11. Total 48.

### G. getDisplayPrice — `perimeterCalc`-gren

`src/app.js` rad 147–161 hade ingen gren för `perimeterCalc`. Ocheckade sockel/taklist visade **0 kr**. Tillagt:

```js
if (item.perimeterCalc) return item.price * window.APP_DATA.calcPerimeter(rum.yta);
```

**Verifiering:** Vardagsrum 25 m² (omkrets = 20 m):
- Sockel ocheckad visar nu **2 487 kr** (grå via `.muted`), inte 0 kr
- Taklist ocheckad visar **2 640 kr** (grå), inte 0 kr
- När användaren checkar → grå → svart. Ingen summeringsförändring (totalen räknar bara kryssade).

### Flik 5 Förklaring — ny Korridor vs Entré-sektion

18 rader tillagda. Förklarar:
- **Korridor** = mellankorridor mellan rum, kan ha klinker på hela golvet (golv_klinker)
- **Entré** = ingångshall med ytterdörr + hatthylla, klinker läggs som del av golv (entre_klinker, hasArea, reducesFloor)
- Rumstyp-ID fortfarande `hall` i koden för bakåtkompat

---

## Verifiering — 24/24 PASS

Komplett read-back via script:

```
✅ Hall Visningsnamn → Korridor
✅ kok_standard/plus labels städade
✅ ytterdorr, entre_klinker, badrum_ue_vs/el labels städade
✅ badrum_dorr kategori = Tillval
✅ badrum_vagg_farg ref "Byggbiten-kalibrerad byggdel 8.504"
✅ golv_ekparkett/klickvinyl/matta: Ingår har rivning-förvald, IngårEj har spackling-tillval
✅ golv_klinker: Ingår har både rivning + spackling som förvalda
✅ IngårEj saknar gamla "(egen följepost)"-rader
✅ golv_klickvinyl/matta: källa=Byggbiten, ref innehåller "benchmark Wikells"
```

### Build-pipeline status

```
48 poster (Wikells: 13, Byggbiten: 22, HSB-förhandlat: 2, Placeholder: 11)
8 rumstyper, 132 rum×post-mappningar
Följeposter: typ A 40, typ B 9
dist/renoveringskalkyl.html 219 KB
```

### Cache-bust

`?v=31` → `?v=32` i `index.html`.

---

## Filer rörda

### Ny
```
scripts/archive/apply-batch1-korrigeringar-2026-04-22.js
.project-context/sessions/2026-04-22-batch1-korrigeringar.md (denna fil)
```

### Ändrade
```
.project-context/data/master.xlsx             (Flik 1 + Flik 2 + Flik 5)
.project-context/data/app-config.json         (regenererad)
src/app-config.json                           (kopia för dev-server)
src/app.js                                    (+1 rad perimeterCalc-gren i getDisplayPrice)
src/index.html                                (?v=31 → ?v=32)
dist/renoveringskalkyl.html                   (219 KB)
.project-context/data/snapshots/2026-04-22/*.csv  (uppdaterade)
C:/Users/denni/Downloads/master-2026-04-22.xlsx   (191 KB, uppdaterad)
```

---

## Potentiella följdfrågor

1. **`entre_klinker` E-konsekvens** — posten har defaultChecked:true för både rivning och spackling, precis som `golv_klinker`. Men Dennis specificerade bara 4 huvud-golvposter i E. Entre_klinker har inte "(egen följepost)"-texter i IngårEj att rensa, men det skulle vara konsekvent att också lägga till "förvald följepost, redan medräknad"-raderna i dess Ingår. Vill Dennis det?

2. **Kök-standard/plus har fortfarande "Schablon" + "Preliminärt pris"-badges** i UI när items är unchecked. Detta är korrekt (de ÄR schabloner och placeholders), men Dennis nämnde i UX-rapport att labels skulle städas. Nu är labels "Kök standard" + "Kök plus" — badges står bredvid, inte inuti label. OK eller städa mer?

3. **`badrum_dorr` skulle kunna få egen kategori "Dörr"** i stället för "Tillval" om Dennis vill separera dörr-items tydligare i UI. Just nu ligger Innerdörr (`innerdorr`/`innerdorr_malning`) i "Tillval" — så `badrum_dorr` i Tillval är konsekvent. Ingen åtgärd, men flaggat.

4. **Formelvärdena för klickvinyl/matta** — efter Alt 3 är de **hårdkodade värden utan formel** (755 resp 730). Om Dennis i framtiden vill justera priset ändrar han bara Pris-cellen direkt. Inga Wikells-underliggande tal.

---

## Till Dennis — nästa steg

1. **Öppna `C:\Users\denni\Downloads\master-2026-04-22.xlsx`** i Excel. Granska:
   - Flik 2: Rumstyp-ID `hall` har Visningsnamn "Korridor"
   - Flik 1: 6 label-ändringar (kok_standard/plus, ytterdorr, entre_klinker, badrum_ue_*)
   - Flik 1: `golv_ekparkett/klickvinyl/matta/klinker` har nya Ingår/IngårEj-rader
   - Flik 1: `golv_klickvinyl/matta` är nu Byggbiten-källa med "benchmark Wikells X"-ref
   - Flik 5: ny Korridor vs Entré-sektion

2. **Testa i browser** (http://localhost:5520/ i incognito):
   - Rumsväljaren visar "Korridor" (inte Hall)
   - Ny kalkyl + lägg till vardagsrum → sockel/taklist visar grå ~2 487 / 2 640 kr ocheckade (inte 0 kr)
   - Kryssa sockel → blir svart aktivt värde
   - Lägg till badrum → UE-VS badge + UE-El badge utan "(UE)" i labeln
   - Lägg till kök → "Kök standard" + "Kök plus" utan fullt "inkl vitvaror"-tillägg
   - Expandera chevron på badrum_dorr → Ingår-text visas (var tidigare ok, nu kategori Tillval)

3. **Svara på följdfrågorna ovan** (1–4) när du tittat på UI:et.

Säg till om något saknas eller om en fjärde batch behövs.
