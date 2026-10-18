import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { buildRemoteTimetable } from './src/timetableJson';

// /timetable.json: rutetidene som den installerte appen henter, generert fra src/data.ts
function timetableJson(): Plugin {
  return {
    name: 'timetable-json',
    configureServer(server) {
      server.middlewares.use('/timetable.json', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(buildRemoteTimetable()));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'timetable.json', source: JSON.stringify(buildRemoteTimetable()) });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      timetableJson(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
        manifest: {
          name: 'Veierland Ferge',
          short_name: 'Veierland',
          description: 'Rutetider og avganger for M/F Jutøya — Tenvik, Vestgården, Engø, Tangen',
          theme_color: '#0A1620',
          background_color: '#0A1620',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          lang: 'no',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || ''),
      'process.env.AISSTREAM_API_KEY': JSON.stringify(process.env.AISSTREAM_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
