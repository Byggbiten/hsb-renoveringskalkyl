/**
 * publish-demo.js — Kopierar byggd dist/ till projektroten så GitHub Pages
 * kan serva den från main-branch-root.
 *
 * Kör EFTER `npm run build`. Flödet:
 *   1. npm run build          → skapar dist/renoveringskalkyl.html + PWA-filer
 *   2. npm run publish-demo   → kopierar till rot som index.html
 *   3. git add . && git commit -m "..." && git push
 *   4. GitHub Pages bygger automatiskt om → live-URL uppdateras
 *
 * Anv: npm run publish-demo
 */

const fs = require('fs');
const path = require('path');

const DIST = 'dist';
const ROOT = '.';

function main() {
  if (!fs.existsSync(path.join(DIST, 'renoveringskalkyl.html'))) {
    console.error('❌ dist/renoveringskalkyl.html saknas. Kör "npm run build" först.');
    process.exit(1);
  }

  // 1. Kopiera bundled HTML → index.html i rot
  fs.copyFileSync(
    path.join(DIST, 'renoveringskalkyl.html'),
    path.join(ROOT, 'index.html')
  );
  console.log('  ✅ index.html (' + Math.round(fs.statSync('index.html').size / 1024) + ' KB)');

  // 2. PWA-filer
  const pwa = ['manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'favicon-32.png'];
  for (const f of pwa) {
    if (fs.existsSync(path.join(DIST, f))) {
      fs.copyFileSync(path.join(DIST, f), path.join(ROOT, f));
    }
  }
  console.log('  ✅ manifest.json + 5 ikoner');

  // 3. assets/
  const distAssets = path.join(DIST, 'assets');
  const rootAssets = path.join(ROOT, 'assets');
  if (fs.existsSync(distAssets)) {
    fs.mkdirSync(rootAssets, { recursive: true });
    for (const f of fs.readdirSync(distAssets)) {
      fs.copyFileSync(path.join(distAssets, f), path.join(rootAssets, f));
    }
    console.log('  ✅ assets/ (' + fs.readdirSync(rootAssets).length + ' filer)');
  }

  console.log();
  console.log('🎉 Demo förberedd för GitHub Pages.');
  console.log('   Nästa: git add . && git commit -m "update demo" && git push');
}

main();
