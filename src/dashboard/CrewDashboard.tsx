import React, { useEffect, useRef } from 'react';
import { Icon } from '../components/Icons';
import { NumTime, Label } from '../components/Atoms';
import { seasonLoops, dayTypeOf, parseTime, stopsMap, ferryName, fmtCountdown } from '../ferryData';
import { compass, osloHm, sunTimes, yrSymbolToCode, type Conditions } from './conditions';
import { weatherProps } from '../components/Icons';
import { Card, MapCard, AlertPill, activeAlerts, useNow, useWakeLock, useWindowSize, dateLine, font } from './parts';
import type { FerryLoop } from '../data';
import type { StopId } from '../types';

// Fergedisplay for mannskapet: stor klokke, dagens rundturer, vind og sjø. Laget for å stå fremme i styrhuset,
// med nattmodus (rødt og dempet, så nattsynet bevares) og skjermen holdt på.

export type NightMode = 'auto' | 'dag' | 'natt';

// Nattfarger: rødt på svart, samme variabler som resten av appen
export const NIGHT_VARS: Record<string, string> = {
  '--deep': '#070303', '--deep2': '#140707', '--onDeep': '#d4513f', '--onDeepDim': 'rgba(212,81,63,0.55)',
  '--accentOnDeep': '#e36450', '--accent2': '#8f3226', '--warn': '#c4472f', '--bad': '#c4472f',
  '--alertBg': 'rgba(212,81,63,0.14)', '--alertFg': '#e36450',
};

const FIELDS: { key: keyof FerryLoop; stop: StopId }[] = [
  { key: 'tenvikUt', stop: 'tenvik' }, { key: 'vestgardenUt', stop: 'vestgarden' }, { key: 'tangenVia', stop: 'tangen' },
  { key: 'engoUt', stop: 'engo' }, { key: 'tangenUt', stop: 'tangen' }, { key: 'tangenInn', stop: 'tangen' },
  { key: 'engoInn', stop: 'engo' }, { key: 'vestgardenInn', stop: 'vestgarden' }, { key: 'tenvikInn', stop: 'tenvik' },
];
const ENGO_PART: (keyof FerryLoop)[] = ['tangenVia', 'engoUt', 'engoInn'];

function todaysLoops(now: Date): FerryLoop[] {
  const all = seasonLoops(now);
  const loops = { monfri: all.monFri, sat: all.sat, sun: all.sun }[dayTypeOf(now)];
  const first = (l: FerryLoop) => Math.min(...FIELDS.map(f => l[f.key]).filter((t): t is string => typeof t === 'string').map(parseTime));
  return [...loops].filter(l => isFinite(first(l))).sort((a, b) => first(a) - first(b));
}

// Kolonnene som brukes i dag. Tangen inn og ut slås sammen når de alltid er like.
function columns(loops: FerryLoop[]) {
  let cols = FIELDS.filter(f => loops.some(l => l[f.key]));
  const sameTangen = loops.every(l => !l.tangenUt || !l.tangenInn || l.tangenUt === l.tangenInn);
  if (sameTangen) cols = cols.filter(c => c.key !== 'tangenInn');
  return { cols, cell: (l: FerryLoop, key: keyof FerryLoop) => (key === 'tangenUt' && sameTangen ? l.tangenUt ?? l.tangenInn : l[key]) as string | null | undefined };
}

const times = (l: FerryLoop) => FIELDS.map(f => l[f.key]).filter((t): t is string => typeof t === 'string').map(parseTime);

// Neste avgang fra en kai, med hvor den går (siste anløp i en rundtur er en ankomst, ikke en avgang).
// Avganger som bare går ved bestilling (bestillingsturer og Engø-delen av røde turer) holdes for seg,
// så skjermen viser neste faste avgang og eventuelt en bestillingsavgang før den.
interface Dep { stop: StopId; to: StopId; time: string }
function nextDepartures(loops: FerryLoop[], nowMin: number): { fixed: Dep | null; optional: Dep | null } {
  let fixed: Dep | null = null, optional: Dep | null = null;
  for (const l of loops) {
    // anløp i rekkefølge; Tangen ut og inn rett etter hverandre er ett anløp med avgang på det siste klokkeslettet
    const calls: { stop: StopId; time: string }[] = [];
    for (const f of FIELDS) {
      const t = l[f.key];
      if (typeof t !== 'string') continue;
      if (calls.length && calls[calls.length - 1].stop === f.stop) calls[calls.length - 1].time = t;
      else calls.push({ stop: f.stop, time: t });
    }
    calls.slice(0, -1).forEach((c, i) => {
      const time = c.time;
      if (parseTime(time) < Math.floor(nowMin)) return;
      const dep = { stop: c.stop, to: calls[i + 1].stop, time };
      const opt = l.rowType === 'booking' || (l.rowType === 'engo' && (c.stop === 'engo' || calls[i + 1].stop === 'engo'));
      if (opt) { if (!optional || time < optional.time) optional = dep; }
      else if (!fixed || time < fixed.time) fixed = dep;
    });
  }
  const o = optional as Dep | null, fx = fixed as Dep | null;
  return { fixed: fx, optional: o && (!fx || o.time < fx.time) ? o : null };
}

const BEAUFORT: [number, string][] = [[0.3, 'stille'], [1.6, 'flau vind'], [3.4, 'svak vind'], [5.5, 'lett bris'], [8, 'laber bris'], [10.8, 'frisk bris'], [13.9, 'liten kuling'], [17.2, 'stiv kuling'], [20.8, 'sterk kuling'], [24.5, 'liten storm'], [28.5, 'full storm'], [32.7, 'sterk storm']];
const beaufort = (ms: number) => BEAUFORT.find(([limit]) => ms < limit)?.[1] ?? 'orkan';

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ minWidth: 0, padding: '9px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
      <Label style={{ fontSize: 9 }}>{label}</Label>
      <div style={{ marginTop: 3, fontFamily: font, fontWeight: 700, fontSize: 19, color: 'var(--onDeep)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontFamily: font, fontSize: 11, color: 'var(--onDeepDim)', marginTop: 1, lineHeight: 1.3 }}>{sub}</div>}
    </div>
  );
}

export function CrewDashboard({ conditions, active, night, mode, onMode }: {
  conditions: Conditions | null; active: boolean; night: boolean; mode: NightMode; onMode: (m: NightMode) => void;
}) {
  const now = useNow();
  const { w, h } = useWindowSize();
  const portrait = h > w;
  useWakeLock(active);
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const loops = todaysLoops(now);
  const { cols, cell } = columns(loops);
  const { fixed: next, optional: before } = nextDepartures(loops, nowMin);
  const alerts = activeAlerts(conditions?.alerts);
  const wx = conditions?.weather;
  const ocean = conditions?.ocean;
  const water = conditions?.water;
  const sun = sunTimes(now);
  const nowMs = Date.now();
  const sunNext = sun.rise && sun.rise.getTime() > nowMs ? { label: 'Soloppgang', t: sun.rise } : sun.set && sun.set.getTime() > nowMs ? { label: 'Solnedgang', t: sun.set } : { label: 'Soloppgang', t: sunTimes(new Date(now.getTime() + 86400000)).rise };

  // Hold raden for turen som pågår synlig i tabellen
  const currentRow = useRef<HTMLTableRowElement>(null);
  const currentId = loops.find(l => { const t = times(l); return Math.max(...t) >= nowMin; })?.id;
  useEffect(() => { currentRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [currentId]);

  const hours = (wx?.hours ?? []).slice(0, 8);
  const maxWind = Math.max(15, ...hours.map(x => x.gust ?? x.wind ?? 0));
  const nextMins = next ? Math.max(0, Math.round(parseTime(next.time) - nowMin)) : null;
  const modeLabel = { auto: 'Auto', dag: 'Dag', natt: 'Natt' }[mode];

  const table = (
    <Card style={{ gridArea: 't', padding: '14px 12px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 6px 8px' }}>
        <Label style={{ fontSize: 10 }}>Rundturer i dag</Label>
        <span style={{ fontFamily: font, fontSize: 11.5, color: 'var(--onDeepDim)' }}>Røde anløp går bare ved bestilling</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: font, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>{cols.map(c => <th key={c.key} style={{ position: 'sticky', top: 0, background: 'var(--deep)', textAlign: 'left', padding: '4px 8px 8px', fontWeight: 600, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--onDeepDim)' }}>{stopsMap[c.stop]}</th>)}<th style={{ position: 'sticky', top: 0, background: 'var(--deep)' }} /></tr>
          </thead>
          <tbody>
            {loops.map(l => {
              const t = times(l);
              const done = Math.max(...t) < nowMin - 1;
              const current = l.id === currentId;
              const booking = l.rowType === 'booking';
              return (
                <tr key={l.id} ref={current ? currentRow : undefined} style={{ opacity: done ? 0.38 : 1, background: current ? 'color-mix(in srgb, var(--accentOnDeep) 16%, transparent)' : 'transparent' }}>
                  {cols.map((c, i) => {
                    const v = cell(l, c.key);
                    const red = booking || (l.rowType === 'engo' && ENGO_PART.includes(c.key));
                    return (
                      <td key={c.key} style={{ padding: '8px 8px', borderTop: '1px solid rgba(255,255,255,0.07)', fontWeight: 600, fontSize: 17, color: v ? (red ? 'color-mix(in srgb, var(--bad) 45%, white)' : 'var(--onDeep)') : 'var(--onDeepDim)', borderRadius: current ? (i === 0 ? '10px 0 0 10px' : undefined) : undefined }}>
                        {v ?? '–'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 8px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'color-mix(in srgb, var(--bad) 45%, white)', whiteSpace: 'nowrap', borderRadius: current ? '0 10px 10px 0' : undefined }}>
                    {booking ? 'bestilling' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loops.length && <div style={{ padding: 12, fontFamily: font, color: 'var(--onDeepDim)' }}>Ingen rundturer i dag</div>}
      </div>
    </Card>
  );

  const wind = (
    <Card style={{ gridArea: 'w' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Label style={{ fontSize: 10 }}>Vind ved Veierland</Label>
        <span style={{ fontFamily: font, fontSize: 11, color: 'var(--onDeepDim)' }}>MET Norge</span>
      </div>
      {wx ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
            <svg width="62" height="62" viewBox="-32 -32 64 64" style={{ flexShrink: 0 }} aria-label={`Vind fra ${compass(wx.now.dir)}`}>
              <circle r="29" fill="none" stroke="var(--onDeepDim)" strokeWidth="1.5" />
              {/* pila peker dit vinden blåser */}
              <path d="M0,-21 L9,11 L0,5 L-9,11 Z" fill="var(--onDeep)" transform={`rotate(${(wx.now.dir ?? 0) + 180})`} />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 50, lineHeight: 1, color: 'var(--onDeep)' }}>
                {Math.round(wx.now.wind ?? 0)}<span style={{ fontSize: 17, fontWeight: 600, color: 'var(--onDeepDim)' }}> m/s fra {compass(wx.now.dir)}</span>
              </div>
              <div style={{ fontFamily: font, fontWeight: 600, fontSize: 14, color: 'var(--onDeepDim)', marginTop: 6 }}>
                {beaufort(wx.now.wind ?? 0)}{wx.now.gust != null ? ` · vindkast ${Math.round(wx.now.gust)} m/s` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 92, marginTop: 14 }}>
            {hours.map(x => {
              const windH = ((x.wind ?? 0) / maxWind) * 70, gustH = (Math.max(0, (x.gust ?? 0) - (x.wind ?? 0)) / maxWind) * 70;
              return (
                <div key={x.time} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: font }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--onDeep)', marginBottom: 2 }}>{Math.round(x.wind ?? 0)}</span>
                  <div style={{ width: '100%', height: gustH, background: 'color-mix(in srgb, var(--accentOnDeep) 55%, transparent)', borderRadius: '4px 4px 0 0' }} />
                  <div style={{ width: '100%', height: windH, background: (x.wind ?? 0) >= 10.8 ? 'var(--bad)' : 'var(--accent2)', borderRadius: gustH ? 0 : '4px 4px 0 0' }} />
                  <span style={{ fontSize: 10.5, color: 'var(--onDeepDim)', marginTop: 4 }}>{osloHm(x.time).slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontFamily: font, fontSize: 10.5, color: 'var(--onDeepDim)' }}>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--accent2)', marginRight: 5 }} />vind</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'color-mix(in srgb, var(--accentOnDeep) 55%, transparent)', marginRight: 5 }} />vindkast</span>
            {hours.some(x => (x.wind ?? 0) >= 10.8) && <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--bad)', marginRight: 5 }} />kuling (fra 11 m/s)</span>}
          </div>
        </>
      ) : <div style={{ marginTop: 12, fontFamily: font, color: 'var(--onDeepDim)' }}>Henter vær …</div>}
    </Card>
  );

  const wp = weatherProps(yrSymbolToCode(wx?.now.symbol));
  const fog = wx?.now.fog;
  const sea = (
    <Card style={{ gridArea: 's' }}>
      <Label style={{ fontSize: 10 }}>Sjø og lys</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <Tile label="Bølger" value={ocean?.waveHeight != null ? `${ocean.waveHeight.toFixed(1).replace('.', ',')} m` : '–'} sub={ocean?.waveFrom != null ? `fra ${compass(ocean.waveFrom)}` : undefined} />
        <Tile label="Sjøtemperatur" value={ocean?.seaTemp != null ? `${Math.round(ocean.seaTemp)} °C` : '–'} />
        <Tile label="Vannstand" value={water ? `${water.cm > 0 ? '+' : ''}${water.cm} cm` : '–'} sub={water ? `${water.trend} (mot middelvann)` : undefined} />
        <Tile label="Sikt" value={fog == null ? '–' : fog >= 60 ? 'Tåke' : fog >= 25 ? 'Mulig tåke' : 'God'} />
        <Tile label="Luft" value={wx?.now.temp != null ? `${Math.round(wx.now.temp)} °C` : '–'} sub={wx ? `${wp.text}${wx.now.precip ? ` · ${wx.now.precip.toString().replace('.', ',')} mm/t` : ''}` : undefined} />
        <Tile label={sunNext.label} value={osloHm(sunNext.t)} />
      </div>
    </Card>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px calc(env(safe-area-inset-bottom, 0px) + 60px)', background: night ? '#070303' : undefined, ...(night ? NIGHT_VARS : {}) as React.CSSProperties }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <NumTime size={portrait ? 84 : 96} color="var(--onDeep)">{now.toTimeString().slice(0, 5)}</NumTime>
            <NumTime size={portrait ? 40 : 46} color="var(--onDeepDim)" style={{ marginLeft: 4 }}>:{now.toTimeString().slice(6, 8)}</NumTime>
          </div>
          <Label style={{ fontSize: 10, display: 'block', marginTop: 6 }}>{dateLine(now)} · {ferryName(now)}</Label>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {alerts.slice(0, 2).map(a => <React.Fragment key={a.title}><AlertPill a={a} big /></React.Fragment>)}
          {!alerts.length && <span style={{ fontFamily: font, fontSize: 13, color: 'var(--onDeepDim)' }}>Ingen farevarsler fra MET</span>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <Label style={{ fontSize: 10 }}>Neste avgang</Label>
          <div style={{ fontFamily: font, fontWeight: 700, fontSize: 30, color: 'var(--onDeep)', marginTop: 2 }}>{next ? `${stopsMap[next.stop]} ${next.time}` : 'Ingen flere i dag'}</div>
          {next && nextMins != null && <div style={{ fontFamily: font, fontWeight: 700, fontSize: 15, color: 'var(--accentOnDeep)' }}>{nextMins < 1 ? 'nå' : `om ${fmtCountdown(nextMins)}`} · til {stopsMap[next.to]}</div>}
          {before && <div style={{ fontFamily: font, fontWeight: 600, fontSize: 12.5, color: 'var(--onDeepDim)', marginTop: 3 }}>Før det ved bestilling: {stopsMap[before.stop]} {before.time} til {stopsMap[before.to]}</div>}
        </div>
        <button onClick={() => onMode(mode === 'auto' ? 'natt' : mode === 'natt' ? 'dag' : 'auto')} aria-label={`Nattmodus: ${modeLabel}`} title="Nattmodus: Auto (etter solen), Natt eller Dag"
          style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 11, color: 'var(--onDeep)' }}>
          <Icon name={night ? 'moon' : 'sun'} size={20} color="var(--onDeep)" stroke={1.9} />
          {modeLabel}
        </button>
      </header>

      <div style={{
        flex: 1, minHeight: 0, display: 'grid', gap: 14,
        gridTemplateColumns: portrait ? '1fr 1fr' : '1.25fr 1fr 0.95fr',
        gridTemplateRows: portrait ? 'auto 1fr' : 'auto 1fr',
        gridTemplateAreas: portrait ? '"w s" "t m"' : '"t m w" "t m s"',
      }}>
        {table}
        <MapCard vesselsKey="vf_batar_ferge" vesselsDefault style={{ gridArea: 'm' }} />
        {wind}
        {sea}
      </div>
    </div>
  );
}
