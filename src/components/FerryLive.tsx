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

function ageLabel(time: string | null): { text: string; stale: boolean } {
  if (!time) return { text: '', stale: true };
  const mins = Math.round((Date.now() - new Date(time).getTime()) / 60000);
  if (mins < 1) return { text: 'Oppdatert nå', stale: false };
  if (mins < 60) return { text: `Oppdatert for ${mins} min siden`, stale: mins > 15 };
  const h = Math.floor(mins / 60);
  return { text: `Siste signal for ${h} t siden`, stale: true };
}

// Skjematisk kart over kaiene med ferga plassert etter breddegrad/lengdegrad
function MiniMap({ pos, stops, showFerry }: { pos: FerryPos; stops: StopId[]; showFerry: boolean }) {
  const kx = Math.cos(59.16 * Math.PI / 180);
  const pts = stops.map(s => ({ x: stopCoords[s].lng * kx, y: -stopCoords[s].lat }));
  const fp = { x: pos.lng * kx, y: -pos.lat };
  const all = showFerry ? [...pts, fp] : pts;
  const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
  const minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
  const span = Math.max(maxX - minX, maxY - minY) * 1.35 || 0.01;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const toV = (p: { x: number; y: number }) => ({ x: 50 + (p.x - cx) / span * 100, y: 50 + (p.y - cy) / span * 100 });
  const vs = pts.map(toV);
  const vf = toV(fp);
  const course = pos.cog ?? pos.heading;
  const moving = pos.sog != null && pos.sog >= 1.5 && course != null;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <polyline points={vs.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--onDeepDim)" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} />
      {vs.map((p, i) => (
        <g key={stops[i]}>
          <circle cx={p.x} cy={p.y} r={3.2} fill="var(--deep)" stroke="var(--onDeep)" strokeWidth={1.4} />
          <text x={p.x + (p.x > 60 ? -5 : 5)} y={p.y + 3} textAnchor={p.x > 60 ? 'end' : 'start'} fontSize={8.5} fontWeight={600} fill="var(--onDeepDim)" fontFamily="'Space Grotesk', sans-serif">{stopsMap[stops[i]]}</text>
        </g>
      ))}
      {showFerry && (
        <g transform={`translate(${vf.x} ${vf.y})`}>
          <circle r={7} fill="var(--accent)" opacity={0.25}>
            <animate attributeName="r" values="5;10;5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
          </circle>
          {moving
            ? <path d="M0,-6 L4.2,4.5 L0,2.4 L-4.2,4.5 Z" fill="var(--accent)" stroke="var(--deep)" strokeWidth={0.8} transform={`rotate(${course})`} />
            : <circle r={4} fill="var(--accent)" stroke="var(--deep)" strokeWidth={1} />}
        </g>
      )}
    </svg>
  );
}

export function FerryLive() {
  const pos = useFerryPosition();
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
      style={{ marginTop: 12, display: 'flex', alignItems: 'stretch', gap: 12, padding: '12px 12px 12px 16px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <Label color="var(--onDeepDim)" style={{ fontSize: 9 }}>Ferga nå · {ferryName(getOsloDate())}</Label>
          <div style={{ marginTop: 6, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--onDeep)', lineHeight: 1.2 }}>{status.text}</div>
          {moving && !status.far && (
            <div style={{ marginTop: 3, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12.5, color: 'var(--accent)' }}>{pos.sog!.toFixed(0)} knop</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11.5, color: age.stale ? 'var(--warn)' : 'var(--onDeepDim)' }}>
          <Icon name="pin" size={12} color="currentColor" stroke={2} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{age.text}</span>
        </div>
      </div>
      <div style={{ width: 112, height: 112, flexShrink: 0, borderRadius: 'var(--radSm)', background: 'rgba(0,0,0,0.18)', overflow: 'hidden' }}>
        <MiniMap pos={pos} stops={stops} showFerry={!status.far} />
      </div>
    </a>
  );
}
