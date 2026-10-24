// Sammenligner fergens faktiske avganger (AIS) med rutetidene i src/data.ts.
// 1. Hent data (BarentsWatch er ofte stengt fra Claude-økter, så gå via Vercel-funksjonen):
//      https://veierland-ferge.vercel.app/api/ferry-history?from=2026-10-17&to=2026-10-24&compact=1
//    (med Vercel-verktøyet web_fetch_vercel_url) og lagre JSON-svaret i en fil.
// 2. npx tsx .claude/skills/veierland-ferge/scripts/punktlighet.ts <fil.json>
// Bare BarentsWatch sine siste 14 dager finnes. Tidene er norsk tid.
import { readFileSync } from 'node:fs';
import * as d from '../../../../src/data';
import type { FerryLoop } from '../../../../src/data';

const hist = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { days: { day: string; points: number; gapsOver5min: number; calls?: string[]; error?: string }[] };
const ferryData = readFileSync('src/ferryData.ts', 'utf8');
const MAINT = ferryData.match(/MAINTENANCE = \{ from: '([\d-]+)', to: '([\d-]+)' \}/)!;
const SUMMER = ferryData.match(/SUMMER = \{ from: '([\d-]+)', to: '([\d-]+)' \}/)!;

const min = (t: string) => { const [h, m, s = '0'] = t.split(':'); return +h * 60 + +m + +s / 60; };
const fmt = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const dayType = (day: string) => { const w = new Date(`${day}T12:00:00Z`).getUTCDay(); return w === 0 ? 'søn' : w === 6 ? 'lør' : 'man–fre'; };
function loopsFor(day: string): FerryLoop[] {
  const t = dayType(day), humla = day >= MAINT[1] && day <= MAINT[2], md = day.slice(5), summer = md >= SUMMER[1] && md <= SUMMER[2];
  const [mf, sa, su] = humla ? [d.humlaMonFriLoops, d.humlaSatLoops, d.humlaSunLoops]
    : summer ? [d.summerMonFriLoops, d.summerSatLoops, d.summerSunLoops] : [d.monFriLoops, d.satLoops, d.sunLoops];
  return t === 'søn' ? su : t === 'lør' ? sa : mf;
}

const per = new Map<string, number[]>(), miss = new Map<string, string[]>();
console.log('Dag         dagtype  avganger i rute (−2..+5 min)  AIS-punkter  hull>5min');
for (const day of hist.days) {
  if (!day.calls) { console.log(`${day.day}  ${day.error}`); continue; }
  const deps = day.calls.map(c => { const [stop, a, dep] = c.split(' '); return { stop, arr: min(a), t: min(dep), used: false }; });
  let ok = 0, n = 0;
  for (const l of loopsFor(day.day)) for (const [k, stop] of [['tenvikUt', 'tenvik'], ['tangenInn', 'tangen'], ['vestgardenUt', 'vestgarden'], ['vestgardenInn', 'vestgarden']] as const) {
    const time = l[k];
    if (!time || l.rowType === 'booking') continue; // bestillingsavganger går bare ved behov
    const p = min(time);
    let best: typeof deps[number] | null = null;
    for (const a of deps) if (!a.used && a.stop === stop && a.t >= p - 10 && a.t <= p + 30 && (!best || Math.abs(a.t - p) < Math.abs(best.t - p))) best = a;
    const key = `${dayType(day.day).padEnd(7)} ${fmt(p)} fra ${stop}`;
    n++;
    if (best) { best.used = true; const delay = Math.round(best.t - p); if (delay >= -2 && delay <= 5) ok++; (per.get(key) ?? per.set(key, []).get(key)!).push(delay); }
    else (miss.get(key) ?? miss.set(key, []).get(key)!).push(day.day.slice(5));
  }
  console.log(`${day.day}  ${dayType(day.day).padEnd(7)}  ${`${ok}/${n}`.padEnd(29)} ${String(day.points).padEnd(11)}  ${day.gapsOver5min}`);
}
const all = [...per.values()].flat().sort((a, b) => a - b);
console.log(`\n${all.length} avganger funnet. Median ${all[Math.floor(all.length / 2)]} min. Innen 3 min: ${Math.round(100 * all.filter(x => x <= 3).length / all.length)} %. Over 5 min: ${all.filter(x => x > 5).length}. Mer enn 1 min før tiden: ${all.filter(x => x < -1).length}.`);
console.log('Per avgang (minutter etter rutetid, ett tall per dag). Faste avvik på mange minutter betyr at rutetiden i appen trolig er feil:');
for (const [k, v] of [...per].sort()) { const s = [...v].sort((a, b) => a - b); console.log(`  ${k.padEnd(26)} median ${String(s[Math.floor(s.length / 2)]).padStart(3)}  [${v.join(' ')}]`); }
if (miss.size) { console.log('Ikke funnet (innstilt, hull i AIS eller annen rute):'); for (const [k, v] of [...miss].sort()) console.log(`  ${k}: ${v.join(', ')}`); }
console.log('\nEngø-anløp og avganger etter 20:10 (bestillingsturer):');
for (const day of hist.days) if (day.calls) {
  const c = day.calls.map(x => x.split(' '));
  const engo = c.filter(x => x[0] === 'engo').map(x => x[1].slice(0, 5));
  const late = c.filter(x => min(x[2]) >= min('20:10') && x[0] !== 'vestgarden').map(x => `${x[0]} ${x[2].slice(0, 5)}`);
  console.log(`  ${day.day} ${dayType(day.day).padEnd(7)} Engø: ${engo.join(', ') || '–'} | etter 20:10: ${late.join(', ') || '–'}`);
}
