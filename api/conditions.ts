// Vercel-funksjon: vær og sjø ved Veierland til fergedisplayet i appen (iPad/PC).
//   MET Norge (api.met.no): locationforecast (vind, vindkast, tåke, nedbør), oceanforecast (bølger,
//   sjøtemperatur), metalerts (farevarsler). Kartverket: vannstand i forhold til middelvann.
// Ingen nøkler trengs. MET krever at vi sier hvem vi er i User-Agent.
//   /api/conditions           samlet svar (cache 10 min)
//   /api/conditions?debug=1   viser status for hver kilde

const UA = 'VeierlandFerge/1.0 (+https://jutoya.veierland.org)';
const WEATHER = { lat: 59.1617, lon: 10.3455 };   // Tenvik–Veierland
const SEA = { lat: 59.1600, lon: 10.3380 };       // åpent vann mellom Veierland og Langø
const TIDE_BASES = ['https://vannstand.kartverket.no/tideapi.php', 'https://api.sehavniva.no/tideapi.php'];

function json(body: unknown, status: number, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 3}` : 'no-store',
    },
  });
}

type Log = Record<string, string | number>;

async function get(url: string, log: Log, key: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json, application/xml, text/xml' } });
    log[key] = res.status;
    return res.ok ? res : null;
  } catch (e) {
    log[key] = String(e);
    return null;
  }
}

// Time for time: vind, kast, retning, temperatur, nedbør og symbol de neste 12 timene
async function weather(log: Log) {
  const res = await get(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${WEATHER.lat}&lon=${WEATHER.lon}`, log, 'weather');
  if (!res) return null;
  const data = await res.json() as { properties: { timeseries: { time: string; data: Record<string, any> }[] } };
  const now = Date.now();
  const series = data.properties.timeseries.filter(e => Date.parse(e.time) > now - 3600_000).slice(0, 13);
  const pick = (e: { time: string; data: Record<string, any> }) => {
    const d = e.data.instant.details;
    return {
      time: e.time,
      temp: d.air_temperature ?? null,
      wind: d.wind_speed ?? null,
      gust: d.wind_speed_of_gust ?? null,
      dir: d.wind_from_direction ?? null,
      fog: d.fog_area_fraction ?? null,
      precip: e.data.next_1_hours?.details?.precipitation_amount ?? null,
      symbol: e.data.next_1_hours?.summary?.symbol_code ?? null,
    };
  };
  return series.length ? { now: pick(series[0]), hours: series.slice(1).map(pick) } : null;
}

// Bølger og sjøtemperatur (nærmeste havpunkt i modellen)
async function ocean(log: Log) {
  const res = await get(`https://api.met.no/weatherapi/oceanforecast/2.0/complete?lat=${SEA.lat}&lon=${SEA.lon}`, log, 'ocean');
  if (!res) return null;
  const data = await res.json() as { geometry?: { coordinates: number[] }; properties?: { timeseries?: { time: string; data: Record<string, any> }[] } };
  const now = Date.now();
  const e = data.properties?.timeseries?.find(x => Date.parse(x.time) > now - 3600_000);
  if (!e) return null;
  const d = e.data.instant.details;
  return {
    time: e.time,
    waveHeight: d.sea_surface_wave_height ?? null,
    waveFrom: d.sea_surface_wave_from_direction ?? null,
    seaTemp: d.sea_water_temperature ?? null,
    current: d.sea_water_speed ?? null,
    currentTo: d.sea_water_to_direction ?? null,
    point: data.geometry?.coordinates ?? null,
  };
}

// Farevarsler som gjelder området nå (kuling, sterk vind, stormflo …)
async function alerts(log: Log) {
  const res = await get(`https://api.met.no/weatherapi/metalerts/2.0/current.json?lat=${SEA.lat}&lon=${SEA.lon}`, log, 'alerts');
  if (!res) return null;
  const data = await res.json() as { features?: { properties: Record<string, any>; when?: { interval?: string[] } }[] };
  return (data.features ?? []).map(f => {
    const p = f.properties;
    const level = String(p.awareness_level ?? p.riskMatrixColor ?? '').toLowerCase();
    return {
      title: p.title ?? p.eventAwarenessName ?? '',
      event: p.event ?? '',
      name: p.eventAwarenessName ?? '',
      level: level.includes('red') ? 'red' : level.includes('orange') ? 'orange' : 'yellow',
      area: p.area ?? '',
      from: f.when?.interval?.[0] ?? null,
      to: f.when?.interval?.[1] ?? null,
      description: p.description ?? '',
    };
  });
}

// Vannstand i cm over middelvann: målt nå (nærmeste stasjon) og varsel med værets virkning
async function water(log: Log) {
  const fmt = (t: number) => new Date(t).toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 16).replace(' ', 'T');
  const now = Date.now();
  const q = new URLSearchParams({
    tide_request: 'locationdata', lat: String(SEA.lat), lon: String(SEA.lon), datatype: 'all', refcode: 'msl',
    fromtime: fmt(now - 2 * 3600_000), totime: fmt(now + 3 * 3600_000), interval: '10', lang: 'nb', dst: '1', tzone: '1', place: '', file: '',
  });
  let xml: string | null = null;
  for (const [i, base] of TIDE_BASES.entries()) {
    const res = await get(`${base}?${q}`, log, `water${i}`);
    if (res) { xml = await res.text(); break; }
  }
  if (!xml) return null;
  const series = (type: string) => {
    const block = xml!.match(new RegExp(`<data type="${type}"[^>]*>([\\s\\S]*?)</data>`))?.[1] ?? '';
    return [...block.matchAll(/<waterlevel value="(-?[\d.]+)" time="([^"]+)"/g)].map(m => ({ v: Number(m[1]), t: Date.parse(m[2]) }));
  };
  const obs = series('observation'), fc = series('forecast').length ? series('forecast') : series('prediction');
  const at = (s: { v: number; t: number }[], t: number) => s.reduce<{ v: number; t: number } | null>((b, p) => (!b || Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b), null);
  const lastObs = obs.filter(p => p.t <= now).pop() ?? null;
  const nowFc = at(fc, now), inHour = at(fc, now + 3600_000);
  const nowVal = lastObs && now - lastObs.t < 30 * 60_000 ? lastObs.v : nowFc?.v ?? null;
  if (nowVal == null) { log.waterParse = xml.slice(0, 300); return null; }
  const diff = nowFc && inHour ? inHour.v - nowFc.v : 0;
  return {
    cm: Math.round(nowVal),
    measured: nowVal === lastObs?.v,
    trend: diff > 2 ? 'stigende' : diff < -2 ? 'synkende' : 'stabil',
    station: xml.match(/obsname="([^"]*)"/)?.[1] ?? xml.match(/<location name="([^"]*)"/)?.[1] ?? null,
  };
}

export async function GET(request: Request): Promise<Response> {
  const debug = new URL(request.url).searchParams.has('debug');
  const log: Log = {};
  const [w, o, a, wl] = await Promise.all([weather(log), ocean(log), alerts(log), water(log)].map(p => p.catch(e => { log.error = String(e); return null; })));
  return json({ generated: new Date().toISOString(), weather: w, ocean: o, alerts: a ?? [], water: wl, ...(debug ? { log } : {}) }, 200, debug ? 0 : 600);
}
