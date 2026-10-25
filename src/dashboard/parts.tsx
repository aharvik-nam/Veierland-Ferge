import React, { useEffect, useRef, useState } from 'react';
import { Label, NumTime } from '../components/Atoms';
import { Icon, weatherProps } from '../components/Icons';
import { MapSvg, TimeCells, VesselToggle, useVessels } from '../components/MapView';
import { useFerryPosition, ferryStatus, ageLabel } from '../components/FerryLive';
import { getOsloDate, ymd, isMaintenancePeriod } from '../ferryData';
import { useLiveTrack } from '../liveDelay';
import { mapTimes } from '../mapTimes';
import { usePunctuality, overallPunctuality } from '../punctuality';
import { yrSymbolToCode, compass, osloHm, type Alert, type HourWeather } from './conditions';
import type { StopId } from '../types';

// Felles byggeklosser for dashbordene på store skjermer (iPad og PC).

export const font = "'Space Grotesk', sans-serif";

export function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', borderRadius: 'var(--rad)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', ...style }}>
      {children}
    </div>
  );
}

// Klokka i norsk tid, oppdatert hvert sekund
export function useNow(): Date {
  const [now, setNow] = useState(getOsloDate);
  useEffect(() => {
    const id = setInterval(() => setNow(getOsloDate()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function useWindowSize(): { w: number; h: number } {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
}

// Holder skjermen på mens fergedisplayet vises (der nettleseren støtter det)
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (!active || !wl) return;
    let lock: { release: () => Promise<void> } | null = null;
    let alive = true;
    const request = () => wl.request('screen').then(l => { if (alive) lock = l; else l.release(); }).catch(() => {});
    request();
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); lock?.release().catch(() => {}); };
  }, [active]);
}

const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
export function dateLine(d: Date): string {
  const s = `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// showTimes=false: uten feltene «Gikk fra / Ankommer» (tidene står likevel ved kaiene i kartet), så kartet får mer plass
export function MapCard({ vesselsKey, vesselsDefault = false, showTimes = true, style }: { vesselsKey: string; vesselsDefault?: boolean; showTimes?: boolean; style?: React.CSSProperties }) {
  const pos = useFerryPosition();
  const now = getOsloDate();
  const humla = isMaintenancePeriod(now);
  const stops: StopId[] = humla ? ['tenvik', 'tangen', 'engo'] : ['tenvik', 'vestgarden', 'tangen', 'engo'];
  const status = pos ? ferryStatus(pos, stops, humla) : null;
  const track = useLiveTrack(true);
  const times = pos ? mapTimes(track, pos, status?.target ?? null) : [];
  const [showOthers, setShowOthers] = useState(() => { try { const v = localStorage.getItem(vesselsKey); return v == null ? vesselsDefault : v === '1'; } catch { return vesselsDefault; } });
  useEffect(() => { try { localStorage.setItem(vesselsKey, showOthers ? '1' : '0'); } catch { /* privat modus */ } }, [vesselsKey, showOthers]);
  const others = useVessels(showOthers);
  const age = pos ? ageLabel(pos.time) : null;
  const moving = pos?.sog != null && pos.sog >= 1.5;
  // Kartboksens proporsjoner, så utsnittet kan sentreres på ruta
  const box = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState<number | undefined>();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (el.clientHeight) setAspect(el.clientWidth / el.clientHeight); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Card style={{ padding: 12, ...style }}>
      {/* én linje: «FERGA NÅ  På vei mot Tangen · 6 knop», så kartet får mest mulig høyde */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '2px 4px 10px' }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 10, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <Label style={{ fontSize: 9.5, flexShrink: 0 }}>Ferga nå</Label>
          <span style={{ fontFamily: font, fontWeight: 700, fontSize: 16, color: 'var(--onDeep)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {status?.text ?? 'Henter posisjon …'}{moving && <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--onDeepDim)' }}> · {pos!.sog!.toFixed(0)} knop</span>}
          </span>
        </div>
        {age && <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: font, fontSize: 11.5, color: age.stale ? 'color-mix(in srgb, var(--warn) 55%, white)' : 'var(--onDeepDim)' }}><Icon name="clock" size={12} color="currentColor" stroke={2} />{age.short}</span>}
      </div>
      {showTimes && <TimeCells times={times} style={{ marginBottom: 10 }} />}
      <div style={{ position: 'relative', flex: 1, minHeight: 160, borderRadius: 'var(--radSm)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div ref={box} style={{ position: 'absolute', inset: 0 }}>
          <MapSvg fill aspect={aspect} pos={pos} trail={track?.trail} tags={new Map(times.map(c => [c.stop, c.tag]))} humla={humla} vessels={others.vessels} />
        </div>
        <VesselToggle on={showOthers} count={others.vessels.length} error={others.error} onToggle={() => setShowOthers(v => !v)} />
        <div style={{ position: 'absolute', right: 6, bottom: 6, padding: '2px 7px', borderRadius: 6, background: 'color-mix(in srgb, var(--deep) 70%, transparent)', fontFamily: font, fontSize: 9.5, color: 'var(--onDeepDim)' }}>© OpenStreetMap-bidragsytere · AIS: BarentsWatch</div>
      </div>
    </Card>
  );
}

// Været de neste timene: klokkeslett, symbol, temperatur og vind
export function WeatherHours({ hours, count = 8, onOpen, style }: { hours: HourWeather[]; count?: number; onOpen?: () => void; style?: React.CSSProperties }) {
  const list = hours.slice(0, count);
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Card style={{ padding: 0, ...style }}>
      <Tag onClick={onOpen} style={{ display: 'block', width: '100%', padding: '14px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: onOpen ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label style={{ fontSize: 10 }}>Vær · Veierland</Label>
          <span style={{ fontFamily: font, fontSize: 11, color: 'var(--onDeepDim)' }}>MET Norge</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${list.length || 1}, 1fr)`, gap: 4, marginTop: 10, textAlign: 'center' }}>
          {list.map(h => {
            const wp = weatherProps(yrSymbolToCode(h.symbol));
            return (
              <div key={h.time} style={{ fontFamily: font, color: 'var(--onDeep)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--onDeepDim)' }}>{osloHm(h.time).slice(0, 2)}</div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0 3px' }}><Icon name={wp.name} size={20} color="var(--onDeep)" stroke={1.8} /></div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{h.temp != null ? `${Math.round(h.temp)}°` : '–'}</div>
                <div style={{ fontSize: 11, color: 'var(--onDeepDim)', marginTop: 2, whiteSpace: 'nowrap' }}>{h.wind != null ? `${Math.round(h.wind)} ${compass(h.dir)}` : ''}</div>
              </div>
            );
          })}
        </div>
      </Tag>
    </Card>
  );
}

// Én linje til kortet «Verdt å vite»: «91 % av avgangene gikk i rute siste 8 dager»
export function PunctualityLine() {
  const p = overallPunctuality(usePunctuality());
  if (!p) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', fontFamily: font, fontSize: 12.5, color: 'var(--onDeep)' }}>
      <NumTime size={24} color="var(--onDeep)">{p.pct} %</NumTime>
      <span style={{ color: 'var(--onDeepDim)', lineHeight: 1.3 }}>av avgangene gikk innen 3 min av rutetiden siste {p.days} dager</span>
    </div>
  );
}

// Farevarsler fra MET som gjelder nå eller senere i dag
export function activeAlerts(alerts: Alert[] | undefined): Alert[] {
  const now = Date.now();
  return (alerts ?? []).filter(a => !a.to || Date.parse(a.to) > now);
}

function when(a: Alert): string {
  const today = ymd(getOsloDate());
  const fmt = (s: string | null) => {
    if (!s) return '';
    const d = new Date(s);
    const day = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
    const wd = d.toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo', weekday: 'short' }).replace('.', '');
    return `${day === today ? '' : wd + ' '}${osloHm(d)}`;
  };
  return a.from && Date.parse(a.from) > Date.now() ? `fra ${fmt(a.from)}` : a.to ? `til ${fmt(a.to)}` : '';
}

const LEVEL = { yellow: { bg: 'color-mix(in srgb, #e8b33a 22%, transparent)', fg: '#ffd77a', no: 'gult' }, orange: { bg: 'color-mix(in srgb, #f08a2c 26%, transparent)', fg: '#ffb877', no: 'oransje' }, red: { bg: 'color-mix(in srgb, #e5484d 28%, transparent)', fg: '#ff9a9d', no: 'rødt' } };

export function AlertPill({ a, big = false }: { a: Alert; big?: boolean }) {
  const l = LEVEL[a.level];
  return (
    <div title={a.description} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: big ? '10px 14px' : '8px 12px', borderRadius: 12, background: `var(--alertBg, ${l.bg})`, color: `var(--alertFg, ${l.fg})`, fontFamily: font, fontWeight: 700, fontSize: big ? 14 : 12.5, lineHeight: 1.3 }}>
      <Icon name="alert" size={big ? 16 : 14} color="currentColor" stroke={2.2} style={{ flexShrink: 0 }} />
      <span>{a.name}, {l.no} nivå · {a.area} · {when(a)}</span>
    </div>
  );
}

// Meldinger fra admin-panelet (samme som på forsiden i appen)
export function useAdminNotices(): { id: string; text: string; type: string }[] {
  const [list, setList] = useState<{ id: string; text: string; type: string }[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem('vf_notices') ?? '[]');
        if (Array.isArray(parsed)) setList(parsed.filter((n: { active?: boolean }) => n.active));
      } catch { /* ugyldig */ }
    };
    read();
    const id = setInterval(read, 60_000);
    return () => clearInterval(id);
  }, []);
  return list;
}

export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' }) {
  const warn = tone === 'warning';
  return (
    <div style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 12, background: warn ? 'color-mix(in srgb, var(--bad) 18%, transparent)' : 'color-mix(in srgb, var(--accentOnDeep) 14%, transparent)', color: warn ? 'color-mix(in srgb, var(--bad) 40%, white)' : 'var(--accentOnDeep)', fontFamily: font, fontWeight: 600, fontSize: 12.5, lineHeight: 1.4 }}>
      <Icon name={warn ? 'alert' : 'info'} size={14} color="currentColor" stroke={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{text}</span>
    </div>
  );
}
