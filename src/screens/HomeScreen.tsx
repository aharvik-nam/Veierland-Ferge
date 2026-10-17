import React, { useState, useEffect } from 'react';
import { CompassMark } from '../components/Icons';
import { Icon } from '../components/Icons';
import { DeepBand, WeatherChip, RouteCard, NumTime, Label } from '../components/Atoms';
import { nextDepartures, minsUntil, fmtCountdown, ymd, getOsloDate, parseYmd, stopsMap, bookingStatus, isSummerSeason, isMaintenancePeriod, ferryName } from '../ferryData';
import { FerryLive } from '../components/FerryLive';
import type { StopId, Weather, Trip } from '../types';

const PLAN_MONTHS = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const PLAN_DAYS_SHORT = ['søn','man','tir','ons','tor','fre','lør'];
function capFirst(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function formatPlanDate(ds: string): string {
  const d = parseYmd(ds);
  return `${capFirst(PLAN_DAYS_SHORT[d.getDay()])} ${d.getDate()}. ${PLAN_MONTHS[d.getMonth()].slice(0, 3)}`;
}

function PlanCalendar({ open, selected, onSelect, onClose }: { open: boolean; selected: string; onSelect: (ds: string) => void; onClose: () => void }) {
  const today = getOsloDate();
  const todayStr = ymd(today);
  const selDate = parseYmd(selected);
  const [viewYm, setViewYm] = useState(() => ({ y: selDate.getFullYear(), m: selDate.getMonth() }));
  useEffect(() => { if (open) setViewYm({ y: selDate.getFullYear(), m: selDate.getMonth() }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(viewYm.y, viewYm.m, 1);
  const daysInMonth = new Date(viewYm.y, viewYm.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const atCurrentMonth = viewYm.y === today.getFullYear() && viewYm.m === today.getMonth();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,24,0.45)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: '14px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 -20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ width: 42, height: 5, borderRadius: 99, background: 'var(--line)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => setViewYm(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })} disabled={atCurrentMonth} style={{ width: 38, height: 38, borderRadius: 99, border: '1.5px solid var(--line)', background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: atCurrentMonth ? 'default' : 'pointer', opacity: atCurrentMonth ? 0.3 : 1 }}>
            <Icon name="chevronLeft" size={17} color="var(--ink)" stroke={2.2} />
          </button>
          <span style={{ fontFamily: 'var(--num)', fontSize: 21, color: 'var(--ink)' }}>{capFirst(PLAN_MONTHS[viewYm.m])} {viewYm.y}</span>
          <button onClick={() => setViewYm(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })} style={{ width: 38, height: 38, borderRadius: 99, border: '1.5px solid var(--line)', background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chevronRight" size={17} color="var(--ink)" stroke={2.2} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['Ma','Ti','On','To','Fr','Lø','Sø'].map(wd => (
            <div key={wd} style={{ textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--inkDim)', textTransform: 'uppercase' }}>{wd}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (day == null) return <div key={`e${i}`} />;
            const ds = ymd(new Date(viewYm.y, viewYm.m, day));
            const isPast = ds < todayStr;
            const isSel = ds === selected;
            const isToday = ds === todayStr;
            return (
              <button key={ds} disabled={isPast} onClick={() => { onSelect(ds); onClose(); }} style={{ aspectRatio: '1', borderRadius: 12, cursor: isPast ? 'default' : 'pointer', border: isSel ? '2px solid var(--accent)' : isToday ? '1.5px solid var(--accent2)' : '1.5px solid transparent', background: isSel ? 'var(--accent)' : 'var(--surfaceAlt)', opacity: isPast ? 0.28 : 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: isSel || isToday ? 700 : 600, fontSize: 14, color: isSel ? 'var(--accentInk)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface HomeScreenProps {
  from: StopId;
  to: StopId;
  weather: Weather | null;
  animate: boolean;
  texture: boolean;
  onEditFrom: () => void;
  onEditTo: () => void;
  onSwap: () => void;
  onSeeAll: (date: string) => void;
  onOpenTrip: (trip: Trip) => void;
  tick: number;
  onOpenWeather: () => void;
  onboarded: boolean;
  onSetOnboarded: () => void;
  onReset: () => void;
  onPlanDate: (date: string) => void;
}

export function HomeScreen({ from, to, weather, animate, texture, onEditFrom, onEditTo, onSwap, onSeeAll, onOpenTrip, tick: _tick, onOpenWeather, onboarded, onSetOnboarded, onReset, onPlanDate }: HomeScreenProps) {
  const [planCal, setPlanCal] = useState(false);
  const [planDate, setPlanDate] = useState<string | null>(null);
  const [adminNotices, setAdminNotices] = useState<Array<{id: string; text: string; type: string; active: boolean}>>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vf_notices');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setAdminNotices(parsed.filter((n: {active?: boolean}) => n.active));
      }
    } catch {}
  }, []);

  const deps = nextDepartures(from, to, 4);
  const dep = deps[0] ?? null;
  const later = deps.slice(1);
  const countdown = dep && dep.dateStr === ymd(getOsloDate()) ? minsUntil(dep.dateStr, dep.startTime) : null;


  if (!onboarded) {
    return (
      <>
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, var(--deep) 0%, var(--deep2) 55%, var(--deep) 100%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <CompassMark size={34} color="var(--onDeep)" opacity={0.85} />
            <div>
              <div style={{ fontFamily: 'var(--num)', fontSize: 25, color: 'var(--onDeep)', lineHeight: 0.9 }}>Veierland</div>
              <Label color="var(--onDeepDim)" style={{ fontSize: 9.5 }}>{ferryName(getOsloDate())} · Ferge</Label>
            </div>
          </div>
          <WeatherChip weather={weather} onDeep onClick={onOpenWeather} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px calc(env(safe-area-inset-bottom, 0px) + 40px)', gap: 14 }}>
          <div data-tour="route-picker"><RouteCard from={from} to={to} onEditFrom={onEditFrom} onEditTo={onEditTo} onSwap={onSwap} /></div>

          <button data-tour="find-next-btn" onClick={onSetOnboarded} style={{ width: '100%', padding: '16px', borderRadius: 'var(--rad)', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--accentInk)' }}>Finn neste avgang</span>
            <Icon name="arrowRight" size={18} color="var(--accentInk)" stroke={2.2} />
          </button>

          <button onClick={() => setPlanCal(true)} style={{ width: '100%', padding: '16px', borderRadius: 'var(--rad)', background: 'transparent', border: '2px solid var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Icon name="calendar" size={18} color="var(--accent)" stroke={2.2} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{planDate ? formatPlanDate(planDate) : 'Planlegg reise'}</span>
          </button>

          <a
            href="/rutetabell.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Icon name="calendar" size={18} color="var(--onDeep)" stroke={1.9} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)' }}>Klassisk rutetabell</span>
            </span>
            <Icon name="chevronRight" size={17} color="var(--onDeepDim)" stroke={2} />
          </a>

          {adminNotices.map(n => {
            const bg = n.type === 'warning' ? 'rgba(220,50,50,0.15)' : n.type === 'price' ? 'rgba(26,138,100,0.15)' : 'rgba(12,130,166,0.15)';
            const br = n.type === 'warning' ? 'rgba(220,50,50,0.35)' : n.type === 'price' ? 'rgba(26,138,100,0.35)' : 'rgba(12,130,166,0.35)';
            const col = n.type === 'warning' ? '#ff6b6b' : n.type === 'price' ? '#4ad4a0' : '#7ecfea';
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--rad)', background: bg, border: `1px solid ${br}` }}>
                <Icon name="alert" size={15} color={col} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: col, lineHeight: 1.45 }}>{n.text}</div>
              </div>
            );
          })}

          {isMaintenancePeriod(getOsloDate()) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--rad)', background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.35)' }}>
              <Icon name="alert" size={15} color="#ff6b6b" stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: '#ff6b6b', marginBottom: 2 }}>M/F Humla seiler · 17. okt. – ca. 1. mars</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--onDeepDim)', lineHeight: 1.4 }}>Kun Tenvik–Tangen (Engø). Vestgården utgår. Kun passasjerer og håndbagasje.</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <PlanCalendar
        open={planCal}
        selected={planDate ?? ymd(getOsloDate())}
        onSelect={(ds) => { setPlanDate(ds); onSetOnboarded(); onPlanDate(ds); }}
        onClose={() => setPlanCal(false)}
      />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, var(--deep) 0%, var(--deep2) 55%, var(--deep) 100%)', position: 'relative' }}>
      <div style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 18px calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <CompassMark size={34} color="var(--onDeep)" opacity={0.85} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--num)', fontSize: 25, color: 'var(--onDeep)', lineHeight: 0.9 }}>Veierland</div>
              <Label color="var(--onDeepDim)" style={{ fontSize: 9.5 }}>{ferryName(getOsloDate())} · Ferge</Label>
            </div>
          </button>
          <WeatherChip weather={weather} onDeep onClick={onOpenWeather} />
        </div>

        {/* compact route bar */}
        <div data-tour="compact-route-bar" onClick={onEditFrom} role="button" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radSm)', padding: '10px 14px', cursor: 'pointer' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>{stopsMap[from]}</span>
          <Icon name="arrowRight" size={14} color="var(--onDeepDim)" stroke={2} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--onDeep)', whiteSpace: 'nowrap', flex: 1, textAlign: 'right' }}>{stopsMap[to]}</span>
          <button onClick={e => { e.stopPropagation(); onSwap(); }} style={{ marginLeft: 6, width: 28, height: 28, borderRadius: 99, background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="swap" size={13} color="var(--accentInk)" stroke={2.2} />
          </button>
        </div>

        {/* next departure hero */}
        {dep ? (
          <div data-tour="hero-card" style={{ marginTop: 18, borderRadius: 'var(--rad)', overflow: 'hidden', background: 'var(--surface)', boxShadow: '0 24px 50px -24px rgba(0,0,0,0.6)' }}>
            <DeepBand animate={animate} texture={texture} ferry waves waveHeight={40} ferrySize={36} style={{ padding: '18px 20px 46px' }}>
              <button onClick={() => onOpenTrip(dep)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Label color="var(--onDeepDim)">Neste avgang</Label>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: 'var(--onDeep)', padding: '4px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.10)' }}>{dep.dayLabel}</span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <NumTime size={64} color="var(--onDeep)">{dep.startTime}</NumTime>
                  {countdown != null && countdown > 0 && (
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--accent)', whiteSpace: 'nowrap' }}>om {fmtCountdown(countdown)}</span>
                  )}
                </div>
                <div style={{ marginTop: 6, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--onDeepDim)' }}>
                  {stopsMap[from]} → {stopsMap[to]} · fremme {dep.endTime}
                </div>
              </button>
            </DeepBand>

            {(() => {
              const bs = bookingStatus(dep);
              if (!bs.required) return null;
              return (
                <div style={{ background: bs.passed ? 'color-mix(in srgb, var(--bad) 14%, var(--surface))' : 'color-mix(in srgb, var(--bad) 10%, var(--surface))', borderBottom: '1px solid color-mix(in srgb, var(--bad) 22%, transparent)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="alert" size={16} color="var(--bad)" stroke={2.2} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--bad)' }}>
                      {bs.passed ? 'Bestillingsfrist er passert' : 'Forhåndsbestilling kreves'}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5, color: 'var(--inkDim)', paddingLeft: 24, lineHeight: 1.4 }}>
                    {bs.passed ? 'Du kan ikke lenger bestille denne avgangen per telefon.' : bs.label}
                  </div>
                  {!bs.passed && (
                    <a href="tel:91888219" style={{ marginTop: 4, marginLeft: 24, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 'var(--radSm)', background: 'var(--bad)', textDecoration: 'none', alignSelf: 'flex-start' }}>
                      <Icon name="phone" size={14} color="#fff" stroke={2} />
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff' }}>Ring · 918 88 219</span>
                    </a>
                  )}
                </div>
              );
            })()}
            <button onClick={() => onSeeAll(dep.dateStr)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>Se alle avganger {dep.dayLabel.toLowerCase()}</span>
              <Icon name="chevronRight" size={18} color="var(--inkDim)" stroke={2} />
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 18, padding: 30, borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <Icon name="anchor" size={30} color="var(--onDeepDim)" />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--onDeep)', marginTop: 10 }}>Ingen avganger funnet for denne ruten</div>
          </div>
        )}

        {/* de neste avgangene etter den store */}
        {later.length > 0 && (
          <div data-tour="mini-cards" style={{ marginTop: 12 }}>
            <Label color="var(--onDeepDim)" style={{ fontSize: 10, paddingLeft: 4 }}>Deretter</Label>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: `repeat(${later.length}, 1fr)`, gap: 8 }}>
              {later.map(trip => {
                const cd = trip.dateStr === ymd(getOsloDate()) ? minsUntil(trip.dateStr, trip.startTime) : null;
                const booking = bookingStatus(trip).required;
                const sub = trip.dayLabel !== dep?.dayLabel ? trip.dayLabel : cd != null && cd < 180 ? `om ${fmtCountdown(cd)}` : `fremme ${trip.endTime}`;
                return (
                  <button
                    key={trip.id + trip.dateStr}
                    onClick={() => onOpenTrip(trip)}
                    style={{ textAlign: 'left', padding: '12px 12px 11px', borderRadius: 'var(--radSm)', background: 'rgba(255,255,255,0.07)', border: booking ? '1px solid color-mix(in srgb, var(--bad) 50%, transparent)' : '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', minWidth: 0 }}
                  >
                    <NumTime size={28} color="var(--onDeep)">{trip.startTime}</NumTime>
                    <div style={{ marginTop: 5, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: booking ? 'var(--bad)' : 'var(--onDeepDim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {booking ? 'Må bestilles' : sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <FerryLive />

        <a
          href="/rutetabell.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name="calendar" size={19} color="var(--onDeep)" stroke={1.9} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)' }}>Klassisk rutetabell</span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--onDeepDim)" stroke={2} />
        </a>

        {adminNotices.map(n => {
          const bg = n.type === 'warning' ? 'rgba(220,50,50,0.15)' : n.type === 'price' ? 'rgba(26,138,100,0.15)' : 'rgba(12,130,166,0.15)';
          const br = n.type === 'warning' ? 'rgba(220,50,50,0.35)' : n.type === 'price' ? 'rgba(26,138,100,0.35)' : 'rgba(12,130,166,0.35)';
          const col = n.type === 'warning' ? '#ff6b6b' : n.type === 'price' ? '#4ad4a0' : '#7ecfea';
          return (
            <div key={n.id} style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--rad)', background: bg, border: `1px solid ${br}` }}>
              <Icon name="alert" size={15} color={col} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: col, lineHeight: 1.45 }}>{n.text}</div>
            </div>
          );
        })}

        {isMaintenancePeriod(getOsloDate()) && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--rad)', background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.35)' }}>
            <Icon name="alert" size={15} color="#ff6b6b" stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: '#ff6b6b', marginBottom: 2 }}>M/F Humla seiler · 17. okt. – ca. 1. mars</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--onDeepDim)', lineHeight: 1.4 }}>Kun Tenvik–Tangen (Engø). Vestgården utgår. Kun passasjerer og håndbagasje.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
