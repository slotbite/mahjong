#!/usr/bin/env node
/**
 * Prueba temas Noto Emoji en el juego con screenshot
 * Uso: node tools/test-game-screenshot.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'doc', 'v2', 'themes-15');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Abriendo juego...');
  await page.goto('http://127.0.0.1:8097/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Iniciando tema acuario...');
  await page.evaluate(() => {
    settings.set('themeId', 'acuario');
    bus.emit('theme:load', { themeId: 'acuario' });
    bus.once('theme:ready', () => {
      bus.emit('game:new', {
        mode: 'zen',
        cols: 4,
        rows: 4,
        themeId: 'acuario',
        seed: 3
      });
    });
  });

  await page.waitForTimeout(2000);

  console.log('Volteando fichas...');
  await page.evaluate(() => bus.emit('card:pick', { index: 0 }));
  await page.waitForTimeout(700);
  await page.evaluate(() => bus.emit('card:pick', { index: 1 }));
  await page.waitForTimeout(500);

  console.log('Capturando screenshot...');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const screenshotPath = path.join(OUT_DIR, 'acuario-ingame.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const size = fs.statSync(screenshotPath).size;
  console.log(`✓ Screenshot guardado: ${screenshotPath} (${(size / 1024).toFixed(1)} KB)`);

  await browser.close();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
