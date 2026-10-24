// Gjør OpenStreetMap-kystlinjen om til en forenklet SVG-sti for kartet i appen.
// Metode: tegn kystlinjen i et rutenett (ca. 4 m per rute), fyll sjøen fra kjente sjøpunkter (fra AIS-sporet),
// alt som ikke er sjø er land, finn konturene med d3-contour og forenkle dem.
import { readFileSync, writeFileSync } from 'node:fs';
import { contours } from 'd3-contour';
import simplify from 'simplify-js';

const [osmFile, outFile] = process.argv.slice(2);
const osm = JSON.parse(readFileSync(osmFile, 'utf8'));

// Kartutsnittet i appen (nord opp)
const VIEW = { latN: 59.184, latS: 59.139, lngW: 10.302, lngE: 10.381 };
const LAT0 = (VIEW.latN + VIEW.latS) / 2;
const MX = 111320 * Math.cos(LAT0 * Math.PI / 180); // meter per lengdegrad
const MY = 110574;                                  // meter per breddegrad
const W = Math.round((VIEW.lngE - VIEW.lngW) * MX), H = Math.round((VIEW.latN - VIEW.latS) * MY);
const proj = (lat, lng) => [(lng - VIEW.lngW) * MX, (VIEW.latN - lat) * MY]; // meter fra øvre venstre hjørne

// Rutenettet dekker et større område enn utsnittet, så sjøen henger sammen rundt øyene
const BIG = { latN: 59.23, latS: 59.10, lngW: 10.22, lngE: 10.46 };
const RES = 4; // meter per rute
const bx = (lng) => (lng - BIG.lngW) * MX / RES, by = (lat) => (BIG.latN - lat) * MY / RES;
const GW = Math.ceil((BIG.lngE - BIG.lngW) * MX / RES), GH = Math.ceil((BIG.latN - BIG.latS) * MY / RES);
const grid = new Uint8Array(GW * GH); // 0 = ukjent, 1 = sjø, 2 = kystlinje
const mark = (x, y) => { for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) { const xx = Math.floor(x) + dx, yy = Math.floor(y) + dy; if (xx >= 0 && yy >= 0 && xx < GW && yy < GH) grid[yy * GW + xx] = 2; } };

let ways = 0;
for (const el of osm.elements) {
  if (el.type !== 'way' || el.tags?.natural !== 'coastline' || !el.geometry) continue;
  ways++;
  const g = el.geometry;
  for (let i = 1; i < g.length; i++) {
    const x0 = bx(g[i - 1].lon), y0 = by(g[i - 1].lat), x1 = bx(g[i].lon), y1 = by(g[i].lat);
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
    for (let k = 0; k <= n; k++) mark(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n);
  }
}

// Sjøpunkter fra fergens AIS-spor (garantert vann)
const seeds = [[59.16057, 10.33841], [59.17062, 10.35023], [59.15123, 10.33017], [59.1735, 10.3590], [59.16575, 10.34224], [59.14907, 10.32277]];
const queue = new Int32Array(GW * GH);
let qh = 0, qt = 0;
for (const [lat, lng] of seeds) {
  const i = Math.round(by(lat)) * GW + Math.round(bx(lng));
  if (grid[i] === 0) { grid[i] = 1; queue[qt++] = i; }
}
while (qh < qt) {
  const i = queue[qh++], x = i % GW, y = (i - x) / GW;
  for (const j of [x > 0 ? i - 1 : -1, x < GW - 1 ? i + 1 : -1, y > 0 ? i - GW : -1, y < GH - 1 ? i + GW : -1]) {
    if (j >= 0 && grid[j] === 0) { grid[j] = 1; queue[qt++] = j; }
  }
}

// Utsnittet: 1 = land, 0 = sjø
const cw = Math.ceil(W / RES), ch = Math.ceil(H / RES);
const ox = bx(VIEW.lngW), oy = by(VIEW.latN);
const values = new Float64Array(cw * ch);
let landCells = 0;
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
  const g = grid[Math.round(oy + y) * GW + Math.round(ox + x)];
  values[y * cw + x] = g === 1 ? 0 : 1;
  landCells += g === 1 ? 0 : 1;
}
const [mp] = contours().size([cw, ch]).thresholds([0.5])(values);

// Ringer i meter, forenklet; svært små skjær tas ut
const area = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2);
let points = 0, rings = 0;
const parts = [];
for (const poly of mp.coordinates) for (const ring of poly) {
  const pts = simplify(ring.map(([x, y]) => ({ x: x * RES, y: y * RES })), 5, true);
  if (pts.length < 4 || area(pts) < 300) continue;
  rings++; points += pts.length;
  let d = `M${Math.round(pts[0].x)} ${Math.round(pts[0].y)}`, px = Math.round(pts[0].x), py = Math.round(pts[0].y);
  for (const p of pts.slice(1)) { const x = Math.round(p.x), y = Math.round(p.y); if (x === px && y === py) continue; d += `l${x - px} ${y - py}`; px = x; py = y; }
  parts.push(d + 'z');
}
const land = parts.join('');

// Fergeruter (OSM route=ferry) og stedsnavn i utsnittet
const inView = (lat, lng) => lat <= VIEW.latN && lat >= VIEW.latS && lng >= VIEW.lngW && lng <= VIEW.lngE;
const ferries = osm.elements.filter(e => e.type === 'way' && e.tags?.route === 'ferry' && e.geometry).map(e => ({
  name: e.tags.name ?? '',
  d: simplify(e.geometry.map(g => { const [x, y] = proj(g.lat, g.lon); return { x, y }; }), 4, true).map((p, i) => `${i ? 'L' : 'M'}${Math.round(p.x)} ${Math.round(p.y)}`).join(''),
}));
const places = osm.elements.filter(e => e.type === 'node' && e.tags?.name && inView(e.lat, e.lon))
  .map(e => ({ name: e.tags.name, place: e.tags.place, x: Math.round(proj(e.lat, e.lon)[0]), y: Math.round(proj(e.lat, e.lon)[1]) }));

writeFileSync(outFile, JSON.stringify({ view: VIEW, width: W, height: H, land, ferries, places }, null, 0));
console.log({ ways, grid: `${GW}x${GH}`, view: `${W}x${H} m`, landShare: (landCells / (cw * ch)).toFixed(2), rings, points, landBytes: land.length, ferries: ferries.map(f => f.name), places: places.map(p => `${p.name} (${p.place})`) });
