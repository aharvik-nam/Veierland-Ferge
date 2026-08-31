import sharp from 'sharp';
import { copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// Source image — original ferry JPG (white background, red silhouette)
const SRC = 'C:/Users/AndreasHarvik/Downloads/fergeikon (2).jpg';

mkdirSync(join(root, 'assets'), { recursive: true });

// Copy original into assets for reference
copyFileSync(SRC, join(root, 'assets', 'FergeIkon.jpg')); // cached copy

const WHITE = { r: 255, g: 255, b: 255 };
const NAVY  = { r: 10,  g: 22,  b: 32  };

async function gen(size, outPath, bg = WHITE) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: bg })
    .flatten({ background: bg })
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath.replace(root, '.')} (${size}x${size})`);
}

// @capacitor/assets source files (white bg matches the original)
await gen(1024, join(root, 'assets', 'icon-only.png'));
await gen(1024, join(root, 'assets', 'icon-background.png'));
await sharp(SRC).resize(1024, 1024, { fit: 'contain', background: WHITE })
  .png().toFile(join(root, 'assets', 'icon-foreground.png'));
console.log('✓ ./assets/icon-foreground.png (1024x1024)');

// Splash: ferry centred on navy (2732×2732)
const ferryBuf = await sharp(SRC)
  .resize(1200, 1200, { fit: 'contain', background: NAVY })
  .flatten({ background: NAVY })
  .toBuffer();
await sharp({ create: { width: 2732, height: 2732, channels: 3, background: NAVY } })
  .composite([{ input: ferryBuf, gravity: 'centre' }])
  .png().toFile(join(root, 'assets', 'splash.png'));
console.log('✓ ./assets/splash.png (2732x2732)');

// PWA icons
const pwaDir = join(root, 'public');
await gen(192, join(pwaDir, 'pwa-192.png'));
await gen(512, join(pwaDir, 'pwa-512.png'));
await gen(180, join(pwaDir, 'apple-touch-icon.png'));
await gen(32,  join(pwaDir, 'favicon-32.png'));

console.log('\nAlle ikoner generert ✓');
