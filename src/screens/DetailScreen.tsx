import React from 'react';
import { Icon } from '../components/Icons';
import { DeepBand, Label, NumTime, StatusSignal, TravelChips, CallButton } from '../components/Atoms';
import { minsUntil, fmtCountdown, rekkerStatus, stopTravel, travelVisibility, stopShort, ymd, getOsloDate, findTripsForDay, dayTypeOf, parseYmd, parseTime } from '../ferryData';
import type { Trip, StopId } from '../types';

function RouteTimeline({ trip, animate }: { trip: Trip; animate: boolean }) {
  const n = trip.subpath.length;
  return (
    <div style={{ position: 'relative', padding: '4px 0' }}>
      <div style={{ position: 'absolute', left: 8.5, top: 16, bottom: 16, width: 2.5, background: 'var(--line)', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: 8.5, top: 16, bottom: 16, width: 2.5, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, width: '100%', height: 40, background: 'linear-gradient(var(--accent2), var(--accent))', animation: animate ? 'ferryTrack 4s ease-in-out infinite' : 'none', opacity: 0.9 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
        {trip.subpath.map((ev, i) => {
          const first = i === 0, last = i === n - 1;
          const role = first ? 'from' : last ? 'to' : 'via';
          return (
            <div key={ev.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 19, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{
                  width: first || last ? 19 : 13, height: first || last ? 19 : 13, borderRadius: 99,
                  background: role === 'via' ? 'var(--surface)' : (last ? 'var(--accent)' : 'var(--accent2)'),
                  border: role === 'via' ? '2.5px solid var(--line)' : '3px solid var(--surface)',
                  display: 'block',
                  boxShadow: first || last ? `0 0 0 2px ${last ? 'var(--accent)' : 'var(--accent2)'}` : 'none',
                }} />
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: first || last ? 700 : 600, fontSize: first || last ? 16 : 14.5, color: first || last ? 'var(--ink)' : 'var(--inkDim)' }}>{ev.name}</span>
                <NumTime size={first || last ? 26 : 21} color={last ? 'var(--accent)' : first ? 'var(--ink)' : 'var(--inkDim)'}>{ev.time}</NumTime>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DetailScreenProps {
  trip: Trip;
  from: StopId;
  animate: boolean;
  texture: boolean;
  onBack: () => void;
  tick: number;
  userLoc: { lat: number; lng: number } | null;
  driveMins: number | null;
}

export function DetailScreen({ trip, from: _from, animate, texture, onBack, tick: _tick, userLoc, driveMins }: DetailScreenProps) {
  const isToday = trip.dateStr === ymd(getOsloDate());
  const countdown = isToday ? minsUntil(trip.dateStr, trip.startTime) : null;
  const upcoming = countdown == null || countdown >= 0;
  const effectiveDrive = driveMins ?? stopTravel[trip.startStop].drive;
  const nextTrip = (() => {
    if (!isToday) return null;
    const nowMins = getOsloDate().getHours() * 60 + getOsloDate().getMinutes();
    const todayTrips = findTripsForDay(dayTypeOf(parseYmd(trip.dateStr)), parseYmd(trip.dateStr), trip.startStop, trip.subpath[trip.subpath.length - 1].stopId);
    return todayTrips.find(t => parseTime(t.startTime) > parseTime(trip.startTime) && parseTime(t.startTime) > nowMins) ?? null;
  })();
  const status = upcoming && isToday ? rekkerStatus(effectiveDrive, countdown, nextTrip) : null;
  const tv = travelVisibility(trip.startStop, userLoc);
  const booking = trip.warnings.find(w => w.type === 'booking');
  const engo = trip.warnings.find(w => w.type === 'engo');
  const endStop = trip.subpath[trip.subpath.length - 1].stopId;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surfaceAlt)' }}>
      <DeepBand animate={animate} texture={texture} ferry waves style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 34px', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, position: 'relative', zIndex: 2 }}>
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chevronLeft" size={20} color="var(--onDeep)" stroke={2.2} />
          </button>
          <Label color="var(--onDeepDim)">{trip.dayLabel} · {trip.duration} min overfart</Label>
        </div>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flexShrink: 0 }}>
            <Label color="var(--onDeepDim)" style={{ fontSize: 10 }}>{stopShort[trip.startStop]}</Label>
            <NumTime size={40} color="var(--onDeep)" style={{ display: 'block', marginTop: 2 }}>{trip.startTime}</NumTime>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 8 }}>
            <Icon name="arrowRight" size={20} color="var(--onDeepDim)" stroke={1.8} />
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Label color="var(--onDeepDim)" style={{ fontSize: 10 }}>{stopShort[endStop]}</Label>
            <NumTime size={40} color="var(--accent)" style={{ display: 'block', marginTop: 2 }}>{trip.endTime}</NumTime>
          </div>
        </div>
        {countdown != null && countdown >= 0 && (
          <div style={{ position: 'relative', zIndex: 2, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', whiteSpace: 'nowrap' }}>
            <Icon name="clock" size={14} color="var(--onDeep)" stroke={2} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12.5, color: 'var(--onDeep)' }}>Går om {fmtCountdown(countdown)}</span>
          </div>
        )}
      </DeepBand>

      <div style={{ padding: '18px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(tv.showCar || tv.showWalk) && status && <StatusSignal status={status} />}

        {isToday && upcoming && (tv.showCar || tv.showWalk) && (
          <div>
            <Label color="var(--inkDim)" style={{ paddingLeft: 2 }}>Til {stopShort[trip.startStop]}-kaia</Label>
            <div style={{ marginTop: 8 }}><TravelChips stop={trip.startStop} showCar={tv.showCar} showWalk={tv.showWalk} driveOverride={driveMins} /></div>
          </div>
        )}

        {(booking || engo) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {booking && (
              <div style={{ display: 'flex', gap: 11, padding: '14px', borderRadius: 'var(--radSm)', background: 'color-mix(in srgb, var(--bad) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--bad) 25%, transparent)' }}>
                <Icon name="alert" size={19} color="var(--bad)" stroke={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--bad)' }}>Forhåndsbestilling påkrevd</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5, color: 'var(--inkDim)', marginTop: 3, lineHeight: 1.4 }}>{booking.text} Ring fergen for å bestille.</div>
                </div>
              </div>
            )}
            {engo && (
              <div style={{ display: 'flex', gap: 11, padding: '14px', borderRadius: 'var(--radSm)', background: 'color-mix(in srgb, var(--accent) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                <Icon name="info" size={19} color="var(--accent)" stroke={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--accent)' }}>Rød avgang via Engø</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5, color: 'var(--inkDim)', marginTop: 3, lineHeight: 1.4 }}>{engo.text}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--rad)', border: '1px solid var(--line)', padding: '18px 18px 20px' }}>
          <Label color="var(--inkDim)" style={{ paddingLeft: 2 }}>Reiserute</Label>
          <div style={{ marginTop: 14 }}><RouteTimeline trip={trip} animate={animate} /></div>
        </div>

        <CallButton />
      </div>
    </div>
  );
}
