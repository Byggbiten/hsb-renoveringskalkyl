/**
 * parse-wbr.js — Engångsscript. Parsear en Wikells .wbr-fil (zip + iso-8859-1-XML)
 * till strukturerad JSON som används av initial-xlsx-from-datajs.js för att populera
 * master.xlsx Flik 4 (Wbr-byggdelar) med artikel-detaljer.
 *
 * Ingen runtime-användning — scriptet körs när Dennis laddar ner en ny wbr från
 * Wikells Sektionsdata. Kan då diffa mot tidigare parsed JSON för prisuppdateringar.
 *
 * Anv: node scripts/archive/parse-wbr.js <wbr-path> <output-json-path>
 * Ex:  node scripts/archive/parse-wbr.js \
 *        .project-context/data/wbr-source/HSB-3a-ROT-helrenovering-v6.wbr \
 *        .project-context/data/wbr-source/HSB-3a-v6-parsed.json
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const iconv = require('iconv-lite');

// Omkostnadsformel per byggdel:
//   pris = Σ(MaterialPris × Spill × Åtgång)
//        + Σ(Tid × 930 × Åtgång)             [930 = 250 kr/h × 3.72 påslag]
//        + Σ(UE × 1.10 × Åtgång)             [1.10 = 10 % UE-påslag]
const TIM_FAKTOR = 250 * 3.72;   // = 930
const UE_FAKTOR = 1.10;

function main() {
  const [, , wbrPath, outPath] = process.argv;
  if (!wbrPath || !outPath) {
    console.error('Användning: node parse-wbr.js <wbr-path> <output-json-path>');
    process.exit(1);
  }

  const buf = fs.readFileSync(wbrPath);
  const xml = extractKalkylXml(buf);
  const byggdelar = parseByggdelar(xml);

  const output = {
    source: path.basename(wbrPath),
    parsed: new Date().toISOString(),
    byggdelarCount: byggdelar.length,
    byggdelar: byggdelar
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`✅ Parsat ${byggdelar.length} byggdelar från ${path.basename(wbrPath)}`);
  console.log(`   Total artiklar: ${byggdelar.reduce((n, b) => n + b.artiklar.length, 0)}`);
  console.log(`   Unika DatabasByggdelID: ${new Set(byggdelar.map((b) => b.databasId)).size}`);
  console.log(`   Output: ${outPath}`);

  // Kvalitets-indikatorer
  const utanArtiklar = byggdelar.filter((b) => b.artiklar.length === 0).length;
  const utanId = byggdelar.filter((b) => !b.databasId).length;
  if (utanArtiklar) console.log(`   ⚠ ${utanArtiklar} byggdelar saknar artiklar`);
  if (utanId) console.log(`   ⚠ ${utanId} byggdelar saknar DatabasByggdelID`);
}

// --- Zip-extraktion: wbr är en PKZIP-fil med exakt en entry (Kalkyl.xml) ---

function extractKalkylXml(buf) {
  // Läs Local File Header för första (och enda) entry.
  const sig = buf.readUInt32LE(0);
  if (sig !== 0x04034b50) throw new Error('Ogiltig wbr-fil: PKZIP-magic saknas.');
  const method = buf.readUInt16LE(8);      // 8 = deflate, 0 = stored
  const compSize = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const name = buf.slice(30, 30 + nameLen).toString('utf8');
  if (name !== 'Kalkyl.xml') {
    console.warn(`⚠ Oväntat filnamn i wbr: '${name}' (förväntade 'Kalkyl.xml')`);
  }
  const dataStart = 30 + nameLen + extraLen;
  const compData = buf.slice(dataStart, dataStart + compSize);
  const rawXml = method === 8 ? zlib.inflateRawSync(compData) : compData;
  return iconv.decode(rawXml, 'iso-8859-1');
}

// --- XML-parsing: wbr-XML är platt (max 3 nivåer), så regex räcker ---

function parseByggdelar(xml) {
  const result = [];
  const postRe = /<KalkylPost>([\s\S]*?)<\/KalkylPost>/g;
  let m;
  while ((m = postRe.exec(xml)) !== null) {
    const inner = m[1];
    const databasId = tag(inner, 'DatabasByggdelID') || '';
    const identitet = tag(inner, 'Identitet') || '';
    const enhet = tag(inner, 'Enhet') || '';
    const mangd = num(tag(inner, 'Mängd'));
    const artiklar = parseArtiklar(inner);

    const summor = summeraByggdel(artiklar);

    result.push({
      databasId,
      identitet,
      enhet,
      mangd,
      artiklar,
      mtrlSum: summor.mtrl,
      timSum: summor.tim,
      ueSum: summor.ue,
      beraknatPris: summor.pris
    });
  }
  return result;
}

function parseArtiklar(postXml) {
  const result = [];
  const re = /<ArtikelRad>([\s\S]*?)<\/ArtikelRad>/g;
  let m;
  while ((m = re.exec(postXml)) !== null) {
    const inner = m[1];
    result.push({
      databasArtikelId: tag(inner, 'DatabasArtikelID') || '',
      benamning: tag(inner, 'Benämning') || '',
      enhet: tag(inner, 'Enhet') || '',
      materialPris: num(tag(inner, 'MaterialPris')),
      tid: num(tag(inner, 'Tid')),
      ue: num(tag(inner, 'UE')),
      spill: num(tag(inner, 'SpillKoefficient'), 1),
      atgang: num(tag(inner, 'Åtgång'), 1),
      aktiverad: (tag(inner, 'Aktiverad') || '').toLowerCase() !== 'false'
    });
  }
  return result;
}

function summeraByggdel(artiklar) {
  let mtrl = 0, tim = 0, ue = 0;
  for (const a of artiklar) {
    if (!a.aktiverad) continue;
    mtrl += a.materialPris * a.spill * a.atgang;
    tim += a.tid * a.atgang;
    ue += a.ue * a.atgang;
  }
  const pris = mtrl + tim * TIM_FAKTOR + ue * UE_FAKTOR;
  return {
    mtrl: round2(mtrl),
    tim: round2(tim),
    ue: round2(ue),
    pris: Math.round(pris)
  };
}

// --- Helpers ---

function tag(xml, name) {
  // Exempel: tag('<ID>abc</ID>', 'ID') → 'abc'. Tar bort ev. whitespace runt inner.
  const re = new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function num(s, fallback = 0) {
  if (s == null || s === '') return fallback;
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function round2(x) { return Math.round(x * 100) / 100; }

main();
