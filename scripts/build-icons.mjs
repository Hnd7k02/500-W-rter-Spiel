// Erzeugt alle App-Icons aus den Vorlagen in design/ (je 1024 × 1024 px, ohne Transparenz).
//   design/app-icon.png          → iOS-Icon (180 px), PWA-Icons (192 und 512 px), Favicon (16, 32, 48 px)
//   design/app-icon-maskable.png → maskierbares PWA-Icon (512 px)
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const ICON = 'design/app-icon.png';
const MASKABLE = 'design/app-icon-maskable.png';
const OUT = 'public';

async function checkSource(file) {
  const { width, height } = await sharp(file).metadata();
  if (width !== 1024 || height !== 1024) throw new Error(`${file}: erwartet 1024 × 1024 px, ist ${width} × ${height}`);
}

/** Verkleinert ohne Alphakanal: iOS füllt Transparenz sonst schwarz. */
function resized(file, size) {
  return sharp(file).resize(size, size, { kernel: 'lanczos3' }).removeAlpha();
}

/** ICO-Datei mit PNG-Einträgen (von allen aktuellen Browsern unterstützt). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserviert
  header.writeUInt16LE(1, 2); // Typ: Icon
  header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  images.forEach(({ size, data }, i) => {
    const entry = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entry); // Breite
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 1); // Höhe
    directory.writeUInt8(0, entry + 2); // keine Farbpalette
    directory.writeUInt8(0, entry + 3); // reserviert
    directory.writeUInt16LE(1, entry + 4); // Farbebenen
    directory.writeUInt16LE(32, entry + 6); // Bit pro Pixel
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

await checkSource(ICON);
await checkSource(MASKABLE);

const png = { compressionLevel: 9, adaptiveFiltering: true };
const targets = [
  [ICON, 180, 'apple-touch-icon-180x180.png'],
  [ICON, 192, 'pwa-192x192.png'],
  [ICON, 512, 'pwa-512x512.png'],
  [MASKABLE, 512, 'maskable-icon-512x512.png'],
];
for (const [file, size, name] of targets) {
  await resized(file, size).png(png).toFile(`${OUT}/${name}`);
  console.log(`${OUT}/${name}`);
}

const favicon = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await resized(ICON, size).ensureAlpha().png(png).toBuffer() })),
);
writeFileSync(`${OUT}/favicon.ico`, ico(favicon));
console.log(`${OUT}/favicon.ico (16, 32, 48 px)`);
