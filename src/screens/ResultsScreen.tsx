import React, { useRef, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { DeepBand, StopDot, Label, TripCard } from '../components/Atoms';
import { findTripsForDay, dayTypeOf, parseYmd, parseTime, minsUntil, ymd, getOsloDate, stopShort, isSummerSeason, NO_DAYS_EXPORT as NO_DAYS, NO_MONTHS_EXPORT } from '../ferryData';
import type { StopId, Trip } from '../types';

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function DayChips({ selected, onSelect }: { selected: string; onSelect: (ds: string) => void }) {
  const now = getOsloDate();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const ds = ymd(d);
    const label = i === 0 ? 'I dag' : i === 1 ? 'I morgen' : cap(NO_DAYS[d.getDay()]).slice(0, 3);
    days.push({ ds, label, num: d.getDate() });
  }
  const isCustom = !days.some(d => d.ds === selected);
  const customDate = isCustom ? parseYmd(selected) : null;
  const customLabel = customDate ? `${cap(NO_DAYS[customDate.getDay()])} ${customDate.getDate()}. ${NO_MONTHS_EXPORT[customDate.getMonth()]}` : '';

  return (
    <div style={{ position: 'relative' }}>
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 18px 4px', scrollbarWidth: 'none' }}>
      {days.map(d => {
        const on = d.ds === selected;
        return (
          <button key={d.ds} onClick={() => onSelect(d.ds)} style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 99, border: on ? '1.5px solid var(--accent)' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: on ? 'var(--accentInk)' : 'var(--ink)' }}>{d.label}</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10, color: on ? 'var(--accentInk)' : 'var(--inkDim)', opacity: 0.8 }}>{d.num}.</span>
          </button>
        );
      })}

      {isCustom && (
        <button onClick={() => dateInputRef.current?.showPicker()} style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 99, border: '1.5px solid var(--accent)', background: 'var(--accent)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: 'var(--accentInk)', whiteSpace: 'nowrap' }}>{customLabel}</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10, color: 'var(--accentInk)', opacity: 0.8 }}>{customDate!.getDate()}.</span>
        </button>
      )}

      <button onClick={() => dateInputRef.current?.showPicker()} style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 99, border: '1.5px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="calendar" size={13} color="var(--inkDim)" stroke={2} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Angi dato</span>
      </button>

      <input
        ref={dateInputRef}
        type="date"
        value={selected}
        min={ymd(now)}
        onChange={e => e.target.value && onSelect(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
    {/* Right-edge fade hinting that the chip row scrolls */}
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 36, background: 'linear-gradient(to right, transparent, var(--surfaceAlt))', pointerEvents: 'none' }} />
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
}

export function ResultsScreen({ from, to, selectedDate, onSelectDate, animate, texture, onBack, onSwap, onEditFrom, onEditTo, onOpenTrip, tick: _tick }: ResultsScreenProps) {
  const todayStr = ymd(getOsloDate());
  const isToday = selectedDate === todayStr;
  const selDate = parseYmd(selectedDate);
  const trips = findTripsForDay(dayTypeOf(selDate), selDate, from, to);
  const nowMins = getOsloDate().getHours() * 60 + getOsloDate().getMinutes();
  const firstUpcomingIndex = isToday ? trips.findIndex(t => parseTime(t.startTime) >= nowMins) : 0;
  const firstUpcomingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    firstUpcomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <div data-tour="trip-list" style={{ flex: 1, overflowY: 'auto', padding: '12px 18px calc(env(safe-area-inset-bottom, 0px) + 96px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
      </div>
    </div>
  );
}
