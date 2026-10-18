import React, { useState } from 'react';
import { Icon } from '../components/Icons';
import { DeepBand, Label } from '../components/Atoms';
import { HumlaNotice } from '../components/HumlaNotice';
import { seasonLoops, seasonLabel, isMaintenancePeriod, getOsloDate, dayTypeOf, parseTime } from '../ferryData';
import type { FerryLoop } from '../data';
import type { StopId } from '../types';

type Dir = 'til' | 'fra';
type DayKey = 'monFri' | 'sat' | 'sun';

interface Col {
  label: string;
  get: (l: FerryLoop) => string | null | undefined;
  bus?: boolean;
  engo?: boolean;
}

// Kolonner per retning. Under M/F Humla går ruten Tenvik – Tangen – (Engø), ellers via Vestgården.
function columnsFor(dir: Dir, humla: boolean): Col[] {
  if (dir === 'til') {
    return humla
      ? [
          { label: 'Buss Tbg.', get: l => l.bussTbg, bus: true },
          { label: 'Tenvik', get: l => l.tenvikUt },
          { label: 'Tangen', get: l => l.tangenVia ?? l.tangenUt },
          { label: 'Engø', get: l => l.engoUt, engo: true },
        ]
      : [
          { label: 'Buss Tbg.', get: l => l.bussTbg, bus: true },
          { label: 'Tenvik', get: l => l.tenvikUt },
          { label: 'Vestg.', get: l => l.vestgardenUt },
          { label: 'Engø', get: l => l.engoUt, engo: true },
          { label: 'Tangen', get: l => l.tangenUt },
        ];
  }
  return humla
    ? [
        { label: 'Tangen', get: l => l.tangenInn },
        { label: 'Tenvik', get: l => l.tenvikInn },
        { label: 'Buss Tenv.', get: l => l.bussTenvik, bus: true },
      ]
    : [
        { label: 'Tangen', get: l => l.tangenInn },
        { label: 'Engø', get: l => l.engoInn, engo: true },
        { label: 'Vestg.', get: l => l.vestgardenInn },
        { label: 'Tenvik', get: l => l.tenvikInn },
        { label: 'Buss Tenv.', get: l => l.bussTenvik, bus: true },
      ];
}

const DAY_LABELS: { key: DayKey; label: string }[] = [
  { key: 'monFri', label: 'Man–fre' },
  { key: 'sat', label: 'Lørdag' },
  { key: 'sun', label: 'Søndag' },
];

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', padding: 4, gap: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <button key={o.key} onClick={() => onChange(o.key)} style={{ flex: 1, padding: '9px 6px', borderRadius: 99, border: 'none', cursor: 'pointer', background: on ? 'var(--accent)' : 'transparent', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: on ? 'var(--accentInk)' : 'var(--onDeep)', whiteSpace: 'nowrap' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface TimetableScreenProps {
  from: StopId;
  animate: boolean;
  texture: boolean;
  onOpenSettings: () => void;
}

export function TimetableScreen({ from, animate, texture, onOpenSettings }: TimetableScreenProps) {
  const now = getOsloDate();
  const humla = isMaintenancePeriod(now);
  const todayKey: DayKey = ({ monfri: 'monFri', sat: 'sat', sun: 'sun' } as const)[dayTypeOf(now)];
  const [dir, setDir] = useState<Dir>(from === 'tangen' || from === 'vestgarden' ? 'fra' : 'til');
  const [day, setDay] = useState<DayKey>(todayKey);

  const allCols = columnsFor(dir, humla);
  const loops = seasonLoops(now)[day];
  // Bare turer som faktisk går i valgt retning, og bare kolonner som har tider
  const rows = loops
    .filter(l => allCols.some(c => !c.bus && c.get(l)))
    .map(l => {
      const first = allCols.find(c => !c.bus && c.get(l));
      return { loop: l, start: first ? first.get(l)! : '' };
    })
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
  const cols = allCols.filter(c => rows.some(r => c.get(r.loop)));

  const isToday = day === todayKey;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nextIndex = isToday ? rows.findIndex(r => parseTime(r.start) >= nowMins) : -1;
  const hasRedEngo = rows.some(r => r.loop.rowType === 'engo');

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, var(--deep) 0%, var(--deep2) 55%, var(--deep) 100%)' }}>
      <DeepBand animate={animate} texture={texture} waves={false} style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 18px 6px', background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--num)', fontSize: 28, color: 'var(--onDeep)', lineHeight: 1 }}>Rutetabell</div>
            <Label color="var(--onDeepDim)" style={{ fontSize: 9.5, display: 'block', marginTop: 6 }}>{seasonLabel(now)}</Label>
          </div>
          <button onClick={onOpenSettings} aria-label="Innstillinger" style={{ width: 40, height: 40, borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="settings" size={18} color="var(--onDeep)" stroke={1.9} />
          </button>
        </div>
      </DeepBand>

      <div style={{ padding: '12px 18px calc(env(safe-area-inset-bottom, 0px) + 96px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Segmented<Dir> value={dir} onChange={setDir} options={[{ key: 'til', label: 'Til Veierland' }, { key: 'fra', label: 'Fra Veierland' }]} />
        <Segmented<DayKey> value={day} onChange={setDay} options={DAY_LABELS} />

        <HumlaNotice date={now} variant="deep" style={{ marginTop: 2 }} />

        {/* tabellen: én rad per avgang, én kolonne per kai */}
        <div style={{ marginTop: 2, borderRadius: 'var(--rad)', background: 'var(--surface)', overflow: 'hidden', boxShadow: '0 16px 40px -24px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, padding: '12px 14px 10px', borderBottom: '1px solid var(--line)' }}>
            {cols.map(c => (
              <div key={c.label} style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', color: c.bus ? 'var(--inkDim)' : 'var(--ink)', textAlign: 'center', whiteSpace: 'nowrap' }}>{c.label}</div>
            ))}
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--inkDim)' }}>Ingen avganger</div>
          ) : rows.map((r, i) => {
            const past = isToday && i < (nextIndex < 0 ? rows.length : nextIndex);
            const isNext = i === nextIndex;
            const booking = r.loop.rowType === 'booking';
            return (
              <div key={r.loop.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, alignItems: 'center', padding: '9px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', background: isNext ? 'color-mix(in srgb, var(--accent) 14%, var(--surface))' : 'transparent', boxShadow: isNext ? 'inset 3px 0 0 var(--accent)' : 'none', opacity: past ? 0.45 : 1 }}>
                {cols.map((c, ci) => {
                  const t = c.get(r.loop);
                  const red = !!t && (booking || (c.engo && r.loop.rowType === 'engo'));
                  const firstFerry = ci === cols.findIndex(x => !x.bus);
                  return (
                    <div key={c.label} style={{ textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontVariantNumeric: 'tabular-nums', fontSize: c.bus ? 13.5 : 15.5, fontWeight: firstFerry || red ? 700 : 500, color: !t ? 'var(--inkDim)' : red ? 'var(--bad)' : c.bus ? 'var(--inkDim)' : 'var(--ink)', opacity: t ? 1 : 0.35 }}>
                      {t ?? '–'}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* forklaring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {hasRedEngo && (
            <a href="tel:91888219" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radSm)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
              <Icon name="phone" size={16} color="var(--accentOnDeep)" stroke={2} style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--onDeep)', lineHeight: 1.4 }}>
                Røde Engø-tider må forhåndsbestilles. Ring fergen: 918 88 219
              </span>
            </a>
          )}
          {humla && (
            <div style={{ padding: '0 4px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12.5, color: 'var(--onDeepDim)', lineHeight: 1.45 }}>
              All retur til Engø går fra Tangen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
