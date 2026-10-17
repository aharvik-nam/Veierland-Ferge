import React, { useState } from 'react';
import { Icon } from './Icons';
import { isMaintenancePeriod } from '../ferryData';

const KEY = 'humlaNoticeDismissed';

function isDismissed(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

// Varsel om M/F Humla. Kan lukkes, og holder seg lukket på alle skjermer etterpå.
export function HumlaNotice({ date, variant, style = {} }: { date: Date; variant: 'deep' | 'light'; style?: React.CSSProperties }) {
  const [dismissed, setDismissed] = useState(isDismissed);
  if (dismissed || !isMaintenancePeriod(date)) return null;

  const deep = variant === 'deep';
  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(KEY, '1'); } catch { /* privat modus */ }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 10px 12px 14px', borderRadius: deep ? 'var(--rad)' : 'var(--radSm)', background: deep ? 'rgba(220,50,50,0.15)' : 'color-mix(in srgb, var(--bad) 12%, var(--surface))', border: deep ? '1px solid rgba(220,50,50,0.35)' : '1px solid color-mix(in srgb, var(--bad) 30%, transparent)', ...style }}>
      <Icon name="alert" size={15} color={deep ? '#ff6b6b' : 'var(--bad)'} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: deep ? '#ff6b6b' : 'var(--bad)', marginBottom: 2 }}>M/F Humla seiler · 17. okt. – ca. 1. mars</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5, color: deep ? 'var(--onDeepDim)' : 'var(--inkDim)', lineHeight: 1.4 }}>Kun Tenvik–Tangen (Engø). Vestgården utgår. Kun passasjerer og håndbagasje.</div>
      </div>
      <button onClick={close} aria-label="Lukk varselet" style={{ width: 32, height: 32, marginTop: -6, marginRight: -2, flexShrink: 0, borderRadius: 99, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Icon name="x" size={16} color={deep ? 'var(--onDeepDim)' : 'var(--inkDim)'} stroke={2.2} />
      </button>
    </div>
  );
}
