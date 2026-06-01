import React, { useState, useEffect, useCallback, useRef } from 'react';
import { THEMES, STYLES, themeVars } from './theme';
import { ymd, getOsloDate } from './ferryData';
import { HomeScreen } from './screens/HomeScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { DetailScreen } from './screens/DetailScreen';
import { StopPicker } from './components/Atoms';
import { Icon } from './components/Icons';
import type { StopId, ThemeKey, StyleKey, Weather, Trip, Screen } from './types';

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
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => (localStorage.getItem('themeKey') as ThemeKey) || 'fjord');
  const [styleKey, setStyleKey] = useState<StyleKey>(() => (localStorage.getItem('styleKey') as StyleKey) || 'sjokart');
  const [animate, setAnimate] = useState(() => localStorage.getItem('animate') !== 'false');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [screen, setScreen] = useState<Screen>('home');
  const [from, setFrom] = useState<StopId>('tenvik');
  const [to, setTo] = useState<StopId>('vestgarden');
  const [selectedDate, setSelectedDate] = useState(ymd(getOsloDate()));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; which: 'from' | 'to' | null }>({ open: false, which: null });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [tick, setTick] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
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

  const openTrip = (t: Trip) => { setTrip(t); setScreen('detail'); };

  return (
    <div style={{ minHeight: '100dvh', ...(vars as React.CSSProperties) }}>
      {screen === 'home' && (
        <HomeScreen
          from={from} to={to} weather={weather}
          animate={animate} texture={style.texture}
          onEditFrom={() => openPicker('from')} onEditTo={() => openPicker('to')} onSwap={swap}
          onSeeAll={() => { setSelectedDate(ymd(getOsloDate())); setScreen('results'); }}
          onOpenTrip={openTrip} tick={tick} userLoc={userLoc}
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
          onBack={() => setScreen('results')} tick={tick} userLoc={userLoc}
        />
      )}

      {/* Settings FAB */}
      <button
        onClick={() => setSettingsOpen(true)}
        style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', right: 20, width: 48, height: 48, borderRadius: 99, background: 'var(--deep)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', zIndex: 70 }}
      >
        <Icon name="settings" size={20} color="var(--onDeep)" stroke={1.8} />
      </button>

      <StopPicker
        open={picker.open}
        title={picker.which === 'from' ? 'Reise fra' : 'Reise til'}
        selected={picker.which === 'from' ? from : to}
        exclude={picker.which === 'from' ? to : from}
        which={picker.which}
        onPick={pick}
        onClose={() => setPicker({ open: false, which: null })}
      />

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
