import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Erzeugt die App-Icons aus public/icon.svg: npm run icons
// Das Icon hat schon einen vollflächigen grauen Grund. Darum ohne zusätzlichen Rand,
// und das 180-px-Icon für iOS ohne Transparenz (iOS rundet die Ecken selbst).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Volle Qualität, damit die Verläufe nicht streifig werden.
    png: { compressionLevel: 9, quality: 100 },
    // Die Kacheln liegen schon in der sicheren Zone (80 %-Kreis) der maskierbaren Icons.
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#F1F2F6' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#F1F2F6' } },
  },
  images: ['public/icon.svg'],
});
