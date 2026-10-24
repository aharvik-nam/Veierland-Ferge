import type { FerryLoop } from './data';
import { API_BASE } from './platform';

// Rutetider hentet fra serveren (public/timetable.json, generert fra data.ts ved bygg),
// slik at den installerte appen får nye rutetider uten ny versjon i app-butikkene.

export interface DayLoops { monFri: FerryLoop[]; sat: FerryLoop[]; sun: FerryLoop[] }

export interface RemoteTimetable {
  version: 1;
  generated: string;
  maintenance?: { from: string; to: string };          // M/F Humla-perioden (yyyy-mm-dd)
  timesFrom?: string;                                  // når gjeldende rutetider trådte i kraft (punktlighet)
  periods: { name: string; from: string; to: string; loops: DayLoops }[]; // daterte unntak
  summer: { from: string; to: string; loops: DayLoops }; // mm-dd, gjentas hvert år
  normal: { loops: DayLoops };
}

const KEY = 'vf_remote_timetable';
const REFRESH_MS = 30 * 60 * 1000;

function isDayLoops(x: unknown): x is DayLoops {
  const d = x as DayLoops;
  return !!d && Array.isArray(d.monFri) && Array.isArray(d.sat) && Array.isArray(d.sun);
}

function isValid(x: unknown): x is RemoteTimetable {
  const t = x as RemoteTimetable;
  return !!t && t.version === 1 && Array.isArray(t.periods) && t.periods.every(p => isDayLoops(p.loops))
    && !!t.summer && isDayLoops(t.summer.loops) && !!t.normal && isDayLoops(t.normal.loops);
}

function load(): RemoteTimetable | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    return isValid(parsed) ? parsed : null;
  } catch { return null; }
}

let current: RemoteTimetable | null = load();
let lastFetch = 0;

export function remoteTimetable(): RemoteTimetable | null {
  return current;
}

// Hent nyeste rutetider. Uten nett beholdes de lagrede (eller de innebygde).
export async function refreshTimetable(force = false): Promise<void> {
  if (!force && Date.now() - lastFetch < REFRESH_MS) return;
  lastFetch = Date.now();
  try {
    const res = await fetch(`${API_BASE}/timetable.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    if (!isValid(data)) return;
    current = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* full lagring */ }
  } catch { /* uten nett */ }
}
