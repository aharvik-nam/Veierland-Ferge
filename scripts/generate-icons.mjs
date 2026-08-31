import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');
const src   = readFileSync(join(root, 'assets', 'icon-source.svg'));

mkdirSync(join(root, 'assets'), { recursive: true });

async function gen(svg, size, outPath, bg) {
  let img = sharp(svg).resize(size, size);
  if (bg) img = img.flatten({ background: bg });
  await img.png().toFile(outPath);
  console.log(`✓ ${outPath.replace(root, '.')} (${size}x${size})`);
}

const BG = { r: 10, g: 22, b: 32 };

// @capacitor/assets source files
await gen(src, 1024, join(root, 'assets', 'icon-only.png'),       BG);
await gen(src, 1024, join(root, 'assets', 'icon-background.png'), BG);
await gen(src, 1024, join(root, 'assets', 'icon-foreground.png'), null);

// Splash: centred icon on navy background (2732×2732)
const iconBuf = await sharp(src).resize(600, 600).toBuffer();
await sharp({
  create: { width: 2732, height: 2732, channels: 4,
             background: { r: 10, g: 22, b: 32, alpha: 1 } }
})
  .composite([{ input: iconBuf, gravity: 'centre' }])
  .png().toFile(join(root, 'assets', 'splash.png'));
console.log('✓ ./assets/splash.png (2732x2732)');

// PWA favicon sizes
const pwaDir = join(root, 'public');
for (const size of [192, 512]) {
  await gen(src, size, join(pwaDir, `pwa-${size}.png`), BG);
}
await gen(src, 180, join(pwaDir, 'apple-touch-icon.png'), BG);
await gen(src, 32,  join(pwaDir, 'favicon-32.png'), BG);

console.log('\nAlle ikoner generert ✓');
