import React, { useEffect, useState } from 'react';
import { Icon, weatherProps } from './Icons';
import { ymd, getOsloDate, NO_DAYS_EXPORT as NO_DAYS } from '../ferryData';

// ── Data ─────────────────────────────────────────────────────

interface SeriesEntry {
  time: string;
  data: {
    instant: { details: { air_temperature: number; wind_speed: number; relative_humidity?: number } };
    next_1_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
  };
}

function symToCode(sym: string): number {
  if (!sym) return 2;
  if (sym.startsWith('clearsky') || sym.startsWith('fair')) return 1;
  if (sym.startsWith('partlycloudy')) return 2;
  if (sym.startsWith('cloudy')) return 3;
  if (sym.startsWith('fog')) return 45;
  if (sym.includes('thunder')) return 95;
  if (sym.includes('snow') || sym.includes('sleet')) return 71;
  if (sym.includes('rain') || sym.includes('drizzle') || sym.includes('shower')) return 61;
  return 2;
}

function osloDate(iso: string): Date {
  return new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

const WEATHER_LABEL: Record<number, string> = {
  1: 'Klarvær', 2: 'Delvis skyet', 3: 'Skyet', 45: 'Tåke', 61: 'Regn', 71: 'Snø', 95: 'Tordenvær',
};

// ── Animated weather scene ───────────────────────────────────

const KEYFRAMES = `
@keyframes wxRain { 0% { transform: translateY(-24px); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateY(150px); opacity: 0.5; } }
@keyframes wxSnow { 0% { transform: translateY(-12px) translateX(0); opacity: 0; } 15% { opacity: 0.95; } 55% { transform: translateY(70px) translateX(9px); } 100% { transform: translateY(150px) translateX(-5px); opacity: 0.4; } }
@keyframes wxCloud { 0% { transform: translateX(-16px); } 50% { transform: translateX(16px); } 100% { transform: translateX(-16px); } }
@keyframes wxSun { 0%, 100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.07); opacity: 1; } }
@keyframes wxFlash { 0%, 90%, 96%, 100% { opacity: 0; } 92%, 94% { opacity: 0.8; } }
@keyframes wxFog { 0% { transform: translateX(-8%); } 50% { transform: translateX(8%); } 100% { transform: translateX(-8%); } }
`;

function Cloud({ x, y, s, o, dur, animate, dark = false }: { x: number; y: number; s: number; o: number; dur: number; animate: boolean; dark?: boolean }) {
  const fill = dark ? 'color-mix(in srgb, var(--ink) 45%, var(--deep2))' : 'color-mix(in srgb, #ffffff 88%, var(--accent2))';
  return (
    <svg viewBox="0 0 64 36" style={{ position: 'absolute', left: `${x}%`, top: y, width: 64 * s, opacity: o, animation: animate ? `wxCloud ${dur}s ease-in-out infinite` : 'none' }}>
      <ellipse cx="22" cy="24" rx="18" ry="11" fill={fill} />
      <ellipse cx="40" cy="18" rx="16" ry="12" fill={fill} />
      <ellipse cx="50" cy="26" rx="12" ry="9" fill={fill} />
    </svg>
  );
}

const DROP_X = [4, 12, 21, 30, 38, 47, 55, 64, 72, 81, 89, 96, 26, 60];

function WeatherAnim({ code, animate }: { code: number; animate: boolean }) {
  const rain = code === 61 || code === 95;
  const snow = code === 71;
  const thunder = code === 95;
  const fog = code === 45;
  const clear = code === 1;
  const partly = code === 2;
  const cloudy = code === 3 || rain || snow;

  // Sky colors derived from the active theme so the scene follows the chosen palette
  const sky = clear || partly
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent2) 22%, var(--deep)) 0%, color-mix(in srgb, var(--accent2) 48%, var(--deep2)) 100%)'
    : fog
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--inkDim) 45%, var(--surfaceAlt)) 0%, color-mix(in srgb, var(--inkDim) 25%, var(--surfaceAlt)) 100%)'
    : thunder
    ? 'linear-gradient(180deg, color-mix(in srgb, #000 40%, var(--deep)) 0%, color-mix(in srgb, #000 12%, var(--deep2)) 100%)'
    : 'linear-gradient(180deg, color-mix(in srgb, var(--inkDim) 28%, var(--deep)) 0%, color-mix(in srgb, var(--inkDim) 18%, var(--deep2)) 100%)';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: sky }}>
      {(clear || partly) && (
        <div style={{ position: 'absolute', top: 16, right: 24, width: 46, height: 46, borderRadius: 99, background: 'color-mix(in srgb, var(--accent) 70%, #ffd98a)', boxShadow: '0 0 34px 14px color-mix(in srgb, var(--accent) 45%, rgba(255,214,130,0.5))', animation: animate ? 'wxSun 4s ease-in-out infinite' : 'none' }} />
      )}
      {partly && <Cloud x={48} y={38} s={1.5} o={0.95} dur={9} animate={animate} />}
      {cloudy && (
        <>
          <Cloud x={6} y={12} s={1.6} o={0.9} dur={10} animate={animate} dark={thunder} />
          <Cloud x={42} y={28} s={1.9} o={0.8} dur={13} animate={animate} dark={thunder} />
          <Cloud x={72} y={10} s={1.3} o={0.85} dur={8} animate={animate} dark={thunder} />
        </>
      )}
      {rain && DROP_X.map((x, i) => (
        <div key={i} style={{ position: 'absolute', top: -24, left: `${x}%`, width: 2, height: 12, borderRadius: 2, background: 'rgba(215,233,250,0.85)', animation: animate ? `wxRain ${0.85 + (i % 4) * 0.18}s linear infinite` : 'none', animationDelay: `${(i * 0.17) % 1.4}s` }} />
      ))}
      {snow && DROP_X.map((x, i) => (
        <div key={i} style={{ position: 'absolute', top: -12, left: `${x}%`, width: 5, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.95)', animation: animate ? `wxSnow ${3 + (i % 5) * 0.55}s linear infinite` : 'none', animationDelay: `${(i * 0.4) % 3}s` }} />
      ))}
      {fog && [0, 1, 2].map(i => (
        <div key={i} style={{ position: 'absolute', top: 26 + i * 30, left: `${-6 + i * 4}%`, width: '95%', height: 15, borderRadius: 99, background: 'rgba(255,255,255,0.32)', animation: animate ? `wxFog ${8 + i * 2.5}s ease-in-out infinite` : 'none' }} />
      ))}
      {thunder && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, animation: animate ? 'wxFlash 5.5s linear infinite' : 'none' }} />}
    </div>
  );
}

// ── Sheet ────────────────────────────────────────────────────

interface DaySummary {
  ds: string;
  label: string;
  dateLabel: string;
  min: number;
  max: number;
  precip: number;
  wind: number;
  code: number;
}

interface WeatherSheetProps {
  open: boolean;
  animate: boolean;
  preloaded?: SeriesEntry[] | null;
  onClose: () => void;
}

export function WeatherSheet({ open, animate, preloaded, onClose }: WeatherSheetProps) {
  const [fetched, setFetched] = useState<SeriesEntry[] | null>(null);
  const [error, setError] = useState(false);
  // Prefer the forecast the app already fetched for the chip — avoids a second request that can fail
  const series = (preloaded && preloaded.length ? preloaded : fetched) ?? null;

  useEffect(() => {
    if (!open || series) return;
    setError(false); // retry on every open
    fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.1617&lon=10.3455')
      .then(r => r.json())
      .then(j => {
        const ts = j.properties?.timeseries ?? [];
        if (ts.length) setFetched(ts); else setError(true);
      })
      .catch(() => setError(true));
  }, [open, series]);

  // Current conditions
  const cur = series?.[0];
  const curDetails = cur?.data.instant.details;
  const curSym = cur?.data.next_1_hours?.summary.symbol_code ?? cur?.data.next_6_hours?.summary.symbol_code ?? '';
  const curCode = symToCode(curSym);
  const curPrecip = cur?.data.next_1_hours?.details?.precipitation_amount ?? 0;

  // Hourly strip (next ~12 h, every 2nd hour)
  const nowMs = Date.now();
  const hourly = (series ?? [])
    .filter(e => new Date(e.time).getTime() > nowMs && e.data.next_1_hours)
    .filter((_, i) => i % 2 === 0)
    .slice(0, 7);

  // Next 3 days
  const todayStr = ymd(getOsloDate());
  const byDay = new Map<string, SeriesEntry[]>();
  (series ?? []).forEach(e => {
    const ds = ymd(osloDate(e.time));
    if (ds <= todayStr) return;
    if (!byDay.has(ds)) byDay.set(ds, []);
    byDay.get(ds)!.push(e);
  });
  const days: DaySummary[] = [...byDay.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).slice(0, 3).map(([ds, entries]) => {
    const temps = entries.map(e => e.data.instant.details.air_temperature);
    const winds = entries.map(e => e.data.instant.details.wind_speed);
    const precip = entries.reduce((sum, e) => sum + (e.data.next_1_hours?.details?.precipitation_amount
      ?? (osloDate(e.time).getHours() % 6 === 0 ? (e.data.next_6_hours?.details?.precipitation_amount ?? 0) : 0)), 0);
    const midday = entries.reduce((best, e) => Math.abs(osloDate(e.time).getHours() - 13) < Math.abs(osloDate(best.time).getHours() - 13) ? e : best, entries[0]);
    const sym = midday.data.next_6_hours?.summary.symbol_code ?? midday.data.next_1_hours?.summary.symbol_code ?? '';
    const d = osloDate(entries[0].time);
    return {
      ds, label: cap(NO_DAYS[d.getDay()]), dateLabel: `${d.getDate()}.${d.getMonth() + 1}`,
      min: Math.round(Math.min(...temps)), max: Math.round(Math.max(...temps)),
      precip: Math.round(precip * 10) / 10, wind: Math.round(Math.max(...winds)), code: symToCode(sym),
    };
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }}>
      <style>{KEYFRAMES}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(7,20,24,0.45)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity 0.28s ease' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88dvh', overflowY: 'auto', background: 'var(--surface)', borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 -20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)', paddingTop: 14, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
          <div style={{ width: 42, height: 5, borderRadius: 99, background: 'var(--line)', margin: '0 auto 12px' }} />
        </div>

        <div style={{ padding: '0 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          {!series && !error && (
            <div style={{ padding: '36px 0', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--inkDim)' }}>Henter værdata …</div>
          )}
          {error && (
            <div style={{ padding: '36px 0', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--inkDim)' }}>Kunne ikke hente værdata</div>
          )}

          {cur && curDetails && (
            <>
              {/* Animated current-weather banner */}
              <div style={{ position: 'relative', height: 150, borderRadius: 'var(--radSm)', overflow: 'hidden' }}>
                <WeatherAnim code={curCode} animate={animate} />
                <div style={{ position: 'absolute', left: 18, bottom: 14, zIndex: 2 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>Tenvik kai · nå</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--num)', fontSize: 46, color: '#fff', lineHeight: 1, textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>{Math.round(curDetails.air_temperature)}°</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{WEATHER_LABEL[curCode]}</span>
                  </div>
                </div>
              </div>

              {/* Detail chips */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {[
                  { val: `${Math.round(curDetails.wind_speed)} m/s`, lbl: 'Vind' },
                  { val: `${curPrecip} mm`, lbl: 'Nedbør 1t' },
                  { val: `${Math.round(curDetails.relative_humidity ?? 0)} %`, lbl: 'Fuktighet' },
                ].map((c, i) => (
                  <div key={i} style={{ flex: 1, padding: '10px 8px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{c.val}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--inkDim)', marginTop: 2 }}>{c.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Hourly strip */}
              {hourly.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--inkDim)', marginBottom: 8 }}>Neste timer</div>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
                    {hourly.map((e, i) => {
                      const d = osloDate(e.time);
                      const c = symToCode(e.data.next_1_hours!.summary.symbol_code);
                      const wp = weatherProps(c);
                      return (
                        <div key={i} style={{ flexShrink: 0, width: 62, padding: '10px 4px', borderRadius: 'var(--radSm)', background: 'var(--surfaceAlt)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--inkDim)' }}>{String(d.getHours()).padStart(2, '0')}</span>
                          <Icon name={wp.name} size={18} color="var(--ink)" stroke={1.8} />
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{Math.round(e.data.instant.details.air_temperature)}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3-day forecast */}
              {days.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--inkDim)', marginBottom: 8 }}>Neste 3 dager</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {days.map(day => (
                      <div key={day.ds} style={{ position: 'relative', borderRadius: 'var(--radSm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
                          <WeatherAnim code={day.code} animate={animate} />
                        </div>
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', background: 'linear-gradient(90deg, var(--surface) 35%, transparent 130%)' }}>
                          <div style={{ width: 84, flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{day.label}</div>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--inkDim)' }}>{day.dateLabel}</div>
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'var(--num)', fontSize: 23, color: 'var(--ink)' }}>{day.max}°</span>
                            <span style={{ fontFamily: 'var(--num)', fontSize: 16, color: 'var(--inkDim)' }}>{day.min}°</span>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11.5, color: 'var(--ink)' }}>{day.precip > 0 ? `${day.precip} mm` : 'Oppholdsvær'}</div>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 10.5, color: 'var(--inkDim)', marginTop: 1 }}>{day.wind} m/s vind</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 10.5, color: 'var(--inkDim)', opacity: 0.8 }}>
                Værdata fra MET Norge (yr.no)
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
