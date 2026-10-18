import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.veierland.ferge',
  appName: 'Veierland',
  webDir: 'dist',
  // Bakgrunn før innholdet er lastet (samme som Fjord-temaet)
  backgroundColor: '#07313C',
  plugins: {
    // Lys tekst i statuslinjen; appen har mørk topp i alle tema
    SystemBars: { style: 'DARK' },
  },
};

export default config;
