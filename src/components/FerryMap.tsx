import React from 'react';
import { Label } from './Atoms';
import { Icon } from './Icons';
import { stopCoords, stopsMap } from '../ferryData';
import { MAP_VIEW, toMap, LAND_PATH, ROUTE, LABELS } from '../map/kart';
import { useLiveTrack } from '../liveDelay';
import { mapTimes } from '../mapTimes';
import type { StopId } from '../types';

// Kart over fergeområdet i appens farger, med ferga der AIS sier den er.
// Kartet er nord opp og i meter, så 1 enhet i SVG-en er 1 meter.

interface MapPos { lat: number; lng: number; sog: number | null; cog: number | null; heading: number | null; time: string | null }

const QUAYS: StopId[] = ['tenvik', 'vestgarden', 'tangen', 'engo'];
const routePath = ROUTE.map(([lat, lng], i) => { const p = toMap(lat, lng); return `${i ? 'L' : 'M'}${p.x.toFixed(0)} ${p.y.toFixed(0)}`; }).join('');

export function FerryMap({ open, pos, title, target, ageText, note, highlight, humla, onClose }: {
  open: boolean;
  pos: MapPos;
  title: string;
  target: StopId | null; // kaia ferga er på vei mot

  ageText: string;
  note: string | null;
  highlight: StopId | null;
  humla: boolean;
  onClose: () => void;
}) {
  const track = useLiveTrack(open);
  const ferry = toMap(pos.lat, pos.lng);
  const inView = ferry.x >= 0 && ferry.y >= 0 && ferry.x <= MAP_VIEW.width && ferry.y <= MAP_VIEW.height;
  const moving = pos.sog != null && pos.sog >= 1.5;
  const course = pos.cog ?? pos.heading;
  const trail = (track?.trail ?? []).map(([lat, lng]) => toMap(lat, lng));
  const times = mapTimes(track, pos, target);
  // Kort tid ved kaia i kartet; ligger ferga ved samme kai som neste avgang, vises bare avgangen
  const tags = new Map(times.map(c => [c.stop, c.tag]));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }} aria-hidden={!open}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,24,0.5)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div role="dialog" aria-label="Kart over ferga" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 520, margin: '0 auto', maxHeight: '94dvh', overflowY: 'auto', background: 'var(--deep)', borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 -20px 50px rgba(0,0,0,0.35)', paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 18px 12px' }}>
          <div style={{ minWidth: 0 }}>
            <Label color="var(--onDeepDim)" style={{ fontSize: 9.5 }}>Ferga nå</Label>
            <div style={{ marginTop: 5, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--onDeep)', lineHeight: 1.25 }}>
              {title}{moving && <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--onDeepDim)' }}> · {pos.sog!.toFixed(0)} knop</span>}
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--onDeepDim)' }}>
              <Icon name="clock" size={12} color="currentColor" stroke={2} />AIS-posisjon {ageText.toLowerCase()}
            </div>
          </div>
          <button onClick={onClose} aria-label="Lukk kartet" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="x" size={17} color="var(--onDeep)" stroke={2.2} />
          </button>
        </div>

        {times.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: times.length > 1 ? '1fr 1fr' : '1fr', gap: 8, margin: '0 12px 10px' }}>
            {times.map(c => (
              <div key={c.label} style={{ minWidth: 0, padding: '9px 12px 10px', borderRadius: 'var(--radSm)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <Label color="var(--onDeepDim)" style={{ fontSize: 9, letterSpacing: '0.12em' }}>{c.label}</Label>
                <div style={{ marginTop: 3, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--onDeep)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{c.time}</div>
                {c.sub && <div style={{ marginTop: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11.5, color: c.late ? 'color-mix(in srgb, var(--warn) 55%, white)' : 'var(--onDeepDim)' }}>{c.sub}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ margin: '0 12px', borderRadius: 'var(--rad)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)' }}>
          <svg viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`} width="100%" style={{ display: 'block', background: 'color-mix(in srgb, var(--deep) 82%, #000)' }} fontFamily="'Space Grotesk', sans-serif">
            <path d={LAND_PATH} fill="color-mix(in srgb, var(--onDeep) 13%, var(--deep))" stroke="color-mix(in srgb, var(--onDeep) 24%, var(--deep))" strokeWidth={1} vectorEffect="non-scaling-stroke" fillRule="evenodd" />
            {LABELS.map(l => { const p = toMap(l.lat, l.lng); return (
              <text key={l.name} x={p.x} y={p.y} textAnchor="middle" fontSize={150} fontStyle="italic" fontWeight={600} fill="var(--onDeepDim)" opacity={0.75}>{l.name}</text>
            ); })}
            <path d={routePath} fill="none" stroke="var(--onDeepDim)" strokeWidth={1.6} strokeDasharray="5 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.8} />
            {trail.length > 1 && (
              <polyline points={trail.map(p => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')} fill="none" stroke="var(--accentOnDeep)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.55} />
            )}
            {QUAYS.map(s => {
              const p = toMap(stopCoords[s].lat, stopCoords[s].lng);
              const dim = humla && s === 'vestgarden'; // ingen avganger fra Vestgården mens Humla seiler
              const right = s === 'tenvik' ? false : true;
              return (
                <g key={s} opacity={dim ? 0.6 : 1}>
                  {s === highlight && <circle cx={p.x} cy={p.y} r={95} fill="none" stroke="var(--accent2)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />}
                  <circle cx={p.x} cy={p.y} r={52} fill="var(--deep)" stroke="var(--onDeep)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  <text x={p.x + (right ? 120 : -120)} y={p.y + 50} textAnchor={right ? 'start' : 'end'} fontSize={150} fontWeight={700} fill="var(--onDeep)" stroke="color-mix(in srgb, var(--deep) 82%, #000)" strokeWidth={3} paintOrder="stroke" vectorEffect="non-scaling-stroke">
                    {stopsMap[s]}
                  </text>
                  {tags.has(s) && (
                    <text x={p.x + (right ? 120 : -120)} y={p.y + 205} textAnchor={right ? 'start' : 'end'} fontSize={125} fontWeight={700} fill="var(--accentOnDeep)" stroke="color-mix(in srgb, var(--deep) 82%, #000)" strokeWidth={3} paintOrder="stroke" vectorEffect="non-scaling-stroke" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {tags.get(s)}
                    </text>
                  )}
                </g>
              );
            })}
            {inView && (
              <g transform={`translate(${ferry.x.toFixed(0)} ${ferry.y.toFixed(0)})`}>
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
        </div>

        {!inView && (
          <div style={{ margin: '10px 18px 0', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--onDeepDim)' }}>
            Ferga er utenfor kartutsnittet akkurat nå.
          </div>
        )}
        {note && (
          <div style={{ margin: '12px 12px 0', padding: '10px 12px', borderRadius: 'var(--radSm)', background: 'color-mix(in srgb, var(--accentOnDeep) 16%, transparent)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--accentOnDeep)', lineHeight: 1.35 }}>
            <Icon name="clock" size={14} color="currentColor" stroke={2.2} style={{ flexShrink: 0 }} />
            <span>{note}</span>
          </div>
        )}
        <div style={{ margin: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, color: 'var(--onDeepDim)' }}>
          <span>Kart: © OpenStreetMap-bidragsytere · Posisjon: BarentsWatch</span>
          <a href={`https://maps.google.com/?q=${pos.lat},${pos.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--onDeep)', fontWeight: 600, whiteSpace: 'nowrap' }}>Google Maps</a>
        </div>
      </div>
    </div>
  );
}
