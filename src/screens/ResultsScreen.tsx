import React, { useRef, useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import { DeepBand, StopDot, Label, TripCard } from '../components/Atoms';
import { EnturTransit } from '../components/EnturTransit';
import { findTripsForDay, dayTypeOf, parseYmd, parseTime, minsUntil, ymd, getOsloDate, stopShort, isSummerSeason, upcomingTrips, NO_DAYS_EXPORT as NO_DAYS, NO_MONTHS_EXPORT } from '../ferryData';
import type { StopId, Trip } from '../types';

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

const NO_MONTHS_FULL = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

function CalendarSheet({ open, selected, onSelect, onClose }: { open: boolean; selected: string; onSelect: (ds: string) => void; onClose: () => void }) {
  const today = getOsloDate();
  const todayStr = ymd(today);
  const selDate = parseYmd(selected);
  const [viewYm, setViewYm] = useState(() => ({ y: selDate.getFullYear(), m: selDate.getMonth() }));
  useEffect(() => { if (open) setViewYm({ y: selDate.getFullYear(), m: selDate.getMonth() }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(viewYm.y, viewYm.m, 1);
  const daysInMonth = new Date(viewYm.y, viewYm.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const atCurrentMonth = viewYm.y === today.getFullYear() && viewYm.m === today.getMonth();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,24,0.45)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: '14px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 -20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ width: 42, height: 5, borderRadius: 99, background: 'var(--line)', margin: '0 auto 16px' }} />

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button
            onClick={() => setViewYm(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
            disabled={atCurrentMonth}
            style={{ width: 38, height: 38, borderRadius: 99, border: '1.5px solid var(--line)', background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: atCurrentMonth ? 'default' : 'pointer', opacity: atCurrentMonth ? 0.3 : 1 }}
          >
            <Icon name="chevronLeft" size={17} color="var(--ink)" stroke={2.2} />
          </button>
          <span style={{ fontFamily: 'var(--num)', fontSize: 21, color: 'var(--ink)' }}>{cap(NO_MONTHS_FULL[viewYm.m])} {viewYm.y}</span>
          <button
            onClick={() => setViewYm(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
            style={{ width: 38, height: 38, borderRadius: 99, border: '1.5px solid var(--line)', background: 'var(--surfaceAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="chevronRight" size={17} color="var(--ink)" stroke={2.2} />
          </button>
        </div>

        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(wd => (
            <div key={wd} style={{ textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--inkDim)', textTransform: 'uppercase' }}>{wd}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (day == null) return <div key={`e${i}`} />;
            const ds = ymd(new Date(viewYm.y, viewYm.m, day));
            const isPast = ds < todayStr;
            const isSel = ds === selected;
            const isToday = ds === todayStr;
            return (
              <button
                key={ds}
                disabled={isPast}
                onClick={() => { onSelect(ds); onClose(); }}
                style={{
                  aspectRatio: '1', borderRadius: 12, cursor: isPast ? 'default' : 'pointer',
                  border: isSel ? '2px solid var(--accent)' : isToday ? '1.5px solid var(--accent2)' : '1.5px solid transparent',
                  background: isSel ? 'var(--accent)' : 'var(--surfaceAlt)',
                  opacity: isPast ? 0.28 : 1,
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: isSel || isToday ? 700 : 600, fontSize: 14,
                  color: isSel ? 'var(--accentInk)' : 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayChips({ selected, onSelect }: { selected: string; onSelect: (ds: string) => void }) {
  const now = getOsloDate();
  const [calOpen, setCalOpen] = useState(false);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const ds = ymd(d);
    const label = i === 0 ? 'I dag' : cap(NO_DAYS[d.getDay()]).slice(0, 3);
    days.push({ ds, label, num: `${d.getDate()}.${d.getMonth() + 1}` });
  }
  const isCustom = !days.some(d => d.ds === selected);
  const customDate = isCustom ? parseYmd(selected) : null;
  const customLabel = customDate ? `${cap(NO_DAYS[customDate.getDay()]).slice(0, 3)}` : '';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, paddingLeft: 18 }}>
      {/* Static date picker button — always first */}
      <button onClick={() => setCalOpen(true)} style={{ flexShrink: 0, padding: '9px 13px', borderRadius: 99, border: isCustom ? '1.5px solid var(--accent)' : '1.5px solid var(--line)', background: isCustom ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {isCustom ? (
          <>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: 'var(--accentInk)', whiteSpace: 'nowrap' }}>{customLabel}</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10, color: 'var(--accentInk)', opacity: 0.8 }}>{`${customDate!.getDate()}.${customDate!.getMonth() + 1}`}</span>
          </>
        ) : (
          <Icon name="calendar" size={17} color="var(--inkDim)" stroke={2} />
        )}
      </button>

      {/* Scrollable chip row */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 18px 4px 0', scrollbarWidth: 'none' }}>
          {days.map(d => {
            const on = d.ds === selected;
            return (
              <button key={d.ds} onClick={() => onSelect(d.ds)} style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 99, border: on ? '1.5px solid var(--accent)' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: on ? 'var(--accentInk)' : 'var(--ink)' }}>{d.label}</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10, color: on ? 'var(--accentInk)' : 'var(--inkDim)', opacity: 0.8 }}>{d.num}</span>
              </button>
            );
          })}
        </div>
        {/* Right-edge fade hinting that the chip row scrolls */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 36, background: 'linear-gradient(to right, transparent, var(--surfaceAlt))', pointerEvents: 'none' }} />
      </div>

      <CalendarSheet open={calOpen} selected={selected} onSelect={onSelect} onClose={() => setCalOpen(false)} />
    </div>
  );
}

interface ResultsScreenProps {
  from: StopId;
  to: StopId;
  selectedDate: string;
  onSelectDate: (ds: string) => void;
  animate: boolean;
  texture: boolean;
  onBack: () => void;
  onSwap: () => void;
  onEditFrom: () => void;
  onEditTo: () => void;
  onOpenTrip: (trip: Trip) => void;
  tick: number;
  userLoc: { lat: number; lng: number } | null;
}

// Stops that have real public transit access (not car-free islands)
const BUS_STOPS: StopId[] = ['tenvik', 'engo', 'buss_tbg', 'buss_tenv'];

export function ResultsScreen({ from, to, selectedDate, onSelectDate, animate, texture, onBack, onSwap, onEditFrom, onEditTo, onOpenTrip, tick: _tick, userLoc }: ResultsScreenProps) {
  const todayStr = ymd(getOsloDate());
  const isToday = selectedDate === todayStr;
  const selDate = parseYmd(selectedDate);
  const trips = findTripsForDay(dayTypeOf(selDate), selDate, from, to);
  const nowMins = getOsloDate().getHours() * 60 + getOsloDate().getMinutes();
  // For the Entur widget
  const selDayFerries = upcomingTrips(from, to, selectedDate);
  const enturFerries = isToday
    ? (() => { const tom = new Date(selDate); tom.setDate(selDate.getDate() + 1); return [...selDayFerries, ...upcomingTrips(from, to, ymd(tom))]; })()
    : selDayFerries;
  // Target the first upcoming trip on the selected day (or first trip for future days)
  const enturTarget = isToday
    ? trips.find(t => parseTime(t.startTime) >= nowMins) ?? trips[0] ?? null
    : trips[0] ?? null;
  const firstUpcomingIndex = isToday ? trips.findIndex(t => parseTime(t.startTime) >= nowMins) : 0;
  const firstUpcomingRef = useRef<HTMLDivElement>(null);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (firstUpcomingRef.current) {
      firstUpcomingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Other days have no "next" anchor — start at the top of the list
      listRef.current?.scrollTo({ top: 0 });
    }
  }, [selectedDate, from, to]);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surfaceAlt)', overflow: 'hidden' }}>
      {/* sticky header */}
      <div style={{ flexShrink: 0 }}>
        <DeepBand animate={animate} texture={texture} waves={false} style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 18px 20px', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="chevronLeft" size={20} color="var(--onDeep)" stroke={2.2} />
            </button>
            <div style={{ fontFamily: 'var(--num)', fontSize: 26, color: 'var(--onDeep)' }}>Rutetabell</div>
          </div>
          <div data-tour="results-route-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radSm)', padding: '10px 14px' }}>
            <button onClick={onEditFrom} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <StopDot role="from" size={9} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>{stopShort[from]}</span>
            </button>
            <button onClick={onSwap} style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="swap" size={15} color="var(--accentInk)" stroke={2.2} />
            </button>
            <button onClick={onEditTo} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)', whiteSpace: 'nowrap' }}>{stopShort[to]}</span>
              <StopDot role="to" size={9} />
            </button>
          </div>
        </DeepBand>

        <div data-tour="day-chips" style={{ paddingTop: 14, paddingBottom: 2 }}>
          <DayChips selected={selectedDate} onSelect={onSelectDate} />
        </div>
        {isSummerSeason(selDate) && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: 'var(--accent)' }}>
              ☀️ Sommerruter · 22. juni–16. aug
            </span>
          </div>
        )}
      </div>

      {/* scrollable trip list */}
      <div data-tour="trip-list" ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 18px calc(env(safe-area-inset-bottom, 0px) + 96px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BUS_STOPS.includes(from) && enturTarget && (
          <div>
            <Label color="var(--inkDim)" style={{ paddingLeft: 2, marginBottom: 8, display: 'block' }}>
              Kollektivt til {stopShort[from]}-kaia · ferge kl. {enturTarget.startTime}
            </Label>
            <EnturTransit userLoc={userLoc} stop={from} targetTrip={enturTarget} allFerries={enturFerries} />
          </div>
        )}

        {trips.length === 0 ? (
          <div style={{ marginTop: 30, padding: 36, borderRadius: 'var(--rad)', background: 'var(--surface)', border: '1px dashed var(--line)', textAlign: 'center' }}>
            <Icon name="anchor" size={32} color="var(--inkDim)" />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--inkDim)', marginTop: 12 }}>{isToday ? 'Ingen flere avganger i dag' : 'Ingen avganger på valgt dag'}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--inkDim)', marginTop: 4, opacity: 0.8 }}>Prøv en annen dag eller rute.</div>
          </div>
        ) : trips.map((trip, i) => {
          const isPast = isToday && parseTime(trip.startTime) < nowMins;
          const isNext = isToday && i === firstUpcomingIndex;
          const cd = isNext ? minsUntil(trip.dateStr, trip.startTime) : null;
          return (
            <div key={trip.id + i} ref={isNext ? firstUpcomingRef : undefined} style={{ opacity: isPast ? 0.38 : 1, transition: 'opacity 0.2s' }}>
              <TripCard trip={trip} isNext={isNext} countdown={cd} onClick={() => onOpenTrip(trip)} />
            </div>
          );
        })}

        <a
          href="/rutetabell.png"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderRadius: 'var(--rad)', background: 'var(--surface)', border: '1px solid var(--line)', cursor: 'pointer', textDecoration: 'none', marginTop: 4 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name="calendar" size={19} color="var(--inkDim)" stroke={1.9} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Klassisk rutetabell</span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--inkDim)" stroke={2} />
        </a>
      </div>
    </div>
  );
}
