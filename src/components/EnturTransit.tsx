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

/** Oslo arrival date + minutes-of-day for a pattern's end time */
function osloArrival(iso: string): { date: string; mins: number } {
  const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
  return { date: ymd(d), mins: d.getHours() * 60 + d.getMinutes() };
}

/** True if this transit pattern arrives in time to board the target ferry (2 min buffer) */
function hitsTarget(pattern: TripPattern, target: Trip): boolean {
  const { date, mins } = osloArrival(pattern.expectedEndTime);
  return date === target.dateStr && mins <= parseTime(target.startTime) - 2;
}

/** First ferry in the list that this pattern can physically connect to */
function firstReachableFerry(pattern: TripPattern, ferries: Trip[]): Trip | null {
  const { date, mins } = osloArrival(pattern.expectedEndTime);
  return ferries.find(f =>
    f.dateStr > date ||
    (f.dateStr === date && parseTime(f.startTime) >= mins + 2)
  ) ?? null;
}

/** Buffer minutes between transit arrival and target ferry departure */
function bufferMins(pattern: TripPattern, target: Trip): number {
  const { mins } = osloArrival(pattern.expectedEndTime);
  return parseTime(target.startTime) - mins;
}

// ── Entur fetch ──────────────────────────────────────────────

const ENTUR_URL = 'https://api.entur.io/journey-planner/v3/graphql';
const CLIENT_NAME = 'aharvik-veierlandferge';

async function fetchTransit(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  arrivalDeadline: string,
): Promise<TripPattern[]> {
  const query = `{
    trip(
      from: { coordinates: { latitude: ${fromLat}, longitude: ${fromLng} } }
      to:   { coordinates: { latitude: ${toLat},   longitude: ${toLng}   } }
      numTripPatterns: 5
      walkSpeed: 1.3
      dateTime: "${arrivalDeadline}"
      arriveBy: true
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

// ── Transit card ─────────────────────────────────────────────

function TransitCard({ pattern, target, allFerries, isToday }: {
  pattern: TripPattern;
  target: Trip;
  allFerries: Trip[];
  isToday: boolean;
}) {
  const [open, setOpen] = useState(false);
  const startIn = minsFromNow(pattern.expectedStartTime);
  const hits = hitsTarget(pattern, target);
  const buf = hits ? bufferMins(pattern, target) : null;
  const transitLegs = pattern.legs.filter(l => l.mode !== 'foot');

  const connColor = buf == null ? 'var(--inkDim)' : buf >= 10 ? 'var(--good)' : buf >= 3 ? 'var(--warn)' : 'var(--bad)';
  const connBg = buf == null ? 'transparent' : buf >= 10
    ? 'color-mix(in srgb, var(--good) 10%, var(--surface))'
    : buf >= 3
    ? 'color-mix(in srgb, var(--warn) 10%, var(--surface))'
    : 'color-mix(in srgb, var(--bad) 10%, var(--surface))';
  const connBorder = buf == null ? 'transparent' : buf >= 10
    ? 'color-mix(in srgb, var(--good) 20%, transparent)'
    : buf >= 3
    ? 'color-mix(in srgb, var(--warn) 20%, transparent)'
    : 'color-mix(in srgb, var(--bad) 20%, transparent)';

  const connLabel = buf == null ? null
    : buf >= 10 ? `Rekker ferge kl. ${target.startTime} — ${buf} min buffer`
    : buf >= 3  ? `Rekker ferge kl. ${target.startTime} — knapt (${buf} min)`
    : `Ferge kl. ${target.startTime} — svært knapt (${buf} min)`;

  return (
    <div style={{
      borderRadius: 'var(--radSm)',
      background: 'var(--surfaceAlt)',
      border: `1px solid ${buf != null && buf < 10 ? 'color-mix(in srgb, var(--warn) 45%, transparent)' : 'var(--line)'}`,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 14px 9px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--num)', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>
              {fmt(pattern.expectedStartTime)}
            </span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--inkDim)' }}>
              {isToday ? (startIn <= 0 ? 'nå' : `om ${fmtCountdown(startIn)}`) : fmt(pattern.expectedStartTime)}
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

      {open && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pattern.legs.map((leg, j) => (
            <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
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

      {connLabel && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px',
          background: connBg,
          borderTop: `1px solid ${connBorder}`,
        }}>
          <Icon name="arrowRight" size={13} color={connColor} stroke={2.2} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: connColor, lineHeight: 1.3 }}>
            {connLabel}
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
  /** The specific ferry trip this widget targets */
  targetTrip: Trip;
  /** All ferries available (today + tomorrow, or selected day) for fallback lookup */
  allFerries: Trip[];
}

export function EnturTransit({ userLoc, stop, targetTrip, allFerries }: EnturTransitProps) {
  const [patterns, setPatterns] = useState<TripPattern[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastFetchRef = useRef<string>('');

  const isToday = targetTrip.dateStr === ymd(getOsloDate());
  // Arrival deadline = ferry departure time (Entur will find buses arriving by then)
  const arrivalDeadline = `${targetTrip.dateStr}T${targetTrip.startTime}:00`;

  useEffect(() => {
    if (!userLoc) { setPatterns(null); return; }
    const dest = stopCoords[stop];
    const key = `${userLoc.lat.toFixed(3)},${userLoc.lng.toFixed(3)},${stop},${targetTrip.dateStr},${targetTrip.startTime}`;
    if (lastFetchRef.current === key) return;
    lastFetchRef.current = key;

    setLoading(true);
    setError(false);
    fetchTransit(userLoc.lat, userLoc.lng, dest.lat, dest.lng, arrivalDeadline)
      .then(p => { setPatterns(p); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [userLoc?.lat.toFixed(3), userLoc?.lng.toFixed(3), stop, targetTrip.dateStr, targetTrip.startTime]);

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

  const activePatterns = patterns.filter(p => !isToday || minsFromNow(p.expectedStartTime) > -1);

  // Split: patterns that hit the target ferry vs those that don't
  const hitPatterns = activePatterns
    .filter(p => hitsTarget(p, targetTrip))
    .sort((a, b) => bufferMins(a, targetTrip) - bufferMins(b, targetTrip)); // shortest buffer first
  const missPatterns = activePatterns.filter(p => !hitsTarget(p, targetTrip));

  if (hitPatterns.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hitPatterns.map((p, i) => (
          <TransitCard key={i} pattern={p} target={targetTrip} allFerries={allFerries} isToday={isToday} />
        ))}
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--inkDim)', textAlign: 'center', paddingTop: 2 }}>
          Avganger fra Entur · oppdateres automatisk
        </div>
      </div>
    );
  }

  // No pattern hits the target — find the best fallback ferry any pattern can reach
  const fallbackEntries = missPatterns
    .map(p => ({ pattern: p, ferry: firstReachableFerry(p, allFerries) }))
    .filter(e => e.ferry != null) as { pattern: TripPattern; ferry: Trip }[];

  // Pick the fallback with the earliest ferry
  fallbackEntries.sort((a, b) => {
    if (a.ferry.dateStr !== b.ferry.dateStr) return a.ferry.dateStr < b.ferry.dateStr ? -1 : 1;
    return parseTime(a.ferry.startTime) - parseTime(b.ferry.startTime);
  });

  const best = fallbackEntries[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Can't-make-it banner */}
      <div style={{ padding: '10px 14px', borderRadius: 'var(--radSm)', background: 'color-mix(in srgb, var(--bad) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--bad) 20%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="info" size={14} color="var(--bad)" stroke={2} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--bad)' }}>
            Ingen avganger rekker ferge kl. {targetTrip.startTime}
          </span>
        </div>
        {best && (
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--inkDim)', marginTop: 5, lineHeight: 1.4 }}>
            Du kan rekke fergen kl. {best.ferry.startTime}{best.ferry.dateStr !== targetTrip.dateStr ? ` (${best.ferry.dateStr})` : ''} — se rute under
          </div>
        )}
      </div>

      {/* Show the best fallback pattern */}
      {best && (
        <TransitCard pattern={best.pattern} target={best.ferry} allFerries={allFerries} isToday={isToday} />
      )}

      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: 'var(--inkDim)', textAlign: 'center', paddingTop: 2 }}>
        Avganger fra Entur · oppdateres automatisk
      </div>
    </div>
  );
}
