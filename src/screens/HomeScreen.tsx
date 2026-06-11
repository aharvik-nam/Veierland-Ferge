import React, { useState, useEffect } from 'react';
import { CompassMark } from '../components/Icons';
import { Icon } from '../components/Icons';
import { DeepBand, WeatherChip, RouteCard, StatusSignal, TravelChips, NumTime, Label } from '../components/Atoms';
import { EnturTransit } from '../components/EnturTransit';
import { nextDepartures, prevDeparture, upcomingTrips, minsUntil, fmtCountdown, rekkerStatus, stopTravel, travelVisibility, ymd, getOsloDate, stopsMap, stopCoords, haversineKm, bookingStatus } from '../ferryData';
import type { StopId, Weather, Trip, TransportMode } from '../types';

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
  onRequestLocation: () => Promise<boolean>;
  onOpenWeather: () => void;
  transportMode: TransportMode | undefined;
  onSetTransportMode: (m: TransportMode) => void;
  onboarded: boolean;
  onSetOnboarded: () => void;
  onReset: () => void;
}

export function HomeScreen({ from, to, weather, animate, texture, onEditFrom, onEditTo, onSwap, onSeeAll, onOpenTrip, tick: _tick, userLoc, driveMins, onRequestLocation, onOpenWeather, transportMode, onSetTransportMode, onboarded, onSetOnboarded, onReset }: HomeScreenProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [locState, setLocState] = useState<'idle' | 'busy' | 'denied'>('idle');
  useEffect(() => { setHeroIndex(0); }, [from, to]);

  const deps = nextDepartures(from, to, heroIndex + 2);
  const dep = deps[heroIndex] ?? null;
  const nextDep = deps[heroIndex + 1] ?? null;
  const prevActual = prevDeparture(from, to);
  const prevCard = heroIndex > 0 ? (deps[heroIndex - 1] ?? null) : prevActual;
  const prevIsPast = heroIndex === 0;
  const countdown = dep && dep.dateStr === ymd(getOsloDate()) ? minsUntil(dep.dateStr, dep.startTime) : null;

  // Transport mode — island stops are always walk, bus stops never show travel info
  const isIsland = from === 'vestgarden' || from === 'tangen';
  const isBusStop = from === 'buss_tbg' || from === 'buss_tenv';
  const defaultMode: TransportMode = isIsland ? 'walk' : 'drive';
  const effectiveMode: TransportMode = isBusStop ? 'bus' : (transportMode ?? defaultMode);
  const showModePicker = !isIsland && !isBusStop;

  // Resolve travel time and mode for status signal
  const travelMode: 'drive' | 'walk' = effectiveMode === 'walk' ? 'walk' : 'drive';
  // Walk estimate from actual GPS position (1.25 path factor, 4.8 km/h)
  const walkEst = userLoc
    ? Math.max(1, Math.ceil(haversineKm(userLoc.lat, userLoc.lng, stopCoords[from].lat, stopCoords[from].lng) * 1.25 / 4.8 * 60))
    : null;
  const effectiveTravel = effectiveMode === 'walk'
    ? (walkEst ?? stopTravel[from].walk)
    : (driveMins ?? stopTravel[from].drive);

  // Override visibility based on chosen mode
  const tvBase = travelVisibility(from, userLoc);
  const tv = effectiveMode === 'bus'
    ? { showCar: false, showWalk: false }
    : effectiveMode === 'walk'
    ? { showCar: false, showWalk: tvBase.showWalk }
    : { showCar: tvBase.showCar, showWalk: false };

  // In drive mode, require a real (GPS-based) estimate — the static fallback can't know where the user is
  const showStatus = effectiveMode !== 'bus' && (tv.showCar || tv.showWalk) && (travelMode !== 'drive' || driveMins != null);
  const status = dep && showStatus ? rekkerStatus(effectiveTravel, countdown, travelMode, nextDep) : null;

  // Ferries for today + tomorrow — needed when the next ferry is after midnight
  const osloNow = getOsloDate();
  const tomorrowDate = new Date(osloNow); tomorrowDate.setDate(osloNow.getDate() + 1);
  const todayFerries = [
    ...upcomingTrips(from, to, ymd(osloNow)),
    ...upcomingTrips(from, to, ymd(tomorrowDate)),
  ];

  if (!onboarded) {
    return (
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, var(--deep) 0%, var(--deep2) 55%, var(--deep) 100%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <CompassMark size={34} color="var(--onDeep)" opacity={0.85} />
            <div>
              <div style={{ fontFamily: 'var(--num)', fontSize: 25, color: 'var(--onDeep)', lineHeight: 0.9 }}>Veierland</div>
              <Label color="var(--onDeepDim)" style={{ fontSize: 9.5 }}>M/F Jutøya · Ferge</Label>
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

          <button data-tour="timetable-btn-onboard" onClick={onSeeAll} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Icon name="calendar" size={18} color="var(--onDeep)" stroke={1.9} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)' }}>Rutetabell</span>
            </span>
            <Icon name="chevronRight" size={17} color="var(--onDeepDim)" stroke={2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, var(--deep) 0%, var(--deep2) 55%, var(--deep) 100%)', position: 'relative' }}>
      <div style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 18px 30px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <CompassMark size={34} color="var(--onDeep)" opacity={0.85} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--num)', fontSize: 25, color: 'var(--onDeep)', lineHeight: 0.9 }}>Veierland</div>
              <Label color="var(--onDeepDim)" style={{ fontSize: 9.5 }}>M/F Jutøya · Ferge</Label>
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
            <DeepBand animate={animate} texture={texture} ferry waves style={{ padding: '18px 20px 72px' }}>
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
            <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {showModePicker && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {([
                    { mode: 'drive' as TransportMode, label: 'Kjører', icon: '🚗' },
                    { mode: 'bus'   as TransportMode, label: 'Buss/Tog', icon: '🚌' },
                    { mode: 'walk'  as TransportMode, label: 'Går', icon: '🚶' },
                  ]).map(({ mode, label, icon }) => {
                    const on = effectiveMode === mode;
                    return (
                      <button key={mode} onClick={() => onSetTransportMode(mode)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 4px', borderRadius: 'var(--radSm)', border: on ? '1.5px solid var(--accent)' : '1px solid var(--line)', background: on ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surfaceAlt)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: on ? 700 : 600, fontSize: 12, color: on ? 'var(--accent)' : 'var(--inkDim)', whiteSpace: 'nowrap' }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {effectiveMode !== 'bus' && !userLoc && (
                <button
                  onClick={async () => {
                    if (locState === 'busy') return;
                    setLocState('busy');
                    const ok = await onRequestLocation();
                    setLocState(ok ? 'idle' : 'denied');
                  }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 13px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px dashed var(--line)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <Icon name={locState === 'denied' ? 'alert' : 'info'} size={15} color={locState === 'denied' ? 'var(--warn)' : 'var(--inkDim)'} stroke={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
                  {locState === 'denied' ? (
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5, color: 'var(--inkDim)', lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 700, color: 'var(--warn)' }}>Posisjon er blokkert for dette nettstedet.</span>{' '}
                      iPhone: Innstillinger → Personvern → Stedstjenester → Safari. Android/Chrome: trykk hengelåsen i adressefeltet → Tillatelser → Posisjon.
                    </span>
                  ) : (
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5, color: 'var(--inkDim)', lineHeight: 1.4 }}>
                      {locState === 'busy' ? 'Henter posisjon …' : 'Trykk her for å aktivere posisjon — se reisetid og om du rekker fergen'}
                    </span>
                  )}
                </button>
              )}
              {status && <div data-tour="status-signal"><StatusSignal status={status} /></div>}
              {effectiveMode !== 'bus' && status?.level !== 'bad' && <TravelChips stop={from} showCar={tv.showCar} showWalk={tv.showWalk} driveOverride={driveMins} walkOverride={walkEst} />}
              {effectiveMode === 'bus' && dep && <EnturTransit userLoc={userLoc} stop={from} targetTrip={dep} allFerries={todayFerries} />}
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
        {(prevCard || nextDep) && (
          <div data-tour="mini-cards" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { trip: prevCard, label: 'Forrige avgang', showCountdown: false, isPast: prevIsPast },
              { trip: nextDep, label: 'Neste avgang',   showCountdown: true,  isPast: false },
            ] as { trip: typeof prevCard; label: string; showCountdown: boolean; isPast: boolean }[]).map(({ trip, label, showCountdown, isPast }) => {
              const cd = showCountdown && trip && trip.dateStr === ymd(getOsloDate()) ? minsUntil(trip.dateStr, trip.startTime) : null;
              const handleClick = showCountdown
                ? () => trip && setHeroIndex(i => i + 1)
                : isPast
                  ? () => trip && onOpenTrip(trip)
                  : () => trip && setHeroIndex(i => i - 1);
              return (
                <button
                  key={label}
                  onClick={trip ? handleClick : undefined}
                  style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radSm)', background: 'rgba(255,255,255,0.06)', border: trip && bookingStatus(trip).required ? '1px solid color-mix(in srgb, var(--bad) 50%, transparent)' : '1px solid rgba(255,255,255,0.10)', cursor: trip ? 'pointer' : 'default', opacity: !trip ? 0.3 : isPast ? 0.6 : 1 }}
                >
                  <Label color="var(--onDeepDim)" style={{ fontSize: 9 }}>{label}</Label>
                  {trip ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 5, gap: 6 }}>
                        <NumTime size={28} color="var(--onDeep)">{trip.startTime}</NumTime>
                        {cd != null ? (
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--accent)', lineHeight: 1.1, textAlign: 'right' }}>om {fmtCountdown(cd)}</span>
                        ) : (
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: 'var(--onDeepDim)', lineHeight: 1.1, textAlign: 'right' }}>{trip.endTime}</span>
                        )}
                      </div>
                      {bookingStatus(trip).required && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          <Icon name="phone" size={10} color="var(--bad)" stroke={2} />
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: 'var(--bad)', lineHeight: 1 }}>Må bestilles</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--onDeepDim)', marginTop: 4 }}>—</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* see all */}
        <button data-tour="rutetabell-btn" onClick={onSeeAll} style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name="calendar" size={19} color="var(--onDeep)" stroke={1.9} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--onDeep)' }}>Rutetabell</span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--onDeepDim)" stroke={2} />
        </button>
      </div>
    </div>
  );
}
