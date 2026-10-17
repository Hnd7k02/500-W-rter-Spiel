import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Auf GitHub Pages liegt die App unter /<repo-name>/. Der Workflow setzt BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Keine Update-Meldung nötig: Der Spielstand liegt in localStorage.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      // Die Icons erfasst schon globPatterns unten, so stehen sie nicht doppelt im Precache.
      includeManifestIcons: false,
      manifest: {
        name: '500 Wörter',
        short_name: '500 Wörter',
        description: 'Wort-Ratespiel mit fünf Buchstaben auf Deutsch und Englisch.',
        lang: 'de',
        display: 'standalone',
        theme_color: '#F1F2F6',
        background_color: '#F1F2F6',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Auch Schrift und Icons müssen offline da sein.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
      },
    }),
  ],
});
