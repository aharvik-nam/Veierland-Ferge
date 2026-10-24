import React, { useEffect, useState } from 'react';
import { Label } from './Atoms';
import { Icon } from './Icons';
import { stopCoords, stopsMap, stopKind, haversineKm, isMaintenancePeriod, getOsloDate, ferryName, minsUntil, fmtCountdown, AT_QUAY_KM } from '../ferryData';
import type { StopId, Trip } from '../types';
import { API_BASE } from '../platform';

interface FerryPos {
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  time: string | null;
}

const API_URL = `${API_BASE}/api/ferry`;
const POLL_MS = 15_000;

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

function ferryStatus(pos: FerryPos, stops: StopId[]): { text: string; far: boolean; target: StopId | null } {
  const dists = stops.map(s => ({ s, km: haversineKm(pos.lat, pos.lng, stopCoords[s].lat, stopCoords[s].lng) }));
  const nearest = dists.reduce((a, b) => (b.km < a.km ? b : a));
  if (nearest.km > 6) return { text: 'Utenfor ruteområdet', far: true, target: null };

  const moving = pos.sog != null && pos.sog >= 1.5;
  if (!moving) {
    return { text: nearest.km <= (AT_QUAY_KM[nearest.s] ?? 0.03) ? `Ligger ved ${stopsMap[nearest.s]}` : 'Ligger stille', far: false, target: null };
  }
  const course = pos.cog ?? pos.heading;
  if (course == null) return { text: 'Underveis', far: false, target: null };
  // Nærmeste kai foran baugen (kaiene ligger nesten på linje, så ta den første)
  const target = dists
    .filter(d => d.km > 0.2 && angleDiff(course, bearingDeg(pos.lat, pos.lng, stopCoords[d.s].lat, stopCoords[d.s].lng)) < 50)
    .sort((a, b) => a.km - b.km)[0];
  return { text: target ? `På vei mot ${stopsMap[target.s]}` : 'Underveis', far: false, target: target?.s ?? null };
}

function ageLabel(time: string | null): { short: string; stale: boolean } {
  if (!time) return { short: '', stale: true };
  const mins = Math.round((Date.now() - new Date(time).getTime()) / 60000);
  if (mins < 1) return { short: 'Nå', stale: false };
  if (mins < 60) return { short: `${mins} min siden`, stale: mins > 15 };
  return { short: `${Math.floor(mins / 60)} t siden`, stale: true };
}

// Hva ferga betyr for avgangen brukeren ser på: er den på vei til kaia, og rekker den det?
function departureNote(pos: FerryPos, dep: Trip | null | undefined, target: StopId | null, line: StopId[]): { stop: StopId; text: string; late: boolean } | null {
  if (!dep) return null;
  const board = dep.subpath.find(e => stopKind[e.stopId] !== 'buss');
  if (!board || !line.includes(board.stopId)) return null;
  const minsToDep = minsUntil(dep.dateStr, board.time);
  if (minsToDep < -2 || minsToDep > 120) return null; // bare relevant når avgangen er nær

  const stop = board.stopId;
  const name = stopsMap[stop];
  const km = haversineKm(pos.lat, pos.lng, stopCoords[stop].lat, stopCoords[stop].lng);
  const moving = pos.sog != null && pos.sog >= 1.5;
  if (km <= (AT_QUAY_KM[stop] ?? 0.03) && !moving) return { stop, text: `Ligger klar ved ${name} til avgangen ${board.time}`, late: false };
  if (moving && target === stop) {
    const eta = Math.max(1, Math.round(km / (pos.sog! * 1.852) * 60));
    const late = eta > minsToDep + 3;
    return { stop, text: `Er ved ${name} om ca. ${fmtCountdown(eta)}${late ? ' – avgangen kan bli litt forsinket' : ` · din avgang ${board.time}`}`, late };
  }
  return { stop, text: `Din avgang fra ${name} kl. ${board.time}`, late: false };
}

// Hvor langt langs ruten ferga er (0 = første kai, 1 = siste), ut fra nærmeste strekning
function routeFraction(pos: FerryPos, line: StopId[]): number {
  const km = (lat: number, lng: number) => ({ x: lng * Math.cos(59.16 * Math.PI / 180) * 111.32, y: lat * 110.57 });
  const p = km(pos.lat, pos.lng);
  let best = { d: Infinity, u: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const a = km(stopCoords[line[i]].lat, stopCoords[line[i]].lng);
    const b = km(stopCoords[line[i + 1]].lat, stopCoords[line[i + 1]].lng);
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d < best.d) best = { d, u: (i + t) / (line.length - 1) };
  }
  return best.u;
}

// Ruten som en rett linje: Tenvik til venstre, Engø til høyre, ferga plassert langs linja
function RouteLine({ pos, line, target, showFerry, highlight }: { pos: FerryPos; line: StopId[]; target: StopId | null; showFerry: boolean; highlight: StopId | null }) {
  const X0 = 24, X1 = 296;
  const xs = line.map((_, i) => X0 + (X1 - X0) * i / (line.length - 1));
  const u = routeFraction(pos, line);
  const fx = X0 + (X1 - X0) * u;
  const ti = target ? line.indexOf(target) : -1;
  const dir = ti < 0 ? 0 : xs[ti] > fx ? 1 : -1; // 1 = mot høyre, -1 = mot venstre, 0 = ligger stille

  return (
    <svg viewBox="0 0 320 64" width="100%" height="64" style={{ display: 'block', overflow: 'visible' }}>
      <line x1={X0} y1={24} x2={X1} y2={24} stroke="var(--onDeepDim)" strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" opacity={0.7} />
      {line.map((s, i) => (
        <g key={s}>
          {s === highlight && <circle cx={xs[i]} cy={24} r={10} fill="none" stroke="var(--accent2)" strokeWidth={2} />}
          <circle cx={xs[i]} cy={24} r={5.5} fill="var(--deep)" stroke="var(--onDeep)" strokeWidth={2} />
          <text x={xs[i]} y={52} textAnchor="middle" fontSize={12} fontWeight={s === highlight ? 700 : 600} fill={s === highlight ? 'var(--onDeep)' : 'var(--onDeepDim)'} fontFamily="'Space Grotesk', sans-serif">{stopsMap[s]}</text>
        </g>
      ))}
      {showFerry && (
        <g transform={`translate(${fx} 24)`}>
          <circle r={10} fill="var(--accentOnDeep)" opacity={0.3}>
            <animate attributeName="r" values="7;15;7" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          {dir === 0
            ? <circle r={6.5} fill="var(--accentOnDeep)" stroke="var(--deep)" strokeWidth={1.5} />
            : <path d="M0,-9 L6.3,6.8 L0,3.6 L-6.3,6.8 Z" fill="var(--accentOnDeep)" stroke="var(--deep)" strokeWidth={1.2} transform={`rotate(${dir * 90})`} />}
        </g>
      )}
    </svg>
  );
}

// showNote=false når kortet for neste avgang allerede viser at ferga er forsinket
export function FerryLive({ dep, showNote = true }: { dep?: Trip | null; showNote?: boolean }) {
  const pos = useFerryPosition();
  if (!pos) return null;

  const humla = isMaintenancePeriod(getOsloDate());
  const stops: StopId[] = humla ? ['tenvik', 'tangen', 'engo'] : ['tenvik', 'vestgarden', 'tangen', 'engo'];
  const line: StopId[] = humla ? ['tenvik', 'tangen', 'engo'] : ['tenvik', 'vestgarden', 'tangen', 'engo'];
  const status = ferryStatus(pos, stops);
  const age = ageLabel(pos.time);
  const moving = pos.sog != null && pos.sog >= 1.5;
  const note = status.far || !showNote ? null : departureNote(pos, dep, status.target, line);

  return (
    <a
      data-tour="ferry-live"
      href={`https://maps.google.com/?q=${pos.lat},${pos.lng}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ marginTop: 12, display: 'block', padding: '12px 14px 10px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, padding: '2px 2px 12px' }}>
        <div style={{ minWidth: 0 }}>
          <Label color="var(--onDeepDim)" style={{ fontSize: 9 }}>Ferga nå · {ferryName(getOsloDate())}</Label>
          <div style={{ marginTop: 5, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--onDeep)', lineHeight: 1.2 }}>
            {status.text}
            {moving && !status.far && <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--onDeepDim)' }}> · {pos.sog!.toFixed(0)} knop</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: age.stale ? 'color-mix(in srgb, var(--warn) 55%, white)' : 'var(--onDeepDim)' }}>
          <Icon name="clock" size={12} color="currentColor" stroke={2} />
          <span style={{ whiteSpace: 'nowrap' }}>{age.short}</span>
        </div>
      </div>
      <RouteLine pos={pos} line={line} target={status.target} showFerry={!status.far} highlight={note?.stop ?? null} />
      {note && (
        <div style={{ marginTop: 8, padding: '9px 12px', borderRadius: 'var(--radSm)', background: note.late ? 'color-mix(in srgb, var(--warn) 20%, transparent)' : 'color-mix(in srgb, var(--accentOnDeep) 16%, transparent)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: note.late ? 'color-mix(in srgb, var(--warn) 55%, white)' : 'var(--accentOnDeep)', lineHeight: 1.35 }}>
          <Icon name={note.late ? 'alert' : 'clock'} size={14} color="currentColor" stroke={2.2} style={{ flexShrink: 0 }} />
          <span>{note.text}</span>
        </div>
      )}
    </a>
  );
}
