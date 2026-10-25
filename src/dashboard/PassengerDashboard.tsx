import React, { useEffect, useRef, useState } from 'react';
import { CompassMark, Icon } from '../components/Icons';
import { NumTime, WeatherChip, Label, viaLabel } from '../components/Atoms';
import { HumlaNotice } from '../components/HumlaNotice';
import { CalendarSheet } from '../screens/ResultsScreen';
import {
  stopsMap, ferryName, findTripsForDay, dayTypeOf, parseYmd, ymd, getOsloDate, minsUntil, fmtCountdown,
  bookingStatus, isMaintenancePeriod, dayLabelFor,
} from '../ferryData';
import { useLiveTrack, liveDelay } from '../liveDelay';
import { Card, MapCard, WeatherHours, PunctualityLine, AlertPill, Notice, activeAlerts, useAdminNotices, useNow, useWindowSize, dateLine, font } from './parts';
import type { Conditions } from './conditions';
import type { StopId, Trip, Weather } from '../types';

// Dashbord for passasjerer. Det viktigste er å finne avganger: velg fra, til og dag øverst, avgangene rett under.
// Kartet, været og varslene står til siden.

const FROM_STOPS: StopId[] = ['buss_tbg', 'tenvik', 'vestgarden', 'tangen', 'engo'];
const TO_STOPS: StopId[] = ['tenvik', 'vestgarden', 'tangen', 'engo', 'buss_tenv'];
const SHORT_DAYS = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

function StopChips({ label, stops, selected, role, onPick }: { label: string; stops: StopId[]; selected: StopId; role: 'from' | 'to'; onPick: (s: StopId) => void }) {
  const on = role === 'from' ? 'var(--accent2)' : 'var(--accentOnDeep)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 34, flexShrink: 0, fontFamily: font, fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--onDeepDim)' }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {stops.map(s => {
          const sel = s === selected;
          return (
            <button key={s} onClick={() => onPick(s)} aria-pressed={sel} style={{ padding: '10px 16px', borderRadius: 99, cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 15.5, border: sel ? `2px solid ${on}` : '1px solid rgba(255,255,255,0.16)', background: sel ? on : 'rgba(255,255,255,0.05)', color: sel ? 'var(--deep)' : 'var(--onDeep)' }}>
              {stopsMap[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'accent' | 'bad' | 'warn' | 'dim' }) {
  const styles: Record<string, React.CSSProperties> = {
    accent: { background: 'var(--accentOnDeep)', color: 'var(--deep)' },
    bad: { background: 'color-mix(in srgb, var(--bad) 24%, transparent)', color: 'color-mix(in srgb, var(--bad) 45%, white)' },
    warn: { background: 'color-mix(in srgb, var(--warn) 26%, transparent)', color: 'color-mix(in srgb, var(--warn) 50%, white)' },
    dim: { background: 'rgba(255,255,255,0.08)', color: 'var(--onDeepDim)' },
  };
  return <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 99, fontFamily: font, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', ...styles[tone] }}>{children}</span>;
}

// Søket: fra, til og dag, og avgangene den dagen
function SearchCard({ from, to, onChooseStop, onSwap, onOpenTrip, style }: {
  from: StopId; to: StopId; onChooseStop: (which: 'from' | 'to', s: StopId) => void; onSwap: () => void; onOpenTrip: (t: Trip) => void; style?: React.CSSProperties;
}) {
  const now = getOsloDate();
  const todayStr = ymd(now);
  const [date, setDate] = useState(todayStr);
  const [calOpen, setCalOpen] = useState(false);
  const day = date < todayStr ? todayStr : date; // etter midnatt hopper søket til den nye dagen
  const dayDate = parseYmd(day);
  const humla = isMaintenancePeriod(now);
  const track = useLiveTrack(day === todayStr);
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const trips = findTripsForDay(dayTypeOf(dayDate), dayDate, from, to);
  const isToday = day === todayStr;
  const next = isToday ? trips.find(t => minsUntil(t.dateStr, t.startTime) >= 0) ?? null : null;
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() + i); return d; });

  // Vis neste avgang øverst i lista når dagen eller strekningen endres
  const list = useRef<HTMLDivElement>(null);
  const nextRow = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = list.current, row = nextRow.current;
    if (el) el.scrollTop = row ? Math.max(0, row.offsetTop - el.offsetTop - 70) : 0;
  }, [day, from, to]);

  const dayChip = (sel: boolean): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', border: sel ? '2px solid var(--onDeep)' : '1px solid rgba(255,255,255,0.14)', background: sel ? 'var(--onDeep)' : 'transparent', color: sel ? 'var(--deep)' : 'var(--onDeep)' });

  return (
    <Card style={{ padding: '18px 18px 10px', ...style }}>
      <div style={{ fontFamily: 'var(--num)', fontSize: 30, color: 'var(--onDeep)', lineHeight: 1, marginBottom: 14 }}>Finn avgang</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StopChips label="Fra" role="from" stops={FROM_STOPS.filter(s => !(humla && s === 'vestgarden'))} selected={from} onPick={s => onChooseStop('from', s)} />
          <StopChips label="Til" role="to" stops={TO_STOPS.filter(s => !(humla && s === 'vestgarden'))} selected={to} onPick={s => onChooseStop('to', s)} />
        </div>
        <button onClick={onSwap} aria-label="Bytt retning" title="Bytt retning" style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}>
          <Icon name="swap" size={20} color="var(--onDeep)" stroke={2.2} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
        <span style={{ width: 34, flexShrink: 0, fontFamily: font, fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--onDeepDim)' }}>Dag</span>
        {days.map((d, i) => {
          const ds = ymd(d);
          return <button key={ds} onClick={() => setDate(ds)} style={dayChip(ds === day)}>{i === 0 ? 'I dag' : i === 1 ? 'I morgen' : `${SHORT_DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`}</button>;
        })}
        <button onClick={() => setCalOpen(true)} aria-label="Velg dato" style={{ ...dayChip(!days.some(d => ymd(d) === day)), display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={15} color="currentColor" stroke={2} />{days.some(d => ymd(d) === day) ? 'Velg dato' : dayLabelFor(dayDate)}
        </button>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '14px -18px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 6px 6px' }}>
        <Label style={{ fontSize: 10 }}>{stopsMap[from]} → {stopsMap[to]} · {dayLabelFor(dayDate)}</Label>
        <span style={{ fontFamily: font, fontSize: 12, color: 'var(--onDeepDim)' }}>{trips.length} avganger</span>
      </div>
      <div ref={list} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {trips.map(t => {
          const mins = minsUntil(t.dateStr, t.startTime);
          const past = isToday && mins < 0;
          const isNext = next === t;
          const bs = bookingStatus(t);
          const engo = t.warnings.some(w => w.type === 'engo');
          const delay = isToday && (isNext || (past && mins >= -15)) ? liveDelay(track, t, nowMin) : null;
          return (
            <button key={t.id} ref={isNext ? nextRow : undefined} onClick={() => onOpenTrip(t)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: isNext ? '14px 12px' : '10px 12px', marginBottom: 2, borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', background: isNext ? 'color-mix(in srgb, var(--accentOnDeep) 15%, transparent)' : 'transparent', opacity: past && !delay ? 0.4 : 1 }}>
              <NumTime size={isNext ? 40 : 30} color="var(--onDeep)" style={{ width: isNext ? 98 : 74, flexShrink: 0 }}>{t.startTime}</NumTime>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: font, fontWeight: 700, fontSize: 14.5, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>fremme {t.endTime}</span>
                <span style={{ display: 'block', fontFamily: font, fontSize: 12, color: 'var(--onDeepDim)', marginTop: 2, whiteSpace: 'nowrap' }}>{viaLabel(t)} · {t.duration} min</span>
              </span>
              <span style={{ flex: 1 }} />
              {delay ? <Badge tone="warn">{delay.short}</Badge> : isNext ? <Badge tone="accent">om {fmtCountdown(mins)}</Badge> : null}
              {bs.required && <Badge tone={bs.passed ? 'dim' : 'bad'}>{bs.passed ? 'Frist passert' : 'Må bestilles'}</Badge>}
              {!bs.required && engo && <Badge tone="bad">Engø: bestill</Badge>}
              <Icon name="chevronRight" size={16} color="var(--onDeepDim)" />
            </button>
          );
        })}
        {!trips.length && <div style={{ padding: '18px 12px', fontFamily: font, fontSize: 15, color: 'var(--onDeepDim)' }}>Ingen avganger mellom {stopsMap[from]} og {stopsMap[to]} denne dagen.</div>}
      </div>
      <CalendarSheet open={calOpen} selected={day} onSelect={setDate} onClose={() => setCalOpen(false)} />
    </Card>
  );
}

export function PassengerDashboard({ from, to, weather, conditions, onChooseStop, onSwap, onOpenTrip, onOpenWeather, onOpenSettings }: {
  from: StopId; to: StopId; weather: Weather | null; conditions: Conditions | null;
  onChooseStop: (which: 'from' | 'to', s: StopId) => void; onSwap: () => void;
  onOpenTrip: (t: Trip) => void; onOpenWeather: () => void; onOpenSettings: () => void;
}) {
  const now = useNow();
  const { w, h } = useWindowSize();
  const portrait = h > w;
  const notices = useAdminNotices();
  const alerts = activeAlerts(conditions?.alerts);
  const round: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' };

  const info = (
    <Card style={{ gridArea: 'i', gap: 8, overflowY: 'auto', maxHeight: portrait ? undefined : 230 }}>
      <Label style={{ fontSize: 10 }}>Verdt å vite</Label>
      {alerts.map(a => <React.Fragment key={a.title}><AlertPill a={a} /></React.Fragment>)}
      {notices.map(n => <React.Fragment key={n.id}><Notice text={n.text} tone={n.type === 'warning' ? 'warning' : 'info'} /></React.Fragment>)}
      <HumlaNotice date={now} variant="deep" />
      <PunctualityLine />
    </Card>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px calc(env(safe-area-inset-bottom, 0px) + 60px)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <CompassMark size={36} color="var(--onDeep)" />
        <div>
          <div style={{ fontFamily: 'var(--num)', fontSize: 30, lineHeight: 1, color: 'var(--onDeep)' }}>Veierland</div>
          <Label style={{ fontSize: 9.5 }}>{ferryName(now)} · ferge</Label>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <NumTime size={30} color="var(--onDeep)">{now.toTimeString().slice(0, 5)}</NumTime>
          <div style={{ fontFamily: font, fontSize: 11.5, color: 'var(--onDeepDim)', marginTop: 2 }}>{dateLine(now)}</div>
        </div>
        <WeatherChip weather={weather} onClick={onOpenWeather} />
        <button onClick={onOpenSettings} aria-label="Innstillinger" style={round}><Icon name="settings" size={18} color="var(--onDeep)" /></button>
      </header>

      {/* Søket er størst: venstre når skjermen ligger, øverst når den står */}
      <div style={{
        flex: 1, minHeight: 0, display: 'grid', gap: 14,
        gridTemplateColumns: portrait ? '1fr 1fr' : '1.55fr 1fr',
        gridTemplateRows: portrait ? '1.7fr auto 1fr' : '1fr auto',
        gridTemplateAreas: portrait ? '"s s" "m w" "m i"' : '"s m" "s i"',
      }}>
        <SearchCard from={from} to={to} onChooseStop={onChooseStop} onSwap={onSwap} onOpenTrip={onOpenTrip} style={{ gridArea: 's' }} />
        <MapCard vesselsKey="vf_batar_passasjer" showTimes={false} style={{ gridArea: 'm' }} />
        {/* liggende: været ligger i værknappen øverst, så kartet får plass */}
        {portrait && <WeatherHours hours={conditions?.weather?.hours ?? []} count={6} onOpen={onOpenWeather} style={{ gridArea: 'w' }} />}
        {info}
      </div>
    </div>
  );
}
