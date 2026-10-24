import React from 'react';
import { CompassMark, Icon } from '../components/Icons';
import { NumTime, WeatherChip, Label } from '../components/Atoms';
import { HumlaNotice } from '../components/HumlaNotice';
import { stopsMap, ferryName } from '../ferryData';
import { useLiveTrack } from '../liveDelay';
import { Card, DepartureColumn, MapCard, WeatherHours, PunctualityLine, AlertPill, Notice, activeAlerts, useAdminNotices, useNow, useWindowSize, dateLine, font } from './parts';
import type { Conditions } from './conditions';
import type { StopId, Trip, Weather } from '../types';

// Dashbord for passasjerer: begge retninger, kartet, været og det som er verdt å vite i dag.

export function PassengerDashboard({ from, to, weather, conditions, onEditFrom, onEditTo, onSwap, onOpenTrip, onOpenWeather, onOpenSettings }: {
  from: StopId; to: StopId; weather: Weather | null; conditions: Conditions | null;
  onEditFrom: () => void; onEditTo: () => void; onSwap: () => void;
  onOpenTrip: (t: Trip) => void; onOpenWeather: () => void; onOpenSettings: () => void;
}) {
  const now = useNow();
  const { w, h } = useWindowSize();
  const portrait = h > w;
  const track = useLiveTrack(true);
  const notices = useAdminNotices();
  const alerts = activeAlerts(conditions?.alerts);
  const pill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 15, color: 'var(--onDeep)' };

  const info = (
    <Card style={{ gap: 8, overflowY: 'auto' }}>
      <Label style={{ fontSize: 10 }}>Verdt å vite</Label>
      <PunctualityLine />
      {alerts.map(a => <React.Fragment key={a.title}><AlertPill a={a} /></React.Fragment>)}
      {notices.map(n => <React.Fragment key={n.id}><Notice text={n.text} tone={n.type === 'warning' ? 'warning' : 'info'} /></React.Fragment>)}
      <HumlaNotice date={now} variant="deep" />
      {!alerts.length && !notices.length && <span style={{ fontFamily: font, fontSize: 13, color: 'var(--onDeepDim)' }}>Ingen varsler i dag.</span>}
    </Card>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 20px calc(env(safe-area-inset-bottom, 0px) + 60px)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CompassMark size={40} color="var(--onDeep)" />
          <div>
            <div style={{ fontFamily: 'var(--num)', fontSize: 34, lineHeight: 1, color: 'var(--onDeep)' }}>Veierland</div>
            <Label style={{ fontSize: 9.5 }}>{ferryName(now)} · ferge</Label>
          </div>
        </div>
        <div style={{ marginLeft: 8 }}>
          <NumTime size={40} color="var(--onDeep)">{now.toTimeString().slice(0, 5)}</NumTime>
          <div style={{ fontFamily: font, fontSize: 11.5, color: 'var(--onDeepDim)', marginTop: 3 }}>{dateLine(now)}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onEditFrom} style={pill}>{stopsMap[from]}<Icon name="chevronDown" size={14} color="var(--onDeepDim)" /></button>
          <button onClick={onSwap} aria-label="Bytt retning" style={{ ...pill, padding: 9 }}><Icon name="swap" size={16} color="var(--onDeep)" /></button>
          <button onClick={onEditTo} style={pill}>{stopsMap[to]}<Icon name="chevronDown" size={14} color="var(--onDeepDim)" /></button>
        </div>
        <WeatherChip weather={weather} onClick={onOpenWeather} />
        <button onClick={onOpenSettings} aria-label="Innstillinger" style={{ ...pill, padding: 10 }}><Icon name="settings" size={18} color="var(--onDeep)" /></button>
      </header>

      {/* Kartet får en høy rute midt i (liggende) eller til venstre (stående), så hele ruta Tenvik–Engø synes */}
      <div style={{
        flex: 1, minHeight: 0, display: 'grid', gap: 14,
        gridTemplateColumns: portrait ? '1.15fr 1fr' : '1fr 1.5fr 1fr',
        gridTemplateRows: portrait ? '1fr 1fr auto' : '1fr auto',
        gridTemplateAreas: portrait ? '"m a" "m b" "w i"' : '"a m b" "w m i"',
      }}>
        <DepartureColumn from={from} to={to} track={track} onOpenTrip={onOpenTrip} style={{ gridArea: 'a' }} />
        <MapCard vesselsKey="vf_batar_passasjer" style={{ gridArea: 'm' }} />
        <DepartureColumn from={to} to={from} track={track} onOpenTrip={onOpenTrip} style={{ gridArea: 'b' }} />
        <WeatherHours hours={conditions?.weather?.hours ?? []} onOpen={onOpenWeather} style={{ gridArea: 'w' }} />
        <div style={{ gridArea: 'i', minHeight: 0, display: 'flex', flexDirection: 'column', maxHeight: 230 }}>{info}</div>
      </div>
    </div>
  );
}
