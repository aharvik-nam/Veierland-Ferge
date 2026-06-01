import React from 'react';
import { CompassMark } from '../components/Icons';
import { Icon } from '../components/Icons';
import { DeepBand, WeatherChip, RouteCard, StatusSignal, TravelChips, NumTime, Label } from '../components/Atoms';
import { nextDeparture, prevDeparture, minsUntil, fmtCountdown, rekkerStatus, stopTravel, travelVisibility, ymd, getOsloDate, stopsMap } from '../ferryData';
import type { StopId, Weather, Trip } from '../types';

interface HomeScreenProps {
  from: StopId;
  to: StopId;
  weather: Weather | null;
  animate: boolean;
  texture: boolean;
  onEditFrom: () => void;
  onEditTo: () => void;
  onSwap: () => void;
  onSeeAll: () => void;
  onOpenTrip: (trip: Trip) => void;
  tick: number;
  userLoc: { lat: number; lng: number } | null;
  driveMins: number | null;
}

export function HomeScreen({ from, to, weather, animate, texture, onEditFrom, onEditTo, onSwap, onSeeAll, onOpenTrip, tick: _tick, userLoc, driveMins }: HomeScreenProps) {
  const dep = nextDeparture(from, to);
  const prev = prevDeparture(from, to);
  const countdown = dep && dep.dateStr === ymd(getOsloDate()) ? minsUntil(dep.dateStr, dep.startTime) : null;
  const effectiveDrive = driveMins ?? stopTravel[from].drive;
  const status = dep ? rekkerStatus(effectiveDrive, countdown) : null;
  const tv = travelVisibility(from, userLoc);

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, var(--deep) 0%, var(--deep2) 55%, var(--deep) 100%)', position: 'relative' }}>
      <div style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 18px 30px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <CompassMark size={34} color="var(--onDeep)" opacity={0.85} />
            <div>
              <div style={{ fontFamily: 'var(--num)', fontSize: 25, color: 'var(--onDeep)', lineHeight: 0.9 }}>Veierland</div>
              <Label color="var(--onDeepDim)" style={{ fontSize: 9.5 }}>M/F Jutøya · Ferge</Label>
            </div>
          </div>
          <WeatherChip weather={weather} onDeep />
        </div>

        {/* route picker */}
        <RouteCard from={from} to={to} onEditFrom={onEditFrom} onEditTo={onEditTo} onSwap={onSwap} />

        {/* next departure hero */}
        {dep ? (
          <div style={{ marginTop: 18, borderRadius: 'var(--rad)', overflow: 'hidden', background: 'var(--surface)', boxShadow: '0 24px 50px -24px rgba(0,0,0,0.6)' }}>
            <DeepBand animate={animate} texture={texture} ferry waves style={{ padding: '18px 20px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                <Label color="var(--onDeepDim)">Neste avgang</Label>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11.5, color: 'var(--onDeep)', padding: '4px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.10)' }}>{dep.dayLabel}</span>
              </div>
              <div style={{ position: 'relative', zIndex: 2, marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
                {countdown != null ? (
                  <>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 17, color: 'var(--onDeepDim)' }}>om</span>
                    <NumTime size={50} color="var(--onDeep)" style={{ animation: animate ? 'ferryPulse 2s ease-in-out infinite' : 'none' }}>{fmtCountdown(countdown)}</NumTime>
                  </>
                ) : (
                  <NumTime size={50} color="var(--onDeep)">{dep.startTime}</NumTime>
                )}
              </div>
              <div style={{ position: 'relative', zIndex: 2, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--onDeepDim)' }}>
                {stopsMap[from]} → {stopsMap[to]} · {dep.startTime}–{dep.endTime}
              </div>
            </DeepBand>

            <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(tv.showCar || tv.showWalk) && status && <StatusSignal status={status} />}
              <TravelChips stop={from} showCar={tv.showCar} showWalk={tv.showWalk} driveOverride={driveMins} />
              <button onClick={() => onOpenTrip(dep)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Se reisedetaljer</span>
                <Icon name="arrowRight" size={17} color="var(--ink)" stroke={2} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18, padding: 30, borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <Icon name="anchor" size={30} color="var(--onDeepDim)" />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--onDeep)', marginTop: 10 }}>Ingen avganger funnet for denne ruten</div>
          </div>
        )}

        {/* prev / next mini-cards */}
        {(prev || dep) && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { trip: prev, label: 'Forrige avgang', dimmed: true },
              { trip: dep,  label: 'Neste avgang',   dimmed: false },
            ].map(({ trip, label, dimmed }) => (
              <button
                key={label}
                onClick={() => trip && onOpenTrip(trip)}
                disabled={!trip}
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radSm)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', cursor: trip ? 'pointer' : 'default', opacity: dimmed ? 0.55 : 1 }}
              >
                <Label color="var(--onDeepDim)" style={{ fontSize: 9 }}>{label}</Label>
                {trip ? (
                  <>
                    <NumTime size={28} color="var(--onDeep)" style={{ display: 'block', marginTop: 4 }}>{trip.startTime}</NumTime>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--onDeepDim)', marginTop: 3 }}>{trip.startTime}–{trip.endTime}</div>
                  </>
                ) : (
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--onDeepDim)', marginTop: 4 }}>—</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* see all */}
        <button onClick={onSeeAll} style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name="calendar" size={19} color="var(--onDeep)" stroke={1.9} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)' }}>Alle avganger i dag</span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--onDeepDim)" stroke={2} />
        </button>
      </div>
    </div>
  );
}
