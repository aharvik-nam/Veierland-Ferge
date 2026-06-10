import type { StopId, Trip, TripEvent, TripWarning } from './types';
import { monFriLoops, satLoops, sunLoops, summerMonFriLoops, summerSatLoops, summerSunLoops } from './data';

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

export const stopCoords: Record<StopId, { lat: number; lng: number }> = {
  buss_tbg:   { lat: 59.2676, lng: 10.4078 },
  tenvik:     { lat: 59.1744, lng: 10.3650 },
  vestgarden: { lat: 59.1650, lng: 10.3434 },
  engo:       { lat: 59.1475, lng: 10.3183 },
  tangen:     { lat: 59.1534, lng: 10.3378 },
  buss_tenv:  { lat: 59.2676, lng: 10.4078 },
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function travelVisibility(stop: StopId, userLoc: { lat: number; lng: number } | null): { showCar: boolean; showWalk: boolean } {
  // Bus stops: user is already on transit, no travel time relevant
  if (stop === 'buss_tbg' || stop === 'buss_tenv') return { showCar: false, showWalk: false };

  if (!userLoc) return { showCar: false, showWalk: false };

  const coord = stopCoords[stop];
  const dist = haversineKm(userLoc.lat, userLoc.lng, coord.lat, coord.lng);

  if (stop === 'vestgarden' || stop === 'tangen') {
    // Car-free island: only walk, only if within 10 km
    return { showCar: false, showWalk: dist < 10 };
  }
  if (stop === 'tenvik' || stop === 'engo') {
    // Mainland: car always, walk only if within 2 km
    return { showCar: true, showWalk: dist < 2 };
  }
  return { showCar: false, showWalk: false };
}

export const stopTravel: Record<StopId, { drive: number; walk: number; showCar: boolean }> = {
  buss_tbg:   { drive: 4,  walk: 18, showCar: true  },
  tenvik:     { drive: 14, walk: 54, showCar: true  }, // 11 min + 3 min parkering/gang til kaia
  vestgarden: { drive: 15, walk: 71, showCar: false }, // bilfri øy
  engo:       { drive: 19, walk: 88, showCar: true  }, // fastland
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

// Sommerruter gjelder fom. 22. juni tom. 16. august
export function isSummerSeason(dateObj: Date): boolean {
  const m = dateObj.getMonth() + 1, d = dateObj.getDate();
  if (m === 7) return true;
  if (m === 6) return d >= 22;
  if (m === 8) return d <= 16;
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loopsFor(dayType: string, dateObj: Date): any[] {
  const summer = isSummerSeason(dateObj);
  if (dayType === 'sat') return summer ? summerSatLoops : satLoops;
  if (dayType === 'sun') return summer ? summerSunLoops : sunLoops;
  return summer ? summerMonFriLoops : monFriLoops;
}

export function findTripsForDay(dayType: 'monfri' | 'sat' | 'sun', dateObj: Date, from: StopId, to: StopId): Trip[] {
  const loops = loopsFor(dayType, dateObj);
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
    // Bestillingskrav gjelder kun ordinære ruter — sommerrutene har ingen avganger som krever forhåndsbestilling
    if (!isSummerSeason(dateObj)) {
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

export function prevDeparture(from: StopId, to: StopId): Trip | null {
  const now = getOsloDate();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const trips = findTripsForDay(dayTypeOf(now), now, from, to);
  const passed = trips.filter(t => parseTime(t.startTime) < nowMins);
  return passed.length ? passed[passed.length - 1] : null;
}

export function nextDepartures(from: StopId, to: StopId, count = 1): Trip[] {
  const now = getOsloDate();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const result: Trip[] = [];
  for (let d = 0; d < 8 && result.length < count; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    let trips = findTripsForDay(dayTypeOf(day), day, from, to);
    if (d === 0) trips = trips.filter(t => parseTime(t.startTime) >= nowMins);
    for (const t of trips) {
      result.push(t);
      if (result.length >= count) break;
    }
  }
  return result;
}

export function nextDeparture(from: StopId, to: StopId): Trip | null {
  const results = nextDepartures(from, to, 1);
  return results[0] ?? null;
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

export function bookingStatus(trip: { warnings: import('./types').TripWarning[]; dateStr: string }): {
  required: boolean;
  passed: boolean;
  minsLeft: number | null;  // null = deadline is not today/tonight
  label: string;            // human-readable urgency summary
} {
  const booking = trip.warnings.find(w => w.type === 'booking');
  if (!booking) return { required: false, passed: false, minsLeft: null, label: '' };

  const now = getOsloDate();
  const todayStr = ymd(now);
  const tripDate = parseYmd(trip.dateStr);
  const dayBefore = new Date(tripDate); dayBefore.setDate(tripDate.getDate() - 1);
  const dayBeforeStr = ymd(dayBefore);

  const sameDay = booking.deadline === '18:00';

  if (sameDay) {
    // Deadline: trip date at 18:00
    if (trip.dateStr === todayStr) {
      const mins = minsUntil(todayStr, '18:00');
      if (mins <= 0) return { required: true, passed: true, minsLeft: null, label: 'Bestillingsfristen er passert' };
      return { required: true, passed: false, minsLeft: mins, label: `${fmtCountdown(mins)} igjen til fristen (kl. 18:00)` };
    }
    if (trip.dateStr === ymd(new Date(now.getTime() + 86400000))) {
      // Tomorrow — deadline is today at 18:00
      const mins = minsUntil(todayStr, '18:00');
      if (mins <= 0) return { required: true, passed: true, minsLeft: null, label: 'Bestillingsfristen er passert' };
      return { required: true, passed: false, minsLeft: mins, label: `Ring i dag — frist kl. 18:00 (${fmtCountdown(mins)} igjen)` };
    }
    return { required: true, passed: false, minsLeft: null, label: 'Må bestilles innen kl. 18:00 på avreisedagen' };
  } else {
    // Deadline: evening before at 20:00
    if (trip.dateStr === todayStr) {
      // Deadline was yesterday — always passed
      return { required: true, passed: true, minsLeft: null, label: 'Bestillingsfristen er passert' };
    }
    if (dayBeforeStr === todayStr) {
      // Deadline is tonight at 20:00
      const mins = minsUntil(todayStr, '20:00');
      if (mins <= 0) return { required: true, passed: true, minsLeft: null, label: 'Bestillingsfristen er passert' };
      return { required: true, passed: false, minsLeft: mins, label: `Ring i kveld — frist kl. 20:00 (${fmtCountdown(mins)} igjen)` };
    }
    return { required: true, passed: false, minsLeft: null, label: 'Må bestilles kvelden før innen kl. 20:00' };
  }
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function rekkerStatus(
  travelMins: number,
  countdownMins: number | null,
  mode: 'drive' | 'walk',
  nextTrip?: { startTime: string; dateStr: string } | null
): { level: 'good' | 'warn' | 'bad'; label: string; sub: string } | null {
  if (countdownMins == null) return null;
  const margin = countdownMins - travelMins;
  const seed = travelMins + Math.abs(margin) * 3;

  function nextHint(): string {
    if (!nextTrip) return '';
    const m = minsUntil(nextTrip.dateStr, nextTrip.startTime);
    return m > 0
      ? ` Neste avgang går om ${fmtCountdown(m)} (kl. ${nextTrip.startTime}).`
      : ` Neste avgang går kl. ${nextTrip.startTime}.`;
  }

  if (mode === 'walk') {
    // Walk mode — thresholds are tighter, friction = terrain + boarding queue
    if (margin >= 20) {
      return { level: 'good', label: pick([
        'Rolig gange holder',
        'God tid til fots',
        'Ingen stress',
        'Behagelig tur til kaia',
        'Du har god tid',
      ], seed), sub: pick([
        'Du kan gå i normalt tempo og er i rute. Kø ved fergen er allerede med i beregningen.',
        'Komfortabel margin. Hold direkte rute til kaia og ta det med ro.',
        'God tid. Normal ganghastighet, ingen omveier — og du er der i god tid.',
        'Du trenger ikke skynde deg. Gå direkte og nyt turen.',
        'Dette er trygg margin til fots. Ingenting å stresse med.',
      ], seed + 1) };
    }

    if (margin >= 10) {
      return { level: 'good', label: pick([
        'Normal gange holder',
        'Du rekker det til fots',
        'Greit med normalt tempo',
        'Du er i rute',
        'Grei tid',
      ], seed), sub: pick([
        'Hold normalt gangtempo og gå direkte til kaia. Ikke ta omveier.',
        'Gangavstanden er overkommelig med normal fart — men ikke stans underveis.',
        'Gåtid undervurderes lett. Hold direkte rute og du er i god tid.',
        'Greit slingringsmonn til fots. Gå nå og hold tempo.',
        'Normal gange holder — men ikke stopp for å se på kart eller sjekke mobilen.',
      ], seed + 1) };
    }

    if (margin >= 5) {
      return { level: 'warn', label: pick([
        'Rask gange nødvendig',
        'Det krever tempo',
        'Knapt, men mulig',
        'Rask tur til kaia',
        'Litt press til fots',
      ], seed), sub: pick([
        'Du trenger rask gange hele veien. Direkte rute til kaia — ingen omveier eller stans.',
        'Dette er ikke rolig spasertur. Hold tempo og gå direkte — gåtid undervurderes lett.',
        'Brisk gange nødvendig. Hold direkte rute og ikke ta sjanser med omveier.',
        'Rask, målrettet gange er det som trengs. Ikke ta sjanser med ruten.',
        'Du rekker det med god fart, men marginen er skjør. Direkte rute, ingen pauser.',
      ], seed + 1) };
    }

    if (margin >= 1) {
      return { level: 'warn', label: pick([
        'Ekstremt knapt til fots',
        'Powerwalk hele veien',
        'Svært lite å gå på',
        'Alt på gange nå',
      ], seed), sub: pick([
        'Dette krever rask, målrettet gange uten et sekund å miste. Neste avgang er tryggere.' + nextHint(),
        'Teknisk mulig, men bare med maksimalt tempo og perfekt rute. Ingen rom for feil.' + nextHint(),
        'Du er på grensen. Raskeste vei, ingen pauser.' + nextHint(),
        'Marginen er reell bare hvis alt klaffer. En omvei eller en stopp og du ser fergen gå.' + nextHint(),
      ], seed + 1) };
    }

    if (margin >= 0) {
      return { level: 'warn', label: pick([
        'Teoretisk mulig — knapt',
        'Neste er tryggere',
        'Umulig uten løping',
      ], seed), sub: pick([
        'Gangtiden er akkurat på grensen. Ta neste — det er det trygge valget.' + nextHint(),
        'Du ville måttet løpe hele veien. Det er ikke verdt det.' + nextHint(),
        'Dette holder bare i teorien. Kø, orientering og boarding spiser resten. Neste er bedre.' + nextHint(),
      ], seed + 1) };
    }

    // Missed — walk
    const shortage = Math.abs(margin);
    if (shortage >= 20) {
      return { level: 'bad', label: pick([
        'Denne rekker du ikke til fots',
        'For langt unna',
        'Sikt på neste',
        'Fergen er allerede på vei',
      ], seed), sub: pick([
        'Gangavstanden er for stor til å rekke denne. Vent på neste avgang.' + nextHint(),
        'For langt til å gå i tide. Ta neste avgang og gå uten stress.' + nextHint(),
        'Det er ingen vits å haste. Neste avgang er det realistiske alternativet.' + nextHint(),
      ], seed + 1) };
    }

    return { level: 'bad', label: pick([
      'Denne rekker du ikke',
      'For sent ute til fots',
      'Ikke denne gangen',
      'Ta neste',
    ], seed), sub: pick([
      'Gangtiden overstiger tiden til avgang. Ta neste — det er det rolige valget.' + nextHint(),
      'Du mangler noen minutter. Verken tempo eller optimisme endrer det nå.' + nextHint(),
      'Neste avgang er det realistiske valget. Gå uten stress.' + nextHint(),
      'Fergen stikker uansett. Sikt på neste og spar beina.' + nextHint(),
    ], seed + 1) };
  }

  // === DRIVE MODE ===

  if (margin >= 45) {
    return { level: 'good', label: pick([
      'Du har god tid',
      'Ingen grunn til å stresse',
      'Behagelig margin',
      'Mer enn nok tid',
      'Avslappet situasjon',
      'Du kan senke skuldrene',
    ], seed), sub: pick([
      'Du kan kjøre normalt og har fortsatt tid til parkering og gange til kaia.',
      'Parkering og gange er allerede med i beregningen. Du er godt ute.',
      'God tid — du kan til og med stoppe for å fylle bensin og fortsatt rekke fergen.',
      'Dette er trygg margin. Ingenting å endre på.',
      'Du er tidlig ute. Kjør normalt, parkér uten stress.',
      'Fergen rekker du uansett. Bare kjør normalt.',
    ], seed + 1) };
  }

  if (margin >= 25) {
    return { level: 'good', label: pick([
      'Du rekker fergen',
      'Greit slingringsmonn',
      'Trygg buffer',
      'God sjanse',
      'Dette går bra',
      'Komfortabel margin',
    ], seed), sub: pick([
      'Normalt kjøretempo holder. Husk litt ekstra tid til parkering og gange til kaia.',
      'Komfortabel buffer — ikke naiv, men heller ikke masete.',
      'Kjør normalt, parkér uten å lete for lenge, og du er i rute.',
      'Parkering og gange til kai er dekket med god margin.',
      'God tid. Parkering og gange til kai er allerede dekket — kjør nå.',
      'Du har nok tid til å parkere rolig og gå direkte til kaia.',
    ], seed + 1) };
  }

  if (margin >= 12) {
    return { level: 'good', label: pick([
      'Du rekker det',
      'Litt snug, men greit',
      'Hold tempo',
      'Greit hvis du kjører nå',
      'Realistisk, men stramt',
    ], seed), sub: pick([
      'Dette krever at du kjører nå og parkerer uten lang leting. Marginen er skjør.',
      'Normalt tempo holder — men ikke gjør stans underveis.',
      'Parkering er jokeren her. Finn plass raskt og gå direkte til kaia.',
      'Du rekker det, men dette forutsetter at alt går riktig. Kjør nå.',
      'Snug, men realistisk. Direkte kjøring og rask parkering.',
      'Skjør buffer — kjør direkte og ikke bruk tid på å lete etter parkering.',
    ], seed + 1) };
  }

  if (margin >= 5) {
    return { level: 'warn', label: pick([
      'Det haster',
      'Tidspress',
      'Kjør nå',
      'Lite å gå på',
      'Knapt, men mulig',
      'Skjær gjennom',
    ], seed), sub: pick([
      'Dette er teoretisk mulig, men forutsetter null forsinkelser. Parkering kan avgjøre det.',
      'Kjør nå, parkér på første ledige plass og gå fort. Ikke tid for å lete.',
      'Marginen holder bare hvis alt klaffer. Et rødt lys for mye og du ser fergen fra land.',
      'Du trenger flyt hele veien — direkte kjøring, rask parkering, direkte til kai.',
      'Dette er 50/50. En dårlig parkering og du ser fergen stikke.',
      'Ikke stopp underveis — ikke for mat, drikke eller mobilsjekk. Direkte til kai.',
      'Parkering + gange spiser marginen. Bruk nærmeste plass og gå fort.',
    ], seed + 1) };
  }

  if (margin >= 0) {
    return { level: 'warn', label: pick([
      'Ekstremt knapt',
      'Alt må klaffe nå',
      'Kritisk margin',
      'Sprint-territorium',
      'Nesten for sent',
      'Optimistisk plan',
    ], seed), sub: pick([
      'Dette er på papiret mulig. Null feilmargin — perfekt parkering, direkte til kai.',
      'Du er på grensen. En trafikklys eller saktegående lastebil — og det er over.' + (nextHint() || ' Neste avgang er tryggere.'),
      'Teorien sier du rekker det. Praksis sier det er svært knapt. Parkeringen teller ikke med her.' + nextHint(),
      'Dette holder bare hvis alt går riktig. Ambisiøst.' + (nextHint() || ''),
      'Kjøretiden er akkurat nok — men det er ikke dør-til-dør. Parkering og gange teller.' + nextHint(),
      'Marginen er reell bare i teorien. Én forsinkelse og du ser fergen gå.' + nextHint(),
    ], seed + 1) };
  }

  // Missed — drive
  const shortage = Math.abs(margin);

  if (shortage >= 45) {
    return { level: 'bad', label: pick([
      'Denne rekker du ikke',
      'For lite tid til denne',
      'Sikt på neste avgang',
      'Ikke denne gangen',
    ], seed), sub: pick([
      'Kjøretiden er for lang til å rekke denne. Ta neste og kjør uten stress.' + nextHint(),
      'Det er ingen vits å haste. Neste avgang er det realistiske alternativet.' + nextHint(),
      'Du ville trengt for mye tid. Ta neste — det er det fornuftige valget.' + nextHint(),
    ], seed + 1) };
  }

  return { level: 'bad', label: pick([
    'Denne rekker du ikke',
    'For lite tid',
    'Ikke denne avgangen',
    'Sikt på neste',
  ], seed), sub: pick([
    'Kjøretiden overstiger tiden til avgang. Ta neste — det er det rolige valget.' + nextHint(),
    'Du mangler noen minutter. Hverken tempo eller optimisme endrer det nå.' + nextHint(),
    'Ta neste avgang og kjør uten hast.' + nextHint(),
    'Litt for knapt. Ingen grunn til å stresse — neste avgang er ikke langt unna.' + nextHint(),
    'Du er noen minutter bak. Kjør normalt og ta neste.' + nextHint(),
  ], seed + 1) };
}
