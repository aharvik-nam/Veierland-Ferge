// Header og søkeresultat-bilde til App Store: tekst til venstre, iPad og iPhone til høyre
// Kjør fra repoet etter ta-bilder.mjs: bytt `dir` til mappen med raw/ og out/, og `fonts` peker på node_modules/@fontsource.
import { writeFileSync } from 'fs';
import { execSync } from 'child_process'; import { pathToFileURL } from 'url'; const { chromium } = await import(pathToFileURL(execSync('npm root -g').toString().trim() + '/playwright/index.mjs').href);
const dir = '/tmp/claude-0/-home-user-Veierland-Ferge/5bd34bfe-20e6-5eff-a905-f5787719428c/scratchpad/store4';
const fonts = '/home/user/Veierland-Ferge/node_modules/@fontsource';
// [navn, bredde, høyde, iPad-høyde, telefon-høyde, overskrift] i % av høyden
const sizes = [['header', 5244, 2950, 50, 64, 13, 4.4], ['header-bred', 3840, 1646, 64, 80, 14, 4.4], ['sokeresultat', 3840, 2560, 42, 54, 11, 3.8]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, W, H, ipadH, phoneH, h1, tag] of sizes) {
  const u = H / 100; // 1 enhet = 1 % av høyden
  const right = 7 * u, ipadW = ipadH * u * 2752 / 2064, phoneW = phoneH * u * 1320 / 2868, overlap = 14 * u;
  const ipadTop = (H - ipadH * u) / 2 + 2 * u, phoneTop = (H - phoneH * u) / 2;
  const phoneLeft = W - right - ipadW - phoneW + overlap, textLeft = 9 * u, textW = phoneLeft - textLeft - 6 * u;
  const html = `<html><head><meta charset="utf-8"><style>
  @font-face { font-family: SG; src: url(file://${fonts}/space-grotesk/files/space-grotesk-latin-500-normal.woff2); font-weight: 500; }
  @font-face { font-family: IS; src: url(file://${fonts}/instrument-serif/files/instrument-serif-latin-400-normal.woff2); }
  * { margin: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
    background: radial-gradient(90% 120% at 75% 30%, #11647A 0%, #0A4352 40%, #07313C 70%, #04222B 100%); }
  .wave { position: absolute; left: -5%; right: -5%; bottom: -${8 * u}px; height: ${26 * u}px; background: rgba(255,255,255,.05); border-radius: 50% 50% 0 0 / 60% 60% 0 0; }
  .wave.b { bottom: -${14 * u}px; height: ${24 * u}px; background: rgba(255,255,255,.05); left: -20%; }
  .text { position: absolute; left: ${textLeft}px; top: 50%; transform: translateY(-50%); color: #EAF6F2; width: ${textW}px; }
  .eyebrow { font-family: SG; font-weight: 500; font-size: ${3.2 * u}px; letter-spacing: .22em; text-transform: uppercase; color: rgba(234,246,242,.62); }
  h1 { font-family: IS; font-weight: 400; font-size: ${h1 * u}px; line-height: .98; margin-top: ${2.4 * u}px; letter-spacing: -0.01em; }
  p { font-family: SG; font-weight: 500; font-size: ${tag * u}px; line-height: 1.3; color: rgba(234,246,242,.78); margin-top: ${3.2 * u}px; }
  .accent { color: #F2875F; }
  .dev { position: absolute; overflow: hidden; box-shadow: 0 ${2 * u}px ${6 * u}px rgba(0,0,0,.5), 0 0 0 ${0.55 * u}px rgba(255,255,255,.16); }
  .dev img { display: block; width: 100%; }
  .ipad { width: ${ipadW}px; right: ${right}px; top: ${ipadTop}px; border-radius: ${2.2 * u}px; }
  .phone { width: ${phoneW}px; left: ${phoneLeft}px; top: ${phoneTop}px; border-radius: ${phoneW * 0.085}px; }
  </style></head><body>
  <div class="wave"></div><div class="wave b"></div>
  <div class="text"><div class="eyebrow">Tenvik · Veierland · Engø</div><h1>Veierland Ferge</h1>
  <p>Neste avgang, hele rutetabellen${tag > 4 ? '<br>' : ' '}og <span class="accent">ferga live</span> på kartet.</p></div>
  <div class="dev ipad"><img src="file://${dir}/raw/ipad-2-ferge.png"></div>
  <div class="dev phone"><img src="file://${dir}/raw/ios-1-hjem.png"></div>
  </body></html>`;
  const f = `${dir}/banner-${name}.html`;
  writeFileSync(f, html);
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.goto('file://' + f); await p.waitForTimeout(600);
  await p.screenshot({ path: `${dir}/out/appstore-${name}.png`, type: 'png' });
  await p.close();
}
await b.close();
