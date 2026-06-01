import type { StopId, Trip, TripEvent, TripWarning } from './types';
import { monFriLoops, satLoops, sunLoops } from './data';

export const stopsMap: Record<StopId, string> = {
  buss_tbg: "Buss fra Tønsberg",
  tenvik: "Tenvik",
  vestgarden: "Vestgården",
  engo: "Engø",
  tangen: "Tangen",
  buss_tenv: "Buss til Tønsberg",
};

export const stopShort: Record<StopId, string> = {
  buss_tbg: "Tønsberg",
  tenvik: "Tenvik",
  vestgarden: "Vestgården",
  engo: "Engø",
  tangen: "Tangen",
  buss_tenv: "Tønsberg",
};

export const stopKind: Record<StopId, 'buss' | 'fastland' | 'øy'> = {
  buss_tbg: "buss",
  tenvik: "fastland",
  vestgarden: "øy",
  engo: "øy",
  tangen: "øy",
  buss_tenv: "buss",
};

export const stopTravel: Record<StopId, { drive: number; walk: number; showCar: boolean }> = {
  buss_tbg:   { drive: 4,  walk: 18, showCar: true  },
  tenvik:     { drive: 14, walk: 54, showCar: true  }, // 11 min + 3 min parkering/gang til kaia
  vestgarden: { drive: 15, walk: 71, showCar: false }, // bilfri øy
  engo:       { drive: 19, walk: 88, showCar: false }, // bilfri øy
  tangen:     { drive: 13, walk: 62, showCar: false }, // bilfri øy
  buss_tenv:  { drive: 11, walk: 54, showCar: true  },
};

const sequenceKeys = [
  'bussTbg', 'tenvikUt', 'vestgardenUt', 'engoUt', 'tangenUt',
  'tangenInn', 'engoInn', 'vestgardenInn', 'tenvikInn', 'bussTenvik'
] as const;

function getStopIdForKey(k: string): StopId | null {
  if (k === 'bussTbg') return 'buss_tbg';
  if (k === 'tenvikUt' || k === 'tenvikInn') return 'tenvik';
  if (k === 'vestgardenUt' || k === 'vestgardenInn') return 'vestgarden';
  if (k === 'engoUt' || k === 'engoInn') return 'engo';
  if (k === 'tangenUt' || k === 'tangenInn') return 'tangen';
  if (k === 'bussTenvik') return 'buss_tenv';
  return null;
}

export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function getOsloDate(): Date {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" });
  return new Date(dateStr);
}

export function dayTypeOf(dateObj: Date): 'monfri' | 'sat' | 'sun' {
  const d = dateObj.getDay();
  if (d === 0) return 'sun';
  if (d === 6) return 'sat';
  return 'monfri';
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const NO_DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const NO_MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayLabelFor(d: Date): string {
  const now = getOsloDate();
  const diff = Math.round((parseYmd(ymd(d)).getTime() - parseYmd(ymd(now)).getTime()) / 86400000);
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return `${cap(NO_DAYS[d.getDay()])} ${d.getDate()}. ${NO_MONTHS[d.getMonth()]}`;
}

export const NO_DAYS_EXPORT = NO_DAYS;
export const NO_MONTHS_EXPORT = NO_MONTHS;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loopsFor(dayType: string): any[] {
  if (dayType === 'sat') return satLoops;
  if (dayType === 'sun') return sunLoops;
  return monFriLoops;
}

export function findTripsForDay(dayType: 'monfri' | 'sat' | 'sun', dateObj: Date, from: StopId, to: StopId): Trip[] {
  const loops = loopsFor(dayType);
  const month = dateObj.getMonth() + 1;
  const dayNum = dateObj.getDate();
  const isEngoSeason = (month > 4 && month < 9) || (month === 4) || (month === 9 && dayNum <= 28);

  const trips: Trip[] = [];
  const dateStr = ymd(dateObj);
  const dl = dayLabelFor(dateObj);

  loops.forEach((loop) => {
    const events: TripEvent[] = [];
    sequenceKeys.forEach(k => {
      const time = loop[k as keyof typeof loop] as string | null;
      if (typeof time === 'string') {
        const sId = getStopIdForKey(k);
        if (sId) events.push({ key: k, time, stopId: sId, name: stopsMap[sId] });
      }
    });

    let best: TripEvent[] | null = null;
    let shortest = Infinity;
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (events[i].stopId === from && events[j].stopId === to) {
          let dur = parseTime(events[j].time) - parseTime(events[i].time);
          if (dur < 0) dur += 1440;
          if (dur < shortest) { shortest = dur; best = events.slice(i, j + 1); }
        }
      }
    }
    if (!best) return;

    const warnings: TripWarning[] = [];
    const startTime = best[0].time;
    const startStop = best[0].stopId;
    const hasEngo = best.some(ev => ev.stopId === 'engo');

    if (hasEngo && !isEngoSeason) {
      warnings.push({ type: 'engo', text: 'Rød avgang via Engø — kjøres normalt kun 1. april–28. sep. Ring fergen for å forhåndsbestille.' });
    }
    if (dayType === 'monfri' || dayType === 'sun') {
      if ((startStop === 'tangen' && startTime >= '20:30') ||
          (startStop === 'vestgarden' && startTime >= '20:40') ||
          (startStop === 'tenvik' && startTime >= '21:30')) {
        warnings.push({ type: 'booking', deadline: '18:00', text: 'Må forhåndsbestilles senest kl. 18:00 på avreisedagen.' });
      }
    } else if (dayType === 'sat') {
      if (startStop === 'vestgarden' && startTime <= '07:50') {
        warnings.push({ type: 'booking', deadline: 'kvelden før, 20:00', text: 'Må forhåndsbestilles kvelden før, innen kl. 20:00.' });
      }
    }

    trips.push({
      id: loop.id as string,
      subpath: best,
      duration: shortest,
      startTime,
      startStop,
      endTime: best[best.length - 1].time,
      warnings,
      dateStr,
      dayLabel: dl,
    });
  });

  trips.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  return trips;
}

export function upcomingTrips(from: StopId, to: StopId, fromDateStr: string): Trip[] {
  const now = getOsloDate();
  const todayStr = ymd(now);
  const sel = fromDateStr ? parseYmd(fromDateStr) : now;
  const selStr = ymd(sel);
  const isToday = selStr === todayStr;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  let trips = findTripsForDay(dayTypeOf(sel), sel, from, to);

  if (isToday) {
    trips = trips.filter(t => parseTime(t.startTime) >= nowMins);
  }
  return trips;
}

export function nextDeparture(from: StopId, to: StopId): Trip | null {
  const now = getOsloDate();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (let d = 0; d < 8; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    let trips = findTripsForDay(dayTypeOf(day), day, from, to);
    if (d === 0) trips = trips.filter(t => parseTime(t.startTime) >= nowMins);
    if (trips.length) return trips[0];
  }
  return null;
}

export function minsUntil(dateStr: string, hhmm: string): number {
  const now = getOsloDate();
  const target = parseYmd(dateStr);
  const [h, m] = hhmm.split(':').map(Number);
  target.setHours(h, m, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

export function fmtCountdown(mins: number): string {
  if (mins <= 0) return 'Nå';
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h > 0) return `${h} t ${String(m).padStart(2, '0')} min`;
  return `${m} min`;
}

export function rekkerStatus(driveMins: number, countdownMins: number | null): { level: 'good' | 'warn' | 'bad'; label: string; sub: string } | null {
  if (countdownMins == null) return null;
  const margin = countdownMins - driveMins;
  if (margin >= 10) return { level: 'good', label: 'Du rekker fergen', sub: `God margin — kjøretid ${driveMins} min, ${fmtCountdown(countdownMins)} igjen` };
  if (margin >= 0) return { level: 'warn', label: 'Det haster — kjør nå', sub: `Kjøretid ${driveMins} min, bare ${margin} min margin` };
  return { level: 'bad', label: 'Du rekker neppe denne', sub: `Kjøretid ${driveMins} min — mangler ${Math.abs(margin)} min` };
}
