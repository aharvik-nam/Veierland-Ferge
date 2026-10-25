import React, { useEffect, useState } from 'react';
import { Label } from './Atoms';
import { stopCoords, stopsMap } from '../ferryData';
import { MAP_VIEW, toMap, LAND_PATH, ROUTE, LABELS } from '../map/kart';
import { API_BASE } from '../platform';
import type { TimeCell } from '../mapTimes';
import type { StopId } from '../types';

// Selve fergekartet (SVG i meter, nord opp), brukt både i kartarket og på dashbordene for store skjermer.

export interface MapPos { lat: number; lng: number; sog: number | null; cog: number | null; heading: number | null; time: string | null }

export interface Vessel {
  mmsi: number; name: string; kind: string;
  lat: number; lng: number; sog: number | null; cog: number | null; heading: number | null;
  length: number | null; ageMin: number | null;
}

const QUAYS: StopId[] = ['tenvik', 'vestgarden', 'tangen', 'engo'];
const routePath = ROUTE.map(([lat, lng], i) => { const p = toMap(lat, lng); return `${i ? 'L' : 'M'}${p.x.toFixed(0)} ${p.y.toFixed(0)}`; }).join('');
const SEA = 'color-mix(in srgb, var(--deep) 82%, #000)';

// Andre båter fra AIS, hentet bare mens knappen er på
export function useVessels(enabled: boolean): { vessels: Vessel[]; error: boolean } {
  const [state, setState] = useState<{ vessels: Vessel[]; error: boolean }>({ vessels: [], error: false });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`${API_BASE}/api/vessels`);
        const data = await res.json() as { vessels?: Vessel[] };
        if (alive) setState(res.ok && Array.isArray(data.vessels) ? { vessels: data.vessels, error: false } : { vessels: [], error: true });
      } catch { if (alive) setState(s => ({ ...s, error: true })); }
    };
    load();
    const id = setInterval(load, 30_000);
    document.addEventListener('visibilitychange', load);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', load); };
  }, [enabled]);
  return enabled ? state : { vessels: [], error: false };
}

// Knapp oppå kartet: «Andre båter»
export function VesselToggle({ on, count, error, onToggle }: { on: boolean; count: number; error: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={on} style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 99, cursor: 'pointer', background: on ? 'var(--accentOnDeep)' : 'color-mix(in srgb, var(--deep) 70%, transparent)', border: on ? 'none' : '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: on ? 'var(--deep)' : 'var(--onDeep)' }}>
      <svg width="13" height="13" viewBox="-10 -10 20 20"><path d="M0,-8 L6,6 L0,3 L-6,6 Z" fill="currentColor" /></svg>
      {on ? (error ? 'Andre båter: ingen data' : count ? `Andre båter · ${count}` : 'Ingen andre båter i kartet nå') : 'Andre båter'}
    </button>
  );
}

// To felt over kartet: «Gikk fra Tenvik 10:07» og «Ankommer Tangen ca. 10:25»
export function TimeCells({ times, style }: { times: TimeCell[]; style?: React.CSSProperties }) {
  if (!times.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: times.length > 1 ? '1fr 1fr' : '1fr', gap: 8, ...style }}>
      {times.map(c => (
        <div key={c.label} style={{ minWidth: 0, padding: '9px 12px 10px', borderRadius: 'var(--radSm)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Label color="var(--onDeepDim)" style={{ fontSize: 9, letterSpacing: '0.12em' }}>{c.label}</Label>
          <div style={{ marginTop: 3, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--onDeep)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{c.time}</div>
          {c.sub && <div style={{ marginTop: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11.5, color: c.late ? 'color-mix(in srgb, var(--warn) 55%, white)' : 'var(--onDeepDim)' }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// Ruta Tenvik–Engø med plass til navnene; et beskåret kart sentreres på den
const ROUTE_BOX = { x0: 650, x1: 3900, y0: 900, y1: 4250 };

// Utsnitt med boksens proporsjoner (bredde/høyde), sentrert på ruta og innenfor kartet
function viewRect(aspect?: number): { x: number; y: number; w: number; h: number } {
  const W = MAP_VIEW.width, H = MAP_VIEW.height;
  if (!aspect) return { x: 0, y: 0, w: W, h: H };
  const cx = (ROUTE_BOX.x0 + ROUTE_BOX.x1) / 2, cy = (ROUTE_BOX.y0 + ROUTE_BOX.y1) / 2;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  if (aspect >= W / H) {
    const h = W / aspect;
    return { x: 0, y: clamp(cy - h / 2, 0, H - h), w: W, h };
  }
  const w = H * aspect;
  return { x: clamp(cx - w / 2, 0, W - w), y: 0, w, h: H };
}
function viewBoxFor(aspect: number): string {
  const r = viewRect(aspect);
  return `${r.x.toFixed(0)} ${r.y.toFixed(0)} ${r.w.toFixed(0)} ${r.h.toFixed(0)}`;
}

// Båtene som faktisk synes i kartet (APIet gir også noen like utenfor kanten).
// aspect: kartboksens proporsjoner når kartet er beskåret (se viewBoxFor)
export function vesselsInView(vessels: Vessel[], aspect?: number): Vessel[] {
  const r = viewRect(aspect), m = 60; // litt margin, så halve trekanter i kanten ikke telles
  return vessels.filter(v => {
    const p = toMap(v.lat, v.lng);
    return p.x >= r.x + m && p.x <= r.x + r.w - m && p.y >= r.y + m && p.y <= r.y + r.h - m;
  });
}

// fill: kartet fyller boksen det står i, med boksens proporsjoner (aspect) og sentrert på ruta;
// ellers full bredde med kartets egne proporsjoner
export function MapSvg({ pos, trail = [], tags, highlight = null, humla, vessels = [], fill = false, aspect }: {
  pos: MapPos | null;
  trail?: [number, number][];
  tags?: Map<StopId, string>;
  highlight?: StopId | null;
  humla: boolean;
  vessels?: Vessel[];
  fill?: boolean;
  aspect?: number;
}) {
  const ferry = pos ? toMap(pos.lat, pos.lng) : null;
  const inView = ferry != null && ferry.x >= 0 && ferry.y >= 0 && ferry.x <= MAP_VIEW.width && ferry.y <= MAP_VIEW.height;
  const moving = pos?.sog != null && pos.sog >= 1.5;
  const course = pos ? pos.cog ?? pos.heading : null;
  const line = trail.map(([lat, lng]) => toMap(lat, lng));
  const halo = { stroke: SEA, strokeWidth: 3, paintOrder: 'stroke' as const, vectorEffect: 'non-scaling-stroke' as const };

  return (
    <svg viewBox={fill && aspect ? viewBoxFor(aspect) : `0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`} width="100%" height={fill ? '100%' : undefined} preserveAspectRatio={fill ? 'xMidYMid slice' : undefined}
      style={{ display: 'block', background: SEA }} fontFamily="'Space Grotesk', sans-serif">
      <path d={LAND_PATH} fill="color-mix(in srgb, var(--onDeep) 13%, var(--deep))" fillRule="evenodd" />
      {LABELS.map(l => { const p = toMap(l.lat, l.lng); return (
        <text key={l.name} x={p.x} y={p.y} textAnchor="middle" fontSize={150} fontStyle="italic" fontWeight={600} fill="var(--onDeepDim)" opacity={0.75}>{l.name}</text>
      ); })}
      <path d={routePath} fill="none" stroke="var(--onDeepDim)" strokeWidth={1.6} strokeDasharray="5 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.8} />
      {line.length > 1 && (
        <polyline points={line.map(p => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')} fill="none" stroke="var(--accentOnDeep)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.55} />
      )}
      {/* andre båter: lyse trekanter i fartsretningen, prikk når de ligger stille */}
      {vessels.map(v => {
        const p = toMap(v.lat, v.lng);
        const dir = v.cog ?? v.heading;
        const still = v.sog == null || v.sog < 1;
        return (
          <g key={v.mmsi} transform={`translate(${p.x.toFixed(0)} ${p.y.toFixed(0)})`} opacity={still ? 0.7 : 0.95}>
            {still || dir == null
              ? <circle r={45} fill="var(--onDeep)" stroke={SEA} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              : <path d="M0,-95 L62,70 L0,38 L-62,70 Z" fill="var(--onDeep)" stroke={SEA} strokeWidth={2} vectorEffect="non-scaling-stroke" transform={`rotate(${dir})`} />}
            {v.name && <text x={85} y={35} fontSize={95} fontWeight={600} fill="var(--onDeep)" {...halo}>{v.name}{!still && v.sog != null ? ` · ${v.sog.toFixed(0)} kn` : ''}</text>}
          </g>
        );
      })}
      {QUAYS.map(s => {
        const p = toMap(stopCoords[s].lat, stopCoords[s].lng);
        const dim = humla && s === 'vestgarden'; // ingen avganger fra Vestgården mens Humla seiler
        const right = s !== 'tenvik';
        return (
          <g key={s} opacity={dim ? 0.6 : 1}>
            {s === highlight && <circle cx={p.x} cy={p.y} r={95} fill="none" stroke="var(--accent2)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />}
            <circle cx={p.x} cy={p.y} r={52} fill="var(--deep)" stroke="var(--onDeep)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <text x={p.x + (right ? 120 : -120)} y={p.y + 50} textAnchor={right ? 'start' : 'end'} fontSize={150} fontWeight={700} fill="var(--onDeep)" {...halo}>
              {stopsMap[s]}
            </text>
            {tags?.has(s) && (
              <text x={p.x + (right ? 120 : -120)} y={p.y + 205} textAnchor={right ? 'start' : 'end'} fontSize={125} fontWeight={700} fill="var(--accentOnDeep)" {...halo} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {tags.get(s)}
              </text>
            )}
          </g>
        );
      })}
      {inView && (
        <g transform={`translate(${ferry!.x.toFixed(0)} ${ferry!.y.toFixed(0)})`}>
          <circle r={120} fill="var(--accentOnDeep)" opacity={0.3}>
            <animate attributeName="r" values="90;200;90" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          {moving && course != null
            ? <path d="M0,-150 L105,110 L0,58 L-105,110 Z" fill="var(--accentOnDeep)" stroke="var(--deep)" strokeWidth={2} vectorEffect="non-scaling-stroke" transform={`rotate(${course})`} />
            : <circle r={80} fill="var(--accentOnDeep)" stroke="var(--deep)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </g>
      )}
      {/* målestokk og nordpil */}
      <g transform={`translate(160 ${MAP_VIEW.height - 170})`}>
        <line x1={0} y1={0} x2={500} y2={0} stroke="var(--onDeepDim)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-45} x2={0} y2={0} stroke="var(--onDeepDim)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1={500} y1={-45} x2={500} y2={0} stroke="var(--onDeepDim)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <text x={250} y={-70} textAnchor="middle" fontSize={120} fontWeight={600} fill="var(--onDeepDim)">500 m</text>
      </g>
      <g transform={`translate(${MAP_VIEW.width - 220} 260)`}>
        <path d="M0,-120 L60,40 L0,10 L-60,40 Z" fill="var(--onDeepDim)" />
        <text x={0} y={190} textAnchor="middle" fontSize={130} fontWeight={700} fill="var(--onDeepDim)">N</text>
      </g>
    </svg>
  );
}

export function mapInView(pos: MapPos): boolean {
  const p = toMap(pos.lat, pos.lng);
  return p.x >= 0 && p.y >= 0 && p.x <= MAP_VIEW.width && p.y <= MAP_VIEW.height;
}
