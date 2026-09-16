// Render artboards to PNG with playwright
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pngDir = join(here, 'png');
mkdirSync(pngDir, { recursive: true });

const ARTBOARDS = [
  { file: 'Main.dc.html', name: 'Main', w: 390, h: 844, dpr: 1 },
  { file: 'MovilAjustes.dc.html', name: 'MovilAjustes', w: 390, h: 844, dpr: 1 },
  { file: 'Tablet.dc.html', name: 'Tablet', w: 1024, h: 768, dpr: 0.75 },
  { file: 'Escritorio.dc.html', name: 'Escritorio', w: 1920, h: 1080, dpr: 0.65 },
  { file: 'UltraWide.dc.html', name: 'UltraWide', w: 2048, h: 576, dpr: 0.5 },
  { file: 'Guia.dc.html', name: 'Guia', w: 1600, h: 2760, dpr: 0.75 },
];

async function renderArtboards() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const board of ARTBOARDS) {
    console.log(`Rendering ${board.name}...`);
    const url = `file://${join(here, board.file)}`;

    // Set viewport with device scale factor
    const scaledW = Math.round(board.w * board.dpr);
    const scaledH = Math.round(board.h * board.dpr);
    await page.setViewportSize({ width: scaledW, height: scaledH });
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for fonts and images to load
    await page.waitForTimeout(1000);

    const pngPath = join(pngDir, `${board.name}.png`);
    await page.screenshot({
      path: pngPath,
      fullPage: false,
    });

    const stats = statSync(pngPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`  ✓ ${board.name}.png (${sizeKB} KB)`);
  }

  await browser.close();
  console.log('Done!');
}

renderArtboards().catch(console.error);
