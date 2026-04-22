/**
 * apply-batch1-korrigeringar-2026-04-22.js — Engångsscript.
 *
 * Dennis batch 1 efter UI-genomlysning. Ändrar master.xlsx:
 *
 * 0. Hall → Korridor (behåll rumstyp-id='hall', byt bara Visningsnamn)
 * B. Labels städas (kok_standard/plus, ytterdorr, entre_klinker, badrum_ue_*)
 * C. badrum_dorr kategori → "Tillval"
 * D. badrum_vagg_farg ref: "Cowork-genererad" → "Byggbiten-kalibrerad"
 * E. Golv-poster: rivning → Ingår (förvald, redan medräknad), spackling omformulerad i IngårEj
 * F. Klickvinyl/matta → Alt 3 (Byggbiten-källa, benchmark Wikells)
 * Extra. Flik 5 uppdateras med Korridor vs Entré-förklaring
 *
 * Anv: node scripts/archive/apply-batch1-korrigeringar-2026-04-22.js
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
// 0. Hall → Korridor (Flik 2)
// ═══════════════════════════════════════════════════════════════════

function fix_0_hall_korridor(wb) {
  const ws = wb.Sheets['Rumstyper'];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const hdr = [];
  for (let c = 0; c <= range.e.c; c++) hdr.push(ws[XLSX.utils.encode_cell({r:0, c})].v);
  const idCol = hdr.indexOf('Rumstyp-ID');
  const namnCol = hdr.indexOf('Visningsnamn');
  for (let r = 1; r <= range.e.r; r++) {
    const id = ws[XLSX.utils.encode_cell({r, c: idCol})];
    if (id && id.v === 'hall') {
      setCell(ws, r, namnCol, 'Korridor');
      return 'Rumstyp-ID "hall": Visningsnamn "Hall" → "Korridor" (id bevarat för bakåtkompat)';
    }
  }
  throw new Error('Rumstyp "hall" hittades inte');
}

// ═══════════════════════════════════════════════════════════════════
// B. Labels städas
// ═══════════════════════════════════════════════════════════════════

const LABEL_UPDATES = {
  kok_standard: 'Kök standard',
  kok_plus: 'Kök plus',
  ytterdorr: 'Ytterdörr (Daloc)',
  entre_klinker: 'Klinker',
  badrum_ue_vs: 'Badrumsinredning inkl VVS-installation',
  badrum_ue_el: 'El-installation badrum'
};

function fix_B_labels(ws, idx) {
  const msgs = [];
  for (const [id, newLabel] of Object.entries(LABEL_UPDATES)) {
    const r = idx.get(id);
    if (r == null) continue;
    const before = getCell(ws, r, COL.Etikett);
    setCell(ws, r, COL.Etikett, newLabel);
    msgs.push(`${id}: "${before}" → "${newLabel}"`);
  }
  return msgs;
}

// entre_klinker: lägg till "del av golv"-förklaring i Ingår (eftersom det togs ur labeln)
function fix_B_entre_klinker_ingar(ws, idx) {
  const r = idx.get('entre_klinker');
  if (r == null) return null;
  const existing = String(getCell(ws, r, COL.Ingar) || '').trim();
  const newFirst = 'Läggs som del av golvet — resterande yta använder valt material (ekparkett/klickvinyl/matta)';
  // Ta bort ev. redan befintlig sådan rad och sätt först
  const parts = existing.split(';').map(s => s.trim()).filter(s => s && !/Läggs som del av golvet/i.test(s));
  setCell(ws, r, COL.Ingar, newFirst + (parts.length ? '; ' + parts.join('; ') : ''));
  return 'entre_klinker Ingår: la till "Läggs som del av golvet..." som första rad';
}

// ═══════════════════════════════════════════════════════════════════
// C. badrum_dorr kategori → Tillval
// ═══════════════════════════════════════════════════════════════════

function fix_C_badrum_dorr(ws, idx) {
  const r = idx.get('badrum_dorr');
  if (r == null) throw new Error('badrum_dorr saknas');
  const before = getCell(ws, r, COL.Kategori);
  setCell(ws, r, COL.Kategori, 'Tillval');
  return `badrum_dorr: Kategori "${before}" → "Tillval"`;
}

// ═══════════════════════════════════════════════════════════════════
// D. badrum_vagg_farg: Cowork-genererad → Byggbiten-kalibrerad
// ═══════════════════════════════════════════════════════════════════

function fix_D_vagg_farg_ref(ws, idx) {
  const r = idx.get('badrum_vagg_farg');
  if (r == null) throw new Error('badrum_vagg_farg saknas');
  setCell(ws, r, COL.WikellsRef, 'Byggbiten-kalibrerad byggdel 8.504');
  return 'badrum_vagg_farg ref → "Byggbiten-kalibrerad byggdel 8.504"';
}

// ═══════════════════════════════════════════════════════════════════
// E. Golv-poster: rivning/spackling Dennis-variant
// ═══════════════════════════════════════════════════════════════════

// Rivning är defaultChecked: true för alla 4 golv → flytta till Ingår
// Spackling är defaultChecked: true ENDAST för golv_klinker → till Ingår där
//                defaultChecked: false för ekparkett/klickvinyl/matta → till IngårEj (ny formulering)

const RIVNING_INGAR = 'Rivning av befintligt golv — förvald följepost, redan medräknad i totalen';
const SPACKLING_INGAR = 'Flytspackling undergolv — förvald följepost, redan medräknad i totalen';
const SPACKLING_INGAREJ = 'Flytspackling vid ojämnt underlag — tillval, kryssa i följeposten om underlaget kräver det';

function fix_E_golv_poster(ws, idx) {
  const msgs = [];

  const posts = [
    { id: 'golv_ekparkett',  spackOn: false },
    { id: 'golv_klickvinyl', spackOn: false },
    { id: 'golv_matta',      spackOn: false },
    { id: 'golv_klinker',    spackOn: true }
  ];

  for (const { id, spackOn } of posts) {
    const r = idx.get(id);
    if (r == null) continue;

    const ingar = String(getCell(ws, r, COL.Ingar) || '');
    const ingarEj = String(getCell(ws, r, COL.IngarEj) || '');

    // Rensa ingarEj från gamla "Rivning ... (egen följepost)" + "Flytspackling ... (egen följepost)"
    const cleanedEj = ingarEj.split(';').map(s => s.trim()).filter((s) =>
      s && !/Rivning.*egen f.ljepost/i.test(s) && !/Flytspackling.*egen f.ljepost/i.test(s)
           && !/Flytspackling.*tillval.*kryssa/i.test(s)  // ta bort ev gammal ny-formulering om skriptet körs flera ggr
           && !/Flytspackling.*förvald.*redan/i.test(s)
    );

    // Rensa ingar från gamla "Rivning av befintligt golv — förvald" eller "Flytspackling undergolv — förvald"
    const cleanedIngar = ingar.split(';').map(s => s.trim()).filter((s) =>
      s && !/Rivning av befintligt golv.*förvald.*redan medräknad/i.test(s)
           && !/Flytspackling undergolv.*förvald.*redan medräknad/i.test(s)
    );

    // Lägg till Ingår: Rivning (alltid on) + ev Spackling (bara för klinker)
    const newIngar = [RIVNING_INGAR];
    if (spackOn) newIngar.push(SPACKLING_INGAR);
    newIngar.push(...cleanedIngar);
    setCell(ws, r, COL.Ingar, newIngar.join('; '));

    // IngårEj: för parkett/klickvinyl/matta, lägg till spackling-tillval-formulering
    const newIngarEj = [];
    if (!spackOn) newIngarEj.push(SPACKLING_INGAREJ);
    newIngarEj.push(...cleanedEj);
    setCell(ws, r, COL.IngarEj, newIngarEj.join('; '));

    msgs.push(`${id}: rivning → Ingår${spackOn ? ' + spackling → Ingår' : ', spackling omformulerad i IngårEj'}`);
  }

  return msgs;
}

// ═══════════════════════════════════════════════════════════════════
// F. Klickvinyl/Matta → Byggbiten, ref "benchmark Wikells X"
// ═══════════════════════════════════════════════════════════════════

function fix_F_klickvinyl_matta(ws, idx) {
  const msgs = [];

  const changes = [
    {
      id: 'golv_klickvinyl',
      newRef: 'Byggbiten-kalibrerad (benchmark Wikells 15.018 laminat)'
    },
    {
      id: 'golv_matta',
      newRef: 'Byggbiten-kalibrerad (benchmark Wikells 15.020 linoleum)'
    }
  ];

  for (const { id, newRef } of changes) {
    const r = idx.get(id);
    if (r == null) continue;
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, newRef);
    // Om priset har en formel → rensa till bara värde (bevara .v)
    const priceRef = XLSX.utils.encode_cell({ r, c: COL.Pris });
    const priceCell = ws[priceRef];
    if (priceCell && priceCell.f) {
      delete priceCell.f;
      priceCell.t = 'n';
    }
    const anmCur = String(getCell(ws, r, COL.Anmarkning) || '');
    const anm = (anmCur ? anmCur + ' | ' : '') + 'Klickvinyl/heltäckningsmatta saknas som egen byggdel i Wikells HSB-3a. Pris kalibrerat mot laminat/linoleum.';
    setCell(ws, r, COL.Anmarkning, anm);
    msgs.push(`${id}: källa → Byggbiten, ref → "${newRef}"`);
  }

  return msgs;
}

// ═══════════════════════════════════════════════════════════════════
// Flik 5 — lägg till Korridor vs Entré-sektion
// ═══════════════════════════════════════════════════════════════════

function fix_flik5(wb) {
  const ws = wb.Sheets['Förklaring'];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const nextRow = range.e.r + 2;

  const tillagg = [
    '',
    '══════════════════════════════════════════════════════════',
    'RUMSTYPER (2026-04-22): Korridor vs Entré',
    '══════════════════════════════════════════════════════════',
    'Hall omdöpt till "Korridor" för tydlighet. Två separata rumstyper finns:',
    '',
    '  • KORRIDOR = mellankorridor/gångutrymme mellan rum.',
    '    Kan ha klinker på hela golvet (golv_klinker) eller annat golvmaterial.',
    '    Har sockel, taklist, innerdörr, målning, garderob.',
    '',
    '  • ENTRÉ = ingångshall med ytterdörr och hatthylla.',
    '    Klinker läggs som del av golvet (entre_klinker, hasArea, reducesFloor).',
    '    Har även ytterdörr (Daloc) och fönstermålning.',
    '',
    'Samma person kan ha båda i samma kalkyl — de är olika rum.',
    '',
    'Rumstyp-ID i koden är fortfarande "hall" (bakåtkompatibilitet för',
    'sparade kalkyler). Endast Visningsnamn är uppdaterat till "Korridor".'
  ];

  for (let i = 0; i < tillagg.length; i++) {
    setCell(ws, nextRow + i, 0, tillagg[i]);
  }
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: nextRow + tillagg.length - 1, c: Math.max(range.e.c, 0) }
  });
  return `Flik 5: la till ${tillagg.length} rader (Korridor vs Entré-förklaring)`;
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

  console.log('0. Hall → Korridor:');
  console.log('   ' + fix_0_hall_korridor(wb));

  console.log('\nB. Labels:');
  fix_B_labels(ws, idx).forEach((m) => console.log('   ' + m));
  console.log('   ' + fix_B_entre_klinker_ingar(ws, idx));

  console.log('\nC. badrum_dorr:');
  console.log('   ' + fix_C_badrum_dorr(ws, idx));

  console.log('\nD. badrum_vagg_farg ref:');
  console.log('   ' + fix_D_vagg_farg_ref(ws, idx));

  console.log('\nE. Golv-poster (rivning/spackling omplacering):');
  fix_E_golv_poster(ws, idx).forEach((m) => console.log('   ' + m));

  console.log('\nF. Klickvinyl/matta (Alt 3 — Byggbiten + benchmark):');
  fix_F_klickvinyl_matta(ws, idx).forEach((m) => console.log('   ' + m));

  console.log('\nFlik 5:');
  console.log('   ' + fix_flik5(wb));

  console.log('\nSkriver master.xlsx tillbaka...');
  XLSX.writeFile(wb, XLSX_PATH);
  console.log('  ✅ Sparad\n');

  // ═══════════════ READ-BACK ═══════════════
  console.log('═══ READ-BACK ═══');
  const wb2 = XLSX.readFile(XLSX_PATH);
  const ws2 = wb2.Sheets['Priser'];
  const idx2 = buildIdIndex(ws2);
  const rumstyper2 = wb2.Sheets['Rumstyper'];

  let pass = 0, fail = 0;

  function chk(ok, msg) {
    console.log((ok ? '  ✅ ' : '  ❌ ') + msg);
    ok ? pass++ : fail++;
  }

  // Hall → Korridor
  const rs = XLSX.utils.decode_range(rumstyper2['!ref']);
  const rsHdr = [];
  for (let c = 0; c <= rs.e.c; c++) rsHdr.push(rumstyper2[XLSX.utils.encode_cell({r:0, c})].v);
  const idC = rsHdr.indexOf('Rumstyp-ID');
  const nmC = rsHdr.indexOf('Visningsnamn');
  for (let r = 1; r <= rs.e.r; r++) {
    const id = rumstyper2[XLSX.utils.encode_cell({r, c: idC})];
    if (id && id.v === 'hall') {
      const nm = rumstyper2[XLSX.utils.encode_cell({r, c: nmC})];
      chk(nm && nm.v === 'Korridor', 'Hall Visningsnamn → Korridor');
      break;
    }
  }

  // Labels
  for (const [id, expected] of Object.entries(LABEL_UPDATES)) {
    const r = idx2.get(id);
    const got = getCell(ws2, r, COL.Etikett);
    chk(got === expected, `${id} label = "${got}"`);
  }

  // badrum_dorr kategori
  {
    const r = idx2.get('badrum_dorr');
    chk(getCell(ws2, r, COL.Kategori) === 'Tillval', 'badrum_dorr kategori = Tillval');
  }

  // badrum_vagg_farg ref
  {
    const r = idx2.get('badrum_vagg_farg');
    chk(getCell(ws2, r, COL.WikellsRef) === 'Byggbiten-kalibrerad byggdel 8.504',
        'badrum_vagg_farg ref uppdaterad');
  }

  // Golv-poster E
  for (const id of ['golv_ekparkett', 'golv_klickvinyl', 'golv_matta']) {
    const r = idx2.get(id);
    const ingar = String(getCell(ws2, r, COL.Ingar));
    const ingarEj = String(getCell(ws2, r, COL.IngarEj));
    chk(ingar.startsWith('Rivning av befintligt golv — förvald'),
        `${id}: Ingår börjar med rivning-förvald-texten`);
    chk(ingarEj.includes('Flytspackling vid ojämnt underlag — tillval'),
        `${id}: IngårEj har spackling-tillval-text`);
    chk(!ingarEj.includes('Rivning') && !/Flytspackling.*egen f.ljepost/i.test(ingarEj),
        `${id}: IngårEj saknar gamla "(egen följepost)"-rader`);
  }
  // golv_klinker har spackling = on
  {
    const r = idx2.get('golv_klinker');
    const ingar = String(getCell(ws2, r, COL.Ingar));
    chk(ingar.includes('Rivning av befintligt golv — förvald'), 'golv_klinker: rivning i Ingår');
    chk(ingar.includes('Flytspackling undergolv — förvald'), 'golv_klinker: spackling i Ingår');
  }

  // Klickvinyl/Matta → Byggbiten
  for (const id of ['golv_klickvinyl', 'golv_matta']) {
    const r = idx2.get(id);
    chk(getCell(ws2, r, COL.PrisKalla) === 'Byggbiten', `${id}: källa = Byggbiten`);
    const ref = getCell(ws2, r, COL.WikellsRef);
    chk(ref.includes('benchmark Wikells'), `${id}: ref innehåller "benchmark Wikells"`);
  }

  console.log('\n══ PASS: ' + pass + '   FAIL: ' + fail + ' ══');
  if (fail > 0) process.exit(1);
}

main();
