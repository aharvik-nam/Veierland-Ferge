import { useEffect, useState } from 'react';
import { API_BASE } from './platform';
import { haversineKm, stopCoords, stopsMap, parseTime } from './ferryData';
import { boardingStop } from './punctuality';
import type { StopId, Trip } from './types';

// «Forsinket nå»: dagens anløp fra AIS (/api/ferry-history?live=1) sier om ferga har gått fra kaia ennå.

export interface LiveTrack {
  day: string;
  now: number; // minutter etter midnatt, norsk tid
  latest: { min: number; lat: number; lng: number; sog: number | null; cog: number | null } | null;
  calls: { stop: string; arr: number; dep: number | null }[]; // dep er null mens ferga ligger ved kaia
}

// reason: «Ferga har ikke gått fra Tangen ennå», short: «ca. 6 min forsinket», text: begge deler
export interface LiveDelay { stop: StopId; mins: number; reason: string; short: string; text: string }

function make(stop: StopId, mins: number, reason: string, approx: 'ca.' | 'minst'): LiveDelay {
  const short = `${approx} ${mins} min forsinket`;
  return { stop, mins, reason, short, text: `${reason}, ${short}` };
}

// Hyppig rundt avgangstiden: serveren henter siste posisjon fra BarentsWatch sitt sanntids-API (cache 10 s)
const POLL_MS = 15_000;

// Hentes bare når en avgang er nær, så serveren ikke spørres unødig
export function useLiveTrack(enabled: boolean): LiveTrack | null {
  const [track, setTrack] = useState<LiveTrack | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`${API_BASE}/api/ferry-history?live=1`);
        if (!res.ok) return;
        const data = await res.json() as LiveTrack;
        if (alive && Array.isArray(data.calls)) setTrack(data);
      } catch { /* uten nett */ }
    };
    load();
    const id = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', load); };
  }, [enabled]);
  return enabled ? track : null;
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// Er avgangen forsinket akkurat nå? nowMin = minutter etter midnatt (norsk tid).
export function liveDelay(track: LiveTrack | null, trip: Trip | null, nowMin: number): LiveDelay | null {
  const board = trip && boardingStop(trip);
  if (!track?.latest || !trip || !board || trip.dateStr !== track.day) return null;
  if (nowMin - track.latest.min > 4) return null; // for gammel posisjon til å si noe sikkert
  const p = parseTime(board.time);
  if (nowMin < p - 20 || nowMin > p + 15) return null;

  const stop = board.stop, name = stopsMap[stop];
  const atStop = track.calls.filter(c => c.stop === stop);
  if (atStop.some(c => c.dep != null && c.dep >= p - 5)) return null; // har allerede gått
  if (atStop.some(c => c.dep == null)) {
    // Ligger ved kaia
    const late = Math.round(nowMin - p);
    return late >= 2 ? make(stop, late, `Ferga har ikke gått fra ${name} ennå`, 'ca.') : null;
  }

  // Ikke ved kaia ennå: er den på vei dit, og rekker den avgangen?
  const L = track.latest, q = stopCoords[stop];
  const moving = (L.sog ?? 0) >= 1.5;
  const course = L.cog;
  const heading = moving && course != null && (() => {
    const d = Math.abs(bearingDeg(L.lat, L.lng, q.lat, q.lng) - course) % 360;
    return (d > 180 ? 360 - d : d) < 60;
  })();
  if (heading) {
    const eta = haversineKm(L.lat, L.lng, q.lat, q.lng) * 1.15 / (Math.max(L.sog!, 5) * 1.852) * 60;
    const late = Math.round(nowMin + eta + 1 - p); // + ett minutt ved kaia
    return late >= 3 ? make(stop, late, `Ferga er på vei til ${name}`, 'ca.') : null;
  }
  const late = Math.round(nowMin - p);
  return late >= 2 ? make(stop, late, `Ferga er ikke kommet til ${name} ennå`, 'minst') : null;
}

// Live-sporet trengs bare fra 20 min før til 15 min etter avgangen (i dag)
export function needsLive(trip: Trip | null, todayStr: string, nowMin: number): boolean {
  const board = trip && boardingStop(trip);
  if (!trip || !board || trip.dateStr !== todayStr) return false;
  const p = parseTime(board.time);
  return nowMin >= p - 20 && nowMin <= p + 15;
}
