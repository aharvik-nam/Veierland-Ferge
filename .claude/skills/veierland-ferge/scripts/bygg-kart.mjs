// Gjør OpenStreetMap-kystlinjen om til én SVG-sti for fergekartet i appen, med full detalj fra OSM.
// Metode: slå sammen kystlinje-veiene til kjeder, lukk kjedene som går ut av kartutsnittet langs kanten
// (OSM-regel: land ligger til venstre for kystlinjens retning), klipp alt til utsnittet og slå sammen.
//
//   node bygg-kart.mjs osm.json kart.json
import { readFileSync, writeFileSync } from 'node:fs';
import polygonClipping from 'polygon-clipping';
import simplify from 'simplify-js';

const [osmFile, outFile] = process.argv.slice(2);
const osm = JSON.parse(readFileSync(osmFile, 'utf8'));

// Kartutsnittet i appen (nord opp)
const VIEW = { latN: 59.184, latS: 59.139, lngW: 10.302, lngE: 10.381 };
const LAT0 = (VIEW.latN + VIEW.latS) / 2;
const MX = 111320 * Math.cos(LAT0 * Math.PI / 180); // meter per lengdegrad
const MY = 110574;                                  // meter per breddegrad
const W = Math.round((VIEW.lngE - VIEW.lngW) * MX), H = Math.round((VIEW.latN - VIEW.latS) * MY);
// Meter med y opp (nord), så «venstre for retningen» betyr det samme som i OSM
const proj = (lat, lng) => [(lng - VIEW.lngW) * MX, (lat - VIEW.latS) * MY];

// Rammen vi klipper til: utsnittet pluss en liten marg, så kanten av kartet ikke får en strek langs land
const M = 100;
const R = { x0: -M, y0: -M, x1: W + M, y1: H + M };
const per = 2 * (R.x1 - R.x0) + 2 * (R.y1 - R.y0);

// 1. Kystlinje-veier slått sammen til kjeder etter felles endenoder
const ways = osm.elements.filter(e => e.type === 'way' && e.tags?.natural === 'coastline' && e.geometry)
  .map(e => ({ nodes: e.nodes, pts: e.geometry.map(g => proj(g.lat, g.lon)) }));
const byStart = new Map(ways.map(w => [w.nodes[0], w]));
const used = new Set();
const chains = [];
for (const w of ways) {
  if (used.has(w)) continue;
  // gå bakover til starten av kjeden
  let first = w;
  for (const seen = new Set([w]); ;) {
    const prev = ways.find(v => !used.has(v) && !seen.has(v) && v.nodes[v.nodes.length - 1] === first.nodes[0]);
    if (!prev || prev === w) break;
    seen.add(prev); first = prev;
  }
  const nodes = [...first.nodes], pts = [...first.pts];
  used.add(first);
  for (;;) {
    const next = byStart.get(nodes[nodes.length - 1]);
    if (!next || used.has(next)) break;
    used.add(next);
    nodes.push(...next.nodes.slice(1)); pts.push(...next.pts.slice(1));
  }
  chains.push({ closed: nodes[0] === nodes[nodes.length - 1], pts });
}

const area = (r) => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const inside = ([x, y]) => x >= R.x0 && x <= R.x1 && y >= R.y0 && y <= R.y1;

// 2. Lukkede ringer: øyer (mot klokka = land til venstre) og eventuelle sjøhull (med klokka)
const land = [], holes = [];
for (const c of chains.filter(c => c.closed)) (area(c.pts) > 0 ? land : holes).push([c.pts]);

// 3. Åpne kjeder: klipp til rammen og lukk langs kanten mot klokka (land ligger til venstre)
// Posisjon langs rammen mot klokka, fra nedre venstre hjørne
function along([x, y]) {
  const w = R.x1 - R.x0, h = R.y1 - R.y0, e = 1e-6;
  if (Math.abs(y - R.y0) < e) return x - R.x0;
  if (Math.abs(x - R.x1) < e) return w + (y - R.y0);
  if (Math.abs(y - R.y1) < e) return w + h + (R.x1 - x);
  return 2 * w + h + (R.y1 - y);
}
const corners = [[R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1], [R.x0, R.y0]].map(p => ({ p, t: along(p) }));
// Første punkt der linjestykket a→b krysser rammen (Liang–Barsky), som andel av stykket
function clipSeg(a, b) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - R.x0], [dx, R.x1 - a[0]], [-dy, a[1] - R.y0], [dy, R.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pieces = [];
for (const c of chains.filter(c => !c.closed)) {
  let cur = null;
  for (let i = 1; i < c.pts.length; i++) {
    const a = c.pts[i - 1], b = c.pts[i];
    const cl = clipSeg(a, b);
    if (!cl) continue;
    const [t0, t1] = cl;
    if (!cur) cur = [lerp(a, b, t0)];
    cur.push(lerp(a, b, t1));
    if (t1 < 1) { pieces.push(cur); cur = null; } // gikk ut av rammen
  }
  if (cur) throw new Error('En åpen kystlinje slutter inne i rammen – utvid Overpass-spørringen');
}
const open = pieces.map(p => ({ pts: p, tIn: along(p[0]), tOut: along(p[p.length - 1]), done: false }));
for (const start of open) {
  if (start.done) continue;
  const ring = [];
  let piece = start;
  while (!piece.done) {
    piece.done = true;
    ring.push(...piece.pts);
    // neste inngang mot klokka fra utgangen, med hjørnene imellom
    const dist = (t) => (t - piece.tOut + per) % per;
    const next = open.filter(o => !o.done || o === start).sort((a, b) => dist(a.tIn) - dist(b.tIn))[0];
    for (const c of corners.filter(c => dist(c.t) < dist(next.tIn)).sort((a, b) => dist(a.t) - dist(b.t))) ring.push(c.p);
    piece = next;
  }
  land.push([ring]);
}

// 4. Klipp til rammen og slå sammen
const frame = [[[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]]];
let result = polygonClipping.intersection(polygonClipping.union(...land), frame);
if (holes.length) result = polygonClipping.difference(result, ...holes);

// 5. SVG-sti i hele meter, y ned. Forenkler bare punkter som ligger innenfor 1 m av linja (usynlig på skjermen).
let points = 0, rings = 0;
const parts = [];
for (const poly of result) for (const ring of poly) {
  const r = simplify(ring.map(([x, y]) => ({ x, y: H - y })), 1, true);
  if (r.length < 4 || Math.abs(area(r.map(p => [p.x, p.y]))) < 25) continue;
  rings++; points += r.length;
  let px = Math.round(r[0].x), py = Math.round(r[0].y), d = `M${px} ${py}`;
  for (const p of r.slice(1, -1)) { const x = Math.round(p.x), y = Math.round(p.y); if (x === px && y === py) continue; d += `l${x - px} ${y - py}`; px = x; py = y; }
  parts.push(d + 'z');
}
const landPath = parts.join('');
writeFileSync(outFile, JSON.stringify({ view: VIEW, width: W, height: H, land: landPath }));
console.log({ chains: chains.length, openPieces: pieces.length, rings, points, bytes: landPath.length });
