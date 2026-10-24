import { useEffect, useState } from 'react';
import { API_BASE } from './platform';
import { dayTypeOf, parseYmd, seasonLabel, getOsloDate, stopKind, stopsMap } from './ferryData';
import type { StopId, Trip } from './types';

// Punktlighet regnet ut fra fergens AIS-spor (/api/ferry-history?stats=1): hvor mye hver avgang
// har vært forsinket de siste dagene, og samlet. Lagres lokalt og hentes på nytt etter noen timer.

export interface DepStats { n: number; avg: number; onTime: number }
export interface Punctuality {
  generated: string;
  timesFrom: string | null;
  days: string[];
  overall: DepStats;
  departures: Record<string, DepStats>; // nøkkel: «monFri|tenvik|07:05»
}

const KEY = 'vf_punktlighet';
const MAX_AGE = 3 * 60 * 60 * 1000;
const MIN_PER_DEPARTURE = 3; // dager med målinger før en avgang får tall
const MIN_OVERALL = 20;      // avganger før samlet punktlighet vises

function load(): Punctuality | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    return p && p.overall && p.departures ? p : null;
  } catch { return null; }
}

let current: Punctuality | null = load();
let inflight: Promise<void> | null = null;

function refresh(): Promise<void> {
  if (current && Date.now() - Date.parse(current.generated) < MAX_AGE) return Promise.resolve();
  inflight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ferry-history?stats=1`);
      if (!res.ok) return;
      const data = await res.json() as Punctuality;
      if (!data?.overall || !data.departures) return;
      current = data;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* full lagring */ }
    } catch { /* uten nett */ } finally { inflight = null; }
  })();
  return inflight;
}

export function usePunctuality(): Punctuality | null {
  const [p, setP] = useState(current);
  useEffect(() => {
    let alive = true;
    refresh().then(() => { if (alive) setP(current); });
    return () => { alive = false; };
  }, []);
  return p;
}

// Kaia og klokkeslettet ferga går fra på turen (første kai som ikke er en bussholdeplass)
export function boardingStop(trip: Trip): { stop: StopId; time: string } | null {
  const ev = trip.subpath.find(e => stopKind[e.stopId] !== 'buss');
  return ev ? { stop: ev.stopId, time: ev.time } : null;
}

// Tall for avgangen, bare når de er målt med de samme rutetidene og det finnes nok målinger
export function tripPunctuality(p: Punctuality | null, trip: Trip): (DepStats & { stop: StopId; time: string; days: number }) | null {
  const board = boardingStop(trip);
  if (!p || !board) return null;
  if (p.timesFrom && trip.dateStr < p.timesFrom) return null;
  const date = parseYmd(trip.dateStr);
  if (seasonLabel(date) !== seasonLabel(getOsloDate())) return null;
  const day = ({ monfri: 'monFri', sat: 'sat', sun: 'sun' } as const)[dayTypeOf(date)];
  const s = p.departures[`${day}|${board.stop}|${board.time}`];
  return s && s.n >= MIN_PER_DEPARTURE ? { ...s, ...board, days: p.days.length } : null;
}

export function overallPunctuality(p: Punctuality | null): (DepStats & { days: number; pct: number }) | null {
  if (!p || p.overall.n < MIN_OVERALL) return null;
  return { ...p.overall, days: p.days.length, pct: Math.round(100 * p.overall.onTime / p.overall.n) };
}

// «i snitt 2 min forsinket» / «går som regel i rute»
export function delayText(s: DepStats): string {
  const avg = Math.round(s.avg);
  if (s.avg < 1.5 && s.onTime / s.n >= 0.9) return 'går som regel i rute';
  if (avg <= 0) return 'i snitt i rute';
  return `i snitt ${avg} min forsinket`;
}

export function departureLabel(s: { stop: StopId; time: string }): string {
  return `${s.time} fra ${stopsMap[s.stop]}`;
}
