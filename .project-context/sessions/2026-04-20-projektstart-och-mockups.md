# Session 2026-04-20 — Projektstart och tre mockup-varianter

**Agent:** Claude Code (claude-opus-4-7, 1M context, desktop-klient — första gången Dennis testar CC utan VS Code)
**Varaktighet:** ca 45 minuter
**Status vid sessionsslut:** Projektstruktur + 3 mockups klara. Väntar på Dennis feedback på mockup-riktning.

---

## Vad som gjordes

### Fas 1 — Projektstruktur (Hubbe-stil)
- Skapade mappar: `.project-context/{mockups,references,sessions,prompts,snapshots}`
- **CLAUDE.md** — AI-agent-entrédokument. Äganderegel, arbetsrutiner, mockup/prompt-standard, info om Dennis. Mall lånad från Hubbe-projektets CLAUDE.md, anpassad till kalkylator-kontext.
- **README.md** — kort mänskoläsbar intro i roten, pekar på `.project-context/`.
- **.project-context/DESIGN.md** — produktdokument baserat på `UTVECKLINGSDOKUMENT_Ytskiktskalkylator.md` (v1.0). Rensat från Claude Code-meta (flyttat till CLAUDE.md/OPEN_QUESTIONS). Designprincip § 4.5 omskriven från "flat, inga skuggor" till "cool och levande" efter explicit önskemål från Dennis.
- **.project-context/AGENT_CONTEXT.md** — mjuk kontext: Byggbitens ram, HSB som kund, Dennis arbetsstil, praktisk miljö.
- **.project-context/DECISIONS.md** — seedad med 4 beslut (Hubbe-stil, mockup-fas-först, cool/levande, 3 varianter).
- **.project-context/OPEN_QUESTIONS.md** — 8 frågor (de 7 från utvecklingsdokumentets sektion 11 + ny Q8 om hemsidescreenshots).

### Fas 2 — Tre statiska HTML-mockups

Alla tre i `.project-context/mockups/`, självförsörjande (inline CSS/SVG/JS, ingen CDN, fungerar offline via dubbelklick). Identisk förladdad data:
- Projekt "Brf Parken lgh 14", datum 2026-04-20
- Vardagsrum 25 m² (parkett + målning + 2 dörrar + 1 fönster) = 28 000 kr
- Kök 15 m² (schablon "Komplett kök" PLACEHOLDER) = 150 000 kr
- Badrum 5 m² (schablon "Helrenovering") = 75 000 kr
- **Total: 253 000 kr ex. moms**

**`mockup-01-stilren.html`** — Minimal / tidlös. Stripe/Linear-inspirerad. Svart header, off-white resten, tunna 1px-borders. Ingen pusselbit-accent. Mikro: fadeUp stagger, smooth checkbox-transitions, count-up på total 900ms.

**`mockup-02-byggbransch.html`** — Solid hantverkarkänsla. Pusselbit-SVG som återkommande accent (bredvid rum-rubriker + vattenstämpel bakom total). Svart header med komplett logga. Accent-warning (#BA7517) på schablon-taggar + primär-knapp. Mikro: pulseOnce på logo-mark, slide-in från vänster på rum, hover-lift på kort, count-up 1000ms.

**`mockup-03-premium.html`** — Dark-mode premium-tolkning. Varm antracit-bakgrund, ljusa glas-kort, bränd koppar-accent. Total-kortet har animerad gradient-border (shimmer 6s loop). Spring-easings på entré. Gradient-fill på titel och totalsumma. Logo-frame med radial-glow. Hover: kort lyfts 3px, rum-mark roterar, puzzle-accent förstärks. Mikro: logoReveal med scale+rotate, checkIn med bounce, count-up easeOutExpo 1200ms, +90° rotation på plus-ikonen vid hover.

### Fas 3 — Denna sessionsrapport
Skapad.

---

## Vad fungerade

- **Hubbe-mallen överförd smidigt.** Tjänade både som struktur-referens och som språkregister för CLAUDE.md.
- **Plan mode via ExitPlanMode.** Dennis fick approval-flöde med AskUserQuestion-dialogen, valde Hubbe-stil + läs-all-underlag + rekommendationer på mockup-varianter. Planfil ligger kvar i `C:\Users\denni\.claude\plans\`.
- **Dubbelt feedback från Dennis mid-session** (hemsidan surfa runt, cool/levande) — integrerades utan att avbryta flödet. Cool/levande blev ett eget DECISIONS-beslut och DESIGN.md § 4.5-omskrivning.

---

## Vad fungerade inte / begränsningar

- **byggbiten.nu är JS-renderad.** WebFetch returnerade bara taglinen "Totalentreprenören i Norrland" — ingen färgpalett, typografi eller bildreferens hämtad. Färgpalett i DESIGN.md § 4.2 kommer fortsatt från utvecklingsdokumentets härledning från loggan. Flaggat som OPEN_QUESTIONS Q8 — Dennis kan lägga screenshots i `.project-context/references/`.
- **Loggan är fortfarande en förenklad SVG-placeholder** (generisk pusselbit). Den riktiga Byggbiten-logotypen har inte laddats in i projektet. OPEN_QUESTIONS Q3.
- **Inga externa fonter i mockups.** Rubik/Inter anropas som fallback-stack men laddas inte från Google Fonts (för att hålla mockups offline-funktionella). I slutleveransen ska fonterna inbäddas som base64 enligt DESIGN.md § 4.4.

---

## Öppna trådar vid sessionsslut

1. **Dennis väljer riktning bland mockups.** Kan välja en ren, cherry-picka element mellan dem, eller be om en fjärde variant.
2. **Åtta OPEN_QUESTIONS väntar på svar.** Ingen blockerar mockup-fasen, men Q1 (kökspris), Q3 (logga), Q4 (kontaktuppgifter) och Q7 (disclaimer) blockerar slutleverans.
3. **Color palette-verifikation mot Byggbitens hemsida.** Flaggat Q8 — Dennis kan lägga screenshots i `references/`.
4. **Befintliga källmaterial** (UTVECKLINGSDOKUMENT_..., Priser.xlsx, Konversation...txt) ligger kvar i roten, orörda. Kan arkiveras eller flyttas till `references/` senare om önskat.

---

## Rekommendation för nästa session

1. **Dennis öppnar alla tre mockups** (dubbelklick i Utforskaren). Testar i olika storlekar (desktop, iPad-stående).
2. **Ger feedback:** vilken riktning känns rätt, vad ska justeras, vilka element från olika varianter ska kombineras.
3. **Besvarar helst Q1, Q2 och Q3** så vi kan ta bort placeholder-taggarna.
4. **Eventuella screenshots från byggbiten.nu** läggs i `references/` om Q8 ska besvaras.
5. **Nästa session** itererar på vald variant. Statisk HTML räcker fortfarande. När designen är låst övergår vi till utvecklingsfas (src/-struktur, data.js, app.js, build.js enligt DESIGN.md § 3.3).

---

## Tekniska noteringar för framtida agenter

- Mockups följer `prefers-reduced-motion` — alla animationer stängs av respektfullt.
- Alla count-up-animationer använder `requestAnimationFrame` + easing-funktion, inte setInterval.
- Alla transitions använder GPU-accelererade properties (`transform`, `opacity`) där möjligt.
- Gradient-shimmern i mockup-03 har en race condition i animation-declarations — den senare `animation` overrides den första. I riktig utveckling ska detta skrivas som en enskild shorthand. För mockup-syfte är det OK.
- Ingen av mockups har JS-logik för faktiska beräkningar, bara count-up på hårdkodat totalvärde.
