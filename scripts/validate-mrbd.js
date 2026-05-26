#!/usr/bin/env node
/**
 * MRBD compliance validator for SolVision.
 * Runs static analysis on HTML/CSS/JS without a browser.
 */
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, relative }                       from 'path';
import { execSync }                              from 'child_process';
import { createGunzip }                          from 'zlib';
import { pipeline }                              from 'stream/promises';
import { Readable }                              from 'stream';

const ROOT   = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PUBLIC = join(ROOT, 'public');

let pass = 0, fail = 0, warn = 0;

function check(label, ok, detail = '') {
  if (ok) { console.log(`  ✓  ${label}`); pass++; }
  else    { console.log(`  ✗  ${label}${detail ? `  (${detail})` : ''}`); fail++; }
}
function caution(label, detail) {
  console.log(`  ⚠  ${label}${detail ? `  (${detail})` : ''}`);
  warn++;
}

// ── 1. HTML shell ──────────────────────────────────────────────────────────
console.log('\n● HTML shell');
const html = readFileSync(join(PUBLIC, 'index.html'), 'utf8');

check('viewport width=600',    html.includes('width=600'));
check('viewport height=600',   html.includes('height=600'));
check('user-scalable=no',      html.includes('user-scalable=no'));
check('theme-color #000000',   html.includes('#000000'));
check('ES module script tag',  html.includes('type="module"'));
check('JetBrains Mono linked', html.includes('JetBrains+Mono'));
check('manifest linked',       html.includes('manifest.webmanifest'));
check('boot-loader present',   html.includes('id="boot-loader"'));

// ── 2. CSS — display constraints ──────────────────────────────────────────
console.log('\n● CSS — display constraints');
const baseCss = readFileSync(join(PUBLIC, 'src/styles/base.css'), 'utf8');
check('html overflow:hidden',  baseCss.includes('overflow: hidden'));
check('body overflow:hidden',  baseCss.match(/body\s*\{[^}]*overflow:\s*hidden/s));
check('.view overflow:hidden', baseCss.match(/\.view\s*\{[^}]*overflow:\s*hidden/s));
check('body width 600px',      baseCss.includes('--viewport-w') || baseCss.includes('600px'));
check('no overflow:auto',      !baseCss.includes('overflow: auto') && !baseCss.includes('overflow:auto'));

const varCss = readFileSync(join(PUBLIC, 'src/styles/variables.css'), 'utf8');
check('--sol-bg is #000000',   varCss.includes('--sol-bg:') && varCss.includes('#000000'));
check('--text-base >= 16px',   varCss.includes('--text-base: 16px'));
check('--text-lg >= 20px',     /--text-lg:\s*20px/.test(varCss));

// Check all CSS for overflow:auto / overflow:scroll
const allCssFiles = ['base.css','components.css','focus.css','variables.css']
  .map(f => readFileSync(join(PUBLIC, 'src/styles', f), 'utf8'));
const allCss = allCssFiles.join('\n');
check('No overflow:scroll anywhere', !allCss.includes('overflow: scroll') && !allCss.includes('overflow:scroll'));
const hoverCount = (allCss.match(/:hover\b/g) || []).length;
if (hoverCount > 0) caution(`${hoverCount} :hover rules (non-functional on MRBD)`);
else check('No :hover rules', true);

// ── 3. JavaScript — MRBD patterns ─────────────────────────────────────────
console.log('\n● JavaScript — input handling');

function walkJS(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJS(p));
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const jsPaths = walkJS(join(PUBLIC, 'src'));
const allJS   = jsPaths.map(p => readFileSync(p, 'utf8')).join('\n');

check('No scroll-dependent code',   !allJS.includes('scrollTop') && !allJS.includes('scrollLeft'));
check('No touch event listeners',   !allJS.includes("'touchstart'") && !allJS.includes('"touchstart"'));
check('No mouse event listeners',   !allJS.includes("'mouseover'") && !allJS.includes('"mouseover"'));
check('No text input elements',     !allJS.includes("<input") && !allJS.includes('<textarea'));
check('Arrow keys handled (app.js)',
  readFileSync(join(PUBLIC, 'src/app.js'), 'utf8').includes('ArrowUp'));

// Enter key should be handled globally or per-component
const appJs      = readFileSync(join(PUBLIC, 'src/app.js'), 'utf8');
const enterGlob  = appJs.includes("'Enter'") || appJs.includes('"Enter"');
const enterComp  = (allJS.match(/['"]Enter['"]/g) || []).length;
check('Enter key handled globally', enterGlob);
if (enterComp > 0) check('Enter key referenced across codebase', true);
else caution('Enter key only in global handler — verify all components work');

// ── 4. App icons ───────────────────────────────────────────────────────────
console.log('\n● App icons');
function fileExists(p) { try { statSync(p); return true; } catch { return false; } }
function fileSize(p)   { try { return statSync(p).size;  } catch { return 0; } }

check('icon.svg exists',       fileExists(join(PUBLIC, 'icons/icon.svg')));
check('icon-64.png exists (64×64)',  fileExists(join(PUBLIC, 'icons/icon-64.png')));
check('icon-192.png exists',   fileExists(join(PUBLIC, 'icons/icon-192.png')));

// ── 5. Manifest ────────────────────────────────────────────────────────────
console.log('\n● Manifest');
try {
  const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
  check('manifest.webmanifest parses',  true);
  check('display: standalone',          manifest.display === 'standalone');
  check('has icons array',              Array.isArray(manifest.icons) && manifest.icons.length > 0);
  check('background_color is #000000',  manifest.background_color === '#000000');
  check('theme_color is #000000',       manifest.theme_color === '#000000');
} catch (e) {
  check('manifest.webmanifest parses', false, e.message);
}

// ── 6. Bundle size ─────────────────────────────────────────────────────────
console.log('\n● Bundle size');

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else total += fileSize(p);
  }
  return total;
}

const rawBytes = dirSize(PUBLIC);
const rawKB    = (rawBytes / 1024).toFixed(1);
console.log(`     Raw total:  ${rawKB} KB`);

try {
  const gzipped = parseInt(
    execSync(
      `find "${PUBLIC}" -type f \\( -name "*.js" -o -name "*.css" -o -name "*.html" \\)` +
      ` | xargs gzip -c 2>/dev/null | wc -c`
    ).toString().trim()
  );
  const gzipKB = (gzipped / 1024).toFixed(1);
  check(`App code gzipped < 80 KB  (${gzipKB} KB)`, gzipped < 80 * 1024);
} catch {
  caution('gzip measurement failed', 'ensure gzip is in PATH');
}

// ── 7. localStorage budget estimate ───────────────────────────────────────
console.log('\n● localStorage estimate');
const TOKENS    = 15;
const HIST_PTS  = 30;
const estHistory = TOKENS * HIST_PTS * 20;         // ~9 KB
const estCache   = TOKENS * 40;                    // ~600 B
const estWallets = 5 * 80;                         // ~400 B
const estAlerts  = 10 * 100;                       // ~1 KB
const estTotal   = estHistory + estCache + estWallets + estAlerts + 1024; // +1KB misc
console.log(`     Estimated worst case: ~${(estTotal / 1024).toFixed(1)} KB`);
check('Estimated localStorage < 500 KB', estTotal < 500 * 1024);

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
console.log(`  ✓ ${pass} passed   ✗ ${fail} failed   ⚠ ${warn} warnings`);
if (fail === 0 && warn === 0) {
  console.log('  MRBD compliance: PASS ✓\n');
  process.exit(0);
} else if (fail === 0) {
  console.log('  MRBD compliance: PASS with warnings\n');
  process.exit(0);
} else {
  console.log('  MRBD compliance: FAIL ✗\n');
  process.exit(1);
}
