import type { Alert } from './conditions';

// Fargeskala for vær og sjø på fergedisplayet: grønn er helt normalt, rød er ekstremt (orkan, rekordhøy vannstand).
// Nivå 0–6. Grensene er laget for indre farvann ved Veierland (Tønsbergfjorden), der det sjelden er store bølger
// og tidevannet bare er noen titalls centimeter. Farevarsler fra MET overstyrer: et aktivt varsel gir minst
// gult (gult varsel), oransje eller rødt nivå for vind, vannstand og nedbør.

export type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Fra RdYlGn-skalaen (grønn → rød). Nattmodus bytter til røde nyanser fra dempet til klart (NIGHT_VARS).
export const LEVEL_COLORS = ['#1A9850', '#91CF60', '#FEE08B', '#FDAE61', '#F46D43', '#D73027', '#A50026'] as const;
export const LEVEL_NIGHT = ['#3a1410', '#4d1912', '#6b2117', '#8f2b1d', '#b23524', '#d4402b', '#ff4a33'] as const;
export const levelColor = (l: Level) => `var(--sev${l}, ${LEVEL_COLORS[l]})`;
export const LEVEL_TEXT = ['normalt', 'litt over normalt', 'merkbart', 'høyt', 'svært høyt', 'ekstremt', 'ekstremt'] as const;

// Nivået er antall grenser verdien har nådd
const level = (v: number, limits: number[]): Level => limits.filter(x => v >= x).length as Level;

// Middelvind (m/s), etter Beaufort: laber bris og mindre er normalt, frisk bris, liten kuling, stiv kuling,
// sterk kuling, storm, orkan
export const windLevel = (ms: number) => level(ms, [8, 10.8, 13.9, 17.2, 24.5, 32.7]);

// Signifikant bølgehøyde (m). Over 1,2 m er mye for så skjermet farvann; 3 m er storm til havs.
export const waveLevel = (m: number) => level(m, [0.5, 0.8, 1.2, 1.6, 2.2, 3]);

// Nedbør neste time (mm). 2 mm er kraftig regn, rundt 20 mm på én time er et 5-årsregn på Østlandet.
export const rainLevel = (mm: number) => level(mm, [0.5, 2, 4, 7, 12, 20]);

// Sikt: andel tåke i området (%) fra MET
export const fogLevel = (pct: number) => level(pct, [10, 25, 45, 60, 80, 95]);

// Vannstand (cm over middelvann). Tidevannet ved Tønsberg er bare ±15 cm, så over 30 cm skyldes vær.
// Stormflo i Oslofjorden: rundt 80–90 cm er høyt, over 110 cm nærmer seg rekordene.
// Lavvann er sjelden farlig, så det får høyst nivå 4.
export const waterLevel = (cm: number): Level => cm >= 0
  ? level(cm, [30, 45, 60, 75, 90, 110])
  : Math.min(4, level(-cm, [30, 45, 60, 75])) as Level;

// Normal overflatetemperatur i sjøen i ytre Oslofjord, midt i hver måned (°C, omtrentlige gjennomsnitt)
const SEA_NORMAL = [4, 3, 3, 5, 9, 14, 17, 18, 15, 11, 8, 5];
export function seaTempNormal(date: Date): number {
  // lineært mellom midten av månedene
  const m = date.getMonth(), d = date.getDate(), days = new Date(date.getFullYear(), m + 1, 0).getDate();
  const t = (d - 15) / days;
  const other = t >= 0 ? SEA_NORMAL[(m + 1) % 12] : SEA_NORMAL[(m + 11) % 12];
  return SEA_NORMAL[m] + (other - SEA_NORMAL[m]) * Math.abs(t);
}
// Avvik fra normalen, både varmere og kaldere
export const seaTempLevel = (temp: number, date: Date) => level(Math.abs(temp - seaTempNormal(date)), [1.5, 2.5, 3.5, 4.5, 5.5, 7]);

// Farevarsler fra MET som gjelder kategorien nå
const ALERT_EVENTS = { wind: ['wind', 'gale', 'polarLow'], water: ['stormSurge'], rain: ['rain', 'rainFlood'] } as const;
const ALERT_LEVEL: Record<Alert['level'], Level> = { yellow: 2, orange: 4, red: 6 };
export function alertLevel(alerts: Alert[], kind: keyof typeof ALERT_EVENTS): Level {
  const now = Date.now();
  const events: readonly string[] = ALERT_EVENTS[kind];
  return alerts
    .filter(a => events.includes(a.event) && (!a.from || Date.parse(a.from) <= now) && (!a.to || Date.parse(a.to) > now))
    .reduce<Level>((max, a) => Math.max(max, ALERT_LEVEL[a.level]) as Level, 0);
}
