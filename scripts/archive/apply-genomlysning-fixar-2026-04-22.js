/**
 * apply-genomlysning-fixar-2026-04-22.js — Engångsscript.
 *
 * Applicerar Dennis genomlysning-fixar på master.xlsx enligt prompt-filen
 * "Genomlysning-fixar master.xlsx + UI" (2026-04-22).
 *
 * Gör:
 *   §3.2 badrum_vagg_kakel: 2492/Byggbiten → 2435/Wikells 8.502 + ny text
 *   §3.3 Ingår EJ: standardisera "Demontering ingår i badrum_rivning" på 4 badrum-material
 *   §3.4 Fallspackling: flytta från Ingår EJ → Ingår för klinker + plastmatta
 *   §3.5 Fyll tomma Ingår-fält på 23 poster
 *   §3.7 vagg_kakel (toalett): Kategori Kakel → Vägg
 *
 * INTE gör:
 *   §3.1 Ersätt master.xlsx — filen är redan intakt (verifierat)
 *   §3.6 Verifiera vagg_kakel ID — ingen konflikt (verifierat)
 *   §3.8 Recalc — formler har redan t=n, f=, v= korrekt
 *   §3.9 UE-badges — redan implementerade i app.js + style.css
 *
 * Anv: node scripts/archive/apply-genomlysning-fixar-2026-04-22.js
 */

const fs = require('fs');
const XLSX = require('xlsx');

const XLSX_PATH = '.project-context/data/master.xlsx';

// Kolumn-index (från master.xlsx Flik 1 layout v1.8)
const COL = {
  PostID: 0, Kategori: 1, Etikett: 2, WikellsOrig: 3, Enhet: 4,
  Pris: 5, PrisKalla: 6, WikellsID: 7, Mtrl: 8, Tim: 9, UE: 10,
  Spill: 11, Flaggor: 12, SmartMap: 13, RaaArtiklar: 14,
  Ingar: 15, IngarEj: 16, WikellsRef: 17, Anmarkning: 18, TagLabel: 19
};

function setCell(ws, r, c, value, type) {
  const ref = XLSX.utils.encode_cell({ r, c });
  if (value === null || value === '' || value === undefined) {
    ws[ref] = { t: 's', v: '' };
  } else if (type === 'n' || typeof value === 'number') {
    ws[ref] = { t: 'n', v: value };
  } else {
    ws[ref] = { t: 's', v: String(value) };
  }
}

function getCell(ws, r, c) {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : '';
}

function buildIdIndex(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const map = new Map();
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: COL.PostID })];
    if (cell && cell.v) map.set(cell.v, r);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════
// §3.2 badrum_vagg_kakel → Wikells 8.502
// ═══════════════════════════════════════════════════════════════════

function fix_3_2(ws, idx) {
  const r = idx.get('badrum_vagg_kakel');
  if (r == null) throw new Error('badrum_vagg_kakel saknas');
  setCell(ws, r, COL.Pris, 2435, 'n');
  setCell(ws, r, COL.PrisKalla, 'Wikells');
  setCell(ws, r, COL.WikellsID, '8.502');
  setCell(ws, r, COL.WikellsOrig, 'Våtrumsvägg med plywood, våtrumsgips och kakel');
  setCell(ws, r, COL.RaaArtiklar,
    'Kakelplattor 150×150 färgade; Fuktskydd typ tätduk; 13 Glasrocskiva våtrum B=900; 15 plywood K20/70 B=900');
  setCell(ws, r, COL.Ingar,
    'Rivning av befintligt kakel (ingår i badrum_rivning); plywood K20/70; våtrumsgips; folieförstärkt tätskikt; kakelplattor 150×150; fästmassa; silikonfog; städning');
  setCell(ws, r, COL.IngarEj,
    'Demontering av befintligt ytskikt ingår i rumsrivning (badrum_rivning); Specialmönster, mosaik eller bårder beräknas separat.');
  setCell(ws, r, COL.Anmarkning, 'Byggbitens byggdel baserat på Wikells 8.502, 2026-04-22');
  return 'badrum_vagg_kakel: 2492/Byggbiten → 2435/Wikells 8.502';
}

// ═══════════════════════════════════════════════════════════════════
// §3.3 Standardisera Ingår EJ på 4 badrum-material-poster
// ═══════════════════════════════════════════════════════════════════

// Gemensam standardformulering (första rad i Ingår EJ)
const DEMONTERING_TEXT = 'Demontering av befintligt ytskikt ingår i rumsrivning (badrum_rivning)';

function prependIngarEj(ws, r, newFirstLine) {
  const existing = String(getCell(ws, r, COL.IngarEj) || '').trim();
  // Ta bort ev. befintlig rad som säger "Demontering... rumsrivning..."
  const cleaned = existing
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !/demontering.*rumsrivning|demontering.*rivning.*ingår/i.test(s))
    .join('; ');
  setCell(ws, r, COL.IngarEj, newFirstLine + (cleaned ? '; ' + cleaned : ''));
}

function fix_3_3(ws, idx) {
  const msgs = [];
  const posterSomSkaHaDemontering = [
    'badrum_vagg_kakel',       // redan uppdaterad i §3.2 men säkerställ standardformulering
    'badrum_vagg_plastmatta',
    'badrum_vagg_farg',
    'badrum_golv_klinker',
    'badrum_golv_plastmatta'
  ];
  for (const id of posterSomSkaHaDemontering) {
    const r = idx.get(id);
    if (r == null) continue;
    prependIngarEj(ws, r, DEMONTERING_TEXT);
    msgs.push(id);
  }
  return 'Ingår EJ standardiserad för ' + msgs.length + ' poster: ' + msgs.join(', ');
}

// ═══════════════════════════════════════════════════════════════════
// §3.4 Fallspackling UX-fix
// ═══════════════════════════════════════════════════════════════════

const FALLSPACKLING_INGAR_TEXT = 'Fallspackling med fall mot golvbrunn (förvald följepost badrum_fallspackling — redan medräknad i totalen)';

function fix_3_4(ws, idx) {
  const msgs = [];
  for (const id of ['badrum_golv_klinker', 'badrum_golv_plastmatta']) {
    const r = idx.get(id);
    if (r == null) continue;

    // 1. Ta bort "Fallspackling (egen...)" från Ingår EJ
    const ingarEj = String(getCell(ws, r, COL.IngarEj) || '');
    const cleaned = ingarEj
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !/fallspackling\s*\(egen/i.test(s))
      .join('; ');
    setCell(ws, r, COL.IngarEj, cleaned);

    // 2. Lägg till fallspackling-textraden FÖRST i Ingår (om inte redan där)
    const ingar = String(getCell(ws, r, COL.Ingar) || '');
    const ingarClean = ingar
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !/fallspackling/i.test(s))
      .join('; ');
    setCell(ws, r, COL.Ingar, FALLSPACKLING_INGAR_TEXT + (ingarClean ? '; ' + ingarClean : ''));

    msgs.push(id);
  }
  return 'Fallspackling flyttad till Ingår för ' + msgs.length + ' poster: ' + msgs.join(', ');
}

// ═══════════════════════════════════════════════════════════════════
// §3.5 Fyll tomma Ingår-fält
// ═══════════════════════════════════════════════════════════════════

// Rivnings-text (5 golv-rivningar)
const RIVNING_TEXT = 'Demontering av ytskikt; utbäring till container; lokal sopning';

// Spacklings-text (5 golv-spacklingar — Dennis listar 4 men entre_klinker__spackling
// är också tom och får samma text; flaggas i rapporten)
const SPACKLING_TEXT = 'Spackling av ojämnheter i underlag; slipning; dammsugning — förbereder ytan för nytt ytskikt';

// Badrum_rivning: UTÖKAD text (posten har redan Ingår, men Dennis vill ha ny text)
const BADRUM_RIVNING_NEW = 'Demontering av klinker/plastmatta på golv och väggar; rivning av fallspackel; utbäring; lokal sopning. Bortforsling av container offereras separat.';

// Specifika poster
const INGAR_MAP = {
  golv_ekparkett__rivning:  RIVNING_TEXT,
  golv_klickvinyl__rivning: RIVNING_TEXT,
  golv_matta__rivning:      RIVNING_TEXT,
  golv_klinker__rivning:    RIVNING_TEXT,
  entre_klinker__rivning:   RIVNING_TEXT,

  golv_ekparkett__spackling:  SPACKLING_TEXT,
  golv_klickvinyl__spackling: SPACKLING_TEXT,
  golv_matta__spackling:      SPACKLING_TEXT,
  golv_klinker__spackling:    SPACKLING_TEXT,
  entre_klinker__spackling:   SPACKLING_TEXT,  // Extra från mig — Dennis listade inte denna

  // Porslin = wc-stol (inte klinker/porslinsplattor som Dennis text antydde)
  porslin: 'Ny WC-stol inkl sits; montage; silikonfog mot golvet; anslutning till befintligt avlopp.',

  hatthylla: 'Enkel hatthylla med krokar och hyllplan; monterad i hall; standardutförande.',

  // Placeholder-poster — beskriv vad som ska ingå när priset är satt
  ytterdorr:           'Ny ytterdörr inkl karm; tröskel; handtag och montage. Specificeras vid offert.',
  balkongdorr_ny:      'Ny balkongdörr inkl karm; handtag och montage. Specificeras vid offert.',
  balkongdorr_malning: 'Målning av befintlig balkongdörr — slipning; grundning; 2 strykningar. Specificeras vid offert.',
  taklampa:            'Byte av taklampa / fast ljuspunkt inkl inkoppling. Specificeras vid offert.',
  eluttag:             'Byte av eluttag inkl inkoppling. Specificeras vid offert.',
  strombrytare:        'Byte av strömbrytare inkl inkoppling. Specificeras vid offert.',
  radiator:            'Byte av radiator inkl inkoppling. Specificeras vid offert.',
  dorrhandtag:         'Byte av dörrhandtag. Specificeras vid offert.',
  slutstad:            'Slutstädning efter renovering. Specificeras vid offert.',
  kok_standard:        'Komplett kök standard inkl stomme; luckor; bänkskiva; vitvaror. Specificeras vid offert.',
  kok_plus:            'Komplett kök Plus inkl uppgraderad stomme; luckor; bänkskiva; vitvaror. Specificeras vid offert.'
};

// Ingår EJ-specifika tillägg
const INGAR_EJ_MAP = {
  hatthylla: 'Specialutförande; hatthylla bredare än 60 cm.'
};

function fix_3_5(ws, idx) {
  const msgs = [];
  for (const [id, text] of Object.entries(INGAR_MAP)) {
    const r = idx.get(id);
    if (r == null) continue;
    const existing = String(getCell(ws, r, COL.Ingar) || '').trim();
    if (existing) continue;  // skippa om redan ifyllt (defensivt)
    setCell(ws, r, COL.Ingar, text);
    msgs.push(id);
  }

  // Utökad text för badrum_rivning — skrivs över eftersom Dennis vill ha ny exakt text
  {
    const r = idx.get('badrum_rivning');
    if (r != null) {
      setCell(ws, r, COL.Ingar, BADRUM_RIVNING_NEW);
      msgs.push('badrum_rivning (utökad)');
    }
  }

  // Ingår EJ-tillägg
  for (const [id, text] of Object.entries(INGAR_EJ_MAP)) {
    const r = idx.get(id);
    if (r == null) continue;
    const existing = String(getCell(ws, r, COL.IngarEj) || '').trim();
    if (!existing) setCell(ws, r, COL.IngarEj, text);
  }

  return 'Ingår ifylld för ' + msgs.length + ' poster';
}

// ═══════════════════════════════════════════════════════════════════
// §3.7 Omstrukturera kategorier — vagg_kakel till Vägg
// ═══════════════════════════════════════════════════════════════════

function fix_3_7(ws, idx) {
  const r = idx.get('vagg_kakel');
  if (r == null) throw new Error('vagg_kakel saknas');
  const before = getCell(ws, r, COL.Kategori);
  setCell(ws, r, COL.Kategori, 'Vägg');
  return 'vagg_kakel (toalett): Kategori "' + before + '" → "Vägg"';
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

function main() {
  console.log('Läser ' + XLSX_PATH + '...');
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets['Priser'];
  if (!ws) throw new Error('Flik "Priser" saknas');
  const idx = buildIdIndex(ws);
  console.log('  ' + idx.size + ' poster');

  console.log();
  console.log('Applicerar fixar:');
  console.log('  §3.2  ' + fix_3_2(ws, idx));
  console.log('  §3.3  ' + fix_3_3(ws, idx));
  console.log('  §3.4  ' + fix_3_4(ws, idx));
  console.log('  §3.5  ' + fix_3_5(ws, idx));
  console.log('  §3.7  ' + fix_3_7(ws, idx));

  console.log();
  console.log('Skriver master.xlsx...');
  XLSX.writeFile(wb, XLSX_PATH);
  console.log('  ✅ Sparad');

  // Read-back verifiering
  console.log();
  console.log('═══ READ-BACK ═══');
  const wb2 = XLSX.readFile(XLSX_PATH);
  const ws2 = wb2.Sheets['Priser'];
  const idx2 = buildIdIndex(ws2);

  function chk(id, { pris, kalla, wikellsId, kategori, ingarHas, ingarEjHas, ingarEjNotHas }) {
    const r = idx2.get(id);
    if (r == null) { console.log('  ❌ ' + id + ': SAKNAS'); return false; }
    const prisV = getCell(ws2, r, COL.Pris);
    const kallaV = getCell(ws2, r, COL.PrisKalla);
    const widV = getCell(ws2, r, COL.WikellsID);
    const katV = getCell(ws2, r, COL.Kategori);
    const ingarV = String(getCell(ws2, r, COL.Ingar) || '');
    const ingarEjV = String(getCell(ws2, r, COL.IngarEj) || '');
    const checks = [];
    if (pris != null && Math.abs(prisV - pris) > 0.5) checks.push(`pris=${prisV}≠${pris}`);
    if (kalla && kallaV !== kalla) checks.push(`kalla=${kallaV}≠${kalla}`);
    if (wikellsId && widV !== wikellsId) checks.push(`wid=${widV}≠${wikellsId}`);
    if (kategori && katV !== kategori) checks.push(`kat=${katV}≠${kategori}`);
    if (ingarHas && !ingarV.includes(ingarHas)) checks.push('Ingår saknar "' + ingarHas + '"');
    if (ingarEjHas && !ingarEjV.includes(ingarEjHas)) checks.push('IngårEj saknar "' + ingarEjHas + '"');
    if (ingarEjNotHas && ingarEjV.includes(ingarEjNotHas)) checks.push('IngårEj INNEHÅLLER "' + ingarEjNotHas + '" (ska vara borta)');
    if (checks.length) { console.log('  ❌ ' + id + ': ' + checks.join('; ')); return false; }
    console.log('  ✅ ' + id);
    return true;
  }

  let pass = 0, fail = 0;
  const r1 = (b) => b ? pass++ : fail++;

  // §3.2
  r1(chk('badrum_vagg_kakel', {
    pris: 2435, kalla: 'Wikells', wikellsId: '8.502',
    ingarHas: 'plywood K20/70',
    ingarEjHas: 'Demontering av befintligt ytskikt ingår i rumsrivning'
  }));

  // §3.3 Demontering-standardisering
  for (const id of ['badrum_vagg_plastmatta', 'badrum_vagg_farg', 'badrum_golv_klinker', 'badrum_golv_plastmatta']) {
    r1(chk(id, { ingarEjHas: 'Demontering av befintligt ytskikt ingår i rumsrivning' }));
  }

  // §3.4 Fallspackling
  for (const id of ['badrum_golv_klinker', 'badrum_golv_plastmatta']) {
    r1(chk(id, {
      ingarHas: 'redan medräknad',
      ingarEjNotHas: 'Fallspackling (egen'
    }));
  }

  // §3.5 Ingår ifylld på rivnings-följeposter
  for (const id of ['golv_ekparkett__rivning', 'golv_klickvinyl__rivning', 'golv_matta__rivning', 'golv_klinker__rivning', 'entre_klinker__rivning']) {
    r1(chk(id, { ingarHas: 'container' }));
  }

  // §3.5 spackling
  for (const id of ['golv_ekparkett__spackling', 'golv_klickvinyl__spackling', 'golv_matta__spackling', 'golv_klinker__spackling']) {
    r1(chk(id, { ingarHas: 'Spackling av ojämnheter' }));
  }

  // §3.5 placeholders (ett exempel räcker)
  r1(chk('ytterdorr', { ingarHas: 'Specificeras vid offert' }));
  r1(chk('kok_standard', { ingarHas: 'Specificeras vid offert' }));

  // §3.7 vagg_kakel (toalett) → Vägg
  r1(chk('vagg_kakel', { kategori: 'Vägg' }));

  console.log();
  console.log('══ PASS: ' + pass + '   FAIL: ' + fail + ' ══');
  if (fail > 0) process.exit(1);
}

main();
