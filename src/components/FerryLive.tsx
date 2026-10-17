import React, { useEffect, useState } from 'react';
import { Label } from './Atoms';
import { Icon } from './Icons';
import { stopCoords, stopsMap, haversineKm, isMaintenancePeriod, getOsloDate, ferryName } from '../ferryData';
import type { StopId } from '../types';

interface FerryPos {
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  time: string | null;
}

// I den native appen (Capacitor) serveres filene lokalt, så API-et må nås på full adresse
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' && !window.location.port
  ? 'https://jutoya.veierland.org/api/ferry'
  : '/api/ferry';
const POLL_MS = 30_000;

function useFerryPosition(): FerryPos | null {
  const [pos, setPos] = useState<FerryPos | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(API_URL);
        if (!res.ok) { if (alive) setPos(null); return; }
        const data = await res.json();
        if (alive && typeof data.lat === 'number') setPos(data);
      } catch { /* uten nett: behold siste posisjon */ }
    };
    load();
    const id = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', load); };
  }, []);
  return pos;
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function ferryStatus(pos: FerryPos, stops: StopId[]): { text: string; far: boolean } {
  const dists = stops.map(s => ({ s, km: haversineKm(pos.lat, pos.lng, stopCoords[s].lat, stopCoords[s].lng) }));
  const nearest = dists.reduce((a, b) => (b.km < a.km ? b : a));
  if (nearest.km > 6) return { text: 'Utenfor ruteområdet', far: true };

  const moving = pos.sog != null && pos.sog >= 1.5;
  if (!moving) {
    return { text: nearest.km < 0.35 ? `Ligger ved ${stopsMap[nearest.s]}` : 'Ligger stille', far: false };
  }
  const course = pos.cog ?? pos.heading;
  if (course == null) return { text: 'Underveis', far: false };
  // Nærmeste kai foran baugen (kaiene ligger nesten på linje, så ta den første)
  const target = dists
    .filter(d => d.km > 0.2 && angleDiff(course, bearingDeg(pos.lat, pos.lng, stopCoords[d.s].lat, stopCoords[d.s].lng)) < 50)
    .sort((a, b) => a.km - b.km)[0];
  return { text: target ? `På vei mot ${stopsMap[target.s]}` : 'Underveis', far: false };
}

function ageLabel(time: string | null): { short: string; stale: boolean } {
  if (!time) return { short: '', stale: true };
  const mins = Math.round((Date.now() - new Date(time).getTime()) / 60000);
  if (mins < 1) return { short: 'Nå', stale: false };
  if (mins < 60) return { short: `${mins} min siden`, stale: mins > 15 };
  return { short: `${Math.floor(mins / 60)} t siden`, stale: true };
}

// Kartverkets gråtonekart (CC BY 4.0), Web Mercator-fliser
const TILE_URL = (z: number, x: number, y: number) =>
  `https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/${z}/${y}/${x}.png`;
const VW = 440, VH = 210, MARGIN = 22;

function project(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 256 * 2 ** z;
  const s = Math.sin(lat * Math.PI / 180);
  return { x: (lng + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

function FerryMarker({ pos, scale }: { pos: FerryPos; scale: number }) {
  const course = pos.cog ?? pos.heading;
  const moving = pos.sog != null && pos.sog >= 1.5 && course != null;
  return (
    <g>
      <circle r={7 * scale} fill="var(--accent)" opacity={0.3}>
        <animate attributeName="r" values={`${5 * scale};${11 * scale};${5 * scale}`} dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" repeatCount="indefinite" />
      </circle>
      {moving
        ? <path d="M0,-6 L4.2,4.5 L0,2.4 L-4.2,4.5 Z" fill="var(--accent)" stroke="var(--deep)" strokeWidth={0.8} transform={`rotate(${course}) scale(${scale})`} />
        : <circle r={4 * scale} fill="var(--accent)" stroke="var(--deep)" strokeWidth={scale} />}
    </g>
  );
}

// Ekte kart med kaiene og ferga plassert etter posisjon
function TileMap({ pos, stops, showFerry, onFail }: { pos: FerryPos; stops: StopId[]; showFerry: boolean; onFail: () => void }) {
  const pts: { lat: number; lng: number }[] = stops.map(s => stopCoords[s]);
  if (showFerry) pts.push({ lat: pos.lat, lng: pos.lng });
  // Største zoom der alle punktene får plass
  let z = 14, proj = pts.map(p => project(p.lat, p.lng, z));
  for (; z > 9; z--) {
    proj = pts.map(p => project(p.lat, p.lng, z));
    const w = Math.max(...proj.map(p => p.x)) - Math.min(...proj.map(p => p.x));
    const h = Math.max(...proj.map(p => p.y)) - Math.min(...proj.map(p => p.y));
    if (w <= VW - 2 * MARGIN && h <= VH - 2 * MARGIN) break;
  }
  const cx = (Math.max(...proj.map(p => p.x)) + Math.min(...proj.map(p => p.x))) / 2;
  const cy = (Math.max(...proj.map(p => p.y)) + Math.min(...proj.map(p => p.y))) / 2;
  const x0 = cx - VW / 2, y0 = cy - VH / 2;
  const tiles: { x: number; y: number }[] = [];
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + VW) / 256); tx++)
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + VH) / 256); ty++) tiles.push({ x: tx, y: ty });
  const stopPts = stops.map((s, i) => ({ s, ...proj[i] }));
  const fp = project(pos.lat, pos.lng, z);

  return (
    <svg viewBox={`${x0} ${y0} ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
      {tiles.map(t => (
        <image key={`${t.x}-${t.y}`} href={TILE_URL(z, t.x, t.y)} x={t.x * 256} y={t.y * 256} width={256} height={256} onError={onFail} />
      ))}
      {stopPts.map(p => {
        const right = p.x < cx + VW / 4;
        return (
          <g key={p.s}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="#fff" stroke="var(--deep)" strokeWidth={2} />
            <text x={p.x + (right ? 8 : -8)} y={p.y + 4} textAnchor={right ? 'start' : 'end'} fontSize={12} fontWeight={700} fill="var(--deep)" stroke="#fff" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" fontFamily="'Space Grotesk', sans-serif">{stopsMap[p.s]}</text>
          </g>
        );
      })}
      {showFerry && <g transform={`translate(${fp.x} ${fp.y})`}><FerryMarker pos={pos} scale={1.5} /></g>}
    </svg>
  );
}

// Reserve hvis kartflisene ikke lastes: skjematisk plassering av kaiene
function SchematicMap({ pos, stops, showFerry }: { pos: FerryPos; stops: StopId[]; showFerry: boolean }) {
  const kx = Math.cos(59.16 * Math.PI / 180);
  const pts = stops.map(s => ({ x: stopCoords[s].lng * kx, y: -stopCoords[s].lat }));
  const fp = { x: pos.lng * kx, y: -pos.lat };
  const all = showFerry ? [...pts, fp] : pts;
  const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
  const minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
  const span = Math.max((maxX - minX) / 2, maxY - minY) * 1.4 || 0.01;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const toV = (p: { x: number; y: number }) => ({ x: 100 + (p.x - cx) / span * 100, y: 50 + (p.y - cy) / span * 100 });
  const vs = pts.map(toV);
  const vf = toV(fp);

  return (
    <svg viewBox="0 0 200 100" width="100%" height="100%" style={{ display: 'block' }}>
      {vs.map((p, i) => (
        <g key={stops[i]}>
          <circle cx={p.x} cy={p.y} r={3.2} fill="var(--deep)" stroke="var(--onDeep)" strokeWidth={1.4} />
          <text x={p.x + (p.x > 120 ? -5 : 5)} y={p.y + 3} textAnchor={p.x > 120 ? 'end' : 'start'} fontSize={8.5} fontWeight={600} fill="var(--onDeepDim)" fontFamily="'Space Grotesk', sans-serif">{stopsMap[stops[i]]}</text>
        </g>
      ))}
      {showFerry && <g transform={`translate(${vf.x} ${vf.y})`}><FerryMarker pos={pos} scale={1} /></g>}
    </svg>
  );
}

export function FerryLive() {
  const pos = useFerryPosition();
  const [tilesFailed, setTilesFailed] = useState(false);
  if (!pos) return null;

  const stops: StopId[] = isMaintenancePeriod(getOsloDate()) ? ['tenvik', 'tangen', 'engo'] : ['tenvik', 'vestgarden', 'tangen', 'engo'];
  const status = ferryStatus(pos, stops);
  const age = ageLabel(pos.time);
  const moving = pos.sog != null && pos.sog >= 1.5;

  return (
    <a
      href={`https://maps.google.com/?q=${pos.lat},${pos.lng}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ marginTop: 12, display: 'block', padding: 12, borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '2px 4px 10px' }}>
        <div style={{ minWidth: 0 }}>
          <Label color="var(--onDeepDim)" style={{ fontSize: 9 }}>Ferga nå · {ferryName(getOsloDate())}</Label>
          <div style={{ marginTop: 5, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--onDeep)', lineHeight: 1.2 }}>
            {status.text}
            {moving && !status.far && <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}> · {pos.sog!.toFixed(0)} knop</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: age.stale ? 'var(--warn)' : 'var(--onDeepDim)' }}>
          <Icon name="clock" size={12} color="currentColor" stroke={2} />
          <span style={{ whiteSpace: 'nowrap' }}>{age.short}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 165, borderRadius: 'var(--radSm)', background: tilesFailed ? 'rgba(0,0,0,0.18)' : '#e9e9e6', overflow: 'hidden' }}>
        {tilesFailed
          ? <SchematicMap pos={pos} stops={stops} showFerry={!status.far} />
          : <TileMap pos={pos} stops={stops} showFerry={!status.far} onFail={() => setTilesFailed(true)} />}
        {!tilesFailed && (
          <span style={{ position: 'absolute', right: 6, bottom: 4, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.75)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: '#333' }}>© Kartverket</span>
        )}
      </div>
    </a>
  );
}
