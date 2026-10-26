import React from 'react';
import { Icon, weatherProps, type IconName } from '../components/Icons';
import { NumTime, Label } from '../components/Atoms';
import { useFerryPosition, ferryStatus } from '../components/FerryLive';
import { stopsMap, ferryName, fmtCountdown, isMaintenancePeriod } from '../ferryData';
import { upcomingCalls, hhmm } from '../mapTimes';
import { compass, osloHm, sunTimes, yrSymbolToCode, type Conditions } from './conditions';
import { Card, MapCard, AlertPill, activeAlerts, useNow, useWakeLock, useWindowSize, dateLine, font } from './parts';
import type { StopId } from '../types';

// Fergedisplay for mannskapet. Det viktigste: hvor ferga er (stort kart), de neste anløpene, vind og vær,
// og farevarsler. Laget for å stå fremme i styrhuset, med nattmodus (rødt og dempet, så nattsynet bevares)
// og skjermen holdt på.

export type NightMode = 'auto' | 'dag' | 'natt';

// Nattfarger: rødt på svart, samme variabler som resten av appen
export const NIGHT_VARS: Record<string, string> = {
  '--deep': '#070303', '--deep2': '#140707', '--onDeep': '#d4513f', '--onDeepDim': 'rgba(212,81,63,0.72)',
  '--accentOnDeep': '#e36450', '--accent2': '#8f3226', '--warn': '#c4472f', '--bad': '#c4472f',
  '--alertBg': 'rgba(212,81,63,0.14)', '--alertFg': '#e36450',
};

const BEAUFORT: [number, string][] = [[0.3, 'stille'], [1.6, 'flau vind'], [3.4, 'svak vind'], [5.5, 'lett bris'], [8, 'laber bris'], [10.8, 'frisk bris'], [13.9, 'liten kuling'], [17.2, 'stiv kuling'], [20.8, 'sterk kuling'], [24.5, 'liten storm'], [28.5, 'full storm'], [32.7, 'sterk storm']];
const beaufort = (ms: number) => BEAUFORT.find(([limit]) => ms < limit)?.[1] ?? 'orkan';
const KULING = 10.8; // liten kuling fra 10,8 m/s

function Tile({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon?: IconName }) {
  return (
    <div style={{ minWidth: 0, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}><Icon name={icon} size={15} color="var(--onDeep)" stroke={1.8} /></div>}
      <Label style={{ fontSize: 9 }}>{label}</Label>
      <div style={{ marginTop: 3, fontFamily: font, fontWeight: 700, fontSize: 19, color: 'var(--onDeep)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontFamily: font, fontSize: 11, color: 'var(--onDeepDim)', marginTop: 1, lineHeight: 1.3 }}>{sub}</div>}
    </div>
  );
}

// De neste anløpene i rekkefølge, det første med beregnet ankomst når ferga er underveis
function NextCalls({ count, style }: { count: number; style?: React.CSSProperties }) {
  const pos = useFerryPosition();
  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const humla = isMaintenancePeriod(now);
  const stops: StopId[] = humla ? ['tenvik', 'tangen', 'engo'] : ['tenvik', 'vestgarden', 'tangen', 'engo'];
  const status = pos ? ferryStatus(pos, stops, humla) : null;
  const calls = upcomingCalls(pos, status?.target ?? null, count);

  return (
    <Card style={{ padding: '14px 12px 8px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 6px 6px' }}>
        <Label style={{ fontSize: 10 }}>Neste anløp</Label>
        <span style={{ fontFamily: font, fontSize: 11.5, color: 'var(--onDeepDim)' }}>rutetid</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {calls.map((c, i) => {
          const first = i === 0;
          const late = c.eta != null ? Math.round(c.eta - c.arr) : null;
          const mins = Math.round((c.eta ?? c.arr) - nowMin);
          const time = c.dep - c.arr >= 2 ? `${hhmm(c.arr)}–${hhmm(c.dep)}` : hhmm(c.arr);
          return (
            <div key={`${c.stop}${c.arr}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: first ? '11px 10px' : '8px 10px', marginBottom: 2, borderRadius: 12, background: first ? 'color-mix(in srgb, var(--accentOnDeep) 15%, transparent)' : 'transparent', opacity: c.optional ? 0.75 : 1 }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, flexShrink: 0, background: first ? 'var(--accentOnDeep)' : 'transparent', border: `2px solid ${first ? 'var(--accentOnDeep)' : 'var(--onDeepDim)'}` }} />
              <span style={{ fontFamily: font, fontWeight: 700, fontSize: first ? 21 : 17, color: 'var(--onDeep)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stopsMap[c.stop]}
                {c.optional && <span style={{ fontWeight: 600, fontSize: 12, color: 'color-mix(in srgb, var(--bad) 45%, white)' }}> · ved bestilling</span>}
              </span>
              <span style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ display: 'block', fontFamily: font, fontWeight: 700, fontSize: first ? 21 : 17, color: 'var(--onDeep)', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
                {first && (
                  <span style={{ display: 'block', fontFamily: font, fontWeight: 700, fontSize: 12, color: late != null && late > 2 ? 'color-mix(in srgb, var(--warn) 55%, white)' : 'var(--accentOnDeep)' }}>
                    {c.eta != null ? `ca. ${hhmm(c.eta)}${late != null && late > 2 ? ` · ${late} min etter` : ''}` : mins > 0 ? `om ${fmtCountdown(mins)}` : 'nå'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {!calls.length && <div style={{ padding: 10, fontFamily: font, fontSize: 14, color: 'var(--onDeepDim)' }}>Ingen flere anløp i dag</div>}
      </div>
    </Card>
  );
}

export function CrewDashboard({ conditions, active, night, mode, onMode }: {
  conditions: Conditions | null; active: boolean; night: boolean; mode: NightMode; onMode: (m: NightMode) => void;
}) {
  const now = useNow();
  const { w, h } = useWindowSize();
  const portrait = h > w;
  useWakeLock(active);
  const alerts = activeAlerts(conditions?.alerts);
  const wx = conditions?.weather;
  const ocean = conditions?.ocean;
  const water = conditions?.water;
  const sun = sunTimes(now);
  const nowMs = Date.now();
  const sunNext = sun.rise && sun.rise.getTime() > nowMs ? { label: 'Soloppgang', t: sun.rise } : sun.set && sun.set.getTime() > nowMs ? { label: 'Solnedgang', t: sun.set } : { label: 'Soloppgang', t: sunTimes(new Date(now.getTime() + 86400000)).rise };
  const hours = (wx?.hours ?? []).slice(0, 8);
  const maxWind = Math.max(15, ...hours.map(x => x.gust ?? x.wind ?? 0));
  const modeLabel = { auto: 'Auto', dag: 'Dag', natt: 'Natt' }[mode];
  const wp = weatherProps(yrSymbolToCode(wx?.now.symbol));
  const fog = wx?.now.fog;

  const wind = (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Label style={{ fontSize: 10 }}>Vind og vær</Label>
        {wx && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontWeight: 600, fontSize: 13, color: 'var(--onDeep)' }}><Icon name={wp.name} size={16} color="var(--onDeep)" stroke={1.9} />{wx.now.temp != null ? `${Math.round(wx.now.temp)} °C` : ''} · {wp.text}</span>}
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
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 50, lineHeight: 1, color: (wx.now.wind ?? 0) >= KULING ? 'color-mix(in srgb, var(--bad) 45%, white)' : 'var(--onDeep)' }}>
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
                  <div style={{ width: '100%', height: windH, background: (x.wind ?? 0) >= KULING ? 'var(--bad)' : 'var(--accent2)', borderRadius: gustH ? 0 : '4px 4px 0 0' }} />
                  <span style={{ fontSize: 10.5, color: 'var(--onDeepDim)', marginTop: 4 }}>{osloHm(x.time).slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontFamily: font, fontSize: 10.5, color: 'var(--onDeepDim)' }}>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--accent2)', marginRight: 5 }} />vind</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'color-mix(in srgb, var(--accentOnDeep) 55%, transparent)', marginRight: 5 }} />vindkast</span>
            {hours.some(x => (x.wind ?? 0) >= KULING) && <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--bad)', marginRight: 5 }} />kuling (fra 11 m/s)</span>}
          </div>
        </>
      ) : <div style={{ marginTop: 12, fontFamily: font, color: 'var(--onDeepDim)' }}>Henter vær …</div>}
    </Card>
  );

  const sea = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      <Tile icon="wave" label="Bølger" value={ocean?.waveHeight != null ? `${ocean.waveHeight.toFixed(1).replace('.', ',')} m` : '–'} sub={ocean?.waveFrom != null ? `fra ${compass(ocean.waveFrom)}` : undefined} />
      <Tile icon="thermometer" label="Sjøtemp." value={ocean?.seaTemp != null ? `${Math.round(ocean.seaTemp)} °C` : '–'} />
      <Tile icon="tide" label="Vannstand" value={water ? `${water.cm > 0 ? '+' : ''}${water.cm} cm` : '–'} sub={water?.trend} />
      <Tile icon="fog" label="Sikt" value={fog == null ? '–' : fog >= 60 ? 'Tåke' : fog >= 25 ? 'Mulig tåke' : 'God'} />
      <Tile icon="rain" label="Nedbør" value={wx?.now.precip != null ? `${wx.now.precip.toString().replace('.', ',')} mm` : '–'} sub="neste time" />
      <Tile icon="sun" label={sunNext.label} value={osloHm(sunNext.t)} />
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px calc(env(safe-area-inset-bottom, 0px) + 60px)', background: night ? '#070303' : undefined, ...(night ? NIGHT_VARS : {}) as React.CSSProperties }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <NumTime size={portrait ? 60 : 64} color="var(--onDeep)">{now.toTimeString().slice(0, 5)}</NumTime>
            <NumTime size={portrait ? 30 : 32} color="var(--onDeepDim)" style={{ marginLeft: 4 }}>:{now.toTimeString().slice(6, 8)}</NumTime>
          </div>
          <Label style={{ fontSize: 10, display: 'block', marginTop: 6 }}>{dateLine(now)} · {ferryName(now)}</Label>
        </div>
        {/* farevarsler fra MET midt i toppen, så de ikke kan overses */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {alerts.slice(0, 2).map(a => <React.Fragment key={a.title}><AlertPill a={a} big /></React.Fragment>)}
          {!alerts.length && <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: font, fontSize: 13, color: 'var(--onDeepDim)' }}><Icon name="check" size={14} color="currentColor" stroke={2.2} />Ingen farevarsler fra MET</span>}
        </div>
        <button onClick={() => onMode(mode === 'auto' ? 'natt' : mode === 'natt' ? 'dag' : 'auto')} aria-label={`Nattmodus: ${modeLabel}`} title="Nattmodus: Auto (etter solen), Natt eller Dag"
          style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 11, color: 'var(--onDeep)' }}>
          <Icon name={night ? 'moon' : 'sun'} size={20} color="var(--onDeep)" stroke={1.9} />
          {modeLabel}
        </button>
      </header>

      {/* Kartet er størst. Liggende: kart og sjø til venstre, anløp og vind til høyre. Stående: kartet øverst. */}
      {portrait ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
            <MapCard vesselsKey="vf_batar_ferge" vesselsDefault showTimes={false} follow />
            <NextCalls count={8} />
          </div>
          {wind}
          {sea}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <MapCard vesselsKey="vf_batar_ferge" vesselsDefault showTimes={false} follow style={{ flex: 1 }} />
            {sea}
          </div>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <NextCalls count={8} style={{ flex: 1 }} />
            {wind}
          </div>
        </div>
      )}
    </div>
  );
}
