import React from 'react';

type IconName =
  | 'swap' | 'arrowRight' | 'arrowDown' | 'chevronLeft' | 'chevronRight' | 'chevronDown'
  | 'phone' | 'wind' | 'calendar' | 'pin' | 'walk' | 'car' | 'clock' | 'info'
  | 'alert' | 'anchor' | 'sun' | 'cloud' | 'rain' | 'fog' | 'snow' | 'bolt'
  | 'check' | 'x' | 'ticket' | 'settings' | 'close' | 'monitor';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 22, stroke = 2, color = 'currentColor', style = {} }: IconProps) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const, style,
  };

  const paths: Record<IconName, React.ReactNode> = {
    swap: <><path d="M7 4v15M7 19l-3.2-3.2M7 19l3.2-3.2" /><path d="M17 20V5M17 5l-3.2 3.2M17 5l3.2 3.2" /></>,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
    chevronLeft: <path d="M15 5l-7 7 7 7" />,
    chevronRight: <path d="M9 5l7 7-7 7" />,
    chevronDown: <path d="M5 9l7 7 7-7" />,
    phone: <path d="M5 4h3.5l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5V23h0a18 18 0 0 1-18-18z" transform="translate(0 -2)" />,
    wind: <><path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 12h16a2.5 2.5 0 1 1-2.5 2.5" /><path d="M3 16h8a2 2 0 1 1-2 2" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
    pin: <><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></>,
    walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="M13 8l-2.5 4 2 2 1 5M10.5 12l-3 2M15 12l1 4" /></>,
    car: <><path d="M4 13l1.6-4.2A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.3L20 13" /><path d="M3 13h18v4a1 1 0 0 1-1 1h-1.5M5.5 18H4a1 1 0 0 1-1-1v-4" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.2" /></>,
    alert: <><path d="M12 3.5 22 20H2L12 3.5z" /><path d="M12 10v4.5M12 17.4v.2" /></>,
    anchor: <><circle cx="12" cy="5" r="2.2" /><path d="M12 7.2V21M5 13a7 7 0 0 0 14 0M5 13H3.5M19 13h1.5" /></>,
    sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></>,
    cloud: <path d="M7 18a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 18 11.2 3.4 3.4 0 0 1 17.5 18z" />,
    rain: <><path d="M7 15a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 18 8.2 3.4 3.4 0 0 1 17.5 15z" /><path d="M8 18.5l-.8 2M12 18.5l-.8 2M16 18.5l-.8 2" /></>,
    fog: <><path d="M7 13a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 18 6.2 3.4 3.4 0 0 1 17.5 13z" /><path d="M5 17h14M7 20.5h10" /></>,
    snow: <><path d="M7 14a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 18 7.2 3.4 3.4 0 0 1 17.5 14z" /><path d="M9 18v.2M13 18.5v.2M16 18v.2M11 21v.2" /></>,
    bolt: <><path d="M7 13a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 18 6.2 3.4 3.4 0 0 1 17.5 13z" /><path d="M12 14l-2 3.5h3L11 21" /></>,
    check: <path d="M4 12.5l5 5 11-12" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    ticket: <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" transform="translate(0 1)" /><path d="M14 7v10" strokeDasharray="2 2.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

export function weatherProps(code: number): { name: IconName; text: string } {
  if (code === 0 || code === 1) return { name: 'sun', text: 'Klart' };
  if (code === 2) return { name: 'cloud', text: 'Delvis skyet' };
  if (code === 3) return { name: 'cloud', text: 'Overskyet' };
  if (code === 45 || code === 48) return { name: 'fog', text: 'Tåke' };
  if (code >= 51 && code <= 67) return { name: 'rain', text: 'Yr' };
  if (code >= 71 && code <= 77) return { name: 'snow', text: 'Snø' };
  if (code >= 80 && code <= 82) return { name: 'rain', text: 'Regnbyger' };
  if (code >= 85 && code <= 86) return { name: 'snow', text: 'Snøbyger' };
  if (code >= 95) return { name: 'bolt', text: 'Torden' };
  return { name: 'cloud', text: 'Skyet' };
}

interface FerryGlyphProps {
  size?: number;
  hull?: string;
  cabin?: string;
  stroke?: string;
}

export function FerryGlyph({ size = 64, hull = '#E2613B', cabin = '#FBF6EA', stroke = 'rgba(0,0,0,0.25)' }: FerryGlyphProps) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62" fill="none">
      <rect x="60" y="14" width="9" height="14" rx="1.5" fill={hull} stroke={stroke} strokeWidth="1.2" />
      <rect x="60" y="14" width="9" height="4" rx="1.5" fill={stroke} opacity={0.5} />
      <path d="M30 28 L33 15 H56 L59 28 Z" fill={cabin} stroke={stroke} strokeWidth="1.2" />
      <rect x="36" y="18" width="6" height="6" rx="1" fill={hull} opacity={0.6} />
      <rect x="45" y="18" width="6" height="6" rx="1" fill={hull} opacity={0.6} />
      <rect x="18" y="28" width="66" height="6" rx="1.5" fill={cabin} stroke={stroke} strokeWidth="1.2" />
      <path d="M12 34 H90 L82 48 Q80 50 76 50 H22 Q18 50 16 47 Z" fill={hull} stroke={stroke} strokeWidth="1.2" />
      <path d="M20 41 H80" stroke={cabin} strokeWidth="2" opacity={0.7} strokeLinecap="round" />
    </svg>
  );
}

interface WaveFieldProps {
  height?: number;
  colors?: string[];
  animate?: boolean;
  style?: React.CSSProperties;
}

export function WaveField({
  height = 96,
  colors = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.26)'],
  animate = true,
  style = {},
}: WaveFieldProps) {
  const wave = (d: string, fill: string, dur: number, delay: number) => (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, width: '220%', height,
      animation: animate ? `ferryWaveSlide ${dur}s linear infinite` : 'none',
      animationDelay: `${delay}s`,
    }}>
      <svg width="100%" height={height} viewBox="0 0 1440 96" preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={d} fill={fill} />
      </svg>
    </div>
  );

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height, overflow: 'hidden', pointerEvents: 'none', ...style }}>
      {wave('M0 48 C 180 20, 360 76, 540 48 C 720 20, 900 76, 1080 48 C 1260 20, 1440 76, 1620 48 L1620 96 L0 96 Z', colors[0], 13, 0)}
      {wave('M0 56 C 200 30, 400 82, 600 56 C 800 30, 1000 82, 1200 56 C 1400 30, 1600 82, 1800 56 L1800 96 L0 96 Z', colors[1], 9, -2)}
      {wave('M0 66 C 160 46, 320 88, 540 66 C 760 46, 980 88, 1200 66 C 1420 46, 1640 88, 1860 66 L1860 96 L0 96 Z', colors[2], 6.5, -1)}
    </div>
  );
}

interface CompassMarkProps {
  size?: number;
  color?: string;
  opacity?: number;
}

export function CompassMark({ size = 30, color = 'currentColor', opacity = 0.5 }: CompassMarkProps) {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const long = i % 3 === 0;
    const r1 = long ? 8 : 10;
    ticks.push(
      <line key={i}
        x1={15 + Math.sin(a) * r1} y1={15 - Math.cos(a) * r1}
        x2={15 + Math.sin(a) * 13} y2={15 - Math.cos(a) * 13}
        stroke={color} strokeWidth={long ? 1.6 : 1} strokeLinecap="round"
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ opacity }}>
      {ticks}
      <path d="M15 5 L17 15 L15 18 L13 15 Z" fill={color} />
    </svg>
  );
}

export function ChartTexture({ on, color = 'rgba(255,255,255,0.05)' }: { on: boolean; color?: string }) {
  if (!on) return null;
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 1 }}>
      {[40, 95, 160, 235, 320].map((_, i) => (
        <path key={i}
          d={`M${-20 + i * 12} ${60 + i * 18} Q ${120} ${20 + i * 30}, ${260 - i * 8} ${90 + i * 22} T ${460} ${70 + i * 26}`}
          fill="none" stroke={color} strokeWidth="1.2" strokeDasharray={i % 2 ? '2 5' : undefined}
        />
      ))}
    </svg>
  );
}
