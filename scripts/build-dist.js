/**
 * build-dist.js — Skapar fristående dist/renoveringskalkyl.html där allt är inlinat.
 *
 * Läser src/index.html och ersätter:
 *   <link rel="stylesheet" href="style.css">  → <style>...</style>
 *   <script src="data.js?...">                → <script>...</script>
 *   <script src="app.js?...">                 → <script>...</script>
 *
 * Lägger in app-config.json som:
 *   <script>window.APP_CONFIG_JSON = {...};</script>  (före data.js)
 *
 * Resultat: en HTML-fil som fungerar vid dubbelklick (file://-protokoll).
 * Inga nätverksberoenden, ingen fetch, offline-användning.
 *
 * Anv: npm run build-dist
 */

const fs = require('fs');
const path = require('path');

const SRC_HTML = 'src/index.html';
const SRC_CSS = 'src/style.css';
const SRC_DATA = 'src/data.js';
const SRC_APP = 'src/app.js';
const APP_CONFIG = '.project-context/data/app-config.json';

const OUT_DIR = 'dist';
const OUT_HTML = path.join(OUT_DIR, 'renoveringskalkyl.html');

function main() {
  console.log('── build-dist.js ──');

  // Säkerställ att alla källfiler finns
  const inputs = [SRC_HTML, SRC_CSS, SRC_DATA, SRC_APP, APP_CONFIG];
  for (const p of inputs) {
    if (!fs.existsSync(p)) {
      console.error(`❌ Saknas: ${p}`);
      if (p === APP_CONFIG) console.error('   Kör "npm run build-config" först för att generera app-config.json.');
      process.exit(1);
    }
  }

  const html = fs.readFileSync(SRC_HTML, 'utf8');
  const css = fs.readFileSync(SRC_CSS, 'utf8');
  const dataJs = fs.readFileSync(SRC_DATA, 'utf8');
  const appJs = fs.readFileSync(SRC_APP, 'utf8');
  const configJson = fs.readFileSync(APP_CONFIG, 'utf8');

  console.log('  Läst: html ' + html.length + 'b, css ' + css.length + 'b, data.js ' + dataJs.length + 'b, app.js ' + appJs.length + 'b, config ' + configJson.length + 'b');

  // 1. Ersätt <link rel="stylesheet" href="style.css"> med inline <style>
  let out = html.replace(
    /<link\s+rel="stylesheet"\s+href="style\.css"\s*>/,
    `<style>\n${css}\n</style>`
  );

  // 2. Lägg in APP_CONFIG_JSON + inline data.js FÖRE raden med data.js-script-tag.
  //    Eftersom data.js nu hanterar båda fallen (fetch eller window.APP_CONFIG_JSON),
  //    räcker det att definiera konstanten före data.js körs.
  const configScript = `<script id="inline-config">window.APP_CONFIG_JSON = ${configJson};</script>`;
  const dataScript = `<script>\n${dataJs}\n</script>`;
  const appScript = `<script>\n${appJs}\n</script>`;

  // Ersätt <script src="data.js?..."> med configScript + dataScript inline
  out = out.replace(
    /<script\s+src="data\.js(?:\?[^"]*)?"\s*><\/script>/,
    configScript + '\n  ' + dataScript
  );

  // Ersätt <script src="app.js?..."> med appScript inline
  out = out.replace(
    /<script\s+src="app\.js(?:\?[^"]*)?"\s*><\/script>/,
    appScript
  );

  // Säkra att alla ersättningar faktiskt gjordes (guard mot regex-miss)
  if (out.includes('style.css') && out.includes('href="style.css"')) {
    console.error('⚠ style.css-länken inte ersatt — kolla index.html-format.');
  }
  if (out.includes('src="data.js')) {
    console.error('⚠ data.js-scripten inte ersatt — kolla index.html-format.');
    process.exit(1);
  }
  if (out.includes('src="app.js')) {
    console.error('⚠ app.js-scripten inte ersatt — kolla index.html-format.');
    process.exit(1);
  }

  // Skriv ut
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_HTML, out, 'utf8');
  const sizeKb = Math.round(out.length / 1024);
  console.log(`  ✅ ${OUT_HTML} (${sizeKb} KB)`);

  // Kopiera även assets/ så loggor etc. finns
  const srcAssets = 'src/assets';
  const distAssets = path.join(OUT_DIR, 'assets');
  if (fs.existsSync(srcAssets)) {
    fs.mkdirSync(distAssets, { recursive: true });
    for (const f of fs.readdirSync(srcAssets)) {
      fs.copyFileSync(path.join(srcAssets, f), path.join(distAssets, f));
    }
    console.log(`  ✅ ${distAssets}/ (${fs.readdirSync(distAssets).length} filer)`);
  }

  // Kopiera PWA-filer (manifest + ikoner) till dist-rot
  const pwaFiles = ['manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'favicon-32.png'];
  for (const f of pwaFiles) {
    const src = path.join('src', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT_DIR, f));
  }
  console.log(`  ✅ ${OUT_DIR}/manifest.json + 5 PWA-ikoner`);

  console.log();
  console.log('🎉 Dist-leverans klar. Öppna ' + OUT_HTML + ' via dubbelklick för att testa offline.');
}

main();
