// Tar skjermbilder av appen (Søk, Avganger, Rutetabell og den klassiske rutetabellen) på et valgt tidspunkt.
// Bruker det ferdige bygget i dist/, så kjør `npm run build` først.
//
//   node .claude/skills/veierland-ferge/scripts/skjermbilder.mjs <utmappe> [tidspunkt] [tema]
//   tidspunkt: f.eks. 2026-11-07T09:40 (norsk vintertid, +01:00; legg til +02:00 om sommeren). Standard: nå.
//   tema: fjord (standard), driftwood (mørk), midnattsol, lanterne
//
// All trafikk ut av maskinen blokkeres, så bildene viser rutetidene i dist/ (ikke admin-data fra Firestore).
// Fergeposisjonen (/api/ferry) er en fast, oppdiktet posisjon mellom Tenvik og Tangen.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [outDir, when, theme = 'fjord'] = process.argv.slice(2);
if (!outDir) {
  console.error('Bruk: node skjermbilder.mjs <utmappe> [tidspunkt] [tema]');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* ikke i prosjektet */ }
  const root = execSync('npm root -g').toString().trim();
  return import(pathToFileURL(path.join(root, 'playwright', 'index.mjs')).href);
}

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const up = () => fetch(BASE).then(r => r.ok, () => false);

let server = null;
if (!(await up())) {
  server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise(r => setTimeout(r, 250));
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', locale: 'nb-NO', timezoneId: 'Europe/Oslo' });
await ctx.addInitScript(t => {
  localStorage.setItem('onboarded', 'true');
  localStorage.setItem('tourSeen', 'true');
  localStorage.setItem('themeKey', t);
}, theme);
await ctx.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'localhost') return route.continue();
  return route.abort();
});
const now = when ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(when) ? when : `${when}+01:00`) : new Date();
await ctx.route('**/api/ferry', route => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ lat: 59.1640, lng: 10.3515, sog: 8.4, cog: 225, heading: 224, time: new Date(now.getTime() - 60000).toISOString(), name: 'TEST' }),
}));

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
if (when) await page.clock.setFixedTime(now);

const shots = [];
async function shot(name, fullPage = false) {
  const file = path.join(outDir, `${name}.png`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage });
  shots.push(file);
}

await page.goto(BASE);
await shot('1-sok');
await page.getByRole('button', { name: 'Avganger' }).last().click();
await shot('2-avganger', true);
await page.getByRole('button', { name: 'Rutetabell' }).last().click();
await shot('3-rutetabell', true);
await page.goto(`${BASE}/rutetabell.html`);
await shot('4-klassisk-rutetabell', true);

await browser.close();
if (server) server.kill();
console.log(shots.join('\n'));
if (errors.length) {
  console.log(`\nFeil i siden:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
