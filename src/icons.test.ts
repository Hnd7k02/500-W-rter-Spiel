import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pub = (file: string) => `public/${file}`;

/** Liest Grösse, Farbtyp und Chunk-Namen einer PNG-Datei. */
function png(file: string) {
  const data = readFileSync(file);
  expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const chunks: string[] = [];
  for (let at = 8; at < data.length; ) {
    const length = data.readUInt32BE(at);
    chunks.push(data.toString('latin1', at + 4, at + 8));
    at += 12 + length;
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType: data[25], chunks };
}

describe('App-Icons', () => {
  it.each([
    ['apple-touch-icon-180x180.png', 180],
    ['pwa-192x192.png', 192],
    ['pwa-512x512.png', 512],
    ['maskable-icon-512x512.png', 512],
  ])('%s hat %i px und keine Transparenz', (file, size) => {
    const info = png(pub(file));
    expect([info.width, info.height]).toEqual([size, size]);
    expect(info.colorType).toBe(2); // RGB ohne Alphakanal
    expect(info.chunks).not.toContain('tRNS');
  });

  it('das Favicon enthält 16, 32 und 48 px', () => {
    const data = readFileSync(pub('favicon.ico'));
    expect(data.readUInt16LE(2)).toBe(1);
    const count = data.readUInt16LE(4);
    expect(Array.from({ length: count }, (_, i) => data[6 + i * 16])).toEqual([16, 32, 48]);
  });

  it('die Vorlagen in design/ haben 1024 × 1024 px ohne Transparenz', () => {
    for (const file of ['design/app-icon.png', 'design/app-icon-maskable.png']) {
      const info = png(file);
      expect([info.width, info.height]).toEqual([1024, 1024]);
      expect(info.colorType).toBe(2);
    }
  });

  it('die alten Icons sind entfernt, HTML und Manifest verweisen nur auf vorhandene Dateien', () => {
    expect(existsSync(pub('icon.svg'))).toBe(false);
    expect(existsSync(pub('pwa-64x64.png'))).toBe(false);

    const html = readFileSync('index.html', 'utf8');
    const links = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="\/([^"]+)"/g)].map((m) => m[1]);
    expect(links).toEqual(['favicon.ico', 'apple-touch-icon-180x180.png']);

    const config = readFileSync('vite.config.ts', 'utf8');
    const manifest = [...config.matchAll(/src: '([^']+)'/g)].map((m) => m[1]);
    expect(manifest).toEqual(['pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png']);

    for (const file of [...links, ...manifest]) expect(existsSync(pub(file)), file).toBe(true);
  });
});
