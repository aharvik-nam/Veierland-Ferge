import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icons';

interface TourStep {
  title: string;
  body: string;
  selector?: string;
}

export type TourScreen = 'onboarding' | 'home' | 'results';

const TOURS: Record<TourScreen, TourStep[]> = {
  onboarding: [
    {
      title: 'Velkommen til Veierland-fergen',
      body: 'Denne appen viser deg neste avgang fra din valgte kai — med nedtelling, reiserute og informasjon om du rekker fergen.',
      selector: undefined,
    },
    {
      title: 'Velg avreisested og destinasjon',
      body: 'Trykk på «Fra» eller «Til» for å bytte stoppested. Du kan velge mellom Tenvik på fastlandet og Vestgården, Engø og Tangen på Veierland. Bytt-pilen snur retningen.',
      selector: 'route-picker',
    },
    {
      title: 'Finn neste avgang',
      body: 'Trykk her for å gå til hovedvisningen. Du får se neste avgang med nedtelling, kjøretid og om du rekker fergen basert på din posisjon.',
      selector: 'find-next-btn',
    },
    {
      title: 'Se hele rutetabellen',
      body: 'Her finner du alle avganger for i dag — og kan bla til andre dager. Avganger som har passert er grått ut, men fortsatt klikk­bare.',
      selector: 'timetable-btn-onboard',
    },
  ],
  home: [
    {
      title: 'Bytt rute raskt',
      body: 'Trykk på linjen for å endre avreisested. Pil-knappen til høyre snur ruten — nyttig når du er på vei tilbake fra øya.',
      selector: 'compact-route-bar',
    },
    {
      title: 'Neste avgang',
      body: 'Her vises neste ferge med nedtelling i minutter. «Se reisedetaljer» viser full ruteinfo med alle stopp, varighet og eventuelle bookingkrav for den avgangen.',
      selector: 'hero-card',
    },
    {
      title: 'Bla mellom avganger',
      body: 'Trykk «Neste avgang» for å se fergen etter den som vises. Trykk «Forrige avgang» for å bla tilbake — eller åpne detaljer for en avgang som allerede har gått.',
      selector: 'mini-cards',
    },
    {
      title: 'Rekker du fergen?',
      body: 'Når GPS er aktivt beregnes kjøretid fra din posisjon til kaia i sanntid. Grønt betyr god tid, gult er knapt, rødt er kritisk — og det er ikke alltid like alvorlig ment.',
      selector: 'status-signal',
    },
    {
      title: 'Rutetabell',
      body: 'Se alle avganger for valgt rute. Du kan bla mellom de neste 7 dagene, eller angi en spesifikk dato for å planlegge turen fremover.',
      selector: 'rutetabell-btn',
    },
  ],
  results: [
    {
      title: 'Velg dag',
      body: 'Bla gjennom de neste 7 dagene. Trykk «Angi dato» for å velge en dato lengre frem i tid — nyttig for planlegging av helge- eller fergeturer.',
      selector: 'day-chips',
    },
    {
      title: 'Avgangsliste',
      body: 'Alle avganger for valgt dag vises her. Siden ruller automatisk til neste kommende avgang. Avganger som har gått er grått ut, men du kan fortsatt trykke på dem for rutedetaljer.',
      selector: 'trip-list',
    },
    {
      title: 'Endre rute',
      body: 'Trykk på stoppested­ene for å endre avreise- eller ankomststed. Bytt-pilen snur retningen — du slipper å gå tilbake til forrige side.',
      selector: 'results-route-bar',
    },
  ],
};

const PAD = 10;

interface Rect { x: number; y: number; w: number; h: number; }

function getRect(selector: string): Rect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
}

// Arrow direction based on where tooltip is relative to element
type ArrowDir = 'up' | 'down' | 'none';

interface TooltipPos {
  top?: number;
  bottom?: number;
  arrowDir: ArrowDir;
  arrowLeft: number; // px from left of tooltip, for arrow horizontal centering
}

function calcTooltipPos(rect: Rect | null, vp: { w: number; h: number }): TooltipPos {
  const TOOLTIP_H = 200;
  const SIDE = 18;
  const TW = vp.w - SIDE * 2;
  const ARROW_SIZE = 10;
  const GAP = 14;

  if (!rect) {
    return { top: vp.h / 2 - TOOLTIP_H / 2, arrowDir: 'none', arrowLeft: TW / 2 };
  }

  const rectCenterX = rect.x + rect.w / 2;
  const arrowLeft = Math.max(20, Math.min(TW - 20, rectCenterX - SIDE));

  const spaceBelow = vp.h - (rect.y + rect.h);
  const spaceAbove = rect.y;

  if (spaceBelow >= TOOLTIP_H + ARROW_SIZE + GAP || spaceBelow >= spaceAbove) {
    return {
      top: Math.min(rect.y + rect.h + GAP, vp.h - TOOLTIP_H - 10),
      arrowDir: 'up',
      arrowLeft,
    };
  } else {
    return {
      bottom: vp.h - rect.y + GAP,
      arrowDir: 'down',
      arrowLeft,
    };
  }
}

interface TourProps {
  screen: TourScreen;
  onClose: () => void;
}

export function Tour({ screen, onClose }: TourProps) {
  const steps = TOURS[screen];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const measure = useCallback(() => {
    if (current.selector) {
      const el = document.querySelector(`[data-tour="${current.selector}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => setRect(current.selector ? getRect(current.selector) : null), 300);
    } else {
      setRect(null);
    }
  }, [current.selector]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const next = () => {
    if (isLast) { onClose(); return; }
    setStep(s => s + 1);
  };

  const vp = { w: window.innerWidth, h: window.innerHeight };
  const pos = calcTooltipPos(rect, vp);
  const SIDE = 18;

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: pos.arrowLeft,
    width: 0,
    height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    pointerEvents: 'none',
    ...(pos.arrowDir === 'up'
      ? { top: -10, borderBottom: '10px solid rgba(255,255,255,0.13)' }
      : pos.arrowDir === 'down'
      ? { bottom: -10, borderTop: '10px solid rgba(255,255,255,0.13)' }
      : {}),
  };

  // Inner arrow (fills with bg color)
  const arrowInnerStyle: React.CSSProperties = {
    position: 'absolute',
    left: pos.arrowLeft + 1,
    width: 0,
    height: 0,
    borderLeft: '9px solid transparent',
    borderRight: '9px solid transparent',
    pointerEvents: 'none',
    ...(pos.arrowDir === 'up'
      ? { top: -8, borderBottom: '9px solid rgba(20,28,40,0.82)' }
      : pos.arrowDir === 'down'
      ? { bottom: -8, borderTop: '9px solid rgba(20,28,40,0.82)' }
      : {}),
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'auto' }}>
      {/* SVG spotlight overlay */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onClick={onClose}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="14" fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,10,0.78)" mask="url(#tour-mask)" />
      </svg>

      {/* highlight ring around element */}
      {rect && (
        <div
          style={{
            position: 'absolute',
            left: rect.x, top: rect.y, width: rect.w, height: rect.h,
            borderRadius: 14,
            boxShadow: '0 0 0 2.5px var(--accent), 0 0 0 5px rgba(255,255,255,0.10)',
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      )}

      {/* arrow decorations */}
      {pos.arrowDir !== 'none' && (
        <>
          <div style={arrowStyle} />
          <div style={arrowInnerStyle} />
        </>
      )}

      {/* tooltip card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: SIDE,
          right: SIDE,
          ...(pos.top !== undefined
            ? { top: pos.top }
            : { bottom: pos.bottom }),
          background: 'rgba(20,28,40,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 18,
          padding: '18px 18px 14px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.13)',
          border: '1px solid rgba(255,255,255,0.13)',
          transition: 'top 0.3s cubic-bezier(0.22,1,0.36,1), bottom 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: i <= step ? 2 : 1,
                borderRadius: 99,
                background: i < step ? 'var(--accent)' : i === step ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
                transition: 'flex 0.3s ease, background 0.2s',
                opacity: i < step ? 0.5 : 1,
              }}
            />
          ))}
        </div>

        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15.5, color: '#fff', marginBottom: 7, lineHeight: 1.25 }}>
          {current.title}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
          {current.body}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.18)', background: 'transparent', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13.5, color: 'rgba(255,255,255,0.55)' }}
          >
            Avslutt
          </button>
          <button
            onClick={next}
            style={{ flex: 2, padding: '10px', borderRadius: 12, border: 'none', background: 'var(--accent)', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--accentInk)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            {isLast ? 'Ferdig' : 'Neste'}
            {!isLast && <Icon name="arrowRight" size={14} color="var(--accentInk)" stroke={2.3} />}
          </button>
        </div>
      </div>
    </div>
  );
}
