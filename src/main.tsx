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

if (isNative) {
  // Lys tekst i statuslinjen over den mørke toppen
  SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
} else {
  // Service worker (offline/installering) bare på nettsiden; den installerte appen har filene lokalt
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {!isNative && <Analytics />}
  </StrictMode>,
);
