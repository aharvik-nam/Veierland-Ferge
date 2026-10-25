// Sjekker rutetidene i src/data.ts og at Humla-perioden er lik i appen og AIS-funksjonen.
// Kjør fra repo-roten:  npx tsx .claude/skills/veierland-ferge/scripts/sjekk-rutetider.ts
// Avslutter med kode 1 hvis noe er galt, så den kan brukes før commit.
import { readFileSync } from 'node:fs';
import * as data from '../../../../src/data';
import type { FerryLoop } from '../../../../src/data';

// Samme rekkefølge som ferryData.ts leser tidene i (én rundtur: ut fra Tenvik, inn igjen)
const KEYS = ['bussTbg', 'tenvikUt', 'vestgardenUt', 'tangenVia', 'engoUt', 'tangenUt',
  'tangenInn', 'engoInn', 'vestgardenInn', 'tenvikInn', 'bussTenvik'] as const;

const SETS: Record<string, FerryLoop[]> = {
  'ordinær man–fre': data.monFriLoops, 'ordinær lørdag': data.satLoops, 'ordinær søndag': data.sunLoops,
  'sommer man–fre': data.summerMonFriLoops, 'sommer lørdag': data.summerSatLoops, 'sommer søndag': data.summerSunLoops,
  'Humla man–fre': data.humlaMonFriLoops, 'Humla lørdag': data.humlaSatLoops, 'Humla søndag': data.humlaSunLoops,
};

const errors: string[] = [];
const warnings: string[] = [];
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

// 1. Hver tur: gyldige klokkeslett, i stigende rekkefølge, og riktige kaier for perioden
const ids = new Map<string, string>();
for (const [name, loops] of Object.entries(SETS)) {
  const humla = name.startsWith('Humla');
  for (const loop of loops) {
    const where = `${name} ${loop.id}`;
    if (ids.has(loop.id)) errors.push(`${where}: id-en brukes også i ${ids.get(loop.id)}`);
    ids.set(loop.id, name);

    let prev: { key: string; t: string } | null = null;
    for (const k of KEYS) {
      const t = loop[k];
      if (t == null) continue;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) { errors.push(`${where}: ${k} = "${t}" er ikke et klokkeslett (TT:MM)`); continue; }
      if (prev && mins(t) < mins(prev.t)) errors.push(`${where}: ${k} ${t} er før ${prev.key} ${prev.t}`);
      prev = { key: k, t };
    }
    if (!KEYS.some(k => loop[k] != null)) warnings.push(`${where}: turen har ingen tider`);
    if (humla && (loop.vestgardenUt || loop.vestgardenInn)) errors.push(`${where}: Vestgården utgår mens Humla seiler`);
    if (humla && loop.engoUt && !loop.tangenVia) warnings.push(`${where}: Engø-tur uten tangenVia (Humla går Tenvik–Tangen–Engø–Tangen)`);
    if (!humla && loop.tangenVia) warnings.push(`${where}: tangenVia brukes bare i Humla-rutene`);
    if (loop.rowType === 'engo' && !loop.engoUt && !loop.engoInn) errors.push(`${where}: rowType "engo" men turen går ikke innom Engø`);
  }
}

// 2. Humla-perioden må være lik i appen og AIS-funksjonen.
//    (Den klassiske rutetabellen leser /timetable.json og har ingen egen kopi lenger.)
const read = (p: string) => readFileSync(p, 'utf8');
const ferryData = read('src/ferryData.ts');
const api = read('api/ferry.ts');

const m = ferryData.match(/MAINTENANCE = \{ from: '([\d-]+)', to: '([\d-]+)' \}/);
const a = api.match(/HUMLA_FROM = '([\d-]+)', HUMLA_TO = '([\d-]+)'/);
const periods = { 'src/ferryData.ts (MAINTENANCE)': m, 'api/ferry.ts (HUMLA_FROM/TO)': a };
for (const [file, hit] of Object.entries(periods)) if (!hit) errors.push(`Fant ikke Humla-perioden i ${file}`);
const shown = Object.entries(periods).filter(([, h]) => h).map(([f, h]) => `${h![1]} – ${h![2]}  ${f}`);
if (new Set(shown.map(s => s.split('  ')[0])).size > 1) errors.push(`Humla-perioden er ikke lik overalt:\n    ${shown.join('\n    ')}`);

// 3. Den klassiske rutetabellen skal ikke ha en egen kopi av rutetidene igjen
if (/HUMLA_SEASON\s*=/.test(read('public/rutetabell.html'))) errors.push('public/rutetabell.html har fått en egen kopi av rutetidene (HUMLA_SEASON). Den skal lese /timetable.json.');

// 4. Tekster med datoene står for hånd – vis dem så de kan sjekkes mot perioden
const labels = [
  ['src/ferryData.ts', /seasonLabel[\s\S]*?return '(MF[^']*)'/],
  ['src/components/HumlaNotice.tsx', />(MF "Humla" seiler[^<]*)</],
  ['src/screens/ResultsScreen.tsx', /(Vestgården utgår mens[^<\n]*)/],
  ['src/data.ts', /text: "(OBS:[^"]*)"/],
] as const;

const count = Object.values(SETS).reduce((n, l) => n + l.length, 0);
console.log(`Sjekket ${count} turer i ${Object.keys(SETS).length} tabeller.`);
if (shown.length) console.log(`Humla-perioden: ${shown[0].split('  ')[0]}`);
console.log('\nTekster med datoer (sjekk at de stemmer med perioden):');
for (const [file, re] of labels) {
  const hit = read(file).match(re);
  console.log(`  ${file}: ${hit ? hit[1].slice(0, 110) : '(fant ikke teksten)'}`);
}
for (const w of warnings) console.log(`\n⚠ ${w}`);
for (const e of errors) console.log(`\n✗ ${e}`);
console.log(errors.length ? `\n${errors.length} feil.` : '\n✓ Ingen feil.');
process.exit(errors.length ? 1 : 0);
