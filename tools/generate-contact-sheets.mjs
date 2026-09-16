#!/usr/bin/env node
/**
 * Genera hojas de contacto (128px, 6 columnas) para temas Noto Emoji
 * Uso: node tools/generate-contact-sheets.mjs
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'manifest.json');
const OUT_DIR = path.join(ROOT, 'doc', 'v2', 'themes-15');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const MARGIN = 4;
const CARD_SIZE = 128;
const COLS = 6;
const CARD_WITH_MARGIN = CARD_SIZE + MARGIN * 2;

async function generateSheet(themeId) {
  const theme = manifest.themes.find(t => t.id === themeId);
  if (!theme || !theme.cards.length) {
    console.log(`  ⊘ ${themeId}: sin cartas`);
    return;
  }

  const rows = Math.ceil(theme.cards.length / COLS);
  const w = CARD_WITH_MARGIN * COLS;
  const h = CARD_WITH_MARGIN * rows;

  // Crear canvas blanco
  const canvas = sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  let composites = [];
  for (let i = 0; i < theme.cards.length; i++) {
    const card = theme.cards[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CARD_WITH_MARGIN + MARGIN;
    const y = row * CARD_WITH_MARGIN + MARGIN;

    const cardPath = path.join(ROOT, card.src);
    let cardImg = sharp(cardPath);

    // Redimensionar a 128×128 si es necesario
    const meta = await cardImg.metadata();
    if (meta.width !== CARD_SIZE || meta.height !== CARD_SIZE) {
      cardImg = cardImg.resize(CARD_SIZE, CARD_SIZE, { fit: 'contain' });
    }

    const buf = await cardImg.png().toBuffer();
    composites.push({ input: buf, left: x, top: y });
  }

  const buf = await canvas.composite(composites).webp({ quality: 85 }).toBuffer();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${themeId}.png`);
  fs.writeFileSync(outPath, buf);

  console.log(`  + ${themeId}: ${theme.cards.length} cartas → ${buf.length} B (${(buf.length / 1024).toFixed(1)} KB)`);
  return buf.length;
}

(async () => {
  console.log('Generando hojas de contacto (128px, 6 col):\n');
  let total = 0;
  for (const theme of ['selva', 'cozy', 'geek', 'acuario']) {
    const size = await generateSheet(theme);
    if (size) total += size;
  }
  console.log(`\nTotal: ${(total / 1024).toFixed(1)} KB`);
})();
