import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import App from './App.tsx';
import { isNative } from './platform';
// Skrifttyper følger med appen (virker uten nett, og ingen kontakt med Google)
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import './index.css';
import { syncTimetable, syncNotices } from './firestoreData';

// Hent siste rutetider fra Firestore ved oppstart (bruker localStorage som fallback)
syncTimetable();
syncNotices();

if (isNative) {
  // Lys tekst i statuslinjen over den mørke toppen
  SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
} else {
  // Service worker (offline/installering) bare på nettsiden; den installerte appen har filene lokalt
  // Ny versjon tas i bruk med en gang (siden lastes på nytt). Se etter den hver gang siden kommer fram igjen,
  // for appen på hjemskjermen kan ligge åpen i dagevis uten å lastes på nytt.
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    },
  })).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {!isNative && <Analytics />}
  </StrictMode>,
);
