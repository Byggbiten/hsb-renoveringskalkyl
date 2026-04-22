/**
 * apply-batch2-2026-04-22.js — Engångsscript för Dennis Batch 2.
 *
 * 1. entre_klinker Ingår: lägg till "Rivning förvald" + "Flytspackling förvald" (samma mönster som golv_klinker).
 *    entre_klinker IngårEj: ta bort "Fallspackling"-raden.
 * 2. badrum_dorr kategori: "Tillval" → "Dörr" (egen kategori).
 * X. Flik 3: badrum × badrum_rivning + badrum × badrum_fallspackling — Rendera i kategori "Tillval" → "Golv".
 * Y. badrum_golv_klinker ombyggd till Dennis-egen komposit 8.515 med folieförstärkt tätskikt (+600 kr/m²).
 */

const fs = require('fs');
const XLSX = require('xlsx');

const XLSX_PATH = '.project-context/data/master.xlsx';

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
// Svar 1: entre_klinker E-konsekvens
// ═══════════════════════════════════════════════════════════════════

const RIVNING_INGAR = 'Rivning av befintligt golv — förvald följepost, redan medräknad i totalen';
const SPACKLING_INGAR = 'Flytspackling undergolv — förvald följepost, redan medräknad i totalen';

function fix_1_entre_klinker(ws, idx) {
  const r = idx.get('entre_klinker');
  if (r == null) throw new Error('entre_klinker saknas');

  const ingarCur = String(getCell(ws, r, COL.Ingar) || '');
  const ingarEjCur = String(getCell(ws, r, COL.IngarEj) || '');

  // Rensa Ingår från ev. tidigare förvald-rader + bevara resten
  const ingar = ingarCur.split(';').map((s) => s.trim()).filter((s) =>
    s && !/förvald följepost.*redan medräknad/i.test(s)
  );

  // Lägg förvald-raderna sist i första "sliten" (efter "Läggs som del av golvet")
  // Enklast: bygg ny ordning: "Läggs som del av golvet..." (om finns), sen förvald-rader, sen övrigt
  const laggsSomDel = ingar.find((s) => /Läggs som del av golvet/i.test(s));
  const restIngar = ingar.filter((s) => !/Läggs som del av golvet/i.test(s));
  const newIngar = [];
  if (laggsSomDel) newIngar.push(laggsSomDel);
  newIngar.push(RIVNING_INGAR, SPACKLING_INGAR);
  newIngar.push(...restIngar);
  setCell(ws, r, COL.Ingar, newIngar.join('; '));

  // Ta bort "Fallspackling"-raden från IngårEj (raden "Fallspackling" utan följepost-notering)
  const newIngarEj = ingarEjCur.split(';').map((s) => s.trim()).filter((s) =>
    s && !/^Fallspackling\s*$/i.test(s)
  );
  setCell(ws, r, COL.IngarEj, newIngarEj.join('; '));

  return 'entre_klinker: rivning + spackling → Ingår, "Fallspackling" borttagen från IngårEj';
}

// ═══════════════════════════════════════════════════════════════════
// Svar 2: badrum_dorr kategori → Dörr
// ═══════════════════════════════════════════════════════════════════

function fix_2_badrum_dorr_dorr(ws, idx) {
  const r = idx.get('badrum_dorr');
  if (r == null) throw new Error('badrum_dorr saknas');
  const before = getCell(ws, r, COL.Kategori);
  setCell(ws, r, COL.Kategori, 'Dörr');
  return `badrum_dorr: Kategori "${before}" → "Dörr"`;
}

// ═══════════════════════════════════════════════════════════════════
// Bugg X: Flik 3 — rendera badrum_rivning + badrum_fallspackling i "Golv"
// ═══════════════════════════════════════════════════════════════════

function fix_X_rendering(wb) {
  const ws = wb.Sheets['Rum × poster'];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const hdr = [];
  for (let c = range.s.c; c <= range.e.c; c++) hdr.push(ws[XLSX.utils.encode_cell({r:0, c})].v);
  const rumCol = hdr.indexOf('Rumstyp-ID');
  const postCol = hdr.indexOf('Post-ID');
  const renderCatCol = hdr.indexOf('Rendera i kategori');
  if (rumCol < 0 || postCol < 0 || renderCatCol < 0) throw new Error('Flik 3 saknar nödvändiga kolumner');

  const msgs = [];
  const targets = new Set(['badrum_rivning', 'badrum_fallspackling']);

  for (let r = 1; r <= range.e.r; r++) {
    const rum = ws[XLSX.utils.encode_cell({r, c: rumCol})];
    const post = ws[XLSX.utils.encode_cell({r, c: postCol})];
    if (!rum || !post || rum.v !== 'hall' && rum.v !== 'badrum') {
      // Egentligen: vi vill bara badrum. Men vi söker generellt för dessa post-ID.
    }
    if (rum && rum.v === 'badrum' && post && targets.has(post.v)) {
      const before = getCell(ws, r, renderCatCol);
      setCell(ws, r, renderCatCol, 'Golv');
      msgs.push(`badrum × ${post.v}: "${before}" → "Golv"`);
    }
  }
  return msgs;
}

// ═══════════════════════════════════════════════════════════════════
// Bugg Y: badrum_golv_klinker → 8.515 Byggbiten-komposit
// ═══════════════════════════════════════════════════════════════════

const TATSKIKT_PALAGG = 600;  // Byggbiten-pålägg för folieförstärkt tätskikt (mitten av Dennis 400-800-span)

function fix_Y_badrum_golv_klinker(ws, idx) {
  const r = idx.get('badrum_golv_klinker');
  if (r == null) throw new Error('badrum_golv_klinker saknas');

  const nyttPris = 2555 + TATSKIKT_PALAGG;  // 3155

  setCell(ws, r, COL.Pris, nyttPris, 'n');
  // Säkerställ ingen formel ligger kvar på cellen (vi hårdkodar)
  const priceRef = XLSX.utils.encode_cell({ r, c: COL.Pris });
  if (ws[priceRef] && ws[priceRef].f) delete ws[priceRef].f;

  setCell(ws, r, COL.PrisKalla, 'Byggbiten');
  setCell(ws, r, COL.WikellsID, '8.515');
  setCell(ws, r, COL.WikellsOrig, 'Klinker på våtrumsgolv med folieförstärkt tätskikt');

  // Mtrl/Tim/UE/Spill: kompositbyggdel saknar dessa
  setCell(ws, r, COL.Mtrl, '');
  setCell(ws, r, COL.Tim, '');
  setCell(ws, r, COL.UE, '');
  setCell(ws, r, COL.Spill, '');

  // Uppdaterade rå-artiklar (inkluderar folieförstärkt tätskikt)
  setCell(ws, r, COL.RaaArtiklar,
    'Klinkerplattor 300x300 standard (Wikells Q1.4121500); ' +
    'Folieförstärkt tätskikt enligt BBR/GVK (Byggbiten-tillägg ~' + TATSKIKT_PALAGG + ' kr/m²); ' +
    'Klinkersockel H=100 (Wikells Q1.4421300); ' +
    'Fästmassa och fog; ' +
    'Silikonfog mot vägg och golvbrunn');

  // Ingår — Dennis specificerade 6 punkter
  setCell(ws, r, COL.Ingar,
    'Fallspackling med fall mot golvbrunn (förvald följepost badrum_fallspackling — redan medräknad i totalen); ' +
    'Folieförstärkt tätskikt enligt BBR/GVK; ' +
    'Våtrumsklassad klinker; ' +
    'Fästmassa + fog; ' +
    'Silikonfog mot vägg och golvbrunn; ' +
    'Städning efter läggning');

  // IngårEj — Dennis specificerade 2 punkter (tätskikt-raden BORT)
  setCell(ws, r, COL.IngarEj,
    'Demontering av befintligt ytskikt ingår i rumsrivning (badrum_rivning); ' +
    'Montering av golvbrunn (ingår i UE-VS)');

  setCell(ws, r, COL.WikellsRef, 'Byggbitens komposit 8.515 (Wikells 15.015 + folieförstärkt tätskikt)');

  setCell(ws, r, COL.Anmarkning,
    'Byggbitens komposit baserat på Wikells 15.015 + folieförstärkt tätskikt (Byggbiten-pålägg ' +
    TATSKIKT_PALAGG + ' kr/m². Wbr-sökning gav 0 träffar på "folie"/"tätskikt" som egna artiklar). Dennis beslut 2026-04-22.');

  return `badrum_golv_klinker: 2555 → ${nyttPris} kr/m² (+${TATSKIKT_PALAGG} tätskiktstillägg), källa=Byggbiten 8.515, tätskikt-raden borttagen från IngårEj`;
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

function main() {
  console.log('Läser ' + XLSX_PATH + '...');
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets['Priser'];
  const idx = buildIdIndex(ws);
  console.log('  ' + idx.size + ' poster\n');

  console.log('1. entre_klinker E-konsekvens:');
  console.log('   ' + fix_1_entre_klinker(ws, idx));

  console.log('\n2. badrum_dorr → "Dörr"-kategori:');
  console.log('   ' + fix_2_badrum_dorr_dorr(ws, idx));

  console.log('\nX. Rendering badrum_rivning/fallspackling i Flik 3:');
  const xMsgs = fix_X_rendering(wb);
  xMsgs.forEach((m) => console.log('   ' + m));

  console.log('\nY. badrum_golv_klinker → 8.515 Byggbiten-komposit:');
  console.log('   ' + fix_Y_badrum_golv_klinker(ws, idx));

  console.log('\nSkriver master.xlsx tillbaka...');
  XLSX.writeFile(wb, XLSX_PATH);
  console.log('  ✅ Sparad\n');

  // ══ READ-BACK ══
  console.log('═══ READ-BACK ═══');
  const wb2 = XLSX.readFile(XLSX_PATH);
  const ws2 = wb2.Sheets['Priser'];
  const idx2 = buildIdIndex(ws2);
  let pass = 0, fail = 0;
  const chk = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); c ? pass++ : fail++; };

  // 1. entre_klinker
  {
    const r = idx2.get('entre_klinker');
    const ingar = String(getCell(ws2, r, COL.Ingar));
    const ingarEj = String(getCell(ws2, r, COL.IngarEj));
    chk(ingar.includes('Rivning av befintligt golv — förvald'), 'entre_klinker Ingår har rivning-förvald');
    chk(ingar.includes('Flytspackling undergolv — förvald'), 'entre_klinker Ingår har spackling-förvald');
    chk(!/^Fallspackling\s*$/im.test(ingarEj) && !ingarEj.split(';').some((s) => s.trim() === 'Fallspackling'),
        'entre_klinker IngårEj har INTE en ensam "Fallspackling"-rad');
  }

  // 2. badrum_dorr
  {
    const r = idx2.get('badrum_dorr');
    chk(getCell(ws2, r, COL.Kategori) === 'Dörr', 'badrum_dorr kategori = "Dörr"');
  }

  // X. Flik 3 rendering
  {
    const ws3 = wb2.Sheets['Rum × poster'];
    const range3 = XLSX.utils.decode_range(ws3['!ref']);
    const hdr3 = [];
    for (let c = range3.s.c; c <= range3.e.c; c++) hdr3.push(ws3[XLSX.utils.encode_cell({r:0, c})].v);
    const rumC = hdr3.indexOf('Rumstyp-ID');
    const postC = hdr3.indexOf('Post-ID');
    const rcC = hdr3.indexOf('Rendera i kategori');
    let foundRiv = false, foundFall = false;
    for (let r = 1; r <= range3.e.r; r++) {
      const rum = ws3[XLSX.utils.encode_cell({r, c: rumC})];
      const post = ws3[XLSX.utils.encode_cell({r, c: postC})];
      const rc = ws3[XLSX.utils.encode_cell({r, c: rcC})];
      if (rum && rum.v === 'badrum' && post) {
        if (post.v === 'badrum_rivning') {
          chk(rc && rc.v === 'Golv', 'badrum × badrum_rivning renderInCategory = "Golv"');
          foundRiv = true;
        }
        if (post.v === 'badrum_fallspackling') {
          chk(rc && rc.v === 'Golv', 'badrum × badrum_fallspackling renderInCategory = "Golv"');
          foundFall = true;
        }
      }
    }
    chk(foundRiv, 'badrum_rivning-raden hittad');
    chk(foundFall, 'badrum_fallspackling-raden hittad');
  }

  // Y. badrum_golv_klinker
  {
    const r = idx2.get('badrum_golv_klinker');
    chk(getCell(ws2, r, COL.Pris) === 3155, 'badrum_golv_klinker pris = 3155');
    chk(getCell(ws2, r, COL.PrisKalla) === 'Byggbiten', 'källa = Byggbiten');
    chk(getCell(ws2, r, COL.WikellsID) === '8.515', 'Wikells-ID = 8.515');
    const ingar = String(getCell(ws2, r, COL.Ingar));
    const ingarEj = String(getCell(ws2, r, COL.IngarEj));
    chk(ingar.includes('Folieförstärkt tätskikt enligt BBR/GVK'), 'Ingår har folieförstärkt tätskikt');
    chk(!ingarEj.includes('Tätskikt (ingår i UE-VS)'), 'IngårEj saknar "Tätskikt (ingår i UE-VS)"');
    chk(ingarEj.includes('Montering av golvbrunn (ingår i UE-VS)'), 'IngårEj har golvbrunn-raden');
    chk(ingarEj.includes('Demontering av befintligt ytskikt ingår i rumsrivning'), 'IngårEj har demontering-standardrad');
  }

  console.log('\n══ PASS: ' + pass + '   FAIL: ' + fail + ' ══');
  if (fail > 0) process.exit(1);
}

main();
