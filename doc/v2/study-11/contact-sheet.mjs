#!/usr/bin/env node
/**
 * contact-sheet.mjs
 *
 * Genera hojas de contacto PNG para evaluación de temas en Memorice Cozy v2.
 * Por tema: dos PNGs:
 *   - <tema>-raw.png: miniaturas 128px originales
 *   - <tema>-pixel.png: imágenes pixeladas a 64x64 (con efecto de juego) en frames 256x256
 *
 * Entrada: assets/raw/study-11/<fuente>/<tema>/*.png
 * Salida: doc/v2/study-11/<tema>-raw.png y <tema>-pixel.png
 *
 * Uso: node doc/v2/study-11/contact-sheet.mjs [tema]
 * Si no se especifica tema, procesa todos.
 */

import sharp from '../../../tools/node_modules/sharp/lib/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.join(__dirname, '../../assets/raw/study-11');
const OUTPUT_PATH = __dirname;

// Paleta y configuración
const PALETTE = {
  background: '#1f4d3a', // --bg-mid
  frameColor: 'rgba(143, 179, 199, 0.25)', // Marco semitransparente
  frameRGB: { r: 143, g: 179, b: 199, alpha: 0.25 },
};

const GRID = {
  columns: 6,
  maxPerSheet: 24,
  sourceSize: 128, // Tamaño fuente (Noto es 128px)
  thumbSize: 128, // Tamaño miniatura para raw
  gameSize: 256,  // Tamaño en juego
  pixelGridSize: 64, // Celda pixelada (256/4 = 64 px por celda)
};

/**
 * Convierte color hex a RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    alpha: 1
  } : { r: 0, g: 0, b: 0, alpha: 1 };
}

/**
 * Aplica efecto pixelado tipo juego (nearest neighbor downscale + upscale)
 */
async function pixelateImage(inputBuffer) {
  try {
    // Redimensionar a 64x64 con nearest neighbor (pixelado)
    // Luego ampliar de vuelta a 256x256 manteniendo el pixel art
    const pixelated = await sharp(inputBuffer)
      .resize(GRID.pixelGridSize, GRID.pixelGridSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'nearest'
      })
      .resize(GRID.gameSize, GRID.gameSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'nearest'
      })
      .png()
      .toBuffer();

    return pixelated;
  } catch (err) {
    console.warn(`  Advertencia pixelado: ${err.message}`);
    return inputBuffer;
  }
}

/**
 * Obtiene metadatos de imagen con fallback
 */
async function getImageMetadata(buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch {
    return { width: 128, height: 128 };
  }
}

/**
 * Crea una hoja de contacto RAW (miniaturas 128px)
 */
async function createRawContactSheet(theme, images) {
  console.log(`  Generando ${theme}-raw.png...`);

  const gridCols = GRID.columns;
  const gridRows = Math.ceil(images.length / gridCols);
  const sheetWidth = gridCols * (GRID.thumbSize + 16) + 20;
  const sheetHeight = gridRows * (GRID.thumbSize + 36) + 20;

  // Canvas base
  let svg = `<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${sheetWidth}" height="${sheetHeight}" fill="${PALETTE.background}"/>
  `;

  // Grid de imágenes
  let idx = 0;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (idx >= images.length) break;

      const x = 10 + col * (GRID.thumbSize + 16);
      const y = 10 + row * (GRID.thumbSize + 36);
      const img = images[idx];

      // Marco
      svg += `<rect x="${x}" y="${y}" width="${GRID.thumbSize}" height="${GRID.thumbSize}"
              fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1" rx="4"/>
      `;

      // Imagen embebida como data URI
      const dataUri = `data:image/png;base64,${Buffer.from(img.data).toString('base64')}`;
      svg += `<image x="${x + 2}" y="${y + 2}" width="${GRID.thumbSize - 4}" height="${GRID.thumbSize - 4}"
              href="${dataUri}" preserveAspectRatio="xMidYMid meet"/>
      `;

      // Etiqueta
      svg += `<text x="${x + GRID.thumbSize / 2}" y="${y + GRID.thumbSize + 18}"
              font-family="Pixelify Sans, monospace" font-size="10" fill="#b8d96a"
              text-anchor="middle">${img.id.substring(0, 12)}</text>
      `;

      idx++;
    }
  }

  svg += '</svg>';

  try {
    const buffer = Buffer.from(svg);
    const pngBuffer = await sharp(buffer)
      .png()
      .toBuffer();

    const outputPath = path.join(OUTPUT_PATH, `${theme}-raw.png`);
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`    ✓ ${path.basename(outputPath)} (${Math.round(pngBuffer.length / 1024)}KB)`);
    return outputPath;
  } catch (err) {
    console.error(`    ✗ Error: ${err.message}`);
    return null;
  }
}

/**
 * Crea una hoja de contacto PIXEL (pixeladas 64x64 en 256x256 frames)
 */
async function createPixelContactSheet(theme, images) {
  console.log(`  Generando ${theme}-pixel.png...`);

  const gridCols = GRID.columns;
  const gridRows = Math.ceil(images.length / gridCols);
  const frameSize = GRID.gameSize + 4; // Espacio para marco
  const sheetWidth = gridCols * frameSize + 20;
  const sheetHeight = gridRows * frameSize + 40; // Mas espacio para etiquetas

  // Crear canvas con Sharp
  const bgColor = hexToRgb(PALETTE.background);

  let svgContent = `<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans&display=swap');
      </style>
    </defs>
    <rect width="${sheetWidth}" height="${sheetHeight}" fill="${PALETTE.background}"/>
  `;

  // Crear frames con imágenes pixeladas
  let idx = 0;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (idx >= images.length) break;

      const x = 10 + col * frameSize;
      const y = 10 + row * frameSize;
      const img = images[idx];

      // Frame (marco con sombra de vidrio)
      svgContent += `
        <g>
          <rect x="${x}" y="${y}" width="${GRID.gameSize}" height="${GRID.gameSize}"
                fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" rx="8"/>
          <rect x="${x + 1}" y="${y + 1}" width="${GRID.gameSize - 2}" height="${GRID.gameSize - 2}"
                fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1" rx="6"/>

          <!-- Fondo de ficha -->
          <rect x="${x + 4}" y="${y + 4}" width="${GRID.gameSize - 8}" height="${GRID.gameSize - 8}"
                fill="rgba(31, 77, 58, 0.8)" rx="6"/>
        </g>
      `;

      // Imagen pixelada embebida
      const dataUri = `data:image/png;base64,${Buffer.from(img.pixelated).toString('base64')}`;
      svgContent += `
        <image x="${x + 4}" y="${y + 4}" width="${GRID.gameSize - 8}" height="${GRID.gameSize - 8}"
               href="${dataUri}" preserveAspectRatio="xMidYMid meet"/>
      `;

      // Etiqueta pequeña
      svgContent += `
        <text x="${x + GRID.gameSize / 2}" y="${y + GRID.gameSize + 16}"
              font-family="Pixelify Sans, monospace" font-size="8" fill="#b8d96a"
              text-anchor="middle">${img.id.substring(0, 10)}</text>
      `;

      idx++;
    }
  }

  svgContent += '</svg>';

  try {
    const buffer = Buffer.from(svgContent);
    const pngBuffer = await sharp(buffer)
      .png()
      .toBuffer();

    const outputPath = path.join(OUTPUT_PATH, `${theme}-pixel.png`);
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`    ✓ ${path.basename(outputPath)} (${Math.round(pngBuffer.length / 1024)}KB)`);
    return outputPath;
  } catch (err) {
    console.error(`    ✗ Error: ${err.message}`);
    return null;
  }
}

/**
 * Procesa un tema completo
 */
async function processTheme(theme) {
  console.log(`\n📦 Procesando tema: ${theme}`);

  const themePattern = path.join(BASE_PATH, '*', theme, '*.png');
  const imagePaths = globSync(themePattern);

  if (imagePaths.length === 0) {
    console.warn(`  No se encontraron imágenes para ${theme}`);
    return;
  }

  const images = [];

  // Cargar y procesar imágenes
  for (const imgPath of imagePaths.slice(0, 24)) { // Max 24 por hoja
    const filename = path.basename(imgPath);
    const id = filename.replace(/\.[^.]+$/, '');

    try {
      const data = fs.readFileSync(imgPath);
      const pixelated = await pixelateImage(data);

      images.push({
        id: id,
        data: data,
        pixelated: pixelated,
        source: path.dirname(imgPath)
      });

      process.stdout.write('.');
    } catch (err) {
      console.warn(`  Error cargando ${filename}: ${err.message}`);
    }
  }

  console.log(` (${images.length} imágenes cargadas)`);

  if (images.length === 0) {
    console.warn(`  No se pudieron cargar imágenes válidas para ${theme}`);
    return;
  }

  // Generar hojas de contacto
  await createRawContactSheet(theme, images);
  await createPixelContactSheet(theme, images);
}

/**
 * Main
 */
async function main() {
  const themes = process.argv.slice(2);

  if (themes.length === 0) {
    // Obtener todos los temas disponibles
    const themeDirs = new Set();
    const pattern = path.join(BASE_PATH, '*', '*');

    globSync(pattern).forEach(dir => {
      if (fs.statSync(dir).isDirectory()) {
        const theme = path.basename(dir);
        themeDirs.add(theme);
      }
    });

    if (themeDirs.size === 0) {
      console.error('No hay imágenes descargadas aun.');
      process.exit(1);
    }

    Array.from(themeDirs).sort().forEach(theme => themes.push(theme));
  }

  console.log('✨ Generando hojas de contacto para Memorice Cozy v2\n');

  for (const theme of themes) {
    await processTheme(theme);
  }

  console.log('\n✅ Hojas de contacto generadas en:', OUTPUT_PATH);
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
