import React, { useState } from 'react';
import { Icon } from './Icons';

interface TourStep {
  title: string;
  body: string;
  // 'top' = tooltip below element (near top of screen), 'bottom' = tooltip above element
  anchor: 'top' | 'middle' | 'bottom';
}

const STEPS: TourStep[] = [
  {
    title: 'Velg rute',
    body: 'Trykk på Fra- eller Til-feltet for å endre avreise- og ankomststed. Bytt-knappen snur retningen.',
    anchor: 'top',
  },
  {
    title: 'Neste avgang',
    body: 'Viser neste avgang med nedtelling. Trykk «Se reisedetaljer» for full ruteinfo med stoppesteder og eventuelle bookingkrav.',
    anchor: 'middle',
  },
  {
    title: 'Bla i avganger',
    body: 'Trykk på «Neste avgang»- eller «Forrige avgang»-kortet for å bla gjennom andre alternativer. Forrige avgang er klikk­bar og åpner rutedetaljer.',
    anchor: 'middle',
  },
  {
    title: 'Rekker du fergen?',
    body: 'Når GPS er aktiv beregnes kjøretid fra din posisjon. Et grønt, gult eller rødt signal viser om du rekker neste avgang.',
    anchor: 'middle',
  },
  {
    title: 'Rutetabell',
    body: 'Se alle avganger for i dag, eller velg en annen dag og dato. Passerte avganger er grått ut, men fortsatt klikk­bare.',
    anchor: 'bottom',
  },
  {
    title: 'Innstillinger',
    body: 'Trykk på tannhjulet for å bytte fargetema, visuell stil og slå av/på animasjoner.',
    anchor: 'bottom',
  },
];

interface TourProps {
  onClose: () => void;
}

export function Tour({ onClose }: TourProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => (isLast ? onClose() : setStep(s => s + 1));

  const anchorStyle: React.CSSProperties =
    current.anchor === 'top'
      ? { top: 'calc(env(safe-area-inset-top, 0px) + 110px)' }
      : current.anchor === 'bottom'
      ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }
      : { top: '50%', transform: 'translateY(-50%)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'auto' }}>
      {/* dim */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      />

      {/* tooltip card */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          ...anchorStyle,
          background: 'var(--surface)',
          borderRadius: 'var(--rad)',
          padding: '20px 20px 16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          border: '1px solid var(--line)',
        }}
      >
        {/* step indicator */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 99,
                background: i <= step ? 'var(--accent)' : 'var(--line)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>
          {current.title}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 14, color: 'var(--inkDim)', lineHeight: 1.55 }}>
          {current.body}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
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
