/**
 * apply-ue-restructure-2026-04-22.js — Engångsscript.
 *
 * Applicerar Dennis badrum-omstrukturering 2026-04-22:
 * - Ta bort badrum_wc_dusch (Wikells 17.034) och badrum_inredning (17.032) från Flik 1
 * - Ta bort motsvarande rader i Flik 3 (Rum × poster)
 * - Uppdatera badrum_ue_vs: pris 40 000, ny etikett + ingår-lista + tagLabel
 * - Uppdatera badrum_ue_el: pris 20 000, ny etikett + ingår-lista + tagLabel
 * - Lägga till ny kolumn `tagLabel` i Flik 1
 * - Uppdatera Flik 5 med renoveringsprincipen
 *
 * Anv: node scripts/archive/apply-ue-restructure-2026-04-22.js
 */

const fs = require('fs');
const XLSX = require('xlsx');

const XLSX_PATH = '.project-context/data/master.xlsx';

// Kolumn-index för Flik 1 (efter ny tagLabel-kolumn)
const COL = {
  PostID: 0,       // A
  Kategori: 1,     // B
  Etikett: 2,      // C
  WikellsOrig: 3,  // D
  Enhet: 4,        // E
  Pris: 5,         // F
  PrisKalla: 6,    // G
  WikellsID: 7,    // H
  Mtrl: 8,         // I
  Tim: 9,          // J
  UE: 10,          // K
  Spill: 11,       // L
  Flaggor: 12,     // M
  SmartMap: 13,    // N
  RaaArtiklar: 14, // O
  Ingar: 15,       // P
  IngarEj: 16,     // Q
  WikellsRef: 17,  // R
  Anmarkning: 18,  // S
  TagLabel: 19     // T (NY)
};

function setCell(ws, ref, value, type) {
  if (value === null || value === '' || value === undefined) {
    ws[ref] = { t: 's', v: '' };
  } else if (type === 'n' || typeof value === 'number') {
    ws[ref] = { t: 'n', v: value };
  } else {
    ws[ref] = { t: 's', v: String(value) };
  }
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
// FLIK 1 — Priser
// ═══════════════════════════════════════════════════════════════════

function updateFlik1(wb) {
  const ws = wb.Sheets['Priser'];
  const origRange = XLSX.utils.decode_range(ws['!ref']);

  // 1. Lägg till tagLabel-header i kolumn T
  setCell(ws, XLSX.utils.encode_cell({ r: 0, c: COL.TagLabel }), 'tagLabel');

  // 2. Utvidga ref-range så kolumn T inkluderas
  const newRange = Object.assign({}, origRange, { e: { r: origRange.e.r, c: COL.TagLabel } });
  ws['!ref'] = XLSX.utils.encode_range(newRange);

  const idx = buildIdIndex(ws);

  // 3. Uppdatera badrum_ue_vs
  {
    const r = idx.get('badrum_ue_vs');
    if (r == null) throw new Error('badrum_ue_vs saknas');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Etikett }), 'Badrumsinredning inkl VVS-installation (UE)');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.WikellsOrig }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Pris }), 40000, 'n');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.PrisKalla }), 'Byggbiten');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.WikellsID }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Mtrl }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Tim }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.UE }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Spill }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.RaaArtiklar }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Ingar }),
      'WC-stol; Kommod med tvättställ; Blandare till kommod; Duschvägg; Duschblandare; Golvbrunn + avlopp; Provtryckning + besiktning; Montage och installation');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.WikellsRef }), 'Byggbiten UE-schablon');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Anmarkning }),
      'Schablonpris från VVS-UE. Ersätter Wikells 17.032 + 17.034. Dennis beslut 2026-04-22.');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.TagLabel }), 'UE-VS');
  }

  // 4. Uppdatera badrum_ue_el
  {
    const r = idx.get('badrum_ue_el');
    if (r == null) throw new Error('badrum_ue_el saknas');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Etikett }), 'El-installation badrum (UE)');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.WikellsOrig }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Pris }), 20000, 'n');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.PrisKalla }), 'Byggbiten');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.WikellsID }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Mtrl }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Tim }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.UE }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Spill }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.RaaArtiklar }), '');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Ingar }),
      'Elgolvvärme (matta + termostat); Belysning — spottar i tak; Inkoppling badrumsskåp med belysning; Brytare; Eluttag (inkl uttag vid spegel för hårtork etc); Besiktningsintyg');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.WikellsRef }), 'Byggbiten UE-schablon');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.Anmarkning }),
      'Schablonpris från El-UE. Placeholder 20 000 — Dennis återkommer med exakt pris. Dennis beslut 2026-04-22.');
    setCell(ws, XLSX.utils.encode_cell({ r, c: COL.TagLabel }), 'UE-El');
  }

  // 5. Ta bort raderna för badrum_wc_dusch och badrum_inredning.
  //    Vi bygger om Flik 1 från grunden genom att läsa alla rader → filtrera → skriv tillbaka.
  const removeIds = new Set(['badrum_wc_dusch', 'badrum_inredning']);
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell ? cell.v : '');
  }

  // Läs alla data-rader, inkl. formel och värde på Pris-kolumnen
  const rows = [];
  for (let r = 1; r <= range.e.r; r++) {
    const postId = ws[XLSX.utils.encode_cell({ r, c: COL.PostID })];
    if (!postId || !postId.v) continue;
    if (removeIds.has(postId.v)) continue;
    const row = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell) row[headers[c]] = { cell: Object.assign({}, cell) };
      else row[headers[c]] = null;
    }
    rows.push(row);
  }

  // Rensa alla datarader (behåll headers)
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete ws[XLSX.utils.encode_cell({ r, c })];
    }
  }

  // Skriv tillbaka rader från index 1 (rad 2 i Excel)
  for (let i = 0; i < rows.length; i++) {
    const rNum = i + 1;
    const row = rows[i];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = headers[c];
      if (!h) continue;
      const rowCell = row[h];
      if (rowCell && rowCell.cell) {
        const newRef = XLSX.utils.encode_cell({ r: rNum, c });
        const newCell = Object.assign({}, rowCell.cell);
        // Om detta är Pris-kolumnen och cellen har en formel som refererar till andra celler,
        // uppdatera radnumren i formeln till det nya radnumret.
        if (c === COL.Pris && newCell.f) {
          const excelRowNum = rNum + 1;  // Excel är 1-based + header på rad 1
          // Formeln från vår initial-extraktor: "I{N}*L{N} + J{N}*930 + K{N}*1.10"
          newCell.f = newCell.f.replace(/([A-Z])(\d+)/g, (m, col, num) => col + excelRowNum);
        }
        ws[newRef] = newCell;
      }
    }
  }

  // Uppdatera !ref
  const newLastRow = rows.length;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: newLastRow, c: COL.TagLabel } });

  console.log('  ✓ Flik 1 Priser:');
  console.log('    - Tog bort badrum_wc_dusch och badrum_inredning');
  console.log('    - Uppdaterade badrum_ue_vs → 40 000 kr + tagLabel UE-VS');
  console.log('    - Uppdaterade badrum_ue_el → 20 000 kr + tagLabel UE-El');
  console.log('    - Lade till tagLabel-kolumn (T)');
  console.log('    - Totalt ' + rows.length + ' rader kvar (från 50 → ' + rows.length + ')');
}

// ═══════════════════════════════════════════════════════════════════
// FLIK 3 — Rum × poster: ta bort badrum × badrum_wc_dusch och badrum × badrum_inredning
// ═══════════════════════════════════════════════════════════════════

function updateFlik3(wb) {
  const ws = wb.Sheets['Rum × poster'];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell ? cell.v : '');
  }
  const postIdCol = headers.indexOf('Post-ID');
  const rumstypCol = headers.indexOf('Rumstyp-ID');
  if (postIdCol < 0 || rumstypCol < 0) throw new Error('Flik 3 saknar Post-ID eller Rumstyp-ID');

  const removeIds = new Set(['badrum_wc_dusch', 'badrum_inredning']);
  const rows = [];
  for (let r = 1; r <= range.e.r; r++) {
    const postId = ws[XLSX.utils.encode_cell({ r, c: postIdCol })];
    if (!postId || !postId.v) continue;
    if (removeIds.has(postId.v)) continue;
    const row = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row[c] = cell ? Object.assign({}, cell) : null;
    }
    rows.push(row);
  }

  // Rensa alla datarader
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      delete ws[XLSX.utils.encode_cell({ r, c })];
    }
  }

  // Skriv tillbaka
  for (let i = 0; i < rows.length; i++) {
    const rNum = i + 1;
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (rows[i][c]) ws[XLSX.utils.encode_cell({ r: rNum, c })] = rows[i][c];
    }
  }

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: range.s.c }, e: { r: rows.length, c: range.e.c } });

  console.log('  ✓ Flik 3 Rum × poster: tog bort 2 rader (' + range.e.r + ' → ' + rows.length + ')');
}

// ═══════════════════════════════════════════════════════════════════
// FLIK 5 — Förklaring: lägg till renoveringsprincipen
// ═══════════════════════════════════════════════════════════════════

function updateFlik5(wb) {
  const ws = wb.Sheets['Förklaring'];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const nextRow = range.e.r + 2;  // två tomma rader för separation

  const tillagg = [
    '',
    '══════════════════════════════════════════════════════════',
    'PRINCIP (2026-04-22): Vad ingår i en Wikells-byggdel?',
    '══════════════════════════════════════════════════════════',
    'Wikells-byggdelar ska innehålla ENDAST renoveringsarbete:',
    '  • Underarbete (rivning, flytspackling, förberedelse)',
    '  • Skivmaterial (gips, golvspånskivor)',
    '  • Tätskikt (folie, cementbaserat, tätduk)',
    '  • Ytskikt (klinker, kakel, matta, färg, parkett)',
    '  • List och beslag som är del av en ytprodukt (foder, trösklar, trycken, sockellister för torra rum)',
    '',
    'INREDNING räknas INTE som renoveringsarbete:',
    '  • Sanitetsporslin (WC-stol, tvättställ)',
    '  • VVS-inredning (blandare, duschvägg, duschset)',
    '  • Skåp (kommod, högskåp, väggskåp, badrumsskåp)',
    '  • Beslag på inredning (toalettpappershållare, handdukshängare, tvålhållare, torkställ, WC-borste)',
    '  • Speglar med belysning',
    '  • El-installation (golvvärme, spottar, uttag, brytare)',
    '',
    'Inredning bakas in i UE-schabloner eller egna Byggbiten-poster',
    '(t.ex. porslin för toalett, garderob_60 för sovrum).',
    '',
    'Om en Wikells-byggdel innehåller inrednings-artiklar — radera dessa ur Flik 4',
    'och räkna om byggdelens pris enligt Wikells-formeln:',
    '  pris = Σ(MaterialPris × Spill × Åtgång) + Σ(Tid × 930 × Åtgång) + Σ(UE × 1.10 × Åtgång)',
    '',
    '',
    '══════════════════════════════════════════════════════════',
    'MOMS (2026-04-22)',
    '══════════════════════════════════════════════════════════',
    'Alla priser i master.xlsx är EXKL moms.',
    'Det gäller även UE-schablonerna (VVS 40 000, El 20 000).',
    'App:en multiplicerar med 1.25 i print-layoutens inkl-moms-kolumn.',
    '',
    '',
    '══════════════════════════════════════════════════════════',
    'UE-TAGGAR (2026-04-22)',
    '══════════════════════════════════════════════════════════',
    'Poster med kolumn `tagLabel` ifylld renderas med badge i UI.',
    'Aktuella värden:',
    '  • UE-VS   → blå badge (Byggbiten UE-schablon VVS, 40 000 kr ex moms)',
    '  • UE-El   → grön badge (Byggbiten UE-schablon El, 20 000 kr ex moms)',
    '',
    'Lämna tagLabel-kolumnen tom för poster som inte ska ha badge.',
    'tagLabel överrider INTE den befintliga "Schablon"-taggen som bygger på Enhet=schablon.',
    '',
    '',
    '══════════════════════════════════════════════════════════',
    'BADRUM-STRUKTUR (efter 2026-04-22 UE-restructure)',
    '══════════════════════════════════════════════════════════',
    'Badrum består nu av följande kategorier:',
    '  GOLV (radio): badrum_golv_klinker / badrum_golv_plastmatta',
    '  VÄGG (radio): badrum_vagg_kakel / badrum_vagg_plastmatta / badrum_vagg_farg',
    '  INREDNING: badrum_dorr (Våtrumsdörr, 4 655 kr Wikells)',
    '  UE: badrum_ue_vs (40 000 kr Byggbiten) + badrum_ue_el (20 000 kr Byggbiten)',
    '  Rumsföljeposter: badrum_rivning, badrum_fallspackling, skyddstackning',
    '',
    'Tidigare hade badrum även badrum_wc_dusch (Wikells 17.034, 30 816) och',
    'badrum_inredning (Wikells 17.032, 9 274). Båda innehöll ~85 % inrednings-',
    'artiklar (WC-stol, blandare, spegel, skåp, toalettpapper) vilket strider',
    'mot Wikells-byggdels-principen ovan. Borttagna och ersatta av UE-VS.'
  ];

  for (let i = 0; i < tillagg.length; i++) {
    setCell(ws, XLSX.utils.encode_cell({ r: nextRow + i, c: 0 }), tillagg[i]);
  }

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: nextRow + tillagg.length - 1, c: Math.max(range.e.c, 0) }
  });

  console.log('  ✓ Flik 5 Förklaring: la till ' + tillagg.length + ' rader (renoveringsprincip + moms + UE-taggar + badrum-struktur)');
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

function main() {
  console.log('Läser ' + XLSX_PATH + '...');
  const wb = XLSX.readFile(XLSX_PATH);

  console.log();
  console.log('Applicerar ändringar:');
  updateFlik1(wb);
  updateFlik3(wb);
  updateFlik5(wb);

  console.log();
  console.log('Skriver master.xlsx tillbaka...');
  XLSX.writeFile(wb, XLSX_PATH);
  console.log('  ✅ Sparad');

  console.log();
  console.log('═══ READ-BACK ═══');
  const wb2 = XLSX.readFile(XLSX_PATH);
  const ws1 = wb2.Sheets['Priser'];
  const idx2 = buildIdIndex(ws1);
  const range1 = XLSX.utils.decode_range(ws1['!ref']);
  console.log('Flik 1 dimensioner: ' + ws1['!ref']);

  // Verifiera tagLabel-header
  const tagHdr = ws1[XLSX.utils.encode_cell({ r: 0, c: COL.TagLabel })];
  console.log('  tagLabel-header: "' + (tagHdr ? tagHdr.v : 'SAKNAS') + '"');

  // Verifiera ingen badrum_wc_dusch / badrum_inredning
  const removed = ['badrum_wc_dusch', 'badrum_inredning'];
  for (const id of removed) {
    console.log('  ' + id + ': ' + (idx2.has(id) ? '❌ FINNS KVAR' : '✅ borttagen'));
  }

  // Verifiera badrum_ue_vs och badrum_ue_el
  for (const id of ['badrum_ue_vs', 'badrum_ue_el']) {
    const r = idx2.get(id);
    const pris = ws1[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    const etik = ws1[XLSX.utils.encode_cell({ r, c: COL.Etikett })];
    const tag = ws1[XLSX.utils.encode_cell({ r, c: COL.TagLabel })];
    const kalla = ws1[XLSX.utils.encode_cell({ r, c: COL.PrisKalla })];
    console.log('  ' + id + ': pris=' + (pris ? pris.v : '?') + ' källa=' + (kalla ? kalla.v : '?') +
      ' tagLabel=' + (tag ? tag.v : '?') + ' etikett="' + (etik ? etik.v : '?') + '"');
  }

  // Flik 3 verifiera borttagning
  const ws3 = wb2.Sheets['Rum × poster'];
  const range3 = XLSX.utils.decode_range(ws3['!ref']);
  const hdr3 = [];
  for (let c = range3.s.c; c <= range3.e.c; c++) hdr3.push(ws3[XLSX.utils.encode_cell({r:0,c})].v);
  const postIdCol = hdr3.indexOf('Post-ID');
  let f3Count = 0, f3Removed = 0;
  for (let r = 1; r <= range3.e.r; r++) {
    const cell = ws3[XLSX.utils.encode_cell({ r, c: postIdCol })];
    if (!cell || !cell.v) continue;
    f3Count++;
    if (removed.includes(cell.v)) f3Removed++;
  }
  console.log();
  console.log('Flik 3: ' + f3Count + ' rader, ' + f3Removed + ' borttagna poster kvar (ska vara 0)');

  console.log();
  console.log(f3Removed === 0 && !idx2.has('badrum_wc_dusch') && !idx2.has('badrum_inredning')
    ? '🎉 Alla master.xlsx-ändringar verifierade.'
    : '❌ Något saknas — kolla output ovan.');
}

main();
