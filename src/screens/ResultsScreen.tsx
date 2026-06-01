import React from 'react';
import { Icon } from '../components/Icons';
import { DeepBand, StopDot, Label, TripCard } from '../components/Atoms';
import { upcomingTrips, minsUntil, ymd, getOsloDate, stopShort, NO_DAYS_EXPORT as NO_DAYS, NO_MONTHS_EXPORT as NO_MONTHS } from '../ferryData';
import type { StopId, Trip } from '../types';

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function DayChips({ selected, onSelect }: { selected: string; onSelect: (ds: string) => void }) {
  const now = getOsloDate();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const ds = ymd(d);
    const label = i === 0 ? 'I dag' : i === 1 ? 'I morgen' : cap(NO_DAYS[d.getDay()]).slice(0, 3);
    days.push({ ds, label, num: d.getDate() });
  }
  return (
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
  const trips = upcomingTrips(from, to, selectedDate);
  const todayStr = ymd(getOsloDate());
  const isToday = selectedDate === todayStr;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surfaceAlt)' }}>
      <DeepBand animate={animate} texture={texture} waves={false} style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 18px 20px', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chevronLeft" size={20} color="var(--onDeep)" stroke={2.2} />
          </button>
          <div style={{ fontFamily: 'var(--num)', fontSize: 26, color: 'var(--onDeep)' }}>Avganger</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radSm)', padding: '10px 14px' }}>
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

      <div style={{ paddingTop: 14 }}>
        <DayChips selected={selectedDate} onSelect={onSelectDate} />
      </div>

      <div style={{ padding: '14px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {trips.length === 0 ? (
          <div style={{ marginTop: 30, padding: 36, borderRadius: 'var(--rad)', background: 'var(--surface)', border: '1px dashed var(--line)', textAlign: 'center' }}>
            <Icon name="anchor" size={32} color="var(--inkDim)" />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--inkDim)', marginTop: 12 }}>{isToday ? 'Ingen flere avganger i dag' : 'Ingen avganger på valgt dag'}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--inkDim)', marginTop: 4, opacity: 0.8 }}>Prøv en annen dag eller rute.</div>
          </div>
        ) : trips.map((trip, i) => {
          const isNext = isToday && i === 0;
          const cd = isNext ? minsUntil(trip.dateStr, trip.startTime) : null;
          return <TripCard key={trip.id + i} trip={trip} isNext={isNext} countdown={cd} onClick={() => onOpenTrip(trip)} />;
        })}
      </div>
    </div>
  );
}
