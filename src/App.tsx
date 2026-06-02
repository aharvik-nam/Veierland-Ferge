import React, { useState, useEffect, useCallback, useRef } from 'react';
import { THEMES, STYLES, themeVars } from './theme';
import { ymd, getOsloDate, stopCoords } from './ferryData';
import { HomeScreen } from './screens/HomeScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { DetailScreen } from './screens/DetailScreen';
import { StopPicker } from './components/Atoms';
import { Icon } from './components/Icons';
import { Tour } from './components/Tour';
import type { StopId, ThemeKey, StyleKey, Weather, Trip, Screen } from './types';

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
  const week = Math.ceil((now.getDate() - now.getDay() + 10) / 7); // approx ISO week
  const month = now.getMonth() + 1; // 1–12

  // Public holidays — treat like Sunday, no rush
  if (NO_HOLIDAYS.has(mmdd)) return 1.0;

  // Summer peak: week 26–32 (late June – early August) Friday afternoons and Sundays
  const isSummerPeak = month >= 6 && month <= 8 && week >= 26 && week <= 32;

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [from, setFrom] = useState<StopId>('tenvik');
  const [to, setTo] = useState<StopId>('vestgarden');
  const [selectedDate, setSelectedDate] = useState(ymd(getOsloDate()));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; which: 'from' | 'to' | null }>({ open: false, which: null });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [tick, setTick] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [driveMins, setDriveMins] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLoc(null),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  useEffect(() => {
    // Tenvik pier: 59.1617, 10.3455 — api.met.no (powers Yr.no)
    fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.1617&lon=10.3455', {
      headers: { 'User-Agent': 'VeierlandFerge/1.0 github.com/aharvik-nam/Veierland-Ferge' },
    })
      .then(r => r.json())
      .then(j => {
        const cur = j.properties?.timeseries?.[0]?.data;
        const inst = cur?.instant?.details;
        const sym = cur?.next_1_hours?.summary?.symbol_code ?? cur?.next_6_hours?.summary?.symbol_code ?? '';
        setWeather({ temp: inst.air_temperature, wind: inst.wind_speed, code: yrSymbolToCode(sym) });
      })
      .catch(() => setWeather({ temp: 10, wind: 3, code: 2 }));
  }, []);

  useEffect(() => {
    if (!userLoc || (from !== 'tenvik' && from !== 'engo')) {
      setDriveMins(null);
      return;
    }
    const dest = stopCoords[from];
    fetch(`https://router.project-osrm.org/route/v1/driving/${userLoc.lng},${userLoc.lat};${dest.lng},${dest.lat}?overview=false`)
      .then(r => r.json())
      .then(j => {
        const secs = j.routes?.[0]?.duration;
        if (secs != null) setDriveMins(Math.ceil(secs / 60 * trafficMultiplier()));
      })
      .catch(() => setDriveMins(null));
  }, [userLoc, from]);

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

  const openTrip = (t: Trip) => { setTrip(t); setPrevScreen(screen); setScreen('detail'); };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--deep)', display: 'flex', justifyContent: 'center', ...(vars as React.CSSProperties) }}>
    <div style={{ width: '100%', maxWidth: 430, minHeight: '100dvh', position: 'relative', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}>
      {screen === 'home' && (
        <HomeScreen
          from={from} to={to} weather={weather}
          animate={animate} texture={style.texture}
          onEditFrom={() => openPicker('from')} onEditTo={() => openPicker('to')} onSwap={swap}
          onSeeAll={() => { setSelectedDate(ymd(getOsloDate())); setScreen('results'); }}
          onOpenTrip={openTrip} tick={tick} userLoc={userLoc} driveMins={driveMins}
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
          onOpenTrip={openTrip} tick={tick}
        />
      )}
      {screen === 'detail' && trip && (
        <DetailScreen
          trip={trip} from={from}
          animate={animate} texture={style.texture}
          onBack={() => setScreen(prevScreen)} tick={tick} userLoc={userLoc} driveMins={driveMins}
        />
      )}

      {/* FABs */}
      <div style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', right: 'calc(max(0px, (100vw - 430px) / 2) + 20px)', display: 'flex', gap: 10, zIndex: 70 }}>
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
