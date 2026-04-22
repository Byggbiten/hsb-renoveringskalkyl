/**
 * initial-xlsx-from-datajs.js — Engångsscript. Extraherar nuvarande ROOM_TYPES
 * från src/data.js + wbr-parsat JSON → master.xlsx med 5 flikar.
 *
 * Körs EN gång för att ge Dennis en ~95 %-komplett Excel-fil att granska.
 * Efter granskning används master.xlsx av scripts/build-config.js för att
 * generera app-config.json. Scriptet arkiveras sedan — ingen produktionsroll.
 *
 * Anv: node scripts/archive/initial-xlsx-from-datajs.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// --- Konstanter ---
const TIM_FAKTOR = 250 * 3.72;   // = 930 kr/h (arbetstim × omkostnadspåslag)
const UE_FAKTOR = 1.10;

const OUT_XLSX = '.project-context/data/master.xlsx';
const DATA_JS = 'src/data.js';
const WBR_PARSED = '.project-context/data/wbr-source/HSB-3a-v6-parsed.json';

// --- Läs input ---
function loadDataJs() {
  global.window = {};
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(DATA_JS, 'utf8'));
  return global.window.APP_DATA;
}

function loadWbr() {
  const data = JSON.parse(fs.readFileSync(WBR_PARSED, 'utf8'));
  // Deduplicera på databasId, behåll första förekomsten
  const byId = new Map();
  for (const b of data.byggdelar) {
    if (b.databasId && !byId.has(b.databasId)) byId.set(b.databasId, b);
  }
  return { all: data.byggdelar, byId };
}

// --- Helpers ---
function extractWikellsId(ref) {
  if (!ref) return '';
  const m = String(ref).match(/(\d{1,2}\.\d{3})/);
  return m ? m[1] : '';
}

function joinSemi(list) { return (list || []).join('; '); }

// --- Flik 1: Priser ---
function buildFlik1(D, wbr) {
  const rows = [];
  const itemDef = new Map();      // item.id → item-objekt
  const followupDef = new Map();  // fu.id → { fu, parentExample }
  const roomFuDef = new Map();    // rfu.id → rfu

  // Samla unika items + följeposter från alla rumstyper
  for (const typ of D.ROOM_TYPE_ORDER) {
    const rt = D.ROOM_TYPES[typ];
    for (const item of rt.items) {
      if (!itemDef.has(item.id)) itemDef.set(item.id, item);
      if (item.followups) {
        for (const fu of item.followups) {
          if (!followupDef.has(fu.id)) followupDef.set(fu.id, { fu, parentId: item.id });
        }
      }
    }
    for (const rfu of (rt.roomFollowups || [])) {
      if (!roomFuDef.has(rfu.id)) roomFuDef.set(rfu.id, rfu);
    }
  }

  // Bygg rader för huvud-items
  for (const [id, item] of itemDef) rows.push(buildItemRow(item, wbr, /*isFollowup*/false));

  // Bygg rader för typ A-följeposter (en rad per unik fu-id, oavsett parent-varianter)
  for (const [id, { fu }] of followupDef) rows.push(buildItemRow(fu, wbr, /*isFollowup*/true));

  // Bygg rader för typ B-följeposter
  for (const [id, rfu] of roomFuDef) rows.push(buildItemRow(rfu, wbr, /*isFollowup*/true));

  // NYA poster: sockel + taklist
  rows.push(buildSockelRow());
  rows.push(buildTaklistRow(wbr));

  return rows;
}

function buildItemRow(item, wbr, isFollowup) {
  const refText = (item.info && item.info.wikellsRef) || '';
  const wikellsId = extractWikellsId(refText);
  const byggdel = wikellsId ? wbr.byId.get(wikellsId) : null;
  const hasWikellsMatch = !!byggdel;

  // Bestäm pris-källa
  let prisKalla = 'Byggbiten';
  if (item.placeholder) prisKalla = 'Placeholder';
  else if (hasWikellsMatch) prisKalla = 'Wikells';
  else if (refText.toLowerCase().includes('byggbiten')) prisKalla = 'Byggbiten';
  else if (refText.toLowerCase().includes('dennis-egen')) prisKalla = 'Byggbiten'; // Dennis-egna Wikells-byggdelar 8.502/8.503/8.504 behandlas som Byggbiten-kalibrerade

  // Bestäm enhet
  let enhet = item.unit || '';
  if (enhet === 'kr/m² vägg') enhet = 'kr/m² vägg';  // bevara

  // Beräkning-flaggor — kommaseparerade
  const flags = [];
  if (item.hasCount) flags.push('hasCount');
  if (item.hasArea) flags.push('hasArea');
  if (item.wallCalc) flags.push('wallCalc');
  if (item.reducesFloor) flags.push('reducesFloor');
  if (item.placeholder) flags.push('placeholder');
  if (item.inheritsParentArea) flags.push('inheritsParentArea');
  if (item.inheritsReducesFloor) flags.push('inheritsReducesFloor');

  // Info-fält
  const info = item.info || {};
  const ingar = Array.isArray(info.ingar) ? info.ingar : [];
  const ingarEj = Array.isArray(info.ingarEj) ? info.ingarEj : [];

  // Kategori — använd item.category direkt, eller härled
  let kategori = item.category || '';
  if (!kategori) {
    // Följeposter har ingen category — härleda från id
    if (item.id.match(/rivning/i)) kategori = 'Rivning';
    else if (item.id.match(/spackling/i) || item.id.match(/fallspackling/i)) kategori = 'Förberedelse';
    else if (item.id.match(/skyddstack/i)) kategori = 'Förberedelse';
    else kategori = 'Tillval';
  }

  // Wbr-derived fält
  const rawArticles = byggdel ? byggdel.artiklar.map((a) => a.benamning).filter(Boolean) : [];
  const mtrlSum = byggdel ? byggdel.mtrlSum : null;
  const timSum = byggdel ? byggdel.timSum : null;
  const ueSum = byggdel ? byggdel.ueSum : null;
  const wikellsOrig = byggdel ? byggdel.identitet : '';

  // Pris-cell — alltid data.js-värdet som "sanning" i första iterationen.
  // Formel används endast om (a) Wikells-match, (b) exakt 1 artikel, (c) diff mot wbr ≤ 50 kr.
  // Om diff > 50 kr → bara hårdkodat data.js-värde, Mtrl/Tim/UE tomma, flaggat i Anmärkning.
  const artikelCount = byggdel ? byggdel.artiklar.length : 0;
  const anmarkningar = [];
  let safeFormula = false;

  if (hasWikellsMatch) {
    const wbrPrice = byggdel.beraknatPris;
    const dataPrice = item.price;
    const priceDiff = Math.abs(wbrPrice - dataPrice);

    if (artikelCount > 1) {
      anmarkningar.push(`Summa av ${artikelCount} artiklar, se Flik 4`);
    }
    if (priceDiff > 50) {
      anmarkningar.push(`Pris-diff: data.js=${dataPrice} kr, wbr=${wbrPrice} kr — välj vilket som gäller`);
    }
    safeFormula = artikelCount === 1 && priceDiff <= 50;
  }

  return {
    'Post-ID': item.id,
    'Kategori': kategori,
    'Etikett': item.label || '',
    'Wikells originalnamn': wikellsOrig,
    'Enhet': enhet,
    // Pris-kolumnen: objektet skrivs till xlsx som formel eller hårdkodat värde i writeSheetFlik1()
    '_priceInfo': {
      kalla: prisKalla,
      hardcoded: item.price,
      mtrl: mtrlSum,
      tim: timSum,
      ue: ueSum,
      spill: 1,  // vi har redan gångat med spill på wbr-summan; för cellen är spill=1 relativt summan
      wbrPrice: byggdel ? byggdel.beraknatPris : null,
      articleCount: artikelCount,
      useFormula: safeFormula
    },
    'Pris-källa': prisKalla,
    'Wikells-ID': wikellsId,
    'Mtrl (kr)': safeFormula ? mtrlSum : '',
    'Tim (h)': safeFormula ? timSum : '',
    'UE (kr)': safeFormula ? ueSum : '',
    'Spillfaktor': safeFormula ? 1 : '',
    'Beräkning-flaggor': flags.join(', '),
    'Smart-mappning': '',
    'Wikells-artiklar (rå)': joinSemi(rawArticles),
    'Ingår (visas i app)': joinSemi(ingar),
    'Ingår EJ (visas i app)': joinSemi(ingarEj),
    'Wikells-ref (visningstext)': refText,
    'Anmärkning': anmarkningar.join(' | ')
  };
}

function buildSockelRow() {
  return {
    'Post-ID': 'sockel',
    'Kategori': 'Lister',
    'Etikett': 'Sockel',
    'Wikells originalnamn': '',
    'Enhet': 'kr/m',
    '_priceInfo': { kalla: 'Byggbiten', hardcoded: 124, useFormula: false },
    'Pris-källa': 'Byggbiten',
    'Wikells-ID': '',
    'Mtrl (kr)': '',
    'Tim (h)': '',
    'UE (kr)': '',
    'Spillfaktor': '',
    'Beräkning-flaggor': 'perimeterCalc',
    'Smart-mappning': '',
    'Wikells-artiklar (rå)': '',
    'Ingår (visas i app)': 'Sockellist (vit); Montering; Kapning i hörn',
    'Ingår EJ (visas i app)': 'Demontering av befintlig sockel; Specialbearbetning runt rörgenomföringar',
    'Wikells-ref (visningstext)': 'Byggbiten-erfarenhet (Wikells 8.132 saknas i HSB-3a-wbr)',
    'Anmärkning': 'Ny post 2026-04-22. Byggbiten-erfarenhet — verifiera pris mot nästa wbr.'
  };
}

function buildTaklistRow(wbr) {
  const b = wbr.byId.get('8.136');
  if (!b) {
    // Fallback om taklist inte finns i wbr — bör inte hända eftersom vi verifierade
    return {
      'Post-ID': 'taklist',
      'Kategori': 'Lister',
      'Etikett': 'Taklist',
      'Wikells originalnamn': '',
      'Enhet': 'kr/m',
      '_priceInfo': { kalla: 'Byggbiten', hardcoded: 132, useFormula: false },
      'Pris-källa': 'Byggbiten',
      'Wikells-ID': '8.136',
      'Mtrl (kr)': '',
      'Tim (h)': '',
      'UE (kr)': '',
      'Spillfaktor': '',
      'Beräkning-flaggor': 'perimeterCalc',
      'Smart-mappning': '',
      'Wikells-artiklar (rå)': '',
      'Ingår (visas i app)': 'Taklist (vit målad); Montering; Kapning i hörn',
      'Ingår EJ (visas i app)': 'Demontering av befintlig taklist',
      'Wikells-ref (visningstext)': 'Wikells byggdel 8.136',
      'Anmärkning': 'Ny post 2026-04-22. Wbr-data saknas — fallback Byggbiten-värde.'
    };
  }
  const rawArticles = b.artiklar.map((a) => a.benamning).filter(Boolean);
  const useFormula = b.artiklar.length === 1;
  return {
    'Post-ID': 'taklist',
    'Kategori': 'Lister',
    'Etikett': 'Taklist',
    'Wikells originalnamn': b.identitet,
    'Enhet': 'kr/m',
    '_priceInfo': {
      kalla: 'Wikells',
      hardcoded: b.beraknatPris,
      mtrl: b.mtrlSum, tim: b.timSum, ue: b.ueSum, spill: 1,
      wbrPrice: b.beraknatPris,
      articleCount: b.artiklar.length,
      useFormula
    },
    'Pris-källa': 'Wikells',
    'Wikells-ID': '8.136',
    'Mtrl (kr)': useFormula ? b.mtrlSum : '',
    'Tim (h)': useFormula ? b.timSum : '',
    'UE (kr)': useFormula ? b.ueSum : '',
    'Spillfaktor': useFormula ? 1 : '',
    'Beräkning-flaggor': 'perimeterCalc',
    'Smart-mappning': '',
    'Wikells-artiklar (rå)': joinSemi(rawArticles),
    'Ingår (visas i app)': 'Taklist (vit målad); Montering; Kapning i hörn',
    'Ingår EJ (visas i app)': 'Demontering av befintlig taklist',
    'Wikells-ref (visningstext)': 'Wikells byggdel 8.136',
    'Anmärkning': useFormula ? '' : `Summa av ${b.artiklar.length} artiklar, se Flik 4`
  };
}

// --- Flik 2: Rumstyper ---
function buildFlik2(D) {
  const rows = [];
  const iconMap = {
    vardagsrum: 'ICON_VARDAGSRUM',
    sovrum: 'ICON_SOVRUM',
    hall: 'ICON_HALL',
    entre: 'ICON_ENTRE',
    kok: 'ICON_KOK',
    badrum: 'ICON_BADRUM',
    toalett: 'ICON_TOALETT',
    ovrigt: 'ICON_OVRIGT'
  };
  let ord = 10;
  for (const typ of D.ROOM_TYPE_ORDER) {
    const rt = D.ROOM_TYPES[typ];
    rows.push({
      'Rumstyp-ID': typ,
      'Visningsnamn': rt.displayName,
      'Default-yta (m²)': rt.hideArea ? '' : rt.defaultArea,
      'Hide-area': rt.hideArea ? 'ja' : 'nej',
      'Typ': rt.type || 'per_post',
      'Ikon-ID': iconMap[typ] || '',
      'Ordning': ord,
      'Anmärkning': ''
    });
    ord += 10;
  }
  return rows;
}

// --- Flik 3: Rum × poster ---
function buildFlik3(D) {
  const rows = [];

  // Lister-konfiguration — sockel/taklist visas i 5 torra rum
  const dryRooms = ['vardagsrum', 'sovrum', 'hall', 'entre', 'kok'];

  for (const typ of D.ROOM_TYPE_ORDER) {
    const rt = D.ROOM_TYPES[typ];
    let ord = 10;

    // 1. Huvud-items
    for (const item of rt.items) {
      const dfl = rt.defaultOnCreate && rt.defaultOnCreate[item.id];
      rows.push({
        'Rumstyp-ID': typ,
        'Post-ID': item.id,
        'Ordning': ord,
        'Radio-grupp': item.group || '',
        'Std-vald': (dfl && dfl.checked) ? 'ja' : 'nej',
        'Std-antal': (dfl && dfl.count != null) ? dfl.count : '',
        'Std-area': (dfl && dfl.area != null) ? dfl.area : '',
        'Följepost-typ': '',
        'Parent-Post-ID': '',
        'Trigger-Post-IDs': '',
        'Rendera i kategori': '',
        'Inherit reducesFloor': '',
        'Inherit parentArea': ''
      });
      ord += 10;

      // 2. Typ A-följeposter (per parent)
      if (item.followups) {
        for (const fu of item.followups) {
          rows.push({
            'Rumstyp-ID': typ,
            'Post-ID': fu.id,
            'Ordning': ord,
            'Radio-grupp': '',
            'Std-vald': fu.defaultChecked ? 'ja' : 'nej',
            'Std-antal': '',
            'Std-area': '',
            'Följepost-typ': 'A',
            'Parent-Post-ID': item.id,
            'Trigger-Post-IDs': '',
            'Rendera i kategori': '',
            'Inherit reducesFloor': fu.inheritsReducesFloor ? 'ja' : 'nej',
            'Inherit parentArea': fu.inheritsParentArea ? 'ja' : 'nej'
          });
          ord += 1;  // små ordning-steg så följeposter sitter tätt under parent
        }
        ord = Math.ceil(ord / 10) * 10;  // nollställ till nästa tio
      }
    }

    // 3. Typ B-följeposter (rumsscope)
    for (const rfu of (rt.roomFollowups || [])) {
      rows.push({
        'Rumstyp-ID': typ,
        'Post-ID': rfu.id,
        'Ordning': ord,
        'Radio-grupp': '',
        'Std-vald': rfu.defaultChecked ? 'ja' : 'nej',
        'Std-antal': '',
        'Std-area': '',
        'Följepost-typ': 'B',
        'Parent-Post-ID': '',
        'Trigger-Post-IDs': (rfu.triggeredBy || []).join(','),
        'Rendera i kategori': rfu.renderInCategory || '',
        'Inherit reducesFloor': '',
        'Inherit parentArea': ''
      });
      ord += 10;
    }

    // 4. Lister (sockel + taklist) i torra rum
    if (dryRooms.includes(typ)) {
      for (const postId of ['sockel', 'taklist']) {
        rows.push({
          'Rumstyp-ID': typ,
          'Post-ID': postId,
          'Ordning': ord,
          'Radio-grupp': '',
          'Std-vald': 'nej',
          'Std-antal': '',
          'Std-area': '',
          'Följepost-typ': '',
          'Parent-Post-ID': '',
          'Trigger-Post-IDs': '',
          'Rendera i kategori': '',
          'Inherit reducesFloor': '',
          'Inherit parentArea': ''
        });
        ord += 10;
      }
    }
  }

  return rows;
}

// --- Flik 4: Wbr-byggdelar ---
function buildFlik4(wbr) {
  const rows = [];
  const seen = new Set();
  for (const b of wbr.all) {
    if (seen.has(b.databasId)) continue;  // unika
    seen.add(b.databasId);
    const articlesFormatted = b.artiklar.map((a) =>
      `${a.databasArtikelId} ${a.benamning} (mtrl ${a.materialPris}, tim ${a.tid}, UE ${a.ue}, åtgång ${a.atgang}, spill ${a.spill})`
    ).join('\n');
    rows.push({
      'Kapitel.Nummer': b.databasId,
      'Identitet': b.identitet,
      'Enhet': b.enhet,
      'Artiklar': articlesFormatted,
      'Mtrl-summa': b.mtrlSum,
      'Tim-summa': b.timSum,
      'UE-summa': b.ueSum,
      'Beräknat pris (kr)': b.beraknatPris,
      'Senast uppdaterad': '2026-04-22',
      'Källa-wbr': 'HSB-3a-ROT-helrenovering-v6.wbr'
    });
  }
  return rows;
}

// --- Flik 5: Förklaring (ren textdokumentation) ---
function buildFlik5() {
  return [
    ['MASTER.XLSX — Förklaring'],
    [''],
    ['Denna fil är sanningen för alla priser och rumskonfigurationer i appen.'],
    ['Dennis redigerar här. scripts/build-config.js läser och genererar app-config.json.'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['FLIK 1 — Priser'],
    ['══════════════════════════════════════════════════════════'],
    ['En rad per unik post (både Wikells-härledda och egna).'],
    [''],
    ['KOLUMN', 'BESKRIVNING'],
    ['Post-ID', 'Unik ID i snake_case. Används i Flik 3 och i appkod.'],
    ['Kategori', 'UI-sektion: Golv, Vägg, Tak, Lister, Målning, Tillval, Inredning, Rivning, Förberedelse, UE, Övrigt'],
    ['Etikett', 'Vad slutkund ser i UI. Dennis redigerar för enkelhet.'],
    ['Wikells originalnamn', 'Auto-fylls av initial-extraktor från wbr <Identitet>. Visas INTE i appen. Används för källspårning.'],
    ['Enhet', 'kr/m², kr/st, kr/m² vägg, kr/m, schablon'],
    ['Pris (kr)', 'Formel eller hårdkodat värde. Se §3.3 i promptfilen.'],
    ['Pris-källa', 'Wikells, Byggbiten, HSB-förhandlat, Beijer, Placeholder'],
    ['Wikells-ID', 'Format kap.nnn (t.ex. 15.016). Slår upp i Flik 4.'],
    ['Mtrl (kr)', 'Materialpris per enhet (endast enkla Wikells-artiklar).'],
    ['Tim (h)', 'Timmar per enhet (endast enkla Wikells-artiklar).'],
    ['UE (kr)', 'UE per enhet (endast enkla Wikells-artiklar).'],
    ['Spillfaktor', 'Defaultvärde 1.0. Wikells-artiklar har ofta 1.07–1.1.'],
    ['Beräkning-flaggor', 'hasCount, hasArea, wallCalc, perimeterCalc, reducesFloor, placeholder, inheritsParentArea, inheritsReducesFloor'],
    ['Smart-mappning', 'Fritext om posten ärver eller ersätter annan.'],
    ['Wikells-artiklar (rå)', 'Auto-fylls av initial-extraktor. Semi-separerade. Visas INTE i appen.'],
    ['Ingår (visas i app)', 'Dennis förenkling. Semi-separerade. DETTA är vad kund ser i expand-panel.'],
    ['Ingår EJ (visas i app)', 'Dennis fri text — ingen motsvarande Wikells-källa.'],
    ['Wikells-ref (visningstext)', 'Kort visnings-referens i expand-panel.'],
    ['Anmärkning', 'Intern — visas inte i UI.'],
    [''],
    ['WIKELLS-FORMELN:'],
    ['Pris = Mtrl × Spillfaktor + Tim × 930 + UE × 1.10'],
    ['där 930 = 250 kr/h × 3.72 omkostnadspåslag'],
    ['och 1.10 = 10 % UE-påslag'],
    [''],
    ['Excel-regler: Öppna alltid i Microsoft Excel (inte LibreOffice/Numbers).'],
    ['Vid Ctrl+S räknar Excel om alla formelvärden automatiskt.'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['FLIK 2 — Rumstyper'],
    ['══════════════════════════════════════════════════════════'],
    ['En rad per rumstyp. Styr rumstyps-väljaren + default-yta + ikon.'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['FLIK 3 — Rum × poster (HJÄRTAT)'],
    ['══════════════════════════════════════════════════════════'],
    ['En rad per post-visning i en specifik rumstyp.'],
    ['En post som visas i 5 rum → 5 rader.'],
    [''],
    ['RADIO-GRUPPER:'],
    ['Poster i samma Radio-grupp + samma Rumstyp = ömsesidigt uteslutande.'],
    ['Tom Radio-grupp = vanlig checkbox.'],
    [''],
    ['FÖLJEPOSTER:'],
    ['Typ A = per-parent (t.ex. rivning under ekparkett). En rad per förälder.'],
    ['Typ B = rumsscope (t.ex. skyddstäckning triggad av målning). En rad per rumstyp.'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['FLIK 4 — Wbr-byggdelar (arkiv)'],
    ['══════════════════════════════════════════════════════════'],
    ['Rå Wikells-data från .wbr-filen. Används INTE av appen direkt.'],
    ['Underlag för att jämföra gamla vs nya priser när ny wbr kommer.'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['HUR MAN LÄGGER TILL EN NY POST'],
    ['══════════════════════════════════════════════════════════'],
    ['1. Hitta Wikells-byggdelen i Flik 4 eller bestäm att det är en Byggbiten-post.'],
    ['2. Lägg till rad i Flik 1 med Post-ID (snake_case), Etikett, Pris, Pris-källa, etc.'],
    ['3. Lägg till en rad i Flik 3 för varje rumstyp där posten ska visas.'],
    ['4. Spara filen (Ctrl+S).'],
    ['5. Kör: npm run build-config. Verifiera ingen valideringsfel.'],
    ['6. Refresha appen i webbläsaren. Posten visas nu.'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['HUR MAN UPPDATERAR PRISER FRÅN NY WBR'],
    ['══════════════════════════════════════════════════════════'],
    ['(Kommer som separat prompt när Fas 1+2 är stabila. Tills vidare: manuell redigering.)'],
    [''],
    ['══════════════════════════════════════════════════════════'],
    ['KÄND SÅRBARHET: xlsx@0.18.5 (prototype pollution, ReDoS)'],
    ['══════════════════════════════════════════════════════════'],
    ['npm-paketet xlsx@0.18.5 har kända CVE. I vårt fall kör det bara lokalt mot'],
    ['denna master.xlsx. Ingen användar-upload, ingen extern input. Risken är'],
    ['obefintlig för vårt usecase. Om appen någon gång börjar acceptera XLSX-filer'],
    ['från HSB-användare — byt till SheetJS CDN-versionen xlsx@0.20+.']
  ];
}

// --- Skriv xlsx ---
function writeXlsx(flik1, flik2, flik3, flik4, flik5) {
  const wb = XLSX.utils.book_new();

  // FLIK 1 — Priser (specialhantering för Pris-cellen med formel + värde)
  const ws1 = sheetFromFlik1(flik1);
  XLSX.utils.book_append_sheet(wb, ws1, 'Priser');

  // FLIK 2 — Rumstyper
  const ws2 = XLSX.utils.json_to_sheet(flik2);
  freezeHeader(ws2);
  XLSX.utils.book_append_sheet(wb, ws2, 'Rumstyper');

  // FLIK 3 — Rum × poster
  const ws3 = XLSX.utils.json_to_sheet(flik3);
  freezeHeader(ws3);
  XLSX.utils.book_append_sheet(wb, ws3, 'Rum × poster');

  // FLIK 4 — Wbr-byggdelar
  const ws4 = XLSX.utils.json_to_sheet(flik4);
  freezeHeader(ws4);
  XLSX.utils.book_append_sheet(wb, ws4, 'Wbr-byggdelar');

  // FLIK 5 — Förklaring
  const ws5 = XLSX.utils.aoa_to_sheet(flik5);
  XLSX.utils.book_append_sheet(wb, ws5, 'Förklaring');

  XLSX.writeFile(wb, OUT_XLSX);
}

function sheetFromFlik1(flik1) {
  // Kopiera rader men ta bort _priceInfo (intern)
  const cleanRows = flik1.map((r) => {
    const copy = Object.assign({}, r);
    delete copy._priceInfo;
    // Byt ut Pris (kr) med tomt värde temporärt — vi skriver formel/värde manuellt nedan
    copy['Pris (kr)'] = '';
    return copy;
  });
  // Sortera kolumner explicit så Pris (kr) hamnar på rätt plats (efter Enhet)
  const columns = [
    'Post-ID', 'Kategori', 'Etikett', 'Wikells originalnamn', 'Enhet', 'Pris (kr)',
    'Pris-källa', 'Wikells-ID', 'Mtrl (kr)', 'Tim (h)', 'UE (kr)', 'Spillfaktor',
    'Beräkning-flaggor', 'Smart-mappning',
    'Wikells-artiklar (rå)', 'Ingår (visas i app)', 'Ingår EJ (visas i app)',
    'Wikells-ref (visningstext)', 'Anmärkning'
  ];
  const ws = XLSX.utils.json_to_sheet(cleanRows, { header: columns });

  // Skriv Pris (kr)-cellerna manuellt: formel för enkla Wikells, hårdkodat för andra
  const priceColIdx = columns.indexOf('Pris (kr)');  // 0-based → kolumn F (index 5)
  const priceColLetter = XLSX.utils.encode_col(priceColIdx);  // 'F'
  const mtrlCol = XLSX.utils.encode_col(columns.indexOf('Mtrl (kr)'));   // 'I'
  const timCol = XLSX.utils.encode_col(columns.indexOf('Tim (h)'));      // 'J'
  const ueCol = XLSX.utils.encode_col(columns.indexOf('UE (kr)'));       // 'K'
  const spillCol = XLSX.utils.encode_col(columns.indexOf('Spillfaktor')); // 'L'

  for (let i = 0; i < flik1.length; i++) {
    const row = flik1[i];
    const info = row._priceInfo;
    const rowNum = i + 2;  // data börjar på rad 2 (rad 1 = header)
    const cellRef = priceColLetter + rowNum;
    if (info.useFormula) {
      // Formel: =I2*L2 + J2*930 + K2*1.1
      const formula = `${mtrlCol}${rowNum}*${spillCol}${rowNum} + ${timCol}${rowNum}*930 + ${ueCol}${rowNum}*1.1`;
      // Använd data.js-värdet (hardcoded) som visat värde — formeln ger ett mycket nära
      // värde (diff < 50 kr per safeFormula-regeln). När Dennis trycker Ctrl+S räknas
      // formeln om till exakt wbr-värde. Skillnaden är acceptabel.
      ws[cellRef] = { t: 'n', f: formula, v: info.hardcoded };
    } else {
      // Hårdkodat värde (från data.js)
      ws[cellRef] = { t: 'n', v: info.hardcoded };
    }
  }

  freezeHeader(ws);
  return ws;
}

function freezeHeader(ws) {
  // xlsx-paketet stödjer `!freeze` via ws['!views']
  ws['!views'] = [{ topLeftCell: 'A2', ySplit: 1, state: 'frozen' }];
}

// --- Main ---
function main() {
  console.log('Läser data.js...');
  const D = loadDataJs();
  console.log(`  ${D.ROOM_TYPE_ORDER.length} rumstyper`);

  console.log('Läser wbr-parsed.json...');
  const wbr = loadWbr();
  console.log(`  ${wbr.byId.size} unika byggdelar`);

  console.log('Bygger Flik 1 (Priser)...');
  const flik1 = buildFlik1(D, wbr);
  console.log(`  ${flik1.length} rader (items + följeposter + nya poster)`);

  console.log('Bygger Flik 2 (Rumstyper)...');
  const flik2 = buildFlik2(D);
  console.log(`  ${flik2.length} rader`);

  console.log('Bygger Flik 3 (Rum × poster)...');
  const flik3 = buildFlik3(D);
  console.log(`  ${flik3.length} rader`);

  console.log('Bygger Flik 4 (Wbr-byggdelar)...');
  const flik4 = buildFlik4(wbr);
  console.log(`  ${flik4.length} rader`);

  console.log('Bygger Flik 5 (Förklaring)...');
  const flik5 = buildFlik5();
  console.log(`  ${flik5.length} rader text`);

  console.log('Skriver master.xlsx...');
  writeXlsx(flik1, flik2, flik3, flik4, flik5);

  console.log();
  console.log(`✅ Skapad: ${OUT_XLSX}`);
  console.log('   Dennis kan nu öppna i Excel och granska.');
}

main();
