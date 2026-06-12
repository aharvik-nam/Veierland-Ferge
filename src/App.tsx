import React, { useState, useEffect, useCallback, useRef } from 'react';
import { THEMES, STYLES, themeVars } from './theme';
import { ymd, getOsloDate, stopCoords, isSummerSeason, haversineKm } from './ferryData';
import { HomeScreen } from './screens/HomeScreen';
import { Dashboard } from './screens/Dashboard';
import { ResultsScreen } from './screens/ResultsScreen';
import { DetailScreen } from './screens/DetailScreen';
import { StopPicker } from './components/Atoms';
import { Icon } from './components/Icons';
import { Tour } from './components/Tour';
import { WeatherSheet } from './components/WeatherSheet';
import type { StopId, ThemeKey, StyleKey, Weather, Trip, Screen, TransportMode } from './types';

// Norwegian public holidays (MM-DD) and summer peak weeks
const NO_HOLIDAYS = new Set([
  '01-01','04-17','04-18','04-20','04-21','05-01','05-17',
  '05-29','06-08','06-09','12-25','12-26',
]);

function trafficMultiplier(): number {
  const now = getOsloDate();
  const dow = now.getDay();       // 0=sun, 5=fri, 6=sat
  const hour = now.getHours();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Public holidays — treat like Sunday, no rush
  if (NO_HOLIDAYS.has(mmdd)) return 1.0;

  // Summer peak follows the summer timetable period (22 Jun – 16 Aug)
  const isSummerPeak = isSummerSeason(now);

  // Friday afternoon outbound rush (E18 sørover) 14:00–19:00
  if (dow === 5 && hour >= 14 && hour < 19) return isSummerPeak ? 1.55 : 1.35;

  // Friday morning / evening light traffic
  if (dow === 5) return 1.1;

  // Sunday evening return rush 15:00–20:00 (summer) — people heading back to Oslo
  if (dow === 0 && hour >= 15 && hour < 20 && isSummerPeak) return 1.4;

  // Weekday morning rush 07:00–09:00 and afternoon rush 15:00–18:00
  if (dow >= 1 && dow <= 4) {
    if (hour >= 7 && hour < 9) return 1.2;
    if (hour >= 15 && hour < 18) return 1.25;
  }

  return 1.0;
}

function yrSymbolToCode(sym: string): number {
  if (!sym) return 2;
  if (sym.startsWith('clearsky')) return 1;
  if (sym.startsWith('fair')) return 1;
  if (sym.startsWith('partlycloudy')) return 2;
  if (sym.startsWith('cloudy')) return 3;
  if (sym.startsWith('fog')) return 45;
  if (sym.includes('thunder')) return 95;
  if (sym.includes('snow') || sym.includes('sleet')) return 71;
  if (sym.includes('rain') || sym.includes('drizzle') || sym.includes('shower')) return 61;
  return 2;
}

function SettingsSheet({ open, theme, style: stylePref, animate, onTheme, onStyle, onAnimate, onClose }: {
  open: boolean;
  theme: ThemeKey;
  style: StyleKey;
  animate: boolean;
  onTheme: (t: ThemeKey) => void;
  onStyle: (s: StyleKey) => void;
  onAnimate: (v: boolean) => void;
  onClose: () => void;
}) {
  const themeKeys: ThemeKey[] = ['fjord', 'driftwood', 'midnattsol', 'lanterne'];
  const styleKeys: StyleKey[] = ['sjokart', 'tavle', 'mykt'];
  const styleLabels: Record<StyleKey, string> = { sjokart: 'Sjøkart', tavle: 'Tavle', mykt: 'Mykt' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: '14px 20px calc(env(safe-area-inset-bottom,0px) + 24px)', transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 42, height: 5, borderRadius: 99, background: 'var(--line)', margin: '0 auto 20px' }} />

        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--inkDim)', marginBottom: 10 }}>Fargetema</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {themeKeys.map(k => {
            const th = THEMES[k];
            const on = k === theme;
            return (
              <button key={k} onClick={() => onTheme(k)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 14, border: on ? '2px solid var(--accent)' : '1.5px solid var(--line)', background: on ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surfaceAlt)', cursor: 'pointer' }}>
                <span style={{ display: 'flex', flexShrink: 0 }}>
                  {th.swatch.map((c, i) => (
                    <span key={i} style={{ width: 13, height: 22, background: c, borderRadius: i === 0 ? '5px 0 0 5px' : i === th.swatch.length - 1 ? '0 5px 5px 0' : 0, border: '0.5px solid rgba(0,0,0,0.12)' }} />
                  ))}
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{th.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--inkDim)', marginBottom: 10 }}>Visuell stil</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {styleKeys.map(k => {
            const on = k === stylePref;
            return (
              <button key={k} onClick={() => onStyle(k)} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: on ? '2px solid var(--accent)' : '1.5px solid var(--line)', background: on ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surfaceAlt)', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                {styleLabels[k]}
              </button>
            );
          })}
        </div>

        <button onClick={() => onAnimate(!animate)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--line)', background: 'var(--surfaceAlt)', cursor: 'pointer' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Bevegelse (bølger + ferge)</span>
          <div style={{ width: 44, height: 26, borderRadius: 99, background: animate ? 'var(--accent)' : 'var(--line)', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: animate ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('onboarded') === 'true');
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => (localStorage.getItem('themeKey') as ThemeKey) || 'fjord');
  const [styleKey, setStyleKey] = useState<StyleKey>(() => (localStorage.getItem('styleKey') as StyleKey) || 'sjokart');
  const [animate, setAnimate] = useState(() => localStorage.getItem('animate') !== 'false');
  const [transportModes, setTransportModes] = useState<Partial<Record<StopId, TransportMode>>>(() => {
    try { return JSON.parse(localStorage.getItem('transportModes') || '{}'); } catch { return {}; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);

  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [from, setFrom] = useState<StopId>('tenvik');
  const [to, setTo] = useState<StopId>('vestgarden');
  const [selectedDate, setSelectedDate] = useState(ymd(getOsloDate()));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; which: 'from' | 'to' | null }>({ open: false, which: null });
  const [weather, setWeather] = useState<Weather | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [forecast, setForecast] = useState<any[] | null>(null);
  const [tick, setTick] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [driveMins, setDriveMins] = useState<number | null>(null);
  const [driveMinsFast, setDriveMinsFast] = useState<number | null>(null);
  const [driveRefreshKey, setDriveRefreshKey] = useState(0);
  // Which ferry the user is aiming for — lets the route query predict traffic at the actual drive time
  const [driveTarget, setDriveTarget] = useState<{ date: string; time: string } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Desktop dashboard: shown on wide screens unless the user picks mobile view
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches);
  const [desktopView, setDesktopView] = useState<'dashboard' | 'mobile'>(() => (localStorage.getItem('desktopView') as 'dashboard' | 'mobile') || 'dashboard');
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1100px)');
    const onChange = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const setDesktopViewPersist = (v: 'dashboard' | 'mobile') => { setDesktopView(v); localStorage.setItem('desktopView', v); };

  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        // Keep last known position on transient errors; clear only if access is denied
        if (err.code === err.PERMISSION_DENIED) setUserLoc(null);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  useEffect(() => {
    // Tenvik pier: 59.1617, 10.3455 — api.met.no (powers Yr.no).
    // No custom User-Agent header: browsers strip or preflight it, which can fail the request.
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const load = () => {
      fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.1617&lon=10.3455')
        .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(j => {
          if (cancelled) return;
          const ts = j.properties?.timeseries ?? [];
          if (ts.length) setForecast(ts);
          const inst = ts[0]?.data?.instant?.details;
          const sym = ts[0]?.data?.next_1_hours?.summary?.symbol_code ?? ts[0]?.data?.next_6_hours?.summary?.symbol_code ?? '';
          if (inst?.air_temperature != null) {
            setWeather({ temp: inst.air_temperature, wind: inst.wind_speed, code: yrSymbolToCode(sym) });
            attempt = 0;
          }
        })
        .catch(() => {
          // Retry with backoff — mobile PWAs often launch before the network is ready
          if (cancelled || attempt >= 5) return;
          attempt += 1;
          retryTimer = setTimeout(load, attempt * 10000);
        });
    };

    load();
    const refresh = setInterval(load, 30 * 60000); // refresh every 30 min
    const onOnline = () => load();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(refresh);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const lastRouteKeyRef = useRef<string>('');
  useEffect(() => {
    if (!userLoc || (from !== 'tenvik' && from !== 'engo')) {
      setDriveMins(null);
      setDriveMinsFast(null);
      lastRouteKeyRef.current = '';
      return;
    }
    // Round coordinates (~100 m) so GPS jitter doesn't refetch on every position tick
    const key = `${userLoc.lat.toFixed(3)},${userLoc.lng.toFixed(3)},${from},${driveRefreshKey},${driveTarget ? `${driveTarget.date}T${driveTarget.time}` : ''}`;
    if (lastRouteKeyRef.current === key) return;
    lastRouteKeyRef.current = key;
    const dest = stopCoords[from];
    // Haversine fallback: road factor 1.3, avg 55 km/h, +3 min parking, with traffic estimate
    const estimate = () => Math.ceil(haversineKm(userLoc.lat, userLoc.lng, dest.lat, dest.lng) * 1.3 / 55 * 60 * trafficMultiplier()) + 3;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) { setDriveMins(estimate()); return; }
    // Predict traffic at the time the user would actually be driving:
    // estimated departure = ferry time minus rough drive estimate. Google requires a future timestamp.
    let departureTime: string | undefined;
    if (driveTarget) {
      const ferryMs = new Date(`${driveTarget.date}T${driveTarget.time}:00`).getTime();
      const departMs = ferryMs - estimate() * 60000;
      if (departMs > Date.now() + 60000) departureTime = new Date(departMs).toISOString();
    }
    fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: userLoc.lat, longitude: userLoc.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        ...(departureTime ? { departureTime } : {}),
      }),
    })
      .then(r => r.json())
      .then(j => {
        // duration / staticDuration returned as e.g. "612s"
        const parse = (s: string | undefined) => s ? parseInt(s.replace('s', ''), 10) : null;
        const secs = parse(j.routes?.[0]?.duration);
        const secsFast = parse(j.routes?.[0]?.staticDuration);
        setDriveMins(secs != null && !isNaN(secs) ? Math.ceil(secs / 60) + 3 : estimate());
        setDriveMinsFast(secsFast != null && !isNaN(secsFast) ? Math.ceil(secsFast / 60) + 3 : null);
      })
      .catch(() => setDriveMins(estimate()));
  }, [userLoc, from, driveRefreshKey, driveTarget]);

  const theme = THEMES[themeKey];
  const style = STYLES[styleKey];
  const vars = themeVars(theme, style);

  const swap = useCallback(() => {
    setFrom(prev => { setTo(prev); return to; });
  }, [to]);

  const openPicker = (which: 'from' | 'to') => setPicker({ open: true, which });

  const pick = useCallback((s: StopId) => {
    setPicker(p => {
      if (p.which === 'from') {
        setFrom(prev => { if (s === to) setTo(prev); return s; });
      } else {
        setTo(prev => { if (s === from) setFrom(prev); return s; });
      }
      return { open: false, which: null };
    });
  }, [from, to]);

  // Called from the GPS hint — a user gesture re-triggers the native permission
  // prompt when state is "prompt"; resolves false when access is denied
  const requestLocation = useCallback((): Promise<boolean> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(false); return; }
      navigator.geolocation.getCurrentPosition(
        pos => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); resolve(true); },
        err => { resolve(err.code !== err.PERMISSION_DENIED); },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 }
      );
    });
  }, []);

  const setTransportMode = useCallback((stop: StopId, mode: TransportMode) => {
    setTransportModes(prev => {
      const next = { ...prev, [stop]: mode };
      localStorage.setItem('transportModes', JSON.stringify(next));
      return next;
    });
  }, []);

  const openTrip = (t: Trip) => { setTrip(t); setPrevScreen(screen); setScreen('detail'); };

  // Desktop dashboard — mobile view below stays untouched
  if (isWide && desktopView === 'dashboard') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--surfaceAlt)', ...(vars as React.CSSProperties) }}>
        <Dashboard
          weather={weather} forecast={forecast} animate={animate} tick={tick}
          from={from} to={to}
          onEditFrom={() => openPicker('from')} onEditTo={() => openPicker('to')} onSwap={swap}
          onOpenWeather={() => setWeatherOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onMobileView={() => setDesktopViewPersist('mobile')}
        />
        <StopPicker
          open={picker.open}
          title={picker.which === 'from' ? 'Reise fra' : 'Reise til'}
          selected={picker.which === 'from' ? from : to}
          exclude={picker.which === 'from' ? to : from}
          which={picker.which}
          onPick={pick}
          onClose={() => setPicker({ open: false, which: null })}
        />
        <WeatherSheet open={weatherOpen} animate={animate} preloaded={forecast} onClose={() => setWeatherOpen(false)} />
        <SettingsSheet
          open={settingsOpen}
          theme={themeKey} style={styleKey} animate={animate}
          onTheme={k => { setThemeKey(k); localStorage.setItem('themeKey', k); }}
          onStyle={s => { setStyleKey(s); localStorage.setItem('styleKey', s); }}
          onAnimate={v => { setAnimate(v); localStorage.setItem('animate', String(v)); }}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--deep)', display: 'flex', justifyContent: 'center', ...(vars as React.CSSProperties) }}>
    <div style={{ width: '100%', maxWidth: 430, minHeight: '100dvh', position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}>
      {screen === 'home' && (
        <HomeScreen
          from={from} to={to} weather={weather}
          animate={animate} texture={style.texture}
          onEditFrom={() => openPicker('from')} onEditTo={() => openPicker('to')} onSwap={swap}
          onSeeAll={() => { setSelectedDate(ymd(getOsloDate())); setScreen('results'); }}
          onOpenTrip={openTrip} tick={tick} userLoc={userLoc} driveMins={driveMins} driveMinsFast={driveMinsFast}
          onRefreshDrive={() => setDriveRefreshKey(k => k + 1)}
          onDriveTarget={setDriveTarget}
          onRequestLocation={requestLocation}
          onOpenWeather={() => setWeatherOpen(true)}
          transportMode={transportModes[from]} onSetTransportMode={(m) => setTransportMode(from, m)}
          onboarded={onboarded} onSetOnboarded={() => { setOnboarded(true); localStorage.setItem('onboarded', 'true'); }}
          onReset={() => { setOnboarded(false); localStorage.removeItem('onboarded'); }}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          from={from} to={to} selectedDate={selectedDate} onSelectDate={setSelectedDate}
          animate={animate} texture={style.texture}
          onBack={() => setScreen('home')} onSwap={swap}
          onEditFrom={() => openPicker('from')} onEditTo={() => openPicker('to')}
          onOpenTrip={openTrip} tick={tick} userLoc={userLoc}
        />
      )}
      {screen === 'detail' && trip && (
        <DetailScreen
          trip={trip} from={from}
          animate={animate} texture={style.texture}
          onBack={() => setScreen(prevScreen)} tick={tick} userLoc={userLoc} driveMins={driveMins} driveMinsFast={driveMinsFast}
          transportMode={transportModes[from]}
        />
      )}

      {/* FABs */}
      <div style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', right: 'calc(max(0px, (100vw - 430px) / 2) + 20px)', display: 'flex', gap: 10, zIndex: 70 }}>
        {isWide && (
          <button
            onClick={() => setDesktopViewPersist('dashboard')}
            title="Dashboard"
            style={{ width: 48, height: 48, borderRadius: 99, background: 'var(--deep)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>🖥️</span>
          </button>
        )}
        <button
          onClick={() => setTourOpen(true)}
          style={{ width: 48, height: 48, borderRadius: 99, background: 'var(--deep)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
        >
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--onDeep)', lineHeight: 1 }}>?</span>
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{ width: 48, height: 48, borderRadius: 99, background: 'var(--deep)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
        >
          <Icon name="settings" size={20} color="var(--onDeep)" stroke={1.8} />
        </button>
      </div>

      <StopPicker
        open={picker.open}
        title={picker.which === 'from' ? 'Reise fra' : 'Reise til'}
        selected={picker.which === 'from' ? from : to}
        exclude={picker.which === 'from' ? to : from}
        which={picker.which}
        onPick={pick}
        onClose={() => setPicker({ open: false, which: null })}
      />

      {tourOpen && <Tour screen={!onboarded ? 'onboarding' : screen === 'results' ? 'results' : 'home'} onClose={() => setTourOpen(false)} />}

      <WeatherSheet open={weatherOpen} animate={animate} preloaded={forecast} onClose={() => setWeatherOpen(false)} />

      <SettingsSheet
        open={settingsOpen}
        theme={themeKey} style={styleKey} animate={animate}
        onTheme={k => { setThemeKey(k); localStorage.setItem('themeKey', k); }}
        onStyle={s => { setStyleKey(s); localStorage.setItem('styleKey', s); }}
        onAnimate={v => { setAnimate(v); localStorage.setItem('animate', String(v)); }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
    </div>
  );
}
