// Rå skjermbilder til butikkene: iPhone (440x956 @3 = 1320x2868) og iPad liggende (1376x1032 @2 = 2752x2064),
// med oppdiktede data (ferge, vær, andre båter, punktlighet). Kjør fra repoet etter `npm run build`:
//   node .claude/skills/veierland-ferge/scripts/butikkbilder/ta-bilder.mjs <mappe>/raw [ios|ipad]
//   node .claude/skills/veierland-ferge/scripts/butikkbilder/sett-sammen.mjs <mappe>
// Ferdige bilder havner i <mappe>/out og kopieres til store/app-store og store/app-store-ipad.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import nodePath from 'node:path';
// Playwright fra prosjektet, ellers den globale installasjonen
async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* ikke i prosjektet */ }
  const root = execSync('npm root -g').toString().trim();
  return import(pathToFileURL(nodePath.join(root, 'playwright', 'index.mjs')).href);
}
const { chromium } = await loadPlaywright();
const root = process.cwd(), out = process.argv[2];
const only = process.argv[3] || 'all';
mkdirSync(out, { recursive: true });
const PORT = 4178, BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
const up = () => fetch(BASE).then(r => r.ok, () => false);
for (let i = 0; i < 60 && !(await up()); i++) await new Promise(r => setTimeout(r, 250));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// Tirsdag 25. mai 2027 kl. 09:58. Ferga har gått fra Tangen 09:45, via Vestgården, og er på vei mot Tenvik.
const now = new Date('2027-05-25T09:58:00+02:00');
const nowMin = 9 * 60 + 58, m = (h, mm) => h * 60 + mm;
const pos = { lat: 59.17030, lng: 10.35560, sog: 8.6, cog: 52, heading: 52 };
const hourly = [[3.1, 5.2, 200, 14], [3.6, 6.1, 205, 15], [4.2, 7.0, 210, 16], [4.8, 8.1, 210, 17], [5.4, 9.0, 215, 17], [6.1, 10.2, 215, 18], [6.6, 11.0, 220, 18], [6.2, 10.4, 220, 18], [5.5, 9.1, 225, 17], [4.6, 7.8, 225, 16], [3.8, 6.4, 230, 15], [3.0, 5.0, 230, 14], [2.4, 4.0, 230, 13]];
const t0 = Math.floor(now.getTime() / 3600000) * 3600000;
const hours = hourly.map(([wind, gust, dir, temp], i) => ({ time: new Date(t0 + i * 3600000).toISOString(), temp, wind, gust, dir, fog: 0, precip: 0, symbol: i < 3 ? 'partlycloudy_day' : i < 9 ? 'clearsky_day' : 'fair_day' }));
const conditions = { generated: now.toISOString(), weather: { now: hours[0], hours: hours.slice(1) }, ocean: { waveHeight: 0.3, waveFrom: 205, seaTemp: 12.8, current: 0.1, currentTo: 40 }, alerts: [], water: { cm: 12, measured: true, trend: 'stigende', station: 'Viker' } };
const vessels = { vessels: [
  { mmsi: 1, name: 'SOLGANG', kind: 'fritid', lat: 59.1580, lng: 10.3460, sog: 5.2, cog: 20, heading: 20, length: 10, ageMin: 1 },
  { mmsi: 2, name: 'BRYGGEBÅTEN', kind: 'passasjer', lat: 59.1610, lng: 10.3720, sog: 11.4, cog: 340, heading: 340, length: 18, ageMin: 0 },
  { mmsi: 3, name: 'TARE', kind: 'fiske', lat: 59.1495, lng: 10.3330, sog: 0.2, cog: 0, heading: 120, length: 9, ageMin: 3 },
] };
const live = { day: '2027-05-25', now: nowMin, latest: { min: nowMin - 0.3, ...pos }, calls: [{ stop: 'tenvik', arr: m(9, 4.6), dep: m(9, 15.3) }, { stop: 'vestgarden', arr: m(9, 24.8), dep: m(9, 25.9) }, { stop: 'tangen', arr: m(9, 35.2), dep: m(9, 45.4) }, { stop: 'vestgarden', arr: m(9, 54.7), dep: m(9, 55.6) }],
  trail: [[59.1534, 10.3378], [59.1580, 10.3405], [59.1630, 10.3425], [59.16496, 10.34343], [59.1670, 10.3480], [59.1690, 10.3525], [pos.lat, pos.lng]] };

const days = Array.from({ length: 14 }, (_, i) => new Date(now - (i + 1) * 864e5).toISOString().slice(0, 10));
const departures = {};
for (const t of ['06:20', '07:15', '08:15', '09:15', '10:05', '11:15', '13:45', '14:45', '15:45', '16:15', '17:10', '19:00', '20:00', '21:45']) departures[`monFri|tenvik|${t}`] = { n: 10, avg: 1.2, onTime: 9 };
const stats = { generated: now.toISOString(), timesFrom: null, days, overall: { n: 182, avg: 1.1, onTime: 169 }, departures };
async function open(w, h, dsf, init) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, serviceWorkers: 'block', locale: 'nb-NO', timezoneId: 'Europe/Oslo' });
  await ctx.addInitScript(init => {
    localStorage.setItem('onboarded', 'true'); localStorage.setItem('tourSeen', 'true');
    localStorage.setItem('routeFrom', 'tenvik'); localStorage.setItem('routeTo', 'tangen');
    for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v);
  }, init);
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
  const json = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await ctx.route('**/api/ferry', json({ ...pos, time: new Date(now - 20000).toISOString(), name: 'JUTØYA' }));
  await ctx.route('**/api/ferry-history?live=1', json(live));
  await ctx.route('**/api/conditions', json(conditions));
  await ctx.route('**/api/vessels', json(vessels));
  await ctx.route('**/api/ferry-history?stats=1', json(stats));
  await ctx.route('**/api.met.no/**', json({ properties: { timeseries: hours.map(x => ({ time: x.time, data: { instant: { details: { air_temperature: x.temp, wind_speed: x.wind, wind_from_direction: x.dir } }, next_1_hours: { summary: { symbol_code: x.symbol }, details: { precipitation_amount: 0 } } } })) } }));
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('FEIL', w, e.message));
  await page.clock.setFixedTime(now);
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const snap = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) });

if (only === 'all' || only === 'ios') {
  let { ctx, page } = await open(440, 956, 3, { themeKey: 'fjord', animate: 'false' });
  await snap(page, 'ios-1-hjem');
  await page.getByRole('button', { name: 'Vis ferga på kartet' }).click(); await page.waitForTimeout(900);
  const boats = page.getByRole('button', { name: /Andre båter/ });
  if (await boats.count()) { await boats.first().click(); await page.waitForTimeout(600); }
  await snap(page, 'ios-2-kart');
  await page.getByRole('button', { name: 'Lukk kartet' }).click(); await page.waitForTimeout(600);
  await page.getByText('Se alle avganger', { exact: false }).click(); await page.waitForTimeout(800);
  await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); }); await page.waitForTimeout(400);
  await snap(page, 'ios-4-avganger');
  await page.getByText('10:05').first().click(); await page.waitForTimeout(800);
  await snap(page, 'ios-3-detalj');
  await ctx.close();
  ({ ctx, page } = await open(440, 956, 3, { themeKey: 'fjord', animate: 'false' }));
  await page.locator('nav[data-tour="tabbar"] button', { hasText: 'Rutetabell' }).click(); await page.waitForTimeout(800);
  await snap(page, 'ios-5-rutetabell');
  await ctx.close();
  ({ ctx, page } = await open(440, 956, 3, { themeKey: 'driftwood', animate: 'false' }));
  await snap(page, 'ios-6-mork');
  await ctx.close();
}
if (only === 'all' || only === 'ipad') {
  const W = 1376, H = 1032;
  let { ctx, page } = await open(W, H, 2, { vf_dashside: '0', vf_nattmodus: 'auto' });
  await snap(page, 'ipad-1-passasjer');
  await page.getByRole('button', { name: /10:05/ }).first().click(); await page.waitForTimeout(800);
  await snap(page, 'ipad-4-detalj');
  await ctx.close();
  ({ ctx, page } = await open(W, H, 2, { vf_dashside: '1', vf_nattmodus: 'dag', vf_batar_ferge: '1' }));
  await snap(page, 'ipad-2-ferge');
  await ctx.close();
  ({ ctx, page } = await open(W, H, 2, { vf_dashside: '1', vf_nattmodus: 'natt', vf_batar_ferge: '1' }));
  await snap(page, 'ipad-3-natt');
  await ctx.close();
}
await browser.close();
server.kill();
