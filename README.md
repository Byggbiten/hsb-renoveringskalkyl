# Renoveringskalkyl — Byggbiten

En webbaserad överslagskalkylator för bostadsrättsrenovering, levererad av **Byggbiten i Norrland AB**. Designad som demo för HSB-förvaltare som snabbt vill få en grov prisbild innan de begär skarp offert.

> **Detta är en DEMO.** Priserna är kalibrerade schablonvärden. Slutligt pris sätts alltid i offert efter platsbesök.

## 🔗 Live-demo

**https://byggbiten.github.io/hsb-renoveringskalkyl/**

Logga in med `demo` / `demo`.

### Installera som app på iPad

Öppna länken i Safari på iPad → tryck **Dela** → **Lägg till på hemskärmen**. Appen öppnas sedan i fullskärm som egen ikon och fungerar offline efter första besöket.

---

## Vad appen gör

- **8 rumstyper** — vardagsrum, sovrum, korridor, entré, kök, badrum, toalett, övrigt
- **~48 byggposter** med Wikells-kalibrerade priser (ekparkett, klickvinyl, kakel, klinker, mm)
- **Följeposter** som förvalda tillägg (rivning, fallspackling, skyddstäckning)
- **Expanderbara poster** — klicka chevron för att se vad som ingår / inte ingår, inkl Wikells-referens
- **UE-schabloner för badrum** — VVS och El som bundlade poster
- **Print-utskrift** som "Kalkylbudget"-dokument (A4, 2 sidor, ex/inkl moms)
- **Begär offert** — modal som öppnar förifyllt mejl (Gmail/Outlook/native)
- **Sparade kalkyler** — localStorage, lista i hemvyn, kan laddas om

## Stack

- Vanilla HTML/CSS/JavaScript, inget ramverk
- PWA (Progressive Web App) — installerbar på iPad/iPhone/desktop
- Master-Excel (`.project-context/data/master.xlsx`) som sanning för alla priser
- Build-pipeline i Node: `build-config.js` läser xlsx → `app-config.json` som appen fetch:ar

## För utvecklare

```bash
# Installera deps
npm install

# Bygg priser från master.xlsx + single-file dist
npm run build

# Bygg + kopiera till rot för GitHub Pages
npm run build && npm run publish-demo

# Dev-server (från src/)
python src/dev_server.py
# Öppna http://localhost:5520/
```

### Filstruktur

```
src/             Källkod (index.html, style.css, data.js, app.js, assets/)
scripts/         Build + utility-scripts
  build-config.js     master.xlsx → app-config.json
  build-dist.js       Bundlar single-file dist
  publish-demo.js     Kopierar dist → rot för GitHub Pages
  archive/            Engångs-migrationsscripts
dist/            Byggd single-file HTML (~220 KB, fungerar offline)
.project-context/    Dokumentation
  DESIGN.md           Arkitektur + datamodell
  DECISIONS.md        Beslutshistorik
  OPEN_QUESTIONS.md   Öppna frågor
  data/               master.xlsx + app-config.json + wbr-källor + snapshots
  sessions/           Sessionsrapporter per arbetspass
index.html       Kopia av dist (för GitHub Pages)
manifest.json    PWA-manifest
icon-*.png       PWA-ikoner
```

## Dokumentation

- **[DESIGN.md](.project-context/DESIGN.md)** — full arkitekturbeskrivning (v1.8)
- **[DECISIONS.md](.project-context/DECISIONS.md)** — alla fattade beslut kronologiskt
- **[OPEN_QUESTIONS.md](.project-context/OPEN_QUESTIONS.md)** — öppna frågor

## Uppdatera priser

1. Öppna `.project-context/data/master.xlsx` i Microsoft Excel
2. Ändra pris/post/rumstyp
3. Ctrl+S
4. I terminal: `npm run build && npm run publish-demo`
5. `git add . && git commit -m "update prices" && git push`
6. GitHub Pages bygger automatiskt → live-demo uppdateras inom 1–2 minuter

## Kontakt

**Dennis Sendelbach**
Byggbiten i Norrland AB
dennis@byggbiten.nu

## Licens

MIT — se [LICENSE](LICENSE).

Prisdata härledd ur Wikells Sektionsdata (licens för internt bruk).
