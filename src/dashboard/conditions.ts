import { useEffect, useState } from 'react';
import { API_BASE } from '../platform';

// Vær og sjø ved Veierland fra /api/conditions (MET Norge og Kartverket), til dashbordene på store skjermer.

export interface HourWeather {
  time: string; temp: number | null; wind: number | null; gust: number | null; dir: number | null;
  fog: number | null; precip: number | null; symbol: string | null;
}
export interface Alert { title: string; event: string; name: string; level: 'yellow' | 'orange' | 'red'; area: string; from: string | null; to: string | null; description: string }
export interface Conditions {
  generated: string;
  weather: { now: HourWeather; hours: HourWeather[] } | null;
  ocean: { waveHeight: number | null; waveFrom: number | null; seaTemp: number | null; current: number | null; currentTo: number | null } | null;
  alerts: Alert[];
  water: { cm: number; measured: boolean; trend: 'stigende' | 'synkende' | 'stabil'; station: string | null } | null;
}

const KEY = 'vf_conditions';

// Hentes hvert 10. minutt; siste svar lagres så skjermen ikke er tom ved oppstart uten nett
export function useConditions(): Conditions | null {
  const [data, setData] = useState<Conditions | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
  });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/conditions`);
        if (!res.ok) return;
        const d = await res.json() as Conditions;
        if (!alive) return;
        setData(d);
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* privat modus */ }
      } catch { /* uten nett */ }
    };
    load();
    const id = setInterval(load, 10 * 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return data;
}

// Yr-symbol (f.eks. «lightrain_night») til koden weatherProps i Icons forstår
export function yrSymbolToCode(sym: string | null | undefined): number {
  if (!sym) return 2;
  if (sym.startsWith('clearsky') || sym.startsWith('fair')) return 1;
  if (sym.startsWith('partlycloudy')) return 2;
  if (sym.startsWith('cloudy')) return 3;
  if (sym.startsWith('fog')) return 45;
  if (sym.includes('thunder')) return 95;
  if (sym.includes('snow') || sym.includes('sleet')) return 71;
  if (sym.includes('rain') || sym.includes('drizzle') || sym.includes('shower')) return 61;
  return 2;
}

const COMPASS = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
// Vindretning (grader, der vinden kommer fra) som kompassretning
export function compass(deg: number | null): string {
  return deg == null ? '' : COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

// Soloppgang og solnedgang (NOAA-formelen) for Veierland på datoen, som Date
export function sunTimes(date: Date, lat = 59.16, lng = 10.34): { rise: Date | null; set: Date | null } {
  const r = Math.PI / 180;
  const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const n = Math.floor((start - Date.UTC(2000, 0, 1, 12)) / 86400000) + 1; // dager siden J2000
  const jStar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * r) + 0.02 * Math.sin(2 * M * r) + 0.0003 * Math.sin(3 * M * r);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = 2451545 + jStar + 0.0053 * Math.sin(M * r) - 0.0069 * Math.sin(2 * lambda * r);
  const decl = Math.asin(Math.sin(lambda * r) * Math.sin(23.44 * r));
  const cosH = (Math.sin(-0.833 * r) - Math.sin(lat * r) * Math.sin(decl)) / (Math.cos(lat * r) * Math.cos(decl));
  if (cosH > 1 || cosH < -1) return { rise: null, set: null }; // midnattsol eller mørketid
  const H = Math.acos(cosH) / r;
  const toDate = (j: number) => new Date((j - 2440587.5) * 86400000);
  return { rise: toDate(jTransit - H / 360), set: toDate(jTransit + H / 360) };
}

// Er det mørkt ute nå (fra 20 min etter solnedgang til 20 min før soloppgang)?
export function isDark(now = new Date()): boolean {
  const { rise, set } = sunTimes(now);
  if (!rise || !set) return false;
  const t = now.getTime(), m = 20 * 60_000;
  return t > set.getTime() + m || t < rise.getTime() - m;
}

export function osloHm(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' });
}
