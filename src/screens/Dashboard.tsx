import React, { useState } from 'react';
import { Icon, CompassMark, weatherProps, FerryGlyph, WaveField } from '../components/Icons';
import { Label, NumTime, WeatherChip, StopDot } from '../components/Atoms';
import {
  findTripsForDay, dayTypeOf, parseTime, minsUntil, fmtCountdown,
  ymd, getOsloDate, stopsMap, stopShort, isSummerSeason, bookingStatus,
  NO_DAYS_EXPORT as NO_DAYS, NO_MONTHS_EXPORT as NO_MONTHS,
} from '../ferryData';
import type { StopId, Weather } from '../types';

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function symToCode(sym: string): number {
  if (!sym) return 2;
  if (sym.startsWith('clearsky') || sym.startsWith('fair')) return 1;
  if (sym.startsWith('partlycloudy')) return 2;
  if (sym.startsWith('cloudy')) return 3;
  if (sym.startsWith('fog')) return 45;
  if (sym.includes('thunder')) return 95;
  if (sym.includes('snow') || sym.includes('sleet')) return 71;
  if (sym.includes('rain') || sym.includes('drizzle') || sym.includes('shower')) return 61;
  return 2;
}

// ── Panel shell ──────────────────────────────────────────────

function Panel({ title, children, accent = false, style = {} }: { title: React.ReactNode; children: React.ReactNode; accent?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--rad)', border: accent ? '1.5px solid var(--accent)' : '1px solid var(--line)', overflow: 'hidden', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {typeof title === 'string' ? <Label color="var(--inkDim)">{title}</Label> : title}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

// ── Departure list (one direction) ───────────────────────────

function DepartureList({ from, to, count = 6, tick: _tick }: { from: StopId; to: StopId; count?: number; tick: number }) {
  // tick prop is intentionally received to force re-render every second
  const now = getOsloDate();
  const todayStr = ymd(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const collect: { trip: ReturnType<typeof findTripsForDay>[0]; isToday: boolean }[] = [];
  for (let i = 0; i < 2 && collect.length < count; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const trips = findTripsForDay(dayTypeOf(d), d, from, to);
    for (const t of trips) {
      if (i === 0 && parseTime(t.startTime) < nowMins) continue;
      collect.push({ trip: t, isToday: i === 0 });
      if (collect.length >= count) break;
    }
  }

  if (collect.length === 0) {
    return <div style={{ padding: 24, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: 'var(--inkDim)' }}>Ingen flere avganger i dag</div>;
  }

  return (
    <div>
      {collect.map(({ trip: t, isToday }, i) => {
        const cd = isToday ? minsUntil(t.dateStr, t.startTime) : null;
        const bs = bookingStatus(t);
        const isNext = i === 0;

        // Hero card for next departure
        if (isNext) {
          return (
            <div key={t.id + t.dateStr} style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line)', background: 'color-mix(in srgb, var(--accent) 7%, var(--surface))' }}>
              <Label color="var(--inkDim)" style={{ fontSize: 10.5, display: 'block', marginBottom: 6 }}>Neste avgang</Label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <NumTime size={36} color="var(--accent)">{t.startTime}</NumTime>
                  <Icon name="arrowRight" size={14} color="var(--inkDim)" stroke={2} />
                  <NumTime size={20} color="var(--inkDim)">{t.endTime}</NumTime>
                  {bs.required && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'color-mix(in srgb, var(--bad) 10%, var(--surface))', border: '1px solid color-mix(in srgb, var(--bad) 30%, transparent)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: 'var(--bad)' }}>RING</span>
                  )}
                </div>
                {!isToday && (
                  <span style={{ padding: '6px 12px', borderRadius: 99, background: 'var(--surfaceAlt)', border: '1px solid var(--line)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: 'var(--inkDim)', whiteSpace: 'nowrap' }}>i morgen</span>
                )}
                {cd != null && cd >= 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }}>
                    <Icon name="clock" size={13} color="var(--accentInk)" stroke={2} />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--accentInk)', whiteSpace: 'nowrap' }}>om {fmtCountdown(cd)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Compact rows for subsequent departures
        return (
          <div key={t.id + t.dateStr + i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
            <NumTime size={22} color="var(--ink)">{t.startTime}</NumTime>
            <Icon name="arrowRight" size={13} color="var(--inkDim)" stroke={2} />
            <NumTime size={16} color="var(--inkDim)">{t.endTime}</NumTime>
            <div style={{ flex: 1 }} />
            {bs.required && (
              <span style={{ padding: '2px 8px', borderRadius: 99, background: 'color-mix(in srgb, var(--bad) 10%, var(--surface))', border: '1px solid color-mix(in srgb, var(--bad) 30%, transparent)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: 'var(--bad)' }}>RING</span>
            )}
            {!isToday && (
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: 'var(--inkDim)' }}>i morgen</span>
            )}
            {cd != null && cd >= 0 && (
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--inkDim)', whiteSpace: 'nowrap' }}>om {fmtCountdown(cd)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Full-day timetable column ────────────────────────────────

function DayColumn({ from, to, dateObj }: { from: StopId; to: StopId; dateObj: Date }) {
  const todayStr = ymd(getOsloDate());
  const isToday = ymd(dateObj) === todayStr;
  const nowMins = getOsloDate().getHours() * 60 + getOsloDate().getMinutes();
  const trips = findTripsForDay(dayTypeOf(dateObj), dateObj, from, to);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--accent2)', flexShrink: 0 }} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {stopShort[from]} → {stopShort[to]}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {trips.map((t, i) => {
          const past = isToday && parseTime(t.startTime) < nowMins;
          const bs = bookingStatus(t);
          return (
            <span key={t.id + i} style={{
              padding: '5px 10px', borderRadius: 8,
              background: past ? 'transparent' : 'var(--surfaceAlt)',
              border: bs.required ? '1px solid color-mix(in srgb, var(--bad) 40%, transparent)' : '1px solid var(--line)',
              fontFamily: 'var(--num)', fontSize: 14.5,
              color: past ? 'var(--inkDim)' : bs.required ? 'var(--bad)' : 'var(--ink)',
              opacity: past ? 0.45 : 1,
            }}>
              {t.startTime}
            </span>
          );
        })}
        {trips.length === 0 && <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: 'var(--inkDim)' }}>Ingen avganger</span>}
      </div>
    </div>
  );
}

// ── Weather panel ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WeatherPanel({ weather, forecast }: { weather: Weather | null; forecast: any[] | null }) {
  const hours = (forecast ?? []).slice(0, 8);
  return (
    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {weather ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Icon name={weatherProps(weather.code).name} size={44} color="var(--accent)" stroke={1.6} />
          <div>
            <NumTime size={38}>{Math.round(weather.temp)}°</NumTime>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Icon name="wind" size={14} color="var(--inkDim)" stroke={1.8} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--inkDim)' }}>{weather.wind.toFixed(0)} m/s</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: 'var(--inkDim)' }}>Henter værdata …</div>
      )}
      {hours.length > 0 && (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {hours.map((h, i) => {
            const d = new Date(h.time);
            const sym = h.data?.next_1_hours?.summary?.symbol_code ?? '';
            const temp = h.data?.instant?.details?.air_temperature;
            return (
              <div key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 9px', borderRadius: 10, background: 'var(--surfaceAlt)', border: '1px solid var(--line)' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--inkDim)' }}>{String(d.getHours()).padStart(2, '0')}</span>
                <Icon name={weatherProps(symToCode(sym)).name} size={17} color="var(--ink)" stroke={1.8} />
                <span style={{ fontFamily: 'var(--num)', fontSize: 13, color: 'var(--ink)' }}>{temp != null ? Math.round(temp) + '°' : '–'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────

interface DashboardProps {
  weather: Weather | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forecast: any[] | null;
  animate: boolean;
  tick: number;
  from: StopId;
  to: StopId;
  onEditFrom: () => void;
  onEditTo: () => void;
  onSwap: () => void;
  onOpenWeather: () => void;
  onOpenSettings: () => void;
  onMobileView: () => void;
}

export function Dashboard({ weather, forecast, animate, tick, from, to, onEditFrom, onEditTo, onSwap, onOpenWeather, onOpenSettings, onMobileView }: DashboardProps) {
  const now = getOsloDate();
  const [dayOffset, setDayOffset] = useState(0);
  const tableDate = new Date(now); tableDate.setDate(now.getDate() + dayOffset);
  const dateLabel = `${cap(NO_DAYS[now.getDay()])} ${now.getDate()}. ${NO_MONTHS[now.getMonth()]}`;
  const tableLabel = dayOffset === 0 ? 'I dag' : dayOffset === 1 ? 'I morgen' : `${cap(NO_DAYS[tableDate.getDay()])} ${tableDate.getDate()}.${tableDate.getMonth() + 1}`;
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surfaceAlt)', display: 'flex', flexDirection: 'column' }}>
      {/* Header — two rows */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, var(--deep) 0%, var(--deep2) 130%)', padding: '20px 28px 22px' }}>

        {/* Row 1: logo + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'relative', zIndex: 2, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CompassMark size={40} color="var(--onDeep)" opacity={0.85} />
            <div>
              <div style={{ fontFamily: 'var(--num)', fontSize: 28, color: 'var(--onDeep)', lineHeight: 0.95 }}>Veierland</div>
              <Label color="var(--onDeepDim)" style={{ fontSize: 10 }}>M/F Jutøya · Ferge · {dateLabel}</Label>
            </div>
            {isSummerSeason(now) && (
              <span style={{ marginLeft: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>
                ☀️ Sommerruter
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NumTime size={40} color="var(--onDeep)">{clock}</NumTime>
            <WeatherChip weather={weather} onDeep onClick={onOpenWeather} />
            <button onClick={onOpenSettings} title="Innstillinger" style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="settings" size={18} color="var(--onDeep)" stroke={1.8} />
            </button>
            <button onClick={onMobileView} title="Bytt til mobilvisning" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer' }}>
              <Icon name="monitor" size={16} color="var(--onDeep)" stroke={1.8} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12.5, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>Mobilvisning</span>
            </button>
          </div>
        </div>

        {/* Row 2: route picker */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radSm)', padding: '9px 16px', width: 'fit-content' }}>
          <button onClick={onEditFrom} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <StopDot role="from" size={9} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>{stopShort[from]}</span>
            <Icon name="chevronDown" size={14} color="var(--onDeepDim)" stroke={2} />
          </button>
          <button onClick={onSwap} style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="swap" size={15} color="var(--accentInk)" stroke={2.2} />
          </button>
          <button onClick={onEditTo} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>{stopShort[to]}</span>
            <StopDot role="to" size={9} />
            <Icon name="chevronDown" size={14} color="var(--onDeepDim)" stroke={2} />
          </button>
        </div>

        <WaveField height={42} animate={animate} />
        <div style={{ position: 'absolute', bottom: 8, left: 0, width: 64, animation: animate ? 'ferryGlide 14s ease-in-out infinite' : 'none', zIndex: 1 }}>
          <div style={{ animation: animate ? 'ferryBob 3.2s ease-in-out infinite' : 'none' }}>
            <FerryGlyph size={48} hull="var(--accent)" cabin="var(--onDeep)" />
          </div>
        </div>
      </div>

      {/* Section label tying departure panels to today */}
      <div style={{ padding: '16px 22px 4px' }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--inkDim)' }}>
          Avganger · {dateLabel}
        </span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: '10px 22px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 360px', gridTemplateRows: 'auto 1fr', gap: 18, alignItems: 'start' }}>
        <Panel title={`${stopsMap[from]} → ${stopsMap[to]}`} accent>
          <DepartureList from={from} to={to} tick={tick} />
        </Panel>
        <Panel title={`${stopsMap[to]} → ${stopsMap[from]}`}>
          <DepartureList from={to} to={from} tick={tick} />
        </Panel>
        <Panel title="Vær · Veierland">
          <WeatherPanel weather={weather} forecast={forecast} />
        </Panel>

        {/* Full-day timetable spanning all columns */}
        <Panel
          style={{ gridColumn: '1 / -1' }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Label color="var(--inkDim)">Rutetabell · {tableLabel}{isSummerSeason(tableDate) ? ' · Sommerruter' : ''}</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setDayOffset(o => Math.max(0, o - 1))} disabled={dayOffset === 0} style={{ width: 30, height: 30, borderRadius: 99, border: '1px solid var(--line)', background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dayOffset === 0 ? 'default' : 'pointer', opacity: dayOffset === 0 ? 0.35 : 1 }}>
                  <Icon name="chevronLeft" size={15} color="var(--ink)" stroke={2.2} />
                </button>
                <button onClick={() => setDayOffset(o => Math.min(13, o + 1))} style={{ width: 30, height: 30, borderRadius: 99, border: '1px solid var(--line)', background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon name="chevronRight" size={15} color="var(--ink)" stroke={2.2} />
                </button>
              </div>
            </div>
          }
        >
          <div style={{ padding: '16px 18px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <DayColumn from={from} to={to} dateObj={tableDate} />
            <DayColumn from={to} to={from} dateObj={tableDate} />
          </div>
          <div style={{ padding: '0 18px 14px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--inkDim)' }}>
            Røde tider krever forhåndsbestilling — ring fergen. Passerte avganger er nedtonet.
          </div>
        </Panel>
      </div>
    </div>
  );
}
