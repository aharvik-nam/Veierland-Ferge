// Vercel-funksjon: andre fartøy i kartutsnittet rundt fergeruta, fra BarentsWatch (Kystverkets AIS).
// Brukes av knappen «Andre båter» i fergekartet. Samme API-klient som api/ferry.ts
// (miljøvariablene BARENTSWATCH_CLIENT_ID og BARENTSWATCH_CLIENT_SECRET).
//   /api/vessels           fartøy med posisjon de siste 30 minuttene
//   /api/vessels?debug=1   viser hvilke oppslag mot BarentsWatch som virket

const TOKEN_URL = 'https://id.barentswatch.no/connect/token';
const AIS_BASE = 'https://live.ais.barentswatch.no';
const FERRIES = new Set([257281900, 257207800]); // M/F Humla og M/F Jutøya tegnes for seg
// Kartutsnittet i appen (src/map/kart.ts) med litt margin
const BOX = { latN: 59.19, latS: 59.13, lngW: 10.29, lngE: 10.395 };
const MAX_AGE_MIN = 30;

let cachedToken: { value: string; expires: number } | null = null;

function json(body: unknown, status: number, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}` : 'no-store',
    },
  });
}

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
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

type Msg = Record<string, unknown>;

// AIS-skipstype til en enkel kategori for kartet
function category(t: unknown): string {
  const n = typeof t === 'number' ? t : -1;
  if (n === 30) return 'fiske';
  if (n === 36 || n === 37) return 'fritid';
  if ((n >= 60 && n <= 69) || (n >= 40 && n <= 49)) return 'passasjer';
  if (n >= 70 && n <= 89) return 'last';
  if ((n >= 31 && n <= 33) || (n >= 50 && n <= 59)) return 'arbeid';
  return 'annet';
}

const inBox = (lat: number, lng: number) => lat <= BOX.latN && lat >= BOX.latS && lng >= BOX.lngW && lng <= BOX.lngE;
const polygon = { type: 'Polygon', coordinates: [[[BOX.lngW, BOX.latS], [BOX.lngE, BOX.latS], [BOX.lngE, BOX.latN], [BOX.lngW, BOX.latN], [BOX.lngW, BOX.latS]]] };

// Oppslag vi prøver i rekkefølge: først med områdefilter hos BarentsWatch, så alle fartøy (filtreres her)
const ATTEMPTS: { name: string; path: string; init?: (auth: Record<string, string>) => RequestInit }[] = [
  { name: 'latest/combined POST geometry', path: '/v1/latest/combined', init: auth => ({ method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ geometry: polygon, modelType: 'Full', modelFormat: 'Json' }) }) },
  { name: 'latest/combined GET', path: '/v1/latest/combined?modelType=Full&modelFormat=Json' },
];

export async function GET(request: Request): Promise<Response> {
  const debug = new URL(request.url).searchParams.has('debug');
  const clientId = process.env.BARENTSWATCH_CLIENT_ID, clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return json({ error: 'not_configured' }, 503, 300);
  const log: { name: string; status: number | string; count?: number; inBox?: number; sample?: string[] }[] = [];
  try {
    const auth = { authorization: `Bearer ${await getToken(clientId, clientSecret)}` };
    let messages: Msg[] | null = null;
    for (const a of ATTEMPTS) {
      try {
        const res = await fetch(AIS_BASE + a.path, a.init ? a.init(auth) : { headers: auth });
        if (!res.ok) { log.push({ name: a.name, status: res.status }); continue; }
        const data = await res.json() as unknown;
        const arr = Array.isArray(data) ? data as Msg[] : null;
        const n = arr?.filter(m => typeof m.latitude === 'number' && inBox(m.latitude as number, m.longitude as number)).length;
        log.push({ name: a.name, status: res.status, count: arr?.length, inBox: n, sample: arr?.[0] ? Object.keys(arr[0]).slice(0, 30) : undefined });
        if (arr) { messages = arr; break; }
      } catch (e) { log.push({ name: a.name, status: String(e) }); }
    }
    if (!messages) return json(debug ? { error: 'ais_failed', log } : { error: 'ais_failed' }, 502, 30);

    const now = Date.now();
    const vessels = messages
      .filter(m => typeof m.latitude === 'number' && typeof m.longitude === 'number' && inBox(m.latitude as number, m.longitude as number))
      .filter(m => !FERRIES.has(Number(m.mmsi)))
      .map(m => {
        const t = typeof m.msgtime === 'string' ? Date.parse(m.msgtime) : NaN;
        const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
        const cog = num(m.courseOverGround), hdg = num(m.trueHeading);
        return {
          mmsi: Number(m.mmsi),
          name: typeof m.name === 'string' ? m.name.trim() : '',
          kind: category(m.shipType),
          lat: +(m.latitude as number).toFixed(5),
          lng: +(m.longitude as number).toFixed(5),
          sog: num(m.speedOverGround),
          cog: cog != null && cog < 360 ? cog : null,
          heading: hdg != null && hdg < 360 ? hdg : null,
          length: num(m.shipLength),
          ageMin: isNaN(t) ? null : Math.round((now - t) / 60000),
        };
      })
      .filter(v => v.ageMin != null && v.ageMin <= MAX_AGE_MIN);
    return json({ generated: new Date(now).toISOString(), vessels, ...(debug ? { log } : {}) }, 200, debug ? 0 : 30);
  } catch (e) {
    return json({ error: 'failed', detail: String(e), ...(debug ? { log } : {}) }, 502, 30);
  }
}
