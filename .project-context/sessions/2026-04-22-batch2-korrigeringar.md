# Session 2026-04-22 (del 5) — Batch 2: entre_klinker, Dörr-kategori, Bugg X + Y

**Agent:** Claude Code (claude-opus-4-7, desktop-klient)
**Input:** Dennis "Batch 2 — svar på dina frågor + två nya fynd"
**Status:** 15/15 read-back PASS. Master.xlsx uppdaterad. Badrum-total +3 000 kr (tätskiktstillägg).

---

## Utförda ändringar

### 1. `entre_klinker` E-konsekvens

Tillagda rader i Ingår (efter befintlig "Läggs som del av golvet..."):
- *"Rivning av befintligt golv — förvald följepost, redan medräknad i totalen"*
- *"Flytspackling undergolv — förvald följepost, redan medräknad i totalen"*

IngårEj: tog bort ensamstående "Fallspackling"-rad. Kvar: "Fuktskydd (ej behövligt i torra rum); Klinkersockel (ej behövligt i torra rum)".

Slutlig entre_klinker Ingår:
```
- Läggs som del av golvet — resterande yta använder valt material (ekparkett/klickvinyl/matta)
- Rivning av befintligt golv — förvald följepost, redan medräknad i totalen
- Flytspackling undergolv — förvald följepost, redan medräknad i totalen
- Klinkerplattor 300x300
- Sättbruk
- Fogning
```

### 2. `badrum_dorr` → ny kategori "Dörr"

- master.xlsx Flik 1: Kategori "Tillval" → **"Dörr"**
- `scripts/build-config.js`: whitelist `ALLOWED.Kategori` utökad med "Dörr" (annars failar validering)

Kategori-fördelning efter Batch 2:
```
Dörr: 1          (badrum_dorr — ny kategori, fristående från Tillval)
Förberedelse: 7
Golv: 6
Inredning: 0     (badrum_dorr flyttad → 0 poster)
Köksinredning: 2
Lister: 2
Målning: 2
Rivning: 6
Tillval: 15      (var 16 innan)
UE: 2
Vägg: 4
```

`Inredning`-kategorin är nu tom — kan städas senare eller behållas för framtida items.

### Bugg X — `badrum_rivning` + `badrum_fallspackling` renderas nu

**Root cause (bekräftat):** master.xlsx Flik 3 hade "Rendera i kategori" = **"Tillval"** för båda rumsföljeposter. Badrum-rumstypen hade inga items med category "Tillval" efter borttagningen av WC-dusch/inredning i v1.8. → roomFollowup-rendering triggas när items "byter kategori", så raderna hoppades över.

**Fix (Alt 1):** Ändrade master.xlsx Flik 3 → "Rendera i kategori" = **"Golv"** för båda. De renderas nu efter sista golv-posten i badrum-kortet. Synliga för användaren med pris (1 200×yta för rivning, 2 283×yta för fallspackling).

Alt 2 (fallback-sektion i renderRoomBody) **inte** implementerat. Rekommenderat av Dennis för framtiden om fler roomFollowups saknar matchande kategori.

### Bugg Y — `badrum_golv_klinker` ombyggd till Byggbiten-komposit 8.515

**Wikells-sökning i wbr (`HSB-3a-ROT-helrenovering-v6.wbr`):**

1. **15.015-bekräftelse:** 3 artiklar — Klinkerplattor 300×300 (Q1.4121500), **Fuktskydd typ tätduk** (Q1.4135000, UE 408), Klinkersockel H=100 (Q1.4421300). "Fuktskydd typ tätduk" är enkel fuktspärr, **inte** folieförstärkt GVK-certifierat tätskikt. Dennis påstående bekräftat.

2. **Sökning efter folieförstärkt tätskikt på GOLV:**
   - Regex `/folie|tätskikt/i` i alla 449 artiklar → **0 träffar**
   - Regex `/fuktskydd|tätduk|duk|VTvF|VTg/i` → bara 2 träffar (Q1.4135000 och Q1.4335000), båda samma "Fuktskydd typ tätduk"
   - Q1.41-serien: bara Klinkerplattor + Fuktskydd
   - Q3-serien: ingen artikel
   
   **→ wbr:en saknar folieförstärkt tätskikt som egen artikel** (både för golv och vägg — väggens 8.502 var Dennis-egen byggdel som inkluderade det som egen artikel).

3. **Fallback (enligt Dennis instruktion):** Byggbiten-pålägg 600 kr/m² (mitten av Dennis 400–800-span).

**Ny byggdel 8.515 — Byggbitens komposit:**

| Fält | Värde |
|---|---|
| Post-ID | `badrum_golv_klinker` |
| Pris | **3 155 kr/m²** (2 555 + 600) |
| Pris-källa | Byggbiten |
| Wikells-ID | 8.515 |
| Wikells originalnamn | Klinker på våtrumsgolv med folieförstärkt tätskikt |
| Mtrl/Tim/UE/Spill | (tomma — komposit) |
| Wikells-artiklar (rå) | Klinkerplattor 300x300 (Wikells Q1.4121500); Folieförstärkt tätskikt enligt BBR/GVK (Byggbiten-tillägg ~600 kr/m²); Klinkersockel H=100 (Wikells Q1.4421300); Fästmassa och fog; Silikonfog mot vägg och golvbrunn |
| Ingår | 6 punkter: Fallspackling (förvald, redan medräknad); **Folieförstärkt tätskikt enligt BBR/GVK**; Våtrumsklassad klinker; Fästmassa + fog; Silikonfog mot vägg och golvbrunn; Städning efter läggning |
| IngårEj | 2 punkter: Demontering av befintligt ytskikt ingår i rumsrivning (badrum_rivning); Montering av golvbrunn (ingår i UE-VS) |
| Wikells-ref | Byggbitens komposit 8.515 (Wikells 15.015 + folieförstärkt tätskikt) |
| Anmärkning | Byggbitens komposit baserat på Wikells 15.015 + folieförstärkt tätskikt (Byggbiten-pålägg 600 kr/m². Wbr-sökning gav 0 träffar på "folie"/"tätskikt" som egna artiklar). Dennis beslut 2026-04-22. |

**Tätskikt-raden "Tätskikt (ingår i UE-VS)" borttagen** från IngårEj enligt Dennis fel 1 — tätskikt är plattsättararbete, inte VVS-UE.

---

## Total-delta per badrum (före/efter)

Scenariot: badrum 5 m², full default (WC-dusch inredning dörr UE-el UE-VS) + klinker + kakel (vägg):

| Version | Total | Ändring |
|---|---|---|
| v1.7 (före UE-restructure) | 148 429 kr | — |
| v1.8 (efter UE-VS/UE-El 40 000+20 000) | 148 339 kr | −90 kr |
| Efter genomlysning-fixar (kakel 2492→2435) | 147 115 kr | −1 224 kr |
| **Efter Batch 2 (klinker 2555→3155)** | **150 115 kr** | **+3 000 kr** |

Matematisk kontroll: 2 555 → 3 155 = +600 kr/m² × 5 m² = **+3 000 kr**. Exakt match.

---

## Konsekvenskontroll — alla 5 badrumsposter har nu tätskikt

| Post | Tätskikt-status |
|---|---|
| `badrum_golv_klinker` | ✅ Folieförstärkt tätskikt inbyggt (ny komposit 8.515) |
| `badrum_golv_plastmatta` | ✅ Plastmattan ÄR tätskiktet |
| `badrum_vagg_kakel` | ✅ Folieförstärkt tätskikt inbyggt (8.502) |
| `badrum_vagg_plastmatta` | ✅ Plastmattan ÄR tätskiktet |
| `badrum_vagg_farg` | ✅ Tätskikt inbyggt (8.504) |

---

## Verifiering — 15/15 PASS

```
✅ entre_klinker Ingår har rivning-förvald
✅ entre_klinker Ingår har spackling-förvald
✅ entre_klinker IngårEj har INTE en ensam "Fallspackling"-rad
✅ badrum_dorr kategori = "Dörr"
✅ badrum × badrum_rivning renderInCategory = "Golv"
✅ badrum × badrum_fallspackling renderInCategory = "Golv"
✅ badrum_rivning-raden hittad (Flik 3)
✅ badrum_fallspackling-raden hittad (Flik 3)
✅ badrum_golv_klinker pris = 3155
✅ källa = Byggbiten
✅ Wikells-ID = 8.515
✅ Ingår har folieförstärkt tätskikt
✅ IngårEj saknar "Tätskikt (ingår i UE-VS)"
✅ IngårEj har golvbrunn-raden
✅ IngårEj har demontering-standardrad
```

---

## Filer rörda

### Ny
```
scripts/archive/apply-batch2-2026-04-22.js
.project-context/sessions/2026-04-22-batch2-korrigeringar.md (denna fil)
```

### Ändrade
```
.project-context/data/master.xlsx                 (Flik 1 + Flik 3 uppdateringar)
.project-context/data/app-config.json             (regenererad)
src/app-config.json                               (kopia för dev-server)
src/index.html                                    (?v=32 → ?v=33)
scripts/build-config.js                           (ALLOWED.Kategori: +'Dörr')
dist/renoveringskalkyl.html                       (220 KB)
.project-context/data/snapshots/2026-04-22/*.csv  (uppdaterade)
C:/Users/denni/Downloads/master-2026-04-22.xlsx   (191 756 byte, uppdaterad)
```

Ingen kod-ändring i `src/data.js`, `src/app.js` eller `src/style.css` — alla ändringar var data-drivna via master.xlsx + en regel-uppdatering i build-config.

---

## Följdfrågor / Rekommendationer

### A. Tätskiktstillägg 600 kr/m² — sanity-check?
Dennis span var 400–800 kr/m². Jag valde mitten (600). Om Dennis har exakt pris från installatör → ändra direkt i master.xlsx Pris-cellen för badrum_golv_klinker. Räkningen i `Anmärkning` förblir informativ.

### B. Alt 2 (fallback-sektion) i renderRoomBody — framtida
Framtida roomFollowups utan matchande kategori kommer fortfarande renderas bara om de matchar en kategori som finns i items. Om Dennis lägger till en ny roomFollowup för något annat rum i framtiden — se till att `renderInCategory` matchar en aktiv kategori, eller implementera Alt 2 (fallback-sektion "Inkluderat i totalen") i `renderRoomBody`. Inte akut.

### C. `Inredning`-kategorin är nu tom
0 poster. Kan:
1. **Lämnas kvar** som tillåten dropdown-värde för framtida items
2. **Raderas** från `ALLOWED.Kategori` i build-config.js
Min rek: lämna — kostar inget, ger flexibilitet.

### D. `entre_klinker` E-fix — detaljer
Jag la till rivning+spackling-rader i Ingår **efter** "Läggs som del av golvet"-raden. Alternativ: sätta dem först. Valde ordning så att "var posten är"-informationen kommer före "vad som ingår"-information. Ändra om Dennis föredrar annat.

### E. Rendering-ordning i badrum
Med "Rendera i kategori = Golv" kommer rivning + fallspackling nu att synas **under golv-items** i badrum. Ordning i UI:
1. Golv (klinker/plastmatta) — items
2. `badrum_rivning` — rumsföljepost (typ B)
3. `badrum_fallspackling` — rumsföljepost (typ B)
4. Vägg (kakel/plastmatta/färg) — items
5. Dörr (våtrumsdörr)
6. UE-VS + UE-El
7. Skyddstäckning (rumsföljepost, i Målning-kategori → efter målning-items vilket badrum saknar → troligen sist i rummet, dimmad eftersom ingen trigger)

Dennis kan verifiera i browser.

---

## Till Dennis

1. **Öppna** `C:\Users\denni\Downloads\master-2026-04-22.xlsx` (191 KB, uppdaterad) och granska:
   - Flik 1 rad `badrum_golv_klinker`: pris 3155, Byggbiten, 8.515, tätskikt i Ingår, INTE i IngårEj
   - Flik 1 rad `badrum_dorr`: Kategori = "Dörr"
   - Flik 1 rad `entre_klinker`: nya "förvald"-rader i Ingår
   - Flik 3: badrum × badrum_rivning och badrum_fallspackling har "Golv" som Rendera i kategori

2. **Testa i browser** (http://localhost:5520/ incognito, hård reload Ctrl+Shift+R):
   - Lägg till Badrum → scrolla igenom items
   - **Rivning 1 200 kr/m²** och **Fallspackling 2 283 kr/m²** ska synas under golv-items (checkade, svart färg)
   - Klicka chevron på Klinker på våtrumsgolv → se 6 Ingår-punkter inkl "Folieförstärkt tätskikt enligt BBR/GVK"
   - Total för 5 m² badrum default + klinker + kakel ≈ **150 115 kr**
   - Lägg till Entré → Klinker → expandera chevron → se 6 Ingår-punkter inkl "Rivning...förvald" + "Flytspackling...förvald"

3. **Svara på A–E** när du granskat.
