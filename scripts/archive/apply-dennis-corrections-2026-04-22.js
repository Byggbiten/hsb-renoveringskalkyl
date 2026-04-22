/**
 * apply-dennis-corrections-2026-04-22.js — Engångsscript.
 *
 * Applicerar Dennis 16 korrigeringar på Flik 1 (Priser) i master.xlsx efter hans
 * granskning 2026-04-22. Läser existerande master.xlsx, modifierar cellerna in-place,
 * skriver tillbaka, gör read-back-verifiering.
 *
 * Anv: node scripts/archive/apply-dennis-corrections-2026-04-22.js
 */

const fs = require('fs');
const XLSX = require('xlsx');

const XLSX_PATH = '.project-context/data/master.xlsx';
const TIM_FAKTOR = 930;
const UE_FAKTOR = 1.10;

// Kolumn-index för Flik 1. Matchar layouten från initial-xlsx-from-datajs.js.
const COL = {
  PostID: 0,   // A
  Kategori: 1, // B
  Etikett: 2,  // C
  WikellsOrig: 3, // D
  Enhet: 4,    // E
  Pris: 5,     // F
  PrisKalla: 6, // G
  WikellsID: 7, // H
  Mtrl: 8,     // I
  Tim: 9,      // J
  UE: 10,      // K
  Spill: 11,   // L
  Flaggor: 12, // M
  SmartMap: 13, // N
  RaaArtiklar: 14, // O
  Ingar: 15,   // P
  IngarEj: 16, // Q
  WikellsRef: 17, // R
  Anmarkning: 18  // S
};

// Mappa Post-ID → rad-index (0-based data-rad, dvs rad 2 i Excel = dataIdx 0)
function buildIdIndex(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const map = new Map();
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: COL.PostID })];
    if (cell && cell.v) map.set(cell.v, r);
  }
  return map;
}

// Sätt cellvärde (nummer eller sträng). Rensa cell med tomt värde eller null.
function setCell(ws, r, c, value, type) {
  const ref = XLSX.utils.encode_cell({ r, c });
  if (value === null || value === '' || value === undefined) {
    // Sätt tom cell (hellre än delete för att bevara radlayout)
    ws[ref] = { t: 's', v: '' };
  } else if (type === 'n' || typeof value === 'number') {
    ws[ref] = { t: 'n', v: value };
  } else {
    ws[ref] = { t: 's', v: String(value) };
  }
}

// Skriv formel-cell med beräknat värde. rowNum är 1-based Excel-radnummer.
function setFormulaCell(ws, r, rowNum, mtrl, tim, ue, spill) {
  const formula = `I${rowNum}*L${rowNum} + J${rowNum}*930 + K${rowNum}*1.10`;
  const computed = Math.round((mtrl * spill + tim * TIM_FAKTOR + ue * UE_FAKTOR) * 100) / 100;
  ws[XLSX.utils.encode_cell({ r, c: COL.Pris })] = { t: 'n', f: formula, v: computed };
}

// --- Korrigeringar ---

function applyCorrections(ws, idx) {
  const corrections = [];

  // Hjälpare: applicera Wikells-härledning (sätter alla Wikells-fält + formel)
  function setWikells(postId, { wikellsId, origNamn, mtrl, tim, ue, spill, raaArtiklar, wikellsRef, anmarkning = '' }) {
    const r = idx.get(postId);
    if (r == null) throw new Error('Saknad post: ' + postId);
    const rowNum = r + 1;  // 1-based Excel-rad
    setCell(ws, r, COL.PrisKalla, 'Wikells');
    setCell(ws, r, COL.WikellsID, wikellsId);
    setCell(ws, r, COL.WikellsOrig, origNamn);
    setCell(ws, r, COL.Mtrl, mtrl, 'n');
    setCell(ws, r, COL.Tim, tim, 'n');
    setCell(ws, r, COL.UE, ue, 'n');
    setCell(ws, r, COL.Spill, spill, 'n');
    setCell(ws, r, COL.RaaArtiklar, raaArtiklar);
    setCell(ws, r, COL.WikellsRef, wikellsRef);
    setCell(ws, r, COL.Anmarkning, anmarkning);
    setFormulaCell(ws, r, rowNum, mtrl, tim, ue, spill);
    corrections.push(`  ✓ ${postId}: Wikells ${wikellsId}, formel (värde ~${Math.round(mtrl * spill + tim * 930 + ue * 1.10)} kr)`);
  }

  // Hjälpare: applicera hårdkodat pris (rensar Wikells-fälten om de ska vara tomma)
  function setHardcoded(postId, { pris, kalla, wikellsId = '', origNamn = '', mtrl = '', tim = '', ue = '', spill = '', raaArtiklar = '', wikellsRef = '', anmarkning = '', etikett = null, ingar = null, ingarEj = null, smartMap = null }) {
    const r = idx.get(postId);
    if (r == null) throw new Error('Saknad post: ' + postId);
    if (etikett !== null) setCell(ws, r, COL.Etikett, etikett);
    setCell(ws, r, COL.Pris, pris, 'n');
    setCell(ws, r, COL.PrisKalla, kalla);
    setCell(ws, r, COL.WikellsID, wikellsId);
    setCell(ws, r, COL.WikellsOrig, origNamn);
    setCell(ws, r, COL.Mtrl, mtrl);
    setCell(ws, r, COL.Tim, tim);
    setCell(ws, r, COL.UE, ue);
    setCell(ws, r, COL.Spill, spill);
    setCell(ws, r, COL.RaaArtiklar, raaArtiklar);
    setCell(ws, r, COL.WikellsRef, wikellsRef);
    setCell(ws, r, COL.Anmarkning, anmarkning);
    if (ingar !== null) setCell(ws, r, COL.Ingar, ingar);
    if (ingarEj !== null) setCell(ws, r, COL.IngarEj, ingarEj);
    if (smartMap !== null) setCell(ws, r, COL.SmartMap, smartMap);
    corrections.push(`  ✓ ${postId}: hårdkodat ${pris} kr, källa=${kalla}`);
  }

  // Hjälpare: uppdatera bara Pris + Anmärkning (behåll Wikells-kedjan)
  function setPriceAndNote(postId, pris, anmarkning) {
    const r = idx.get(postId);
    if (r == null) throw new Error('Saknad post: ' + postId);
    setCell(ws, r, COL.Pris, pris, 'n');
    setCell(ws, r, COL.Anmarkning, anmarkning);
    corrections.push(`  ✓ ${postId}: pris ${pris} kr, Anmärkning uppdaterad`);
  }

  // === 1. Sockel ===
  setWikells('sockel', {
    wikellsId: '8.132',
    origNamn: 'Socklar, målade',
    mtrl: 28.5,
    tim: 0.10,
    ue: 0,
    spill: 1.1,
    raaArtiklar: 'Sockellist, 12x56 vitmålad',
    wikellsRef: 'Wikells byggdel 8.132',
    anmarkning: ''
  });

  // === 2. Ekparkett ===
  setPriceAndNote('golv_ekparkett', 757, 'Enligt Wikells 15.016. Dennis beslut 2026-04-22.');

  // === 3. Klinker (hall/toalett) ===
  setPriceAndNote('golv_klinker', 2593, 'Enligt Wikells 15.015 (inkl. fuktskydd + klinkersockel). Dennis beslut 2026-04-22.');

  // === 4. Entréklinker ===
  // Här behöver jag ersätta hela raden's Wikells-kedja + etikett-relaterade fält
  {
    const postId = 'entre_klinker';
    const r = idx.get(postId);
    const rowNum = r + 1;
    const mtrl = 646, tim = 1.2, ue = 0, spill = 1.06;
    setCell(ws, r, COL.PrisKalla, 'Wikells');
    setCell(ws, r, COL.WikellsID, '15.015');
    setCell(ws, r, COL.WikellsOrig, 'Klinker på golv (torrt rum)');
    setCell(ws, r, COL.Mtrl, mtrl, 'n');
    setCell(ws, r, COL.Tim, tim, 'n');
    setCell(ws, r, COL.UE, ue, 'n');
    setCell(ws, r, COL.Spill, spill, 'n');
    setCell(ws, r, COL.RaaArtiklar, 'Klinkerplattor, 300x300 standard');
    setCell(ws, r, COL.Ingar, 'Klinkerplattor 300x300; Sättbruk; Fogning');
    setCell(ws, r, COL.IngarEj, 'Fuktskydd (ej behövligt i torra rum); Klinkersockel (ej behövligt i torra rum); Fallspackling');
    setCell(ws, r, COL.WikellsRef, 'Wikells 15.015 (artikel 1/3 — torr variant)');
    setCell(ws, r, COL.SmartMap, 'Från Wikells 15.015, endast klinkerplatte-artikeln. Fuktskydd och klinkersockel utelämnade eftersom entré/kök/hall är torra utrymmen.');
    setCell(ws, r, COL.Anmarkning, 'Torr variant av 15.015. Dennis beslut 2026-04-22.');
    setFormulaCell(ws, r, rowNum, mtrl, tim, ue, spill);
    corrections.push(`  ✓ entre_klinker: Wikells 15.015 (torr), formel (värde ~${Math.round(mtrl * spill + tim * 930 + ue * 1.10)} kr)`);
  }

  // === 5. Vägg kakel (toalett) ===
  setPriceAndNote('vagg_kakel', 1483, 'Enligt Wikells 15.027. Dennis beslut 2026-04-22.');

  // === 6. Fönstermålning → Patrik Norlén ===
  setHardcoded('fonster_malning', {
    pris: 1350,
    kalla: 'Byggbiten',
    wikellsRef: 'Patrik Norlén (UE-målare) — offertpris 2026',
    anmarkning: 'Patrik Norléns ommålningspris. Ersätter wbr 14.047 (bara karm-oljefärg — otillräcklig scope).'
  });

  // === 7. Garderob 60's → Marbodal ===
  setHardcoded('garderob_60', {
    pris: 3600,
    kalla: 'HSB-förhandlat',
    etikett: "Marbodal 60's garderob",
    ingar: "Marbodal 60's garderobsstomme; Montering",
    ingarEj: 'Inredning (hyllor, lådor utöver standard); Belysning',
    wikellsRef: 'HSB-avtalspris Marbodal 2026',
    anmarkning: 'HSB-förhandlat Marbodal-pris. Ersätter wbr 17.020 (Wikells standard-garderob 14600).'
  });

  // === 8. Hatthylla → HSB-förhandlat ===
  {
    const r = idx.get('hatthylla');
    setCell(ws, r, COL.Pris, 1450, 'n');
    setCell(ws, r, COL.PrisKalla, 'HSB-förhandlat');
    setCell(ws, r, COL.WikellsRef, 'HSB-avtalspris 2026');
    setCell(ws, r, COL.Anmarkning, 'HSB-förhandlat pris. Dennis beslut 2026-04-22.');
    // Ta bort ev placeholder-flagga i Beräkning-flaggor
    const flagCell = ws[XLSX.utils.encode_cell({ r, c: COL.Flaggor })];
    if (flagCell && flagCell.v) {
      const newFlags = String(flagCell.v).split(',').map((s) => s.trim()).filter((s) => s && s !== 'placeholder').join(', ');
      setCell(ws, r, COL.Flaggor, newFlags);
    }
    corrections.push('  ✓ hatthylla: 1450 kr, HSB-förhandlat, placeholder-flagga bort');
  }

  // === 9. Badrum UE El ===
  {
    const r = idx.get('badrum_ue_el');
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, 'Byggbiten UE-schablon');
    setCell(ws, r, COL.Anmarkning, 'Byggbiten-schablon för ELs UE. Wbr 20.002 har nollvärden (bara slot för kundens offert).');
    // Cellen hade inte formel tidigare (flera artiklar förmodligen), men säkerställ att det inte finns formel kvar
    const priceCell = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    if (priceCell && priceCell.f) {
      delete priceCell.f;
      priceCell.v = 8000;
    }
    corrections.push('  ✓ badrum_ue_el: Byggbiten-schablon, Wikells-fält rensade');
  }

  // === 10. Badrum UE VS ===
  {
    const r = idx.get('badrum_ue_vs');
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, 'Byggbiten UE-schablon');
    setCell(ws, r, COL.Anmarkning, 'Byggbiten-schablon för VS UE. Wbr 20.003 har nollvärden.');
    const priceCell = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    if (priceCell && priceCell.f) { delete priceCell.f; priceCell.v = 12000; }
    corrections.push('  ✓ badrum_ue_vs: Byggbiten-schablon, Wikells-fält rensade');
  }

  // === 11. Skyddstäckning ===
  {
    const r = idx.get('skyddstackning');
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, 'Byggbiten-schablon per rum');
    setCell(ws, r, COL.Anmarkning, 'Byggbiten schablon per rum. Wbr 14.017 räknas per m² — inte jämförbart.');
    const priceCell = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    if (priceCell && priceCell.f) { delete priceCell.f; priceCell.v = 450; }
    corrections.push('  ✓ skyddstackning: Byggbiten-schablon, Wikells-fält rensade');
  }

  // === 12. Takmålning ===
  {
    const r = idx.get('malning_tak');
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, 'Byggbiten-kalibrerat');
    setCell(ws, r, COL.Anmarkning, 'Byggbiten-kalibrerat pris för ommålning tak inkl arbete. Wbr 14.038 är bara materialet.');
    const priceCell = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    if (priceCell && priceCell.f) { delete priceCell.f; priceCell.v = 144; }
    corrections.push('  ✓ malning_tak: Byggbiten-kalibrerat, Wikells-fält rensade');
  }

  // === 13. Väggmålning ===
  {
    const r = idx.get('malning_vagg');
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, 'Byggbiten-kalibrerat');
    setCell(ws, r, COL.Anmarkning, 'Byggbiten-kalibrerat pris för ommålning väggar inkl arbete.');
    const priceCell = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    if (priceCell && priceCell.f) { delete priceCell.f; priceCell.v = 144; }
    corrections.push('  ✓ malning_vagg: Byggbiten-kalibrerat, Wikells-fält rensade');
  }

  // === 14. Badrum rivning ===
  {
    const r = idx.get('badrum_rivning');
    setCell(ws, r, COL.PrisKalla, 'Byggbiten');
    setCell(ws, r, COL.WikellsID, '');
    setCell(ws, r, COL.WikellsOrig, '');
    setCell(ws, r, COL.Mtrl, '');
    setCell(ws, r, COL.Tim, '');
    setCell(ws, r, COL.UE, '');
    setCell(ws, r, COL.Spill, '');
    setCell(ws, r, COL.RaaArtiklar, '');
    setCell(ws, r, COL.WikellsRef, 'Byggbiten-schablon');
    setCell(ws, r, COL.Anmarkning, 'Byggbiten-schablon — inkl. rivning av inredning. Bredare scope än wbr 15.001 (bara klinker).');
    const priceCell = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    if (priceCell && priceCell.f) { delete priceCell.f; priceCell.v = 1200; }
    corrections.push('  ✓ badrum_rivning: Byggbiten-schablon, Wikells-fält rensade');
  }

  // === 15. Rensa kvarvarande "Pris-diff: ... — välj vilket som gäller" ===
  const range = XLSX.utils.decode_range(ws['!ref']);
  let cleaned = 0;
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: COL.Anmarkning })];
    if (!cell || !cell.v) continue;
    const before = String(cell.v);
    // Ta bort "Pris-diff: data.js=X kr, wbr=Y kr — välj vilket som gäller" (med eller utan omslutande " | ")
    let after = before.replace(/\s*\|\s*Pris-diff:[^|]*?— välj vilket som gäller/g, '');
    after = after.replace(/^Pris-diff:[^|]*?— välj vilket som gäller\s*\|?\s*/g, '');
    after = after.replace(/^Pris-diff:[^|]*?— välj vilket som gäller\s*$/g, '');
    after = after.trim();
    if (after !== before) {
      setCell(ws, r, COL.Anmarkning, after);
      cleaned++;
    }
  }
  corrections.push(`  ✓ Rensade "Pris-diff: ..."-text från ${cleaned} Anmärkning-celler (punkt 15)`);

  // === 16. innerdorr_malning — ingen ändring ===
  corrections.push('  • innerdorr_malning: oförändrad (wbr-formel 1212 kr kvar)');

  return corrections;
}

// --- Read-back ---
function readBack(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const rows = [];
  for (let r = 1; r <= range.e.r; r++) {
    const postId = ws[XLSX.utils.encode_cell({ r, c: COL.PostID })];
    if (!postId || !postId.v) continue;
    const etikett = ws[XLSX.utils.encode_cell({ r, c: COL.Etikett })];
    const pris = ws[XLSX.utils.encode_cell({ r, c: COL.Pris })];
    const kalla = ws[XLSX.utils.encode_cell({ r, c: COL.PrisKalla })];
    const wid = ws[XLSX.utils.encode_cell({ r, c: COL.WikellsID })];
    const mtrl = ws[XLSX.utils.encode_cell({ r, c: COL.Mtrl })];
    const tim = ws[XLSX.utils.encode_cell({ r, c: COL.Tim })];
    const ue = ws[XLSX.utils.encode_cell({ r, c: COL.UE })];
    const spill = ws[XLSX.utils.encode_cell({ r, c: COL.Spill })];
    const anm = ws[XLSX.utils.encode_cell({ r, c: COL.Anmarkning })];
    rows.push({
      id: postId.v,
      etikett: etikett ? etikett.v : '',
      prisV: pris ? pris.v : '',
      prisF: pris && pris.f ? pris.f : '',
      kalla: kalla ? kalla.v : '',
      wikellsId: wid ? wid.v : '',
      mtrl: mtrl ? mtrl.v : '',
      tim: tim ? tim.v : '',
      ue: ue ? ue.v : '',
      spill: spill ? spill.v : '',
      anm: anm ? anm.v : ''
    });
  }
  return rows;
}

// --- Main ---
function main() {
  console.log('Läser ' + XLSX_PATH + '...');
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets['Priser'];
  if (!ws) throw new Error('Flik "Priser" saknas!');
  const idx = buildIdIndex(ws);
  console.log('  ' + idx.size + ' poster hittade');

  console.log();
  console.log('Applicerar 16 korrigeringar:');
  const results = applyCorrections(ws, idx);
  for (const line of results) console.log(line);

  console.log();
  console.log('Skriver master.xlsx tillbaka...');
  XLSX.writeFile(wb, XLSX_PATH);
  console.log('  ✅ Sparad');

  console.log();
  console.log('═══ READ-BACK: Flik 1 (alla 50 poster) ═══');
  const readback = readBack(wb.Sheets['Priser']);
  console.log();
  console.log('Post-ID'.padEnd(30) + ' | ' + 'Etikett'.padEnd(28) + ' | Pris | Källa           | Wik-ID');
  console.log('-'.repeat(30) + '-+-' + '-'.repeat(28) + '-+------+-' + '-'.repeat(15) + '-+--------');
  for (const r of readback) {
    const fmark = r.prisF ? ' [f]' : '    ';
    console.log(
      String(r.id).padEnd(30) + ' | ' +
      String(r.etikett).padEnd(28) + ' | ' +
      String(r.prisV).padStart(6) + fmark + ' | ' +
      String(r.kalla).padEnd(15) + ' | ' +
      String(r.wikellsId)
    );
  }

  // === Verifieringskontroller ===
  console.log();
  console.log('═══ VERIFIERING ═══');

  let warnings = 0;
  const byId = new Map(readback.map((r) => [r.id, r]));

  // (a) entre_klinker och sockel: Wikells-källa med Mtrl/Tim/UE/Spill satta
  for (const id of ['entre_klinker', 'sockel']) {
    const r = byId.get(id);
    if (r.kalla !== 'Wikells') { console.log(`❌ ${id}: kalla=${r.kalla}, förväntat Wikells`); warnings++; continue; }
    if (r.mtrl === '' || r.tim === '' || r.spill === '') { console.log(`❌ ${id}: Mtrl/Tim/Spill ej satta`); warnings++; continue; }
    if (!r.prisF) { console.log(`❌ ${id}: formel saknas`); warnings++; continue; }
    console.log(`✅ ${id}: Wikells ${r.wikellsId}, mtrl=${r.mtrl}, tim=${r.tim}, ue=${r.ue}, spill=${r.spill}, pris=${r.prisV}, formel OK`);
  }

  // (b) Ingen rad har kvar "Pris-diff: ... — välj vilket som gäller"
  let diffKvar = 0;
  for (const r of readback) {
    if (String(r.anm).includes('Pris-diff:') && String(r.anm).includes('välj vilket')) {
      console.log(`❌ ${r.id}: Anmärkning innehåller kvar Pris-diff: "${r.anm}"`);
      diffKvar++;
    }
  }
  if (diffKvar === 0) console.log('✅ Ingen rad har kvar "Pris-diff: ... — välj vilket som gäller"');
  else warnings += diffKvar;

  // (c) Alla formel-priser har både .f och .v satt
  for (const r of readback) {
    if (r.prisF && (r.prisV === '' || r.prisV == null)) {
      console.log(`❌ ${r.id}: formel finns men .v saknas`);
      warnings++;
    }
  }

  // (d) Dennis 16 prisbeslut — verifikation av pris-värden
  const expected = {
    'sockel':           { pris: 124.35, kalla: 'Wikells' },
    'golv_ekparkett':   { pris: 757,    kalla: 'Wikells' },
    'golv_klinker':     { pris: 2593,   kalla: 'Wikells' },
    'entre_klinker':    { pris: 1800.76, kalla: 'Wikells' },
    'vagg_kakel':       { pris: 1483,   kalla: 'Wikells' },
    'fonster_malning':  { pris: 1350,   kalla: 'Byggbiten' },
    'garderob_60':      { pris: 3600,   kalla: 'HSB-förhandlat' },
    'hatthylla':        { pris: 1450,   kalla: 'HSB-förhandlat' },
    'badrum_ue_el':     { pris: 8000,   kalla: 'Byggbiten' },
    'badrum_ue_vs':     { pris: 12000,  kalla: 'Byggbiten' },
    'skyddstackning':   { pris: 450,    kalla: 'Byggbiten' },
    'malning_tak':      { pris: 144,    kalla: 'Byggbiten' },
    'malning_vagg':     { pris: 144,    kalla: 'Byggbiten' },
    'badrum_rivning':   { pris: 1200,   kalla: 'Byggbiten' }
  };
  console.log();
  console.log('Priskontroll mot Dennis 16 beslut:');
  for (const [id, exp] of Object.entries(expected)) {
    const r = byId.get(id);
    if (!r) { console.log(`❌ ${id}: saknas`); warnings++; continue; }
    const priceOk = Math.abs(Number(r.prisV) - exp.pris) < 0.5;
    const kallaOk = r.kalla === exp.kalla;
    const mark = priceOk && kallaOk ? '✅' : '❌';
    if (!priceOk || !kallaOk) warnings++;
    console.log(`  ${mark} ${id}: ${r.prisV} kr (förväntat ${exp.pris}), källa=${r.kalla} (förväntat ${exp.kalla})`);
  }

  console.log();
  if (warnings === 0) console.log('🎉 ALLA 16 KORRIGERINGAR VERIFIERADE. Build-pipelinen kan köra.');
  else console.log(`⚠ ${warnings} varning(ar) — kolla output ovan.`);
}

main();
