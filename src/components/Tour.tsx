import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icons';

interface TourStep {
  title: string;
  body: string;
  selector?: string; // matches data-tour="xxx"
}

export type TourScreen = 'onboarding' | 'home' | 'results';

const TOURS: Record<TourScreen, TourStep[]> = {
  onboarding: [
    {
      title: 'Velg avreisested',
      body: 'Trykk på Fra eller Til for å velge stopp. Du kan velge mellom Tenvik på fastlandet og Vestgården, Engø og Tangen på Veierland.',
      selector: 'route-picker',
    },
    {
      title: 'Finn neste avgang',
      body: 'Trykk her for å gå direkte til neste avgang med nedtelling og reiseinfo.',
      selector: 'find-next-btn',
    },
    {
      title: 'Rutetabell',
      body: 'Se alle avganger for i dag, eller velg en annen dato.',
      selector: 'timetable-btn-onboard',
    },
  ],
  home: [
    {
      title: 'Rute',
      body: 'Trykk for å endre avreise- eller ankomststed. Bytt-knappen snur retningen.',
      selector: 'compact-route-bar',
    },
    {
      title: 'Neste avgang',
      body: 'Viser neste avgang med nedtelling. Trykk «Se reisedetaljer» for full ruteinfo med stopp og eventuelle bookingkrav.',
      selector: 'hero-card',
    },
    {
      title: 'Bla i avganger',
      body: 'Trykk på kortene for å bla frem og tilbake i avgangene. Forrige avgang er klikk­bar og åpner rutedetaljer.',
      selector: 'mini-cards',
    },
    {
      title: 'Rekker du fergen?',
      body: 'Når GPS er aktiv beregnes kjøretid fra din posisjon. Grønt, gult eller rødt viser om du rekker det — med litt humor.',
      selector: 'status-signal',
    },
    {
      title: 'Rutetabell',
      body: 'Se alle avganger for i dag, eller velg en annen dag og dato.',
      selector: 'rutetabell-btn',
    },
  ],
  results: [
    {
      title: 'Velg dag',
      body: 'Bla gjennom de neste 7 dagene. Trykk «Angi dato» for å velge en spesifikk dato lengre frem i tid.',
      selector: 'day-chips',
    },
    {
      title: 'Avgangsliste',
      body: 'Alle avganger for valgt dag. Passerte avganger er grått ut, men fortsatt klikk­bare for rutedetaljer. Siden åpner automatisk ved første kommende avgang.',
      selector: 'trip-list',
    },
    {
      title: 'Rute og retning',
      body: 'Trykk på stoppestedene eller bytt-knappen for å endre rute uten å gå tilbake.',
      selector: 'results-route-bar',
    },
  ],
};

const PAD = 10;
const TOOLTIP_H_ESTIMATE = 220;

interface Rect { x: number; y: number; w: number; h: number; }

function getRect(selector: string): Rect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
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
      const r = getRect(current.selector);
      if (r) {
        const el = document.querySelector(`[data-tour="${current.selector}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => setRect(getRect(current.selector)), 300);
      } else {
        setRect(null);
      }
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

  // Determine tooltip position: above or below the highlighted rect
  const vp = { w: window.innerWidth, h: window.innerHeight };
  let tooltipTop: number | undefined;
  let tooltipBottom: number | undefined;

  if (rect) {
    const spaceBelow = vp.h - (rect.y + rect.h);
    const spaceAbove = rect.y;
    if (spaceBelow >= TOOLTIP_H_ESTIMATE || spaceBelow >= spaceAbove) {
      tooltipTop = rect.y + rect.h + 14;
    } else {
      tooltipBottom = vp.h - rect.y + 14;
    }
  } else {
    tooltipTop = vp.h / 2 - TOOLTIP_H_ESTIMATE / 2;
  }

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
              <rect
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                rx="14" fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tour-mask)" />
      </svg>

      {/* highlight ring */}
      {rect && (
        <div
          style={{
            position: 'absolute',
            left: rect.x, top: rect.y, width: rect.w, height: rect.h,
            borderRadius: 14,
            boxShadow: '0 0 0 2.5px var(--accent), 0 0 0 5px rgba(255,255,255,0.12)',
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      )}

      {/* tooltip card */}
      <div
        style={{
          position: 'absolute',
          left: 18, right: 18,
          ...(tooltipTop !== undefined ? { top: Math.min(tooltipTop, vp.h - TOOLTIP_H_ESTIMATE - 16) } : { bottom: tooltipBottom }),
          background: 'var(--surface)',
          borderRadius: 'var(--rad)',
          padding: '18px 18px 14px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          border: '1px solid var(--line)',
          transition: 'top 0.25s cubic-bezier(0.22,1,0.36,1), bottom 0.25s cubic-bezier(0.22,1,0.36,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* progress bar */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i <= step ? 'var(--accent)' : 'var(--line)', transition: 'background 0.2s' }} />
          ))}
        </div>

        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 7 }}>
          {current.title}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 14, color: 'var(--inkDim)', lineHeight: 1.55 }}>
          {current.body}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 'var(--radSm)', border: '1.5px solid var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--inkDim)' }}
          >
            Avslutt
          </button>
          <button
            onClick={next}
            style={{ flex: 2, padding: '11px', borderRadius: 'var(--radSm)', border: 'none', background: 'var(--accent)', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--accentInk)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            {isLast ? 'Ferdig' : 'Neste'}
            {!isLast && <Icon name="arrowRight" size={15} color="var(--accentInk)" stroke={2.2} />}
          </button>
        </div>
      </div>
    </div>
  );
}
