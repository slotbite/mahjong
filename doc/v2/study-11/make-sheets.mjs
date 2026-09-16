#!/usr/bin/env node
/**
 * Script simple para generar hojas de contacto PNG
 * Usa sharp para redimensionar y componer imágenes
 */

import sharp from '../../../tools/node_modules/sharp/lib/index.js';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const BASE_PATH = path.resolve('./assets/raw/study-11/noto');
const OUTPUT_PATH = path.resolve('./doc/v2/study-11');

const GRID = {
  cols: 6,
  thumbSize: 128,
  frameSize: 268,
  padding: 10
};

/**
 * Pixelate image (scale down then up with nearest neighbor)
 */
async function pixelate(buffer) {
  try {
    return await sharp(buffer)
      .resize(64, 64, { fit: 'contain', kernel: 'nearest' })
      .resize(256, 256, { fit: 'contain', kernel: 'nearest' })
      .png()
      .toBuffer();
  } catch (e) {
    console.warn('Pixelate failed:', e.message);
    return buffer;
  }
}

/**
 * Create raw contact sheet (128px thumbnails)
 */
async function makeRawSheet(themeName, imagePaths) {
  console.log(`  ${themeName}-raw.png...`);

  const rows = Math.ceil(imagePaths.length / GRID.cols);
  const width = GRID.cols * (GRID.thumbSize + 12) + 20;
  const height = rows * (GRID.thumbSize + 28) + 20;

  // Use SVG as intermediate
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#1f4d3a"/>
  `;

  for (let i = 0; i < imagePaths.length; i++) {
    const col = i % GRID.cols;
    const row = Math.floor(i / GRID.cols);
    const x = 10 + col * (GRID.thumbSize + 12);
    const y = 10 + row * (GRID.thumbSize + 28);

    try {
      const data = fs.readFileSync(imagePaths[i]);
      const b64 = Buffer.from(data).toString('base64');
      const name = path.basename(imagePaths[i], '.png').substring(0, 10);

      svg += `<image x="${x}" y="${y}" width="${GRID.thumbSize}" height="${GRID.thumbSize}"
        href="data:image/png;base64,${b64}"/>
        <text x="${x + GRID.thumbSize/2}" y="${y + GRID.thumbSize + 14}"
        font-family="monospace" font-size="8" fill="#b8d96a" text-anchor="middle">${name}</text>`;
    } catch (e) {
      console.warn(`    Error: ${path.basename(imagePaths[i])}`);
    }
  }

  svg += '</svg>';

  try {
    const png = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    const out = path.join(OUTPUT_PATH, `${themeName}-raw.png`);
    fs.writeFileSync(out, png);
    const kb = Math.round(png.length / 1024);
    console.log(`    OK (${kb}KB)`);
  } catch (e) {
    console.error(`    Error: ${e.message}`);
  }
}

/**
 * Create pixel contact sheet (256x256 frames with pixelated art)
 */
async function makePixelSheet(themeName, imagePaths) {
  console.log(`  ${themeName}-pixel.png...`);

  const rows = Math.ceil(imagePaths.length / GRID.cols);
  const width = GRID.cols * GRID.frameSize + GRID.padding * 2;
  const height = rows * GRID.frameSize + GRID.padding * 2;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#1f4d3a"/>
  `;

  for (let i = 0; i < imagePaths.length; i++) {
    const col = i % GRID.cols;
    const row = Math.floor(i / GRID.cols);
    const x = GRID.padding + col * GRID.frameSize;
    const y = GRID.padding + row * GRID.frameSize;
    const name = path.basename(imagePaths[i], '.png').substring(0, 10);

    try {
      const data = fs.readFileSync(imagePaths[i]);
      const pixelated = await pixelate(data);
      const b64 = pixelated.toString('base64');

      // Frame
      svg += `<rect x="${x+4}" y="${y+4}" width="256" height="256" rx="8"
        fill="rgba(31,77,58,0.8)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
        <image x="${x+8}" y="${y+8}" width="248" height="248"
        href="data:image/png;base64,${b64}"/>
        <text x="${x+132}" y="${y+276}" font-family="monospace" font-size="8"
        fill="#b8d96a" text-anchor="middle">${name}</text>`;
    } catch (e) {
      console.warn(`    ${path.basename(imagePaths[i])}: ${e.message}`);
    }
  }

  svg += '</svg>';

  try {
    const png = await sharp(Buffer.from(svg), { density: 96 })
      .png()
      .toBuffer();

    const out = path.join(OUTPUT_PATH, `${themeName}-pixel.png`);
    fs.writeFileSync(out, png);
    const kb = Math.round(png.length / 1024);
    console.log(`    OK (${kb}KB)`);
  } catch (e) {
    console.error(`    Error: ${e.message}`);
  }
}

async function main() {
  console.log('Generating contact sheets...\n');

  const themeDir = fs.readdirSync(BASE_PATH).filter(f =>
    fs.statSync(path.join(BASE_PATH, f)).isDirectory()
  );

  for (const theme of themeDir.sort()) {
    console.log(`${theme}:`);
    const pattern = path.join(BASE_PATH, theme, '*.png');
    const images = globSync(pattern).slice(0, 24);

    if (images.length === 0) {
      console.log('  (no images)');
      continue;
    }

    await makeRawSheet(theme, images);
    await makePixelSheet(theme, images);
  }

  console.log('\nDone. Output: doc/v2/study-11/');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
