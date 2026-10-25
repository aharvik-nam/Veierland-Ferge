import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DetailScreen } from '../screens/DetailScreen';
import { PassengerDashboard } from './PassengerDashboard';
import { CrewDashboard, NIGHT_VARS, type NightMode } from './CrewDashboard';
import { useConditions, isDark } from './conditions';
import { font } from './parts';
import type { StopId, Trip, Weather } from '../types';

// Store skjermer (iPad og PC): to dashbord ved siden av hverandre, og man sveiper mellom dem.
// Side 0 er for passasjerer, side 1 er fergedisplayet for mannskapet.

const PAGES = ['Passasjer', 'Ferge'];
const PAGE_KEY = 'vf_dashside';
const NIGHT_KEY = 'vf_nattmodus';

function read(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* privat modus */ }
}

export function Dashboards({ from, to, weather, animate, texture, onChooseStop, onSwap, onOpenWeather, onOpenSettings }: {
  from: StopId; to: StopId; weather: Weather | null; animate: boolean; texture: boolean;
  onChooseStop: (which: 'from' | 'to', s: StopId) => void; onSwap: () => void; onOpenWeather: () => void; onOpenSettings: () => void;
}) {
  const conditions = useConditions();
  const pager = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(() => (read(PAGE_KEY, '0') === '1' ? 1 : 0));
  const pageRef = useRef(page);
  pageRef.current = page;
  const [mode, setMode] = useState<NightMode>(() => read(NIGHT_KEY, 'auto') as NightMode);
  const [dark, setDark] = useState(() => isDark());
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const id = setInterval(() => setDark(isDark()), 60_000);
    return () => clearInterval(id);
  }, []);
  const night = mode === 'natt' || (mode === 'auto' && dark);

  // Start på siden man var på sist, og bli der når skjermen snus
  useLayoutEffect(() => {
    const el = pager.current;
    if (el) el.scrollLeft = page * el.clientWidth;
    const onResize = () => { if (pager.current) pager.current.scrollLeft = pageRef.current * pager.current.clientWidth; };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = pager.current;
    if (!el) return;
    const p = Math.round(el.scrollLeft / el.clientWidth);
    if (p !== pageRef.current) { setPage(p); write(PAGE_KEY, String(p)); }
  };
  const go = (p: number) => pager.current?.scrollTo({ left: p * pager.current.clientWidth, behavior: 'smooth' });
  const switchNight = page === 1 && night;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--deep)', backgroundImage: 'linear-gradient(160deg, var(--deep), color-mix(in srgb, var(--deep2) 55%, var(--deep)))' }}>
      <div ref={pager} onScroll={onScroll} className="dash-pager" style={{ display: 'flex', width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain' }}>
        <section style={{ flex: '0 0 100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
          <PassengerDashboard from={from} to={to} weather={weather} conditions={conditions}
            onChooseStop={onChooseStop} onSwap={onSwap} onOpenTrip={setTrip} onOpenWeather={onOpenWeather} onOpenSettings={onOpenSettings} />
        </section>
        <section style={{ flex: '0 0 100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
          <CrewDashboard conditions={conditions} active={page === 1} night={night} mode={mode} onMode={m => { setMode(m); write(NIGHT_KEY, m); }} />
        </section>
      </div>

      {/* Valg av side nederst på midten; sveip fungerer også */}
      <div style={{ position: 'absolute', left: '50%', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', transform: 'translateX(-50%)', display: 'flex', gap: 4, padding: 4, borderRadius: 99, background: switchNight ? 'rgba(212,81,63,0.08)' : 'rgba(255,255,255,0.08)', border: `1px solid ${switchNight ? 'rgba(212,81,63,0.25)' : 'rgba(255,255,255,0.14)'}`, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        {PAGES.map((name, i) => (
          <button key={name} onClick={() => go(i)} aria-pressed={page === i} style={{ padding: '7px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, background: page === i ? (switchNight ? NIGHT_VARS['--accent2'] : 'var(--accentOnDeep)') : 'transparent', color: page === i ? (switchNight ? '#070303' : 'var(--deep)') : (switchNight ? NIGHT_VARS['--onDeepDim'] : 'var(--onDeepDim)') }}>
            {name}
          </button>
        ))}
      </div>

      {/* Detaljer for en avgang, som et panel over dashbordet */}
      {trip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setTrip(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,24,0.55)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', width: 'min(430px, 94vw)', maxHeight: 'min(860px, 92dvh)', overflowY: 'auto', borderRadius: 28, background: 'var(--surface)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', transform: 'translateZ(0)' }}>
            <DetailScreen trip={trip} from={from} animate={animate} texture={texture} onBack={() => setTrip(null)} tick={0} />
          </div>
        </div>
      )}
    </div>
  );
}

// Store skjermer: iPad (begge veier) og PC. Telefoner, også liggende, får vanlig visning.
const WIDE = '(min-width: 900px) and (min-height: 600px), (min-width: 700px) and (min-height: 900px)';
export function useWideScreen(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}
