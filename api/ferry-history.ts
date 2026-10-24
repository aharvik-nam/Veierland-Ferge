// Vercel-funksjon: fergens AIS-spor de siste dagene fra BarentsWatch (historikk-API, maks 14 dager tilbake),
// gjort om til anløp per kai. Brukes til å sammenligne faktiske avganger med rutetabellen (punktlighet).
//
//   /api/ferry-history?from=2026-10-17&to=2026-10-24     anløp per dag (norske datoer, til og med «to»)
//   /api/ferry-history?day=2026-10-23&raw=1              alle AIS-punkter for én dag (feilsøking)
//   valgfritt: radius=250 (meter fra kaia), mmsi=257281900
//
// Krever de samme miljøvariablene som /api/ferry: BARENTSWATCH_CLIENT_ID og BARENTSWATCH_CLIENT_SECRET.

const HUMLA_MMSI = '257281900';
const JUTOYA_MMSI = '257207800';
const TOKEN_URL = 'https://id.barentswatch.no/connect/token';
const HISTORIC_BASE = 'https://historic.ais.barentswatch.no';

// Kaiene (samme som stopCoords i src/data.ts)
const QUAYS: Record<string, { lat: number; lng: number }> = {
  tenvik: { lat: 59.1744256064253, lng: 10.364987204418728 },
  vestgarden: { lat: 59.16496191981857, lng: 10.343429236051696 },
  tangen: { lat: 59.15344925258157, lng: 10.33775055215706 },
  engo: { lat: 59.147476312611, lng: 10.31832985729631 },
};

interface Point { t: number; lat: number; lng: number; sog: number | null }

let cachedToken: { value: string; expires: number } | null = null;

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}` : 'no-store',
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

function nearestQuay(p: Point, radius: number): string | null {
  let best: string | null = null, bestD = radius;
  for (const [name, q] of Object.entries(QUAYS)) {
    const d = distM(p, q);
    if (d <= bestD) { best = name; bestD = d; }
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
    points.push({ t: Date.parse(time), lat, lng, sog: typeof sog === 'number' ? sog : null });
  }
  return points.sort((a, b) => a.t - b.t);
}

// Gjør punktene om til anløp: når båten kom til og forlot hver kai.
// arr = [siste punkt underveis, første punkt ved kaia], dep = [siste punkt ved kaia, første punkt underveis]
function portCalls(points: Point[], radius: number) {
  const calls: { stop: string; arr: [string | null, string]; dep: [string, string | null]; n: number }[] = [];
  let cur: { stop: string; first: Point; last: Point; before: Point | null; n: number } | null = null;
  let prev: Point | null = null;
  for (const p of points) {
    // Ved kaia: innenfor radius og (nesten) stille. Uten fart i meldingen holder det å være innenfor radius.
    const quay = nearestQuay(p, radius);
    const atQuay = quay && (p.sog == null || p.sog < 2) ? quay : null;
    if (atQuay && cur && cur.stop === atQuay) { cur.last = p; cur.n++; }
    else {
      if (cur) calls.push(finish(cur, p));
      cur = atQuay ? { stop: atQuay, first: p, last: p, before: prev, n: 1 } : null;
    }
    prev = p;
  }
  if (cur) calls.push(finish(cur, null));
  return calls;

  function finish(c: NonNullable<typeof cur>, after: Point | null) {
    return {
      stop: c.stop,
      arr: [c.before ? oslo(c.before.t).time : null, oslo(c.first.t).time] as [string | null, string],
      dep: [oslo(c.last.t).time, after ? oslo(after.t).time : null] as [string, string | null],
      n: c.n,
    };
  }
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

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const mmsi = q.get('mmsi') || HUMLA_MMSI;
  if (mmsi !== HUMLA_MMSI && mmsi !== JUTOYA_MMSI) return json({ error: 'unknown_mmsi' }, 400);
  const radius = Math.min(Math.max(Number(q.get('radius')) || 250, 50), 1000);
  const today = oslo(Date.now()).date;
  const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  try {
    const token = await getToken();

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
        return { day, ...gapStats(points), calls: portCalls(points, radius) };
      } catch (e) {
        return { day, error: e instanceof Error ? e.message : String(e), detail: (e as { detail?: unknown }).detail };
      }
    }));
    return json({ mmsi, radius, days: result }, 200, 600);
  } catch (e) {
    cachedToken = null;
    return json({ error: e instanceof Error ? e.message : String(e), detail: (e as { detail?: unknown }).detail }, 502);
  }
}
