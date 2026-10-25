import React, { useEffect, useState } from 'react';
import { Label } from './Atoms';
import { Icon } from './Icons';
import { useLiveTrack } from '../liveDelay';
import { mapTimes } from '../mapTimes';
import { MapSvg, TimeCells, VesselToggle, mapInView, useVessels, vesselsInView, type MapPos } from './MapView';
import type { StopId } from '../types';

// Kart over fergeområdet i appens farger, med ferga der AIS sier den er.
// Kartet er nord opp og i meter, så 1 enhet i SVG-en er 1 meter.

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
  const [showOthers, setShowOthers] = useState(() => localStorage.getItem('visAndreBater') === '1');
  const others = useVessels(open && showOthers);
  const visible = vesselsInView(others.vessels);
  useEffect(() => { try { localStorage.setItem('visAndreBater', showOthers ? '1' : '0'); } catch { /* privat modus */ } }, [showOthers]);
  const inView = mapInView(pos);
  const moving = pos.sog != null && pos.sog >= 1.5;
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

        <TimeCells times={times} style={{ margin: '0 12px 10px' }} />

        <div style={{ position: 'relative', margin: '0 12px', borderRadius: 'var(--rad)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)' }}>
          <MapSvg pos={pos} trail={track?.trail} tags={tags} highlight={highlight} humla={humla} vessels={visible} />
          <VesselToggle on={showOthers} count={visible.length} error={others.error} onToggle={() => setShowOthers(v => !v)} />
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
          <span>Kart: © OpenStreetMap-bidragsytere · AIS: BarentsWatch</span>
          <a href={`https://maps.google.com/?q=${pos.lat},${pos.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--onDeep)', fontWeight: 600, whiteSpace: 'nowrap' }}>Google Maps</a>
        </div>
      </div>
    </div>
  );
}
