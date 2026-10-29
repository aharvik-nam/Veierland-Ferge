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
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
// Legger overskrift og bakgrunn rundt bildene fra ta-bilder.mjs. Kjør fra repoet.
const dir = path.resolve(process.argv[2]);
mkdirSync(`${dir}/out`, { recursive: true });
const fonts = path.resolve('node_modules/@fontsource');
const ios = [
  ['1-hjem', 'Neste ferge – med én gang', 'Klokkeslett, nedtelling og ferga live'],
  ['2-kart', 'Se hvor ferga er', 'Live på kartet, med tider for hver kai'],
  ['3-detalj', 'Alt om avgangen', 'Stopp, tider og bestilling samlet'],
  ['4-avganger', 'Alle dagens avganger', 'Bla mellom dager og planlegg turen'],
  ['5-rutetabell', 'Hele rutetabellen', 'Til og fra Veierland, for alle dager'],
  ['6-mork', 'Velg ditt fargetema', 'Også i mørke farger'],
];
const ipad = [
  ['1-passasjer', 'Hele oversikten på én skjerm', 'Velg fra og til – avgangene og ferga ved siden av'],
  ['2-ferge', 'Fergedisplay for mannskapet', 'Posisjon, neste anløp, vind, sjø og farevarsler'],
  ['3-natt', 'Nattmodus for broa', 'Rødt lys som ikke blender i mørket'],
  ['4-detalj', 'Trykk for detaljer', 'Alle stopp og tider for avgangen'],
];
const sizes = {
  ios:  { W: 1320, H: 2868, cap: { top: 170, pad: 90, h: 128, p: 50, gap: 26 }, shotW: 1060, top: 560, rad: 0.085, list: ios },
  ipad: { W: 2752, H: 2064, cap: { top: 84, pad: 120, h: 112, p: 46, gap: 18 }, shotW: 2240, top: 330, rad: 0.022, list: ipad },
};
const css = (s) => `
  @font-face { font-family: SG; src: url(file://${fonts}/space-grotesk/files/space-grotesk-latin-500-normal.woff2); font-weight: 500; }
  @font-face { font-family: IS; src: url(file://${fonts}/instrument-serif/files/instrument-serif-latin-400-normal.woff2); }
  * { margin: 0; box-sizing: border-box; }
  body { width: ${s.W}px; height: ${s.H}px; overflow: hidden; background: radial-gradient(120% 70% at 50% 0%, #0E5365 0%, #07313C 60%, #052530 100%); }
  .cap { position: absolute; top: ${s.cap.top}px; left: 0; right: 0; text-align: center; color: #EAF6F2; padding: 0 ${s.cap.pad}px; }
  h1 { font-family: IS; font-weight: 400; font-size: ${s.cap.h}px; line-height: 1.02; letter-spacing: -0.01em; }
  p { font-family: SG; font-weight: 500; font-size: ${s.cap.p}px; color: rgba(234,246,242,.72); margin-top: ${s.cap.gap}px; }
  .shot { position: absolute; left: 50%; top: ${s.top}px; width: ${s.shotW}px; transform: translateX(-50%); border-radius: ${s.shotW * s.rad}px; overflow: hidden;
          box-shadow: 0 ${s.shotW * 0.03}px ${s.shotW * 0.1}px rgba(0,0,0,.45), 0 0 0 ${Math.max(6, Math.round(s.shotW * 0.008))}px rgba(255,255,255,.14); }
  .shot img { display: block; width: 100%; }`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [tag, s] of Object.entries(sizes)) {
  const p = await b.newPage({ viewport: { width: s.W, height: s.H }, deviceScaleFactor: 1 });
  for (const [name, h, sub] of s.list) {
    if (!existsSync(`${dir}/raw/${tag}-${name}.png`)) continue;
    const f = `${dir}/tmp-${tag}-${name}.html`;
    writeFileSync(f, `<html><head><meta charset="utf-8"><style>${css(s)}</style></head><body><div class="cap"><h1>${h}</h1><p>${sub}</p></div><div class="shot"><img src="file://${dir}/raw/${tag}-${name}.png"></div></body></html>`);
    await p.goto('file://' + f); await p.waitForTimeout(400);
    await p.screenshot({ path: `${dir}/out/${tag}-${name}.png` });
  }
  await p.close();
}
await b.close();
