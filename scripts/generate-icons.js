/**
 * TSB PWA Icon Generator
 *
 * Generates gold "WBS" monogram icons on dark background for PWA use.
 *
 * Requirements:
 *   npm install canvas
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * Output:
 *   public/icons/icon-192.png  (192x192)
 *   public/icons/icon-512.png  (512x512)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const BRAND_BG = '#2D2D2D';
const BRAND_GOLD = '#F5C518';

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BRAND_BG;
  ctx.fillRect(0, 0, size, size);

  // "WBS" text — centered, gold, bold
  const fontSize = Math.round(size * 0.38);
  ctx.fillStyle = BRAND_GOLD;
  ctx.font = `900 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WBS', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const buf = generateIcon(size);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Generated ${outPath}`);
}
