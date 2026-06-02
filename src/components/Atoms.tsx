import React from 'react';
import { Icon, weatherProps, FerryGlyph, WaveField, ChartTexture } from './Icons';
import { stopsMap, stopShort, stopKind, stopTravel, fmtCountdown } from '../ferryData';
import type { StopId, Weather, Trip } from '../types';

// ── Label ────────────────────────────────────────────────────
export function Label({ children, color = 'var(--onDeepDim)', style = {} }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color, ...style }}>
      {children}
    </span>
  );
}

// ── NumTime ──────────────────────────────────────────────────
export function NumTime({ children, size = 40, color = 'var(--ink)', style = {} }: { children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'var(--num)', fontWeight: 400, fontSize: size, lineHeight: 0.95, color, letterSpacing: '0.01em', fontFeatureSettings: '"tnum"', ...style }}>
      {children}
    </span>
  );
}

// ── StopDot ──────────────────────────────────────────────────
export function StopDot({ role, size = 11 }: { role: 'from' | 'to' | 'via'; size?: number }) {
  const fill = role === 'to' ? 'var(--accent)' : role === 'from' ? 'var(--accent2)' : 'transparent';
  return (
    <span style={{
      width: size, height: size, borderRadius: 99, background: fill,
      border: role === 'via' ? '2px solid var(--onDeepDim)' : 'none',
      display: 'inline-block', flexShrink: 0,
      boxShadow: role !== 'via' ? '0 0 0 4px rgba(0,0,0,0.04)' : 'none',
    }} />
  );
}

// ── WeatherChip ──────────────────────────────────────────────
export function WeatherChip({ weather, onDeep = true }: { weather: Weather | null; onDeep?: boolean }) {
  if (!weather) return <div style={{ height: 36 }} />;
  const wp = weatherProps(weather.code);
  const col = onDeep ? 'var(--onDeep)' : 'var(--ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 13px', borderRadius: 99, background: onDeep ? 'rgba(255,255,255,0.08)' : 'var(--surfaceAlt)', border: onDeep ? '1px solid rgba(255,255,255,0.10)' : '1px solid var(--line)' }}>
      <Icon name={wp.name} size={17} color={col} stroke={1.8} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: col }}>{Math.round(weather.temp)}°</span>
      <span style={{ width: 1, height: 12, background: onDeep ? 'rgba(255,255,255,0.18)' : 'var(--line)' }} />
      <Icon name="wind" size={15} color={col} stroke={1.8} style={{ opacity: 0.8 }} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: col }}>
        {weather.wind.toFixed(0)}<span style={{ fontSize: 10, opacity: 0.7 }}> m/s</span>
      </span>
    </div>
  );
}

// ── StatusSignal ─────────────────────────────────────────────
export function StatusSignal({ status }: { status: { level: 'good' | 'warn' | 'bad'; label: string; sub: string } }) {
  const colorMap = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)' };
  const c = colorMap[status.level];
  const ic = status.level === 'good' ? 'check' : status.level === 'warn' ? 'alert' : 'x';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radSm)', background: 'var(--surface)', border: `1.5px solid ${c}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: c }} />
      <div style={{ width: 32, height: 32, borderRadius: 99, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 4 }}>
        <Icon name={ic as 'check' | 'alert' | 'x'} size={18} color="#fff" stroke={2.6} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14.5, color: c, lineHeight: 1.1 }}>{status.label}</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11.5, color: 'var(--inkDim)', marginTop: 3, lineHeight: 1.25 }}>{status.sub}</div>
      </div>
    </div>
  );
}

// ── TravelChips ──────────────────────────────────────────────
export function TravelChips({ stop, onDeep = false, showCar: showCarProp, showWalk: showWalkProp, driveOverride }: { stop: StopId; onDeep?: boolean; showCar?: boolean; showWalk?: boolean; driveOverride?: number | null }) {
  const tv = stopTravel[stop];
  if (!tv) return null;
  const showCar = showCarProp !== undefined ? showCarProp : tv.showCar;
  const showWalk = showWalkProp !== undefined ? showWalkProp : true;
  if (!showCar && !showWalk) return null;
  const driveDisplay = fmtCountdown(driveOverride != null ? driveOverride : tv.drive);
  const walkDisplay = fmtCountdown(tv.walk);
  const col = onDeep ? 'var(--onDeep)' : 'var(--ink)';
  const dim = onDeep ? 'var(--onDeepDim)' : 'var(--inkDim)';

  const chip = (icon: 'car' | 'walk', big: string, small: string) => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 'var(--radSm)', background: onDeep ? 'rgba(255,255,255,0.07)' : 'var(--surfaceAlt)', border: onDeep ? '1px solid rgba(255,255,255,0.09)' : '1px solid var(--line)' }}>
      <Icon name={icon} size={19} color={dim} stroke={1.9} />
      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: col, lineHeight: 1, whiteSpace: 'nowrap' }}>{big}</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: dim, marginTop: 3 }}>{small}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {showCar && chip('car', driveDisplay, 'med bil')}
      {showWalk && chip('walk', walkDisplay, 'til fots')}
    </div>
  );
}

// ── DeepBand ─────────────────────────────────────────────────
export function DeepBand({ children, animate, texture, style = {}, waves = true, ferry = false }: {
  children: React.ReactNode;
  animate: boolean;
  texture: boolean;
  style?: React.CSSProperties;
  waves?: boolean;
  ferry?: boolean;
}) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, var(--deep) 0%, var(--deep2) 130%)', ...style }}>
      <ChartTexture on={texture} />
      {children}
      {waves && <WaveField height={70} animate={animate} />}
      {ferry && (
        <div style={{ position: 'absolute', bottom: 14, left: 0, width: 64, animation: animate ? 'ferryGlide 14s ease-in-out infinite' : 'none' }}>
          <div style={{ animation: animate ? 'ferryBob 3.2s ease-in-out infinite' : 'none' }}>
            <FerryGlyph size={56} hull="var(--accent)" cabin="var(--onDeep)" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── StopPicker ───────────────────────────────────────────────
export function StopPicker({ open, title, selected, exclude, which, onPick, onClose }: {
  open: boolean;
  title: string;
  selected: StopId;
  exclude: StopId;
  which: 'from' | 'to' | null;
  onPick: (s: StopId) => void;
  onClose: () => void;
}) {
  const allStops: StopId[] = ['buss_tbg', 'tenvik', 'vestgarden', 'engo', 'tangen', 'buss_tenv'];
  // Only show the relevant bus stop based on direction
  const stops = allStops.filter(s => {
    if (which === 'from' && s === 'buss_tenv') return false;
    if (which === 'to' && s === 'buss_tbg') return false;
    return true;
  });
  const kindLabel = { buss: 'Bussforbindelse', fastland: 'Fastland', øy: 'På Veierland' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,24,0.45)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: '14px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)', transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 -20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ width: 42, height: 5, borderRadius: 99, background: 'var(--line)', margin: '0 auto 16px' }} />
        <Label color="var(--inkDim)" style={{ paddingLeft: 4 }}>{title}</Label>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stops.map(s => {
            const isSel = s === selected;
            const isDisabled = s === exclude;
            return (
              <button key={s} disabled={isDisabled} onClick={() => onPick(s)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderRadius: 'var(--radSm)', border: isSel ? '1.5px solid var(--accent)' : '1.5px solid var(--line)', background: isSel ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.32 : 1, textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={stopKind[s] === 'buss' ? 'car' : 'anchor'} size={18} color="var(--inkDim)" stroke={1.9} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{stopsMap[s]}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11.5, color: 'var(--inkDim)', marginTop: 1 }}>{kindLabel[stopKind[s]]}</div>
                </div>
                {isSel && <Icon name="check" size={20} color="var(--accent)" stroke={2.6} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── RouteCard ────────────────────────────────────────────────
export function RouteCard({ from, to, onEditFrom, onEditTo, onSwap }: { from: StopId; to: StopId; onEditFrom: () => void; onEditTo: () => void; onSwap: () => void }) {
  const Row = ({ role, stop, onEdit }: { role: 'from' | 'to'; stop: StopId; onEdit: () => void }) => (
    <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer', textAlign: 'left' }}>
      <StopDot role={role} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Label>{role === 'from' ? 'Fra' : 'Til'}</Label>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 21, color: 'var(--onDeep)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stopsMap[stop]}</div>
      </div>
      <Icon name="chevronDown" size={18} color="var(--onDeepDim)" stroke={2} />
    </button>
  );
  return (
    <div style={{ position: 'relative', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--rad)', padding: '16px 18px' }}>
      <Row role="from" stop={from} onEdit={onEditFrom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0' }}>
        <div style={{ width: 11, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 2, height: 22, background: 'repeating-linear-gradient(var(--onDeepDim) 0 3px, transparent 3px 7px)' }} />
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
        <button onClick={onSwap} style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
          <Icon name="swap" size={19} color="var(--accentInk)" stroke={2.2} />
        </button>
      </div>
      <Row role="to" stop={to} onEdit={onEditTo} />
    </div>
  );
}

// ── TripCard ─────────────────────────────────────────────────
export function TripCard({ trip, isNext, countdown, onClick }: { trip: Trip; isNext: boolean; countdown: number | null; onClick: () => void }) {
  const booking = trip.warnings.find(w => w.type === 'booking');
  const engo = trip.warnings.find(w => w.type === 'engo');
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--rad)', overflow: 'hidden', border: isNext ? '1.5px solid var(--accent)' : '1px solid var(--line)', background: 'var(--surface)', padding: 0, boxShadow: isNext ? '0 10px 30px -12px color-mix(in srgb, var(--accent) 50%, transparent)' : '0 1px 2px rgba(0,0,0,0.03)' }}>
      {isNext && (
        <div style={{ background: 'var(--accent)', padding: '7px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <Label color="var(--accentInk)" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Neste avgang</Label>
          {countdown != null && <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--accentInk)', whiteSpace: 'nowrap' }}>om {fmtCountdown(countdown)}</span>}
        </div>
      )}
      <div style={{ padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <NumTime size={34}>{trip.startTime}</NumTime>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--inkDim)', marginTop: 3 }}>{stopShort[trip.startStop]}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--inkDim)' }}>{trip.duration} min</span>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent2)' }} />
            <div style={{ flex: 1, height: 1.5, background: 'var(--line)' }} />
            <Icon name="arrowRight" size={15} color="var(--inkDim)" stroke={2} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--inkDim)', opacity: 0.7 }}>{trip.subpath.length} stopp</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <NumTime size={34} color="var(--accent)">{trip.endTime}</NumTime>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--inkDim)', marginTop: 3 }}>{stopShort[trip.subpath[trip.subpath.length - 1].stopId]}</div>
        </div>
        <Icon name="chevronRight" size={18} color="var(--inkDim)" stroke={2} style={{ opacity: 0.5 }} />
      </div>
      {(booking || engo) && (
        <div style={{ padding: '8px 16px', background: 'color-mix(in srgb, var(--bad) 8%, var(--surface))', borderTop: '1px solid color-mix(in srgb, var(--bad) 20%, transparent)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={14} color="var(--bad)" stroke={2} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: 'var(--bad)' }}>{booking ? 'Krever forhåndsbestilling' : 'Rød avgang via Engø'}</span>
        </div>
      )}
    </button>
  );
}

// ── CallButton ───────────────────────────────────────────────
export function CallButton({ compact = false }: { compact?: boolean }) {
  return (
    <a href="tel:91888219" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, padding: compact ? '13px' : '17px', borderRadius: 'var(--rad)', background: 'var(--deep)', color: 'var(--onDeep)', textDecoration: 'none', boxShadow: '0 8px 22px -10px var(--deep)' }}>
      <Icon name="phone" size={19} color="var(--onDeep)" stroke={1.9} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>Ring fergen · 918 88 219</span>
    </a>
  );
}
