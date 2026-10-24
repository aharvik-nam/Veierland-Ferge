// Vercel-funksjon: fergens AIS-spor de siste dagene fra BarentsWatch (historikk-API, maks 14 dager tilbake),
// gjort om til anløp per kai. Brukes til å sammenligne faktiske avganger med rutetabellen (punktlighet).
//
//   /api/ferry-history?from=2026-10-17&to=2026-10-24     anløp per dag (norske datoer, til og med «to»)
//   /api/ferry-history?day=2026-10-23&raw=1              alle AIS-punkter for én dag (feilsøking)
//   valgfritt: radius=… (meter fra kaia, overstyrer kaienes egne), compact=1 (kortere svar), mmsi=257281900
//   /api/ferry-history?stats=1                            punktlighet siste 14 dager per avgang og samlet (for appen)
//   /api/ferry-history?live=1                             dagens anløp og siste posisjon (for «forsinket nå» i appen)
//                                                         siste posisjon tas fra sanntids-API-et, som er sekunder gammelt
//
// Krever de samme miljøvariablene som /api/ferry: BARENTSWATCH_CLIENT_ID og BARENTSWATCH_CLIENT_SECRET.

const HUMLA_MMSI = '257281900';
const JUTOYA_MMSI = '257207800';
const TOKEN_URL = 'https://id.barentswatch.no/connect/token';
const HISTORIC_BASE = 'https://historic.ais.barentswatch.no';
const LIVE_BASE = 'https://live.ais.barentswatch.no';

// Der ferga faktisk ligger til kai (målt fra AIS-sporet 23.10.2026). Fortøyd ligger den innenfor 5–10 m
// av punktet, så innenfor 30 m regnes som ved kaia, og utenfor 30 m har den gått. Et anløp krever at den
// faktisk stoppet (under stopSog knop), så forbikjøring telles ikke. Engø-stoppene er korte og mindre presise.
const QUAYS: Record<string, { lat: number; lng: number; radius: number; stopSog: number }> = {
  tenvik: { lat: 59.17436, lng: 10.36493, radius: 30, stopSog: 1.5 },
  vestgarden: { lat: 59.16491, lng: 10.34331, radius: 30, stopSog: 1.5 },
  tangen: { lat: 59.15352, lng: 10.33655, radius: 30, stopSog: 1.5 },
  engo: { lat: 59.14765, lng: 10.31865, radius: 60, stopSog: 4.5 },
};

interface Point { t: number; lat: number; lng: number; sog: number | null; cog: number | null }

let cachedToken: { value: string; expires: number } | null = null;

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      // Lange cacher kan gi gamle svar mens nye hentes; korte (live) skal alltid være ferske
      'cache-control': cacheSeconds >= 600 ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 24}`
        : cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}` : 'no-store',
    },
  });
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const rawId = process.env.BARENTSWATCH_CLIENT_ID?.trim();
  let clientId = rawId;
  try { if (rawId?.includes('%')) clientId = decodeURIComponent(rawId); } catch { /* bruk som den er */ }
  const clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('not_configured');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: 'ais', grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in?: number };
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

// Norsk dato og klokkeslett for et tidspunkt
const osloFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
function oslo(t: number): { date: string; time: string } {
  const s = osloFmt.format(new Date(t)); // «2026-10-23 07:05:12»
  return { date: s.slice(0, 10), time: s.slice(11, 19) };
}

// Midnatt norsk tid for en dato, som UTC-tidspunkt
function osloMidnight(date: string): number {
  const guess = Date.parse(`${date}T00:00:00Z`);
  const { date: d, time } = oslo(guess);
  const shown = Date.parse(`${d}T${time}Z`);
  return guess - (shown - guess);
}

function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestQuay(p: Point, radius?: number): string | null {
  let best: string | null = null, bestD = Infinity;
  for (const [name, q] of Object.entries(QUAYS)) {
    const d = distM(p, q);
    if (d <= (radius ?? q.radius) && d < bestD) { best = name; bestD = d; }
  }
  return best;
}

// Henter sporet for en periode. Formatet på svaret er ikke dokumentert her, så feltene leses fleksibelt.
async function fetchTrack(token: string, mmsi: string, from: number, to: number): Promise<Point[]> {
  const url = `${HISTORIC_BASE}/v1/historic/tracks/${mmsi}/${new Date(from).toISOString().slice(0, 19)}Z/${new Date(to).toISOString().slice(0, 19)}Z`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`historic ${res.status}`), { detail: { url, status: res.status, body: body.slice(0, 600) } });
  }
  const data = await res.json() as unknown;
  const list = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? []) as Record<string, unknown>[];
  const points: Point[] = [];
  for (const m of list) {
    const lat = (m.latitude ?? m.lat) as number | undefined;
    const lng = (m.longitude ?? m.lon ?? m.lng) as number | undefined;
    const time = (m.msgtime ?? m.timestamp ?? m.time) as string | undefined;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !time) continue;
    const sog = (m.speedOverGround ?? m.sog) as number | undefined;
    const cog = (m.courseOverGround ?? m.cog) as number | undefined;
    points.push({ t: Date.parse(time), lat, lng, sog: typeof sog === 'number' ? sog : null, cog: typeof cog === 'number' && cog < 360 ? cog : null });
  }
  return points.sort((a, b) => a.t - b.t);
}

// Anløp: når båten kom til og forlot hver kai.
// before = siste punkt underveis før kaia, first/last = første og siste punkt ved kaia, after = første punkt etterpå
interface Call { stop: string; before: Point | null; first: Point; last: Point; after: Point | null; n: number; minSog: number | null }

export function rawCalls(points: Point[], radius?: number): Call[] {
  // Sammenhengende punkter nær samme kai
  const segments: Call[] = [];
  let cur: Call | null = null;
  let prev: Point | null = null;
  for (const p of points) {
    const quay = nearestQuay(p, radius);
    if (quay && cur && cur.stop === quay) {
      cur.last = p; cur.n++;
      if (p.sog != null) cur.minSog = cur.minSog == null ? p.sog : Math.min(cur.minSog, p.sog);
    } else {
      if (cur) { cur.after = p; segments.push(cur); }
      cur = quay ? { stop: quay, before: prev, first: p, last: p, after: null, n: 1, minSog: p.sog } : null;
    }
    prev = p;
  }
  if (cur) segments.push(cur);

  // Bare der båten faktisk stoppet, og korte avbrudd ved samme kai (GPS-støy) slås sammen
  const calls: Call[] = [];
  for (const seg of segments) {
    if (seg.minSog != null && seg.minSog >= QUAYS[seg.stop].stopSog) continue;
    const last = calls[calls.length - 1];
    if (last && last.stop === seg.stop && seg.first.t - last.last.t <= 180_000) {
      last.last = seg.last; last.after = seg.after; last.n += seg.n;
      continue;
    }
    calls.push({ ...seg });
  }
  return calls;
}

// arr = [siste punkt underveis, første punkt ved kaia], dep = [siste punkt ved kaia, første punkt underveis]
function portCalls(points: Point[], radius?: number) {
  return rawCalls(points, radius).map(c => ({
    stop: c.stop,
    arr: [c.before ? oslo(c.before.t).time : null, oslo(c.first.t).time] as [string | null, string],
    dep: [oslo(c.last.t).time, c.after ? oslo(c.after.t).time : null] as [string, string | null],
    n: c.n,
  }));
}

// Minutter etter midnatt norsk tid
function osloMin(t: number): number {
  const [h, m, s] = oslo(t).time.split(':').map(Number);
  return h * 60 + m + s / 60;
}

// Avgangstidspunkt: midt mellom siste punkt ved kaia og første punkt underveis (punktene kommer ca. hvert minutt)
function departedAt(c: Call): number | null {
  if (!c.after) return null;
  const gap = c.after.t - c.last.t;
  return osloMin(gap < 180_000 ? c.last.t + gap / 2 : c.last.t);
}

function gapStats(points: Point[]) {
  const gaps = points.slice(1).map((p, i) => (p.t - points[i].t) / 1000).sort((a, b) => a - b);
  return {
    points: points.length,
    medianGapSec: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null,
    maxGapSec: gaps.length ? Math.round(gaps[gaps.length - 1]) : null,
    gapsOver5min: gaps.filter(g => g > 300).length,
  };
}

// ── Punktlighet ─────────────────────────────────────────────

type Loop = Record<string, string | null | undefined>;
interface DayLoops { monFri: Loop[]; sat: Loop[]; sun: Loop[] }
interface Timetable {
  timesFrom?: string;
  periods: { from: string; to: string; loops: DayLoops }[];
  summer: { from: string; to: string; loops: DayLoops };
  normal: { loops: DayLoops };
}

const dayKey = (day: string) => { const w = new Date(`${day}T12:00:00Z`).getUTCDay(); return w === 0 ? 'sun' : w === 6 ? 'sat' : 'monFri'; };
const hm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

// Samme rekkefølge som appen: daterte perioder (Humla), så sommer, så ordinære ruter
function loopsForDate(tt: Timetable, day: string): Loop[] {
  const period = tt.periods.find(p => day >= p.from && day <= p.to);
  const md = day.slice(5);
  const set = period?.loops ?? (md >= tt.summer.from && md <= tt.summer.to ? tt.summer.loops : tt.normal.loops);
  return set[dayKey(day) as keyof DayLoops] ?? [];
}

// Planlagte avganger fra hver kai i turene. Bestillingsavganger går bare ved behov og telles ikke.
const DEPARTURES: [string, string][] = [
  ['tenvikUt', 'tenvik'], ['vestgardenUt', 'vestgarden'], ['tangenVia', 'tangen'], ['engoUt', 'engo'],
  ['tangenInn', 'tangen'], ['engoInn', 'engo'], ['vestgardenInn', 'vestgarden'],
];

// Forsinkelse i minutter per planlagt avgang en dag (bare avganger som kan sees i AIS)
export function dayDelays(tt: Timetable, day: string, calls: Call[], untilMin: number): { key: string; delay: number }[] {
  const deps = calls.map(c => ({ stop: c.stop, arr: osloMin(c.first.t), t: departedAt(c), used: false }));
  const planned: { stop: string; p: number; key: string; before?: number }[] = [];
  for (const l of loopsForDate(tt, day)) {
    if (l.rowType === 'booking') continue;
    // Uten Engø-anløp (rød avgang uten bestilling) blir båten liggende på Tangen: hopp over Engø-delen
    const engo = l.engoUt ? deps.find(d => d.stop === 'engo' && d.arr >= hm(l.engoUt!) - 10 && d.arr <= hm(l.engoUt!) + 25) : null;
    for (const [field, stop] of DEPARTURES) {
      const time = l[field];
      if (!time) continue;
      if ((field === 'engoUt' || field === 'tangenVia') && !engo) continue;
      const p = hm(time);
      if (p + 25 > untilMin) continue; // ikke ferdig ennå i dag
      // Tangen mot Engø må ha gått før båten kom til Engø (noen dager går den rett fra Tenvik til Engø)
      planned.push({ stop, p, key: `${dayKey(day)}|${stop}|${time}`, before: field === 'tangenVia' ? engo!.arr : undefined });
    }
  }
  planned.sort((a, b) => a.p - b.p);
  const out: { key: string; delay: number }[] = [];
  for (const pl of planned) {
    let best: typeof deps[number] | null = null;
    for (const d of deps) {
      if (d.used || d.t == null || d.stop !== pl.stop || d.t < pl.p - 5 || d.t > pl.p + 25) continue;
      if (pl.before != null && d.t > pl.before) continue;
      if (!best || Math.abs(d.t - pl.p) < Math.abs(best.t! - pl.p)) best = d;
    }
    if (best) { best.used = true; out.push({ key: pl.key, delay: Math.round(best.t! - pl.p) }); }
  }
  return out;
}

function summarize(delays: number[]) {
  const clamped = delays.map(d => Math.max(-2, Math.min(30, d)));
  return {
    n: delays.length,
    avg: Math.round(clamped.reduce((a, b) => a + b, 0) / Math.max(1, delays.length) * 10) / 10,
    onTime: delays.filter(d => d <= 3).length, // gikk innen 3 min etter rutetid
  };
}

async function punctuality(request: Request, token: string, mmsi: string, radius?: number): Promise<Response> {
  const res = await fetch(new URL('/timetable.json', request.url));
  if (!res.ok) throw new Error(`timetable ${res.status}`);
  const tt = await res.json() as Timetable;
  const now = Date.now(), today = oslo(now).date;
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = oslo(now - i * 86_400_000).date;
    if (!tt.timesFrom || day >= tt.timesFrom) days.push(day);
  }
  const perDay = await Promise.all(days.map(async day => {
    const from = osloMidnight(day);
    try {
      const points = await fetchTrack(token, mmsi, from, Math.min(from + 86_400_000, now));
      return dayDelays(tt, day, rawCalls(points, radius), day === today ? osloMin(now) : 24 * 60);
    } catch { return []; }
  }));
  const byKey = new Map<string, number[]>();
  for (const { key, delay } of perDay.flat()) (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(delay);
  return json({
    generated: new Date(now).toISOString(),
    timesFrom: tt.timesFrom ?? null,
    days,
    overall: summarize(perDay.flat().map(d => d.delay)),
    departures: Object.fromEntries([...byKey].map(([k, v]) => [k, summarize(v)])),
  }, 200, 3600);
}

// Siste posisjon fra sanntids-API-et (sekunder gammel, mens historikken henger ca. ett minutt etter)
async function fetchLatest(token: string, mmsi: string): Promise<Point | null> {
  try {
    const res = await fetch(`${LIVE_BASE}/v1/latest/ais`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ mmsi: [Number(mmsi)], includePosition: true, includeStatic: false }),
    });
    if (!res.ok) return null;
    let best: Point | null = null;
    for (const m of await res.json() as Record<string, unknown>[]) {
      if (String(m.mmsi) !== mmsi || typeof m.latitude !== 'number' || typeof m.longitude !== 'number' || typeof m.msgtime !== 'string') continue;
      const p: Point = { t: Date.parse(m.msgtime), lat: m.latitude, lng: m.longitude,
        sog: typeof m.speedOverGround === 'number' ? m.speedOverGround : null,
        cog: typeof m.courseOverGround === 'number' && m.courseOverGround < 360 ? m.courseOverGround : null };
      if (!best || p.t > best.t) best = p;
    }
    return best;
  } catch { return null; }
}

// Dagens anløp og siste posisjon, så appen kan si om ferga har gått fra kaia ennå
async function live(token: string, mmsi: string, radius?: number): Promise<Response> {
  const now = Date.now(), day = oslo(now).date;
  const [points, latest] = await Promise.all([fetchTrack(token, mmsi, osloMidnight(day), now), fetchLatest(token, mmsi)]);
  if (latest && oslo(latest.t).date === day && (!points.length || latest.t > points[points.length - 1].t)) points.push(latest);
  const last = points[points.length - 1];
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return json({
    day,
    now: r1(osloMin(now)),
    latest: last ? { min: r1(osloMin(last.t)), lat: last.lat, lng: last.lng, sog: last.sog, cog: last.cog } : null,
    // arr/dep i minutter etter midnatt; dep er null mens båten fortsatt ligger ved kaia
    calls: rawCalls(points, radius).slice(-6).map(c => ({ stop: c.stop, arr: r1(osloMin(c.first.t)), dep: departedAt(c) == null ? null : r1(departedAt(c)!) })),
  }, 200, 10);
}

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const mmsi = q.get('mmsi') || HUMLA_MMSI;
  if (mmsi !== HUMLA_MMSI && mmsi !== JUTOYA_MMSI) return json({ error: 'unknown_mmsi' }, 400);
  const radius = q.get('radius') ? Math.min(Math.max(Number(q.get('radius')) || 30, 10), 1000) : undefined;
  const today = oslo(Date.now()).date;
  const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  try {
    const token = await getToken();
    if (q.get('stats')) return await punctuality(request, token, mmsi, radius);
    if (q.get('live')) return await live(token, mmsi, radius);

    if (q.get('raw')) {
      const day = q.get('day');
      if (!isDate(day)) return json({ error: 'day=yyyy-mm-dd mangler' }, 400);
      const from = osloMidnight(day);
      const points = await fetchTrack(token, mmsi, from, Math.min(from + 86_400_000, Date.now()));
      return json({
        mmsi, day, ...gapStats(points),
        // [klokkeslett, bredde, lengde, fart i knop, nærmeste kai]
        track: points.map(p => [oslo(p.t).time, +p.lat.toFixed(5), +p.lng.toFixed(5), p.sog, nearestQuay(p, radius)]),
      }, 200, 600);
    }

    const fromDate = isDate(q.get('from')) ? q.get('from')! : oslo(Date.now() - 7 * 86_400_000).date;
    const toDate = isDate(q.get('to')) ? q.get('to')! : today;
    const days: string[] = [];
    for (let d = Date.parse(`${fromDate}T12:00:00Z`); days.length < 15; d += 86_400_000) {
      const day = new Date(d).toISOString().slice(0, 10);
      if (day > toDate) break;
      days.push(day);
    }
    const result = await Promise.all(days.map(async day => {
      const from = osloMidnight(day);
      if (from > Date.now()) return { day, error: 'future' };
      try {
        const points = await fetchTrack(token, mmsi, from, Math.min(from + 86_400_000, Date.now()));
        const calls = portCalls(points, radius);
        // compact=1: «kai ankomst avgang» per anløp, for å holde svaret lite
        return { day, ...gapStats(points), calls: q.get('compact') ? calls.map(c => `${c.stop} ${c.arr[1]} ${c.dep[0]}`) : calls };
      } catch (e) {
        return { day, error: e instanceof Error ? e.message : String(e), detail: (e as { detail?: unknown }).detail };
      }
    }));
    return json({ mmsi, radius: radius ?? 'per kai', days: result }, 200, 600);
  } catch (e) {
    cachedToken = null;
    return json({ error: e instanceof Error ? e.message : String(e), detail: (e as { detail?: unknown }).detail }, 502);
  }
}
