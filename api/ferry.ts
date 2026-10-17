// Vercel-funksjon: siste AIS-posisjon for ferga fra BarentsWatch (Kystverket).
// Krever miljøvariablene BARENTSWATCH_CLIENT_ID og BARENTSWATCH_CLIENT_SECRET
// (gratis API-klient på barentswatch.no, tilgang til AIS). FERRY_MMSI overstyrer fartøyet.

// M/F Humla = GO VAKKER RANDI, erstatningsferge mens M/F Jutøya er på verksted
const HUMLA_MMSI = '257281900';
const JUTOYA_MMSI = '257207800';
const HUMLA_FROM = '2026-10-17', HUMLA_TO = '2027-02-28'; // samme periode som isMaintenancePeriod

function defaultMmsi(): string {
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
  return today >= HUMLA_FROM && today <= HUMLA_TO ? HUMLA_MMSI : JUTOYA_MMSI;
}

const TOKEN_URL = 'https://id.barentswatch.no/connect/token';
const AIS_BASE = 'https://live.ais.barentswatch.no';

interface AisMessage {
  mmsi?: number;
  msgtime?: string;
  latitude?: number;
  longitude?: number;
  speedOverGround?: number;
  courseOverGround?: number;
  trueHeading?: number;
  navigationalStatus?: number;
  name?: string;
}

let cachedToken: { value: string; expires: number } | null = null;

function json(body: unknown, status: number, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': cacheSeconds > 0
        ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
        : 'no-store',
    },
  });
}

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'ais',
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in?: number };
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

// Nyeste melding med posisjon for MMSI-en
function latestPosition(messages: AisMessage[], mmsi: number): AisMessage | null {
  let best: AisMessage | null = null;
  for (const m of messages) {
    if (m.mmsi !== mmsi || typeof m.latitude !== 'number' || typeof m.longitude !== 'number') continue;
    if (!best || (m.msgtime ?? '') > (best.msgtime ?? '')) best = m;
  }
  return best;
}

async function fetchPosition(token: string, mmsi: number): Promise<AisMessage | null> {
  const auth = { authorization: `Bearer ${token}` };
  // Filtrert oppslag på MMSI
  const res = await fetch(`${AIS_BASE}/v1/latest/ais`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ mmsi: [mmsi], includePosition: true, includeStatic: false }),
  });
  if (res.ok) {
    const found = latestPosition(await res.json() as AisMessage[], mmsi);
    if (found) return found;
  }
  // Reserve: siste posisjon for alle fartøy, filtrert her
  const all = await fetch(`${AIS_BASE}/v1/latest/combined?modelType=Simple`, { headers: auth });
  if (!all.ok) throw new Error(`ais ${res.status}/${all.status}`);
  return latestPosition(await all.json() as AisMessage[], mmsi);
}

export async function GET(): Promise<Response> {
  const clientId = process.env.BARENTSWATCH_CLIENT_ID;
  const clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return json({ error: 'not_configured' }, 503, 300);

  const mmsi = Number(process.env.FERRY_MMSI || defaultMmsi());
  try {
    const token = await getToken(clientId, clientSecret);
    const pos = await fetchPosition(token, mmsi);
    if (!pos) return json({ error: 'no_position', mmsi }, 404, 60);
    return json({
      mmsi,
      lat: pos.latitude,
      lng: pos.longitude,
      sog: pos.speedOverGround ?? null,
      cog: pos.courseOverGround ?? null,
      heading: pos.trueHeading != null && pos.trueHeading < 360 ? pos.trueHeading : null,
      time: pos.msgtime ?? null,
    }, 200, 20);
  } catch (e) {
    cachedToken = null;
    return json({ error: 'upstream', detail: e instanceof Error ? e.message : String(e) }, 502);
  }
}
