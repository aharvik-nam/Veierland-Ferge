import { AT_QUAY_KM, dayTypeOf, getOsloDate, haversineKm, parseTime, seasonLoops, stopCoords, stopsMap, ymd } from './ferryData';
import type { LiveTrack } from './liveDelay';
import type { FerryLoop } from './data';
import type { StopId } from './types';

// Klokkeslett i fergekartet: når ferga gikk og når den er fremme, eller når den kom og når den går igjen.
// Faktiske tider kommer fra AIS (dagens anløp), rutetidene fra dagens rutetabell.

// Feltene i en rundtur i den rekkefølgen ferga kjører dem
const KEYS: [keyof FerryLoop, StopId][] = [
  ['tenvikUt', 'tenvik'], ['vestgardenUt', 'vestgarden'], ['tangenVia', 'tangen'], ['engoUt', 'engo'],
  ['tangenUt', 'tangen'], ['tangenInn', 'tangen'], ['engoInn', 'engo'], ['vestgardenInn', 'vestgarden'], ['tenvikInn', 'tenvik'],
];
const QUAYS: StopId[] = ['tenvik', 'vestgarden', 'tangen', 'engo'];

// Ett anløp i en rundtur. arr og dep er like, unntatt når ferga ligger en stund (f.eks. Tangen inn/ut)
interface Call { stop: StopId; arr: number; dep: number }
// optional(i): avgangen fra anløp i går bare når noen har bestilt (bestillingsavgang eller rød Engø-tur)
interface Round { calls: Call[]; optional: (i: number) => boolean; booking: boolean }

function todaysRounds(date: Date): Round[] {
  const all = seasonLoops(date);
  const loops = { monfri: all.monFri, sat: all.sat, sun: all.sun }[dayTypeOf(date)];
  return loops.map(l => {
    const calls: Call[] = [];
    for (const [key, stop] of KEYS) {
      const t = l[key];
      if (typeof t !== 'string') continue;
      const m = parseTime(t);
      const last = calls[calls.length - 1];
      if (last?.stop === stop) last.dep = m; else calls.push({ stop, arr: m, dep: m });
    }
    const optional = (i: number) => l.rowType === 'booking' || (l.rowType === 'engo' && (calls[i].stop === 'engo' || calls[i + 1]?.stop === 'engo'));
    return { calls, optional, booking: l.rowType === 'booking' };
  });
}

export function hhmm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export interface TimeCell {
  stop: StopId;
  label: string;      // «Gikk fra Tenvik»
  time: string;       // «10:12» eller «ca. 10:29»
  sub: string | null; // «rute 10:00»
  late: boolean;      // mer enn 2 min etter rutetiden
  tag: string;        // kort tekst ved kaia i kartet: «gikk 10:12»
}

interface Pos { lat: number; lng: number; sog: number | null; time: string | null }

// Venstre: der ferga gikk fra (eller ligger). Høyre: der den skal (eller neste avgang).
export function mapTimes(track: LiveTrack | null, pos: Pos, target: StopId | null): TimeCell[] {
  const now = getOsloDate();
  if (!track || track.day !== ymd(now)) return [];
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const ageMin = pos.time ? (Date.now() - new Date(pos.time).getTime()) / 60000 : Infinity;
  if (ageMin > 10) return []; // for gammel posisjon til å si noe om tidene
  const posMin = nowMin - ageMin;
  const rounds = todaysRounds(now);
  const last = track.calls[track.calls.length - 1];
  const moving = (pos.sog ?? 0) >= 1.5;
  const cells: TimeCell[] = [];

  if (moving) {
    // Gikk fra: siste kai i AIS-sporet, hvis den har gått derfra for under 40 min siden
    if (!last || last.dep == null || nowMin - last.dep > 40) return [];
    const from = last.stop as StopId, t = last.dep;
    if (target === from) target = null;
    // Rutetiden ferga trolig kjører: avgang fra samme kai inntil 30 min før eller 5 min etter, helst med målet videre i turen
    let best: { r: Round; i: number; score: number } | null = null;
    for (const r of rounds) r.calls.forEach((c, i) => {
      if (c.stop !== from || i === r.calls.length - 1 || c.dep < t - 30 || c.dep > t + 5) return;
      const reaches = target != null && r.calls.slice(i + 1).some(n => n.stop === target);
      const score = Math.abs(t - c.dep) + (reaches || target == null ? 0 : 100);
      if (!best || score < best.score) best = { r, i, score };
    });
    const b = best as { r: Round; i: number } | null;
    const plannedDep = b ? b.r.calls[b.i].dep : null;
    cells.push({
      stop: from, label: `Gikk fra ${stopsMap[from]}`, time: hhmm(t),
      sub: plannedDep != null ? `rute ${hhmm(plannedDep)}` : null, late: plannedDep != null && t - plannedDep > 2,
      tag: `gikk ${hhmm(t)}`,
    });
    if (target) {
      // Fart som AIS sier, men vanlig marsjfart (6,5 knop) når den akselererer eller bremser; 15 % lenger enn luftlinja
      const sog = pos.sog ?? 0;
      const km = haversineKm(pos.lat, pos.lng, stopCoords[target].lat, stopCoords[target].lng);
      const eta = posMin + km * 1.15 / ((sog >= 5 ? sog : 6.5) * 1.852) * 60;
      const plannedArr = b ? b.r.calls.slice(b.i + 1).find(n => n.stop === target)?.arr ?? null : null;
      cells.push({
        stop: target, label: `Ankommer ${stopsMap[target]}`, time: `ca. ${hhmm(eta)}`,
        sub: plannedArr != null ? `rute ${hhmm(plannedArr)}` : null, late: plannedArr != null && eta - plannedArr > 2,
        tag: `ca. ${hhmm(eta)}`,
      });
    }
    return cells;
  }

  // Ligger ved kaia
  const at = QUAYS.find(s => haversineKm(pos.lat, pos.lng, stopCoords[s].lat, stopCoords[s].lng) <= (AT_QUAY_KM[s] ?? 0.03));
  if (!at) return [];
  const since = last && last.stop === at && last.dep == null ? last.arr : null;
  if (since != null) cells.push({ stop: at, label: `Kom til ${stopsMap[at]}`, time: hhmm(since), sub: null, late: false, tag: `kom ${hhmm(since)}` });

  // Neste avgang herfra. En avgang som bare går ved bestilling, regnes som droppet 3 min etter rutetiden; ellers venter vi 15 min.
  const nextFrom = (stop: StopId | null, earliest: (optional: boolean) => number) => {
    let next: { stop: StopId; dep: number; optional: boolean } | null = null;
    for (const r of rounds) r.calls.forEach((c, i) => {
      if ((stop && c.stop !== stop) || i === r.calls.length - 1) return;
      const optional = r.optional(i);
      if (c.dep < earliest(optional)) return;
      if (!next || c.dep < next.dep) next = { stop: c.stop, dep: c.dep, optional };
    });
    return next as { stop: StopId; dep: number; optional: boolean } | null;
  };
  // Ligger den på en kai uten avganger (f.eks. pause ved Vestgården mens Humla seiler): neste avgang uansett kai
  const next = nextFrom(at, opt => Math.max((since ?? nowMin) - 10, nowMin - (opt ? 3 : 15))) ?? nextFrom(null, () => nowMin);
  if (next) {
    const passed = next.dep < nowMin;
    const here = next.stop === at;
    cells.push({
      stop: next.stop,
      label: passed ? 'Skulle gått' : here ? 'Neste avgang' : `Neste avgang fra ${stopsMap[next.stop]}`,
      time: hhmm(next.dep),
      sub: passed ? 'har ikke gått ennå' : next.optional ? 'må bestilles' : null,
      late: passed,
      tag: `går ${hhmm(next.dep)}`,
    });
  }
  return cells;
}

// Fergens neste anløp, til fergedisplayet: «Tangen 10:20 (ca. 10:25) → Engø 10:30 ved bestilling → Tangen 10:40 → …».
// Rundturene legges etter hverandre, og ligger ferga ved samme kai mellom to turer, blir det ett anløp.
export interface UpcomingCall {
  stop: StopId;
  arr: number;            // minutter etter midnatt (rutetid)
  dep: number;            // like arr, unntatt når ferga ligger en stund
  optional: boolean;      // ferga kommer hit bare når noen har bestilt
  eta: number | null;     // beregnet ankomst for anløpet ferga er på vei til
}

export function upcomingCalls(pos: Pos | null, target: StopId | null, count = 8): UpcomingCall[] {
  const now = getOsloDate();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const rounds = todaysRounds(now).filter(r => r.calls.length > 1).sort((a, b) => a.calls[0].dep - b.calls[0].dep);
  const flat: UpcomingCall[] = [];
  for (const r of rounds) {
    const last = r.calls.length - 1;
    r.calls.forEach((c, i) => {
      // Hele bestillingsturer, og Engø på røde turer, kjøres bare ved bestilling. Tangen etterpå er fast.
      const optional = r.booking || (c.stop === 'engo' && ((i > 0 && r.optional(i - 1)) || r.optional(i)));
      const prev = flat[flat.length - 1];
      if (i === 0 && prev && prev.stop === c.stop && c.dep >= prev.arr) { prev.dep = c.dep; prev.optional = prev.optional && optional; return; }
      flat.push({ stop: c.stop, arr: c.arr, dep: i === last ? c.arr : c.dep, optional, eta: null });
    });
  }
  if (!flat.length) return [];

  let start = -1;
  const ageMin = pos?.time ? (Date.now() - new Date(pos.time).getTime()) / 60000 : Infinity;
  const fresh = pos != null && ageMin <= 10;
  const moving = fresh && (pos!.sog ?? 0) >= 1.5;
  if (moving && target) {
    // På vei til en kai: anløpet der som passer best med beregnet ankomst
    const sog = pos!.sog ?? 0;
    const km = haversineKm(pos!.lat, pos!.lng, stopCoords[target].lat, stopCoords[target].lng);
    const eta = nowMin - ageMin + km * 1.15 / ((sog >= 5 ? sog : 6.5) * 1.852) * 60;
    let best = Infinity;
    flat.forEach((c, i) => {
      const d = Math.abs(c.arr - eta);
      if (c.stop === target && c.arr >= eta - 45 && c.arr <= eta + 30 && d < best) { best = d; start = i; }
    });
    if (start >= 0) flat[start] = { ...flat[start], eta };
  } else if (fresh) {
    // Ligger ved en kai: anløpet der med neste avgang (bestillingsavganger regnes som droppet 3 min etter rutetiden)
    const at = QUAYS.find(s => haversineKm(pos!.lat, pos!.lng, stopCoords[s].lat, stopCoords[s].lng) <= (AT_QUAY_KM[s] ?? 0.03));
    if (at) start = flat.findIndex(c => c.stop === at && c.dep >= nowMin - (c.optional ? 3 : 15));
  }
  if (start < 0) start = flat.findIndex(c => c.dep >= nowMin);
  return start < 0 ? [] : flat.slice(start, start + count);
}
