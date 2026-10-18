import React, { useState, useEffect, useCallback } from 'react';
import { THEMES, STYLES, themeVars } from './theme';
import { ymd, getOsloDate, isMaintenancePeriod } from './ferryData';
import { HomeScreen } from './screens/HomeScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { DetailScreen } from './screens/DetailScreen';
import { TimetableScreen } from './screens/TimetableScreen';
import { refreshTimetable } from './remoteTimetable';
import { StopPicker } from './components/Atoms';
import { Icon } from './components/Icons';
import { Tour } from './components/Tour';
import { WeatherSheet } from './components/WeatherSheet';
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

function SettingsSheet({ open, theme, style: stylePref, animate, onTheme, onStyle, onAnimate, onTour, onClose }: {
  open: boolean;
  theme: ThemeKey;
  style: StyleKey;
  animate: boolean;
  onTheme: (t: ThemeKey) => void;
  onStyle: (s: StyleKey) => void;
  onAnimate: (v: boolean) => void;
  onTour: () => void;
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

        <button onClick={onTour} style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--line)', background: 'var(--surfaceAlt)', cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
            <Icon name="info" size={18} color="var(--inkDim)" stroke={2} />Vis hvordan appen fungerer
          </span>
          <Icon name="chevronRight" size={17} color="var(--inkDim)" stroke={2} />
        </button>
      </div>
    </div>
  );
}

const STOP_IDS: StopId[] = ['buss_tbg', 'tenvik', 'vestgarden', 'engo', 'tangen', 'buss_tenv'];
function savedStop(key: string, fallback: StopId): StopId {
  let v: string | null = null;
  try { v = localStorage.getItem(key); } catch { /* privat modus */ }
  if (!v || !STOP_IDS.includes(v as StopId)) return fallback;
  if (v === 'vestgarden' && isMaintenancePeriod(getOsloDate())) return 'tangen';
  return v as StopId;
}

type Tab = 'home' | 'results' | 'timetable';
const TABS: { key: Tab; label: string; icon: 'search' | 'list' | 'table' }[] = [
  { key: 'home', label: 'Søk', icon: 'search' },
  { key: 'results', label: 'Avganger', icon: 'list' },
  { key: 'timetable', label: 'Rutetabell', icon: 'table' },
];

// Fast navigasjonslinje nederst, alltid over innholdet
function TabBar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  return (
    <nav data-tour="tabbar" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 430, margin: '0 auto', zIndex: 60, display: 'flex', padding: '6px 8px calc(env(safe-area-inset-bottom, 0px) + 6px)', background: 'color-mix(in srgb, var(--deep) 88%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
      {TABS.map(t => {
        const on = t.key === active;
        return (
          <button key={t.key} onClick={() => onSelect(t.key)} aria-current={on ? 'page' : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0 4px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 28, borderRadius: 99, background: on ? 'color-mix(in srgb, var(--accentOnDeep) 18%, transparent)' : 'transparent', transition: 'background 0.2s' }}>
              <Icon name={t.icon} size={20} color={on ? 'var(--accentOnDeep)' : 'var(--onDeepDim)'} stroke={on ? 2.3 : 2} />
            </span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: on ? 700 : 600, fontSize: 11.5, color: on ? 'var(--onDeep)' : 'var(--onDeepDim)' }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('onboarded') === 'true');
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => (localStorage.getItem('themeKey') as ThemeKey) || 'fjord');
  const [styleKey, setStyleKey] = useState<StyleKey>(() => (localStorage.getItem('styleKey') as StyleKey) || 'sjokart');
  const [animate, setAnimate] = useState(() => localStorage.getItem('animate') !== 'false');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);

  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  // Husk siste valgte strekning; Vestgården byttes ut mens den ikke anløpes
  const [from, setFrom] = useState<StopId>(() => savedStop('routeFrom', 'tenvik'));
  const [to, setTo] = useState<StopId>(() => savedStop('routeTo', 'tangen'));
  useEffect(() => {
    try { localStorage.setItem('routeFrom', from); localStorage.setItem('routeTo', to); } catch { /* privat modus */ }
  }, [from, to]);
  const [selectedDate, setSelectedDate] = useState(ymd(getOsloDate()));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; which: 'from' | 'to' | null }>({ open: false, which: null });
  const [weather, setWeather] = useState<Weather | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [forecast, setForecast] = useState<any[] | null>(null);
  const [tick, setTick] = useState(0);


  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Hent nyeste rutetider fra serveren ved oppstart og når appen åpnes igjen
  useEffect(() => {
    refreshTimetable(true);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshTimetable(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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
          onSeeAll={(date) => { setSelectedDate(date); setScreen('results'); }}
          onOpenTrip={openTrip} tick={tick}
          onOpenWeather={() => setWeatherOpen(true)}
          onboarded={onboarded} onSetOnboarded={() => { setOnboarded(true); localStorage.setItem('onboarded', 'true'); }}
          onReset={() => { setOnboarded(false); localStorage.removeItem('onboarded'); }}
          onOpenSettings={() => setSettingsOpen(true)}
          onPlanDate={(date) => { setSelectedDate(date); setOnboarded(true); localStorage.setItem('onboarded', 'true'); setScreen('results'); }}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          from={from} to={to} selectedDate={selectedDate} onSelectDate={setSelectedDate}
          animate={animate} texture={style.texture}
          onSwap={swap}
          onEditFrom={() => openPicker('from')} onEditTo={() => openPicker('to')}
          onOpenTrip={openTrip} tick={tick}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'detail' && trip && (
        <DetailScreen
          trip={trip} from={from}
          animate={animate} texture={style.texture}
          onBack={() => setScreen(prevScreen)} tick={tick}
        />
      )}
      {screen === 'timetable' && (
        <TimetableScreen from={from} animate={animate} texture={style.texture} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      <TabBar
        active={screen === 'detail' ? (prevScreen === 'detail' ? 'home' : prevScreen as Tab) : screen as Tab}
        onSelect={t => {
          // «Avganger» viser alltid dagens avganger
          if (t === 'results') setSelectedDate(ymd(getOsloDate()));
          setScreen(t);
          window.scrollTo({ top: 0 });
        }}
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

      {tourOpen && <Tour screen={!onboarded ? 'onboarding' : screen === 'results' ? 'results' : 'home'} onClose={() => setTourOpen(false)} />}

      <WeatherSheet open={weatherOpen} animate={animate} preloaded={forecast} onClose={() => setWeatherOpen(false)} />

      <SettingsSheet
        open={settingsOpen}
        theme={themeKey} style={styleKey} animate={animate}
        onTheme={k => { setThemeKey(k); localStorage.setItem('themeKey', k); }}
        onStyle={s => { setStyleKey(s); localStorage.setItem('styleKey', s); }}
        onAnimate={v => { setAnimate(v); localStorage.setItem('animate', String(v)); }}
        onTour={() => { setSettingsOpen(false); setTourOpen(true); }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
    </div>
  );
}
