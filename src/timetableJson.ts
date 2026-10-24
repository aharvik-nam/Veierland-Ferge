// Bygger innholdet i /timetable.json fra rutetidene i data.ts (brukes av Vite ved bygg),
// så den installerte appen henter de samme rutetidene som nettsiden.
import {
  monFriLoops, satLoops, sunLoops,
  summerMonFriLoops, summerSatLoops, summerSunLoops,
  humlaMonFriLoops, humlaSatLoops, humlaSunLoops, TIMES_FROM,
} from './data';
import { SUMMER, MAINTENANCE } from './ferryData';
import type { RemoteTimetable } from './remoteTimetable';

export function buildRemoteTimetable(): RemoteTimetable {
  return {
    version: 1,
    generated: new Date().toISOString(),
    maintenance: MAINTENANCE,
    timesFrom: TIMES_FROM,
    periods: [
      { name: 'MF "Humla"', from: MAINTENANCE.from, to: MAINTENANCE.to, loops: { monFri: humlaMonFriLoops, sat: humlaSatLoops, sun: humlaSunLoops } },
    ],
    summer: { ...SUMMER, loops: { monFri: summerMonFriLoops, sat: summerSatLoops, sun: summerSunLoops } },
    normal: { loops: { monFri: monFriLoops, sat: satLoops, sun: sunLoops } },
  };
}
