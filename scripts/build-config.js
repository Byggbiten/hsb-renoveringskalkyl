/**
 * build-config.js — Läser master.xlsx, validerar, genererar app-config.json.
 *
 * Dennis arbetsflöde:
 *   1. Öppna master.xlsx i Excel, ändra pris/post, Ctrl+S.
 *   2. npm run build-config.
 *   3. Refresha appen i webbläsaren.
 *
 * Vid valideringsfel: exit 1, app-config.json oförändrad, appen fortsätter
 * fungera med tidigare config.
 *
 * Genererar även CSV-snapshots i .project-context/data/snapshots/YYYY-MM-DD/
 * för git-diff-spårning.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const XLSX_PATH = '.project-context/data/master.xlsx';
const OUT_JSON = '.project-context/data/app-config.json';
const OUT_JSON_SRC = 'src/app-config.json';  // kopia i src/ så dev_server.py kan leverera den
const SNAPSHOTS_DIR = '.project-context/data/snapshots';

// Tillåtna dropdown-värden (matcha Flik 5 Förklaring)
const ALLOWED = {
  Kategori: ['Golv', 'Vägg', 'Tak', 'Lister', 'Målning', 'Kakel', 'Tillval', 'Inredning', 'Rivning', 'Förberedelse', 'UE', 'Köksinredning', 'Dörr', 'Övrigt'],
  Enhet: ['kr/m²', 'kr/st', 'kr/m² vägg', 'kr/m', 'schablon'],
  PrisKalla: ['Wikells', 'Byggbiten', 'HSB-förhandlat', 'Beijer', 'Placeholder'],
  FollowupTyp: ['', 'A', 'B'],
  Flaggor: ['hasCount', 'hasArea', 'wallCalc', 'perimeterCalc', 'reducesFloor', 'placeholder', 'inheritsParentArea', 'inheritsReducesFloor']
};

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function main() {
  console.log('── build-config.js ──');
  console.log('Läser ' + XLSX_PATH + '...');
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`\n❌ ${XLSX_PATH} saknas. Kör initial-extraktorn först eller skapa master.xlsx.`);
    process.exit(1);
  }
  const wb = XLSX.readFile(XLSX_PATH);

  const priser = parseSheet(wb, 'Priser');
  const rumstyper = parseSheet(wb, 'Rumstyper');
  const rumPoster = parseSheet(wb, 'Rum × poster');
  const wbrByggdelar = parseSheet(wb, 'Wbr-byggdelar');

  console.log(`  ${priser.rows.length} poster, ${rumstyper.rows.length} rumstyper, ${rumPoster.rows.length} rum×poster, ${wbrByggdelar.rows.length} wbr-byggdelar`);

  console.log('Validerar...');
  validate(priser, rumstyper, rumPoster);

  if (errors.length) {
    console.error('\n❌ VALIDERINGSFEL i ' + XLSX_PATH);
    for (const e of errors) console.error('  ' + e);
    console.error(`\n${errors.length} fel. app-config.json oförändrad.`);
    process.exit(1);
  }

  if (warnings.length) {
    console.log('\n⚠ Varningar (icke-blockerande):');
    for (const w of warnings) console.log('  ' + w);
  }

  console.log('\nBygger app-config.json...');
  const config = buildConfig(priser.rows, rumstyper.rows, rumPoster.rows);

  const jsonStr = JSON.stringify(config, null, 2);
  fs.writeFileSync(OUT_JSON, jsonStr, 'utf8');
  fs.writeFileSync(OUT_JSON_SRC, jsonStr, 'utf8');  // kopia som dev-servern kan leverera
  console.log('  ✅ ' + OUT_JSON + ' (' + fs.statSync(OUT_JSON).size + ' byte)');
  console.log('  ✅ ' + OUT_JSON_SRC + ' (kopia för dev-server)');

  console.log('\nSkriver CSV-snapshots...');
  writeSnapshots(priser, rumstyper, rumPoster, wbrByggdelar);

  // Sammanfattning per pris-källa
  const bySource = {};
  for (const p of priser.rows) {
    const k = p['Pris-källa'] || '(tom)';
    bySource[k] = (bySource[k] || 0) + 1;
  }
  console.log('\n✅ Byggd app-config.json');
  console.log(`  - ${priser.rows.length} poster (${Object.entries(bySource).map(([k, v]) => k + ': ' + v).join(', ')})`);
  console.log(`  - ${rumstyper.rows.length} rumstyper`);
  console.log(`  - ${rumPoster.rows.length} rum×post-mappningar`);
  const typA = rumPoster.rows.filter((r) => r['Följepost-typ'] === 'A').length;
  const typB = rumPoster.rows.filter((r) => r['Följepost-typ'] === 'B').length;
  console.log(`  - Följeposter: typ A ${typA}, typ B ${typB}`);
}

// --- Sheet-parsing ---

function parseSheet(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) { err(`Flik "${name}" saknas i master.xlsx`); return { headers: [], rows: [] }; }
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell ? String(cell.v) : '');
  }
  const rows = [];
  for (let r = 1; r <= range.e.r; r++) {
    const row = { _rowNum: r + 1, _flikName: name };
    let anyValue = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      let v = '';
      if (cell) {
        // Föredra computed value (v) — fail loud om formel utan värde.
        if (cell.f && (cell.v === undefined || cell.v === null)) {
          err(`Flik "${name}" rad ${r + 1}, kolumn "${headers[c]}": formel saknar beräknat värde. Öppna master.xlsx i Excel och Ctrl+S för att räkna om.`);
        }
        v = cell.v !== undefined ? cell.v : '';
        if (v !== '') anyValue = true;
      }
      row[headers[c]] = v;
    }
    if (anyValue) rows.push(row);
  }
  return { headers, rows };
}

// --- Validering ---

function validate(priser, rumstyper, rumPoster) {
  // Flik 1: Priser
  const postIds = new Set();
  const dupPostIds = new Set();
  for (const p of priser.rows) {
    const id = p['Post-ID'];
    if (!id) { err(`Flik "Priser" rad ${p._rowNum}: saknar Post-ID`); continue; }
    if (postIds.has(id)) dupPostIds.add(id);
    postIds.add(id);
    if (!p['Etikett']) err(`Flik "Priser" rad ${p._rowNum} (${id}): saknar Etikett`);
    if (!ALLOWED.Enhet.includes(p['Enhet'])) err(`Flik "Priser" rad ${p._rowNum} (${id}): ogiltig Enhet "${p['Enhet']}". Tillåtna: ${ALLOWED.Enhet.join(', ')}`);
    if (!ALLOWED.Kategori.includes(p['Kategori'])) err(`Flik "Priser" rad ${p._rowNum} (${id}): ogiltig Kategori "${p['Kategori']}"`);
    if (!ALLOWED.PrisKalla.includes(p['Pris-källa'])) err(`Flik "Priser" rad ${p._rowNum} (${id}): ogiltig Pris-källa "${p['Pris-källa']}"`);
    if (p['Pris (kr)'] === '' || p['Pris (kr)'] == null) err(`Flik "Priser" rad ${p._rowNum} (${id}): Pris (kr) saknas`);
    if (typeof p['Pris (kr)'] !== 'number' && p['Pris (kr)'] !== '') err(`Flik "Priser" rad ${p._rowNum} (${id}): Pris (kr) är inte ett nummer ("${p['Pris (kr)']}")`);
    // Wikells-formel-sanity: varna bara om Wikells-post saknar BÅDE Mtrl/Tim OCH
    // alla förklarande anmärkningar. Dennis-motiverade hårdkodade Wikells-poster
    // ("Enligt Wikells 15.015...") räknas som OK.
    if (p['Pris-källa'] === 'Wikells') {
      const anm = String(p['Anmärkning'] || '');
      // Spillfaktor är satt för alla Wikells-formel-poster (även där Mtrl=0 eller Tim=0).
      // Tom Spillfaktor + ingen anmärkning = verkligen ofullständig Wikells-post.
      const hasWikellsData = p['Spillfaktor'] !== '' && p['Spillfaktor'] != null;
      const hasExplanation = anm.match(/Summa av \d+ artiklar/i) || anm.match(/Enligt Wikells/i) || anm.match(/Dennis beslut/i);
      if (!hasWikellsData && !hasExplanation) {
        warn(`Flik "Priser" rad ${p._rowNum} (${id}): Wikells-källa men saknar Spillfaktor och har ingen förklarande anmärkning — verifiera.`);
      }
    }
    // Flaggor
    const flags = String(p['Beräkning-flaggor'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const f of flags) {
      if (!ALLOWED.Flaggor.includes(f)) err(`Flik "Priser" rad ${p._rowNum} (${id}): ogiltig flagga "${f}"`);
    }
    // perimeterCalc + wallCalc ömsesidigt uteslutande
    if (flags.includes('perimeterCalc') && flags.includes('wallCalc')) {
      err(`Flik "Priser" rad ${p._rowNum} (${id}): "perimeterCalc" och "wallCalc" kan inte båda vara satta.`);
    }
  }
  for (const dup of dupPostIds) err(`Flik "Priser": Post-ID "${dup}" är duplicerat.`);

  // Flik 2: Rumstyper
  const rumIds = new Set();
  for (const r of rumstyper.rows) {
    const id = r['Rumstyp-ID'];
    if (!id) { err(`Flik "Rumstyper" rad ${r._rowNum}: saknar Rumstyp-ID`); continue; }
    if (rumIds.has(id)) err(`Flik "Rumstyper" rad ${r._rowNum}: duplicerat Rumstyp-ID "${id}"`);
    rumIds.add(id);
    if (!r['Visningsnamn']) err(`Flik "Rumstyper" rad ${r._rowNum} (${id}): saknar Visningsnamn`);
    if (!r['Ikon-ID']) warn(`Flik "Rumstyper" rad ${r._rowNum} (${id}): saknar Ikon-ID — appen kan fallbacka till default-ikon`);
  }

  // Flik 3: Rum × poster
  const triKey = new Set();  // (rumstyp, post, parent) för duplikatkontroll
  const stdValdInGroup = new Map();  // (rumstyp, group) → Set<postId> (för att fånga flera Std-vald i samma radio-grupp)
  for (const r of rumPoster.rows) {
    const typ = r['Rumstyp-ID'];
    const post = r['Post-ID'];
    const parent = r['Parent-Post-ID'] || '';
    const fuTyp = r['Följepost-typ'] || '';
    if (!typ) { err(`Flik "Rum × poster" rad ${r._rowNum}: saknar Rumstyp-ID`); continue; }
    if (!post) { err(`Flik "Rum × poster" rad ${r._rowNum}: saknar Post-ID`); continue; }
    if (!rumIds.has(typ)) err(`Flik "Rum × poster" rad ${r._rowNum}: Rumstyp-ID "${typ}" finns inte i Flik "Rumstyper"`);
    if (!postIds.has(post)) err(`Flik "Rum × poster" rad ${r._rowNum}: Post-ID "${post}" finns inte i Flik "Priser"`);
    if (!ALLOWED.FollowupTyp.includes(fuTyp)) err(`Flik "Rum × poster" rad ${r._rowNum}: ogiltig Följepost-typ "${fuTyp}"`);

    // Typ A: parent måste finnas i Priser
    if (fuTyp === 'A' && parent && !postIds.has(parent)) {
      err(`Flik "Rum × poster" rad ${r._rowNum}: Parent-Post-ID "${parent}" finns inte i Flik "Priser"`);
    }
    // Typ B: triggers måste finnas (om satta)
    if (fuTyp === 'B') {
      const triggers = String(r['Trigger-Post-IDs'] || '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const t of triggers) {
        if (!postIds.has(t)) err(`Flik "Rum × poster" rad ${r._rowNum}: Trigger-Post-ID "${t}" finns inte i Flik "Priser"`);
      }
    }

    // Duplikatkontroll på (typ, post, parent)
    const key = `${typ}|${post}|${parent}`;
    if (triKey.has(key)) err(`Flik "Rum × poster" rad ${r._rowNum}: duplicerad trio (rumstyp=${typ}, post=${post}, parent=${parent})`);
    triKey.add(key);

    // Flera Std-vald=ja i samma radio-grupp?
    const group = r['Radio-grupp'];
    if (group && r['Std-vald'] === 'ja') {
      const gKey = `${typ}|${group}`;
      if (!stdValdInGroup.has(gKey)) stdValdInGroup.set(gKey, new Set());
      stdValdInGroup.get(gKey).add(post);
    }
  }
  for (const [gKey, posts] of stdValdInGroup) {
    if (posts.size > 1) err(`Flik "Rum × poster": flera Std-vald=ja i samma radio-grupp "${gKey.split('|')[1]}" (rumstyp ${gKey.split('|')[0]}): ${[...posts].join(', ')}`);
  }
}

// --- Bygg app-config.json ---

function buildConfig(priser, rumstyper, rumPoster) {
  // 1. Items-karta (alla poster, både huvud-items och följeposter)
  const items = {};
  for (const p of priser) {
    const id = p['Post-ID'];
    const flags = String(p['Beräkning-flaggor'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    items[id] = {
      id,
      label: String(p['Etikett']),
      price: Number(p['Pris (kr)']),
      unit: String(p['Enhet']),
      category: String(p['Kategori']),
      source: String(p['Pris-källa']),
      wikellsId: p['Wikells-ID'] ? String(p['Wikells-ID']) : '',
      flags,  // som array — app.js kan bygga item.hasCount etc. från denna
      ingar: splitSemi(p['Ingår (visas i app)']),
      ingarEj: splitSemi(p['Ingår EJ (visas i app)']),
      wikellsRef: p['Wikells-ref (visningstext)'] ? String(p['Wikells-ref (visningstext)']) : '',
      rawArticles: splitSemi(p['Wikells-artiklar (rå)']),
      note: p['Anmärkning'] ? String(p['Anmärkning']) : ''
    };
    // 2026-04-22: tagLabel för UE-VS / UE-El-badges (eller framtida tagg-värden).
    // Tom sträng → undefined (så vi inte får tomma strängar i JSON-outputen).
    const tagLabel = p['tagLabel'] ? String(p['tagLabel']).trim() : '';
    if (tagLabel) items[id].tagLabel = tagLabel;
    // Konvenient: extracta booleska flaggor på item-objektet för enklare konsumtion
    for (const f of flags) items[id][f] = true;
  }

  // 2. Rumstyper
  const roomTypes = {};
  const roomOrder = [...rumstyper]
    .sort((a, b) => (Number(a['Ordning']) || 0) - (Number(b['Ordning']) || 0))
    .map((r) => String(r['Rumstyp-ID']));
  for (const r of rumstyper) {
    const id = String(r['Rumstyp-ID']);
    roomTypes[id] = {
      id,
      displayName: String(r['Visningsnamn']),
      defaultArea: r['Default-yta (m²)'] === '' ? 0 : Number(r['Default-yta (m²)']),
      hideArea: String(r['Hide-area']).toLowerCase() === 'ja',
      type: String(r['Typ'] || 'per_post'),
      iconId: r['Ikon-ID'] ? String(r['Ikon-ID']) : '',
      items: [],
      roomFollowups: [],
      defaultOnCreate: {}
    };
  }

  // 3. Applicera rum×poster-mappningen
  // Sortera först på Ordning för stabil output
  const sorted = [...rumPoster].sort((a, b) => {
    const ta = String(a['Rumstyp-ID']);
    const tb = String(b['Rumstyp-ID']);
    if (ta !== tb) return roomOrder.indexOf(ta) - roomOrder.indexOf(tb);
    return (Number(a['Ordning']) || 0) - (Number(b['Ordning']) || 0);
  });

  // Samla typ A-följeposter per (rumstyp, parent) för enklare injection
  const typAByParent = new Map();  // "typ|parent" → [fuRow, ...]
  for (const r of sorted) {
    if (String(r['Följepost-typ']) === 'A') {
      const key = `${r['Rumstyp-ID']}|${r['Parent-Post-ID']}`;
      if (!typAByParent.has(key)) typAByParent.set(key, []);
      typAByParent.get(key).push(r);
    }
  }

  for (const r of sorted) {
    const typ = String(r['Rumstyp-ID']);
    const post = String(r['Post-ID']);
    const fuTyp = String(r['Följepost-typ'] || '');
    const room = roomTypes[typ];
    if (!room) continue;  // validering har redan fångat

    if (fuTyp === '') {
      // Huvud-item (inklusive lister/sockel/taklist)
      const rowData = {
        id: post,
        order: Number(r['Ordning']) || 0
      };
      if (r['Radio-grupp']) rowData.group = String(r['Radio-grupp']);
      // Default-on-create
      const stdVald = String(r['Std-vald']).toLowerCase() === 'ja';
      const stdAntal = r['Std-antal'] !== '' && r['Std-antal'] != null ? Number(r['Std-antal']) : null;
      const stdArea = r['Std-area'] !== '' && r['Std-area'] != null ? Number(r['Std-area']) : null;
      if (stdVald || stdAntal != null || stdArea != null) {
        const def = { checked: stdVald };
        if (stdAntal != null) def.count = stdAntal;
        if (stdArea != null) def.area = stdArea;
        room.defaultOnCreate[post] = def;
      }
      room.items.push(rowData);

      // Injectera typ A-följeposter för denna parent
      const fuKey = `${typ}|${post}`;
      const typAs = typAByParent.get(fuKey) || [];
      if (typAs.length) {
        rowData.followups = typAs.map((fuRow) => ({
          id: String(fuRow['Post-ID']),
          defaultChecked: String(fuRow['Std-vald']).toLowerCase() === 'ja',
          inheritsReducesFloor: String(fuRow['Inherit reducesFloor']).toLowerCase() === 'ja',
          inheritsParentArea: String(fuRow['Inherit parentArea']).toLowerCase() === 'ja'
        }));
      }
    } else if (fuTyp === 'B') {
      room.roomFollowups.push({
        id: post,
        defaultChecked: String(r['Std-vald']).toLowerCase() === 'ja',
        triggeredBy: String(r['Trigger-Post-IDs'] || '').split(',').map((s) => s.trim()).filter(Boolean),
        renderInCategory: r['Rendera i kategori'] ? String(r['Rendera i kategori']) : ''
      });
    }
    // typ A hanteras via injection ovan — vi har redan lagt den i parent-item.followups
  }

  return {
    version: '1.7.0',
    generated: new Date().toISOString(),
    sourceFile: 'master.xlsx',
    items,
    roomTypes,
    roomOrder
  };
}

function splitSemi(s) {
  if (!s) return [];
  return String(s).split(';').map((x) => x.trim()).filter(Boolean);
}

// --- CSV-snapshots ---

function writeSnapshots(priser, rumstyper, rumPoster, wbrByggdelar) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(SNAPSHOTS_DIR, date);
  fs.mkdirSync(dir, { recursive: true });

  writeCsv(path.join(dir, 'priser.csv'), priser.headers, priser.rows);
  writeCsv(path.join(dir, 'rumstyper.csv'), rumstyper.headers, rumstyper.rows);
  writeCsv(path.join(dir, 'rum-poster.csv'), rumPoster.headers, rumPoster.rows);
  writeCsv(path.join(dir, 'wbr-byggdelar.csv'), wbrByggdelar.headers, wbrByggdelar.rows);
  console.log('  ✅ ' + dir + '/{priser,rumstyper,rum-poster,wbr-byggdelar}.csv');
}

function writeCsv(filePath, headers, rows) {
  const sep = ',';
  const lines = [headers.map(csvEscape).join(sep)];
  for (const row of rows) {
    const cells = headers.map((h) => csvEscape(row[h]));
    lines.push(cells.join(sep));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

main();
