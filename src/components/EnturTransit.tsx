import React, { useEffect, useState, useRef } from 'react';
import { Icon } from './Icons';
import { stopCoords, fmtCountdown, ymd, getOsloDate, parseTime } from '../ferryData';
import type { StopId, Trip } from '../types';

// ── Types ────────────────────────────────────────────────────

interface Leg {
  mode: string;
  line?: { publicCode?: string; name?: string };
  fromPlace: { name: string };
  toPlace: { name: string };
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
}

interface TripPattern {
  expectedStartTime: string;
  expectedEndTime: string;
  duration: number;
  legs: Leg[];
}

// ── Helpers ──────────────────────────────────────────────────

const MODE_LABEL: Record<string, string> = {
  bus: 'Buss', rail: 'Tog', tram: 'Trikk', metro: 'T-bane', foot: 'Gange', water: 'Båt',
};

const MODE_ICON: Record<string, string> = {
  bus: '🚌', rail: '🚂', tram: '🚋', metro: '🚇', foot: '🚶', water: '⛴️',
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minsFromNow(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function fmtDur(secs: number): string {
  const m = Math.round(secs / 60);
  const h = Math.floor(m / 60), r = m % 60;
  return h > 0 ? `${h}t ${r > 0 ? r + ' min' : ''}`.trim() : `${m} min`;
}

function transitConnection(arrivalIso: string, ferries: Trip[]): {
  catches: boolean;
  ferryTime: string;
  label: string;
  urgent: boolean;
} | null {
  const arrOslo = new Date(new Date(arrivalIso).toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
  const arrDate = ymd(arrOslo);
  const arrMins = arrOslo.getHours() * 60 + arrOslo.getMinutes();
  const reachable = ferries.filter(f => f.dateStr === arrDate && parseTime(f.startTime) > arrMins);
  if (reachable.length === 0) return null;
  const next = reachable[0];
  const buffer = parseTime(next.startTime) - arrMins;
  return {
    catches: true,
    ferryTime: next.startTime,
    label: buffer >= 10
      ? `Rekker ferge kl. ${next.startTime} — ${buffer} min buffer`
      : buffer >= 3
      ? `Rekker ferge kl. ${next.startTime} — knapt`
      : `Ferge kl. ${next.startTime} — svært knapt`,
    urgent: buffer < 10,
  };
}

// ── Entur fetch ──────────────────────────────────────────────

const ENTUR_URL = 'https://api.entur.io/journey-planner/v3/graphql';
const CLIENT_NAME = 'aharvik-veierlandferge';

async function fetchTransit(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  dateTime?: string,
): Promise<TripPattern[]> {
  const dtArg = dateTime ? `\n      dateTime: "${dateTime}"` : '';
  const query = `{
    trip(
      from: { coordinates: { latitude: ${fromLat}, longitude: ${fromLng} } }
      to:   { coordinates: { latitude: ${toLat},   longitude: ${toLng}   } }
      numTripPatterns: 3
      walkSpeed: 1.3${dtArg}
    ) {
      tripPatterns {
        expectedStartTime
        expectedEndTime
        duration
        legs {
          mode
          duration
          expectedStartTime
          expectedEndTime
          fromPlace { name }
          toPlace { name }
          line { publicCode name }
        }
      }
    }
  }`;

  const res = await fetch(ENTUR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ET-Client-Name': CLIENT_NAME },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  return json?.data?.trip?.tripPatterns ?? [];
}

// ── Single transit option card ───────────────────────────────

function TransitCard({ pattern, ferries }: { pattern: TripPattern; ferries: Trip[] }) {
  const [open, setOpen] = useState(false);
  const startIn = minsFromNow(pattern.expectedStartTime);
  const conn = transitConnection(pattern.expectedEndTime, ferries);
  const transitLegs = pattern.legs.filter(l => l.mode !== 'foot');

  return (
    <div style={{
      borderRadius: 'var(--radSm)',
      background: 'var(--surfaceAlt)',
      border: conn?.urgent
        ? '1px solid color-mix(in srgb, var(--warn) 45%, transparent)'
        : '1px solid var(--line)',
      overflow: 'hidden',
    }}>
      {/* Clickable summary row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 14px 9px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {/* Left: departure + line badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--num)', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>
              {fmt(pattern.expectedStartTime)}
            </span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--inkDim)' }}>
              {startIn <= 0 ? 'nå' : `om ${fmtCountdown(startIn)}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {transitLegs.map((leg, j) => (
              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, background: 'color-mix(in srgb, var(--accent2) 18%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent2) 30%, transparent)' }}>
                <span style={{ fontSize: 11 }}>{MODE_ICON[leg.mode] ?? '🚌'}</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10.5, color: 'var(--ink)' }}>
                  {leg.line?.publicCode
                    ? `${MODE_LABEL[leg.mode] ?? leg.mode} ${leg.line.publicCode}`
                    : MODE_LABEL[leg.mode] ?? leg.mode}
                </span>
              </span>
            ))}
            {transitLegs.length === 0 && (
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--inkDim)' }}>Gange</span>
            )}
          </div>
        </div>

        {/* Right: arrival + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 10.5, color: 'var(--inkDim)', marginBottom: 1 }}>fremme</div>
            <span style={{ fontFamily: 'var(--num)', fontSize: 20, color: 'var(--accent)', lineHeight: 1 }}>
              {fmt(pattern.expectedEndTime)}
            </span>
          </div>
          <Icon name="chevronRight" size={16} color="var(--inkDim)" stroke={2}
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }} />
        </div>
      </button>

      {/* Expanded leg detail */}
      {open && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pattern.legs.map((leg, j) => (
            <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Mode dot */}
              <div style={{ width: 28, display: 'flex', justifyContent: 'center', paddingTop: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>{MODE_ICON[leg.mode] ?? '🚌'}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>
                    {leg.line?.publicCode
                      ? `${MODE_LABEL[leg.mode] ?? leg.mode} ${leg.line.publicCode}`
                      : MODE_LABEL[leg.mode] ?? leg.mode}
                    {leg.line?.name ? ` · ${leg.line.name}` : ''}
                  </span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--inkDim)', whiteSpace: 'nowrap' }}>
                    {fmtDur(leg.duration)}
                  </span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11.5, color: 'var(--inkDim)', marginTop: 3, lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmt(leg.expectedStartTime)}</span>
                  {' '}{leg.fromPlace.name}
                  {' → '}
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmt(leg.expectedEndTime)}</span>
                  {' '}{leg.toPlace.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ferry connection row */}
      {conn && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px',
          background: conn.urgent
            ? 'color-mix(in srgb, var(--warn) 10%, var(--surface))'
            : 'color-mix(in srgb, var(--good) 10%, var(--surface))',
          borderTop: `1px solid ${conn.urgent
            ? 'color-mix(in srgb, var(--warn) 20%, transparent)'
            : 'color-mix(in srgb, var(--good) 20%, transparent)'}`,
        }}>
          <Icon name="arrowRight" size={13} color={conn.urgent ? 'var(--warn)' : 'var(--good)'} stroke={2.2} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: conn.urgent ? 'var(--warn)' : 'var(--good)', lineHeight: 1.3 }}>
            {conn.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

interface EnturTransitProps {
  userLoc: { lat: number; lng: number } | null;
  stop: StopId;
  ferries: Trip[];
  /** ISO datetime string — pass for future dates so Entur searches from that day */
  dateTime?: string;
}

export function EnturTransit({ userLoc, stop, ferries, dateTime }: EnturTransitProps) {
  const [patterns, setPatterns] = useState<TripPattern[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastFetchRef = useRef<string>('');

  // 5-minute bucket so suggestions refresh over time, not only on movement
  const timeBucket = Math.floor(Date.now() / 300000);

  useEffect(() => {
    if (!userLoc) { setPatterns(null); return; }
    const dest = stopCoords[stop];
    const key = `${userLoc.lat.toFixed(3)},${userLoc.lng.toFixed(3)},${stop},${timeBucket},${dateTime ?? ''}`;
    if (lastFetchRef.current === key) return;
    lastFetchRef.current = key;

    setLoading(true);
    setError(false);
    fetchTransit(userLoc.lat, userLoc.lng, dest.lat, dest.lng, dateTime)
      .then(p => { setPatterns(p); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [userLoc?.lat.toFixed(3), userLoc?.lng.toFixed(3), stop, timeBucket, dateTime]);

  if (!userLoc) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)' }}>
        <Icon name="info" size={16} color="var(--inkDim)" stroke={1.8} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--inkDim)', lineHeight: 1.4 }}>
          Aktiver GPS for å se buss- og togtilbud fra din posisjon
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)' }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--inkDim)' }}>
          Henter avganger fra Entur…
        </span>
      </div>
    );
  }

  if (error || !patterns) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)' }}>
        <Icon name="alert" size={16} color="var(--bad)" stroke={2} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--inkDim)' }}>
          Kunne ikke hente kollektivdata fra Entur
        </span>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div style={{ padding: '13px 14px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)' }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--inkDim)' }}>
          Ingen kollektivtilbud funnet fra din posisjon til kaia
        </span>
      </div>
    );
  }

  // Keep only patterns that haven't departed and connect to a ferry
  const reachablePatterns = (patterns as TripPattern[])
    .filter(p => minsFromNow(p.expectedStartTime) > -1)
    .filter(p => transitConnection(p.expectedEndTime, ferries) !== null);

  // If none connect, show a simple message instead of listing useless options
  if (reachablePatterns.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 'var(--radSm)', background: 'color-mix(in srgb, var(--bad) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--bad) 18%, transparent)' }}>
        <Icon name="info" size={14} color="var(--bad)" stroke={2} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--bad)' }}>
          Rekker ikke fergen
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {reachablePatterns.map((p, i) => (
        <React.Fragment key={i}>
          <TransitCard pattern={p} ferries={ferries} />
        </React.Fragment>
      ))}
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--inkDim)', textAlign: 'center', paddingTop: 2 }}>
        Avganger fra Entur · oppdateres ved posisjonsendring
      </div>
    </div>
  );
}
