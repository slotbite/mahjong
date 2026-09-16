#!/usr/bin/env node
/**
 * Descarga emojis de múltiples fuentes para study-11
 * Estructura: assets/raw/study-11/<fuente>/<tema>/*.png
 */

import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.join(__dirname, '../assets/raw/study-11');

// Configuración de emojis por tema y fuente
const EMOJI_CATALOG = {
  plantas_interior: {
    fluent: [
      { id: 'plant-pot-28286', name: 'Maceta con planta' },
      { id: 'leaf-28349', name: 'Hoja' },
      { id: 'leaf-fluttering-in-wind-1f343', name: 'Hoja flotante' },
      { id: 'herb-1f33f', name: 'Hierba' },
      { id: 'frog-1f438', name: 'Rana' },
      { id: 'seedling-1f331', name: 'Brote' },
      { id: 'flower-1f337', name: 'Flor' },
      { id: 'bouquet-1f490', name: 'Ramo' },
    ],
  },
  selva_tropical: {
    fluent: [
      { id: 'frog-1f438', name: 'Rana' },
      { id: 'parrot-1f99c', name: 'Loro' },
      { id: 'butterfly-1f98b', name: 'Mariposa' },
      { id: 'leaf-28349', name: 'Hoja' },
      { id: 'flower-1f337', name: 'Flor' },
      { id: 'tropical-fish-1f420', name: 'Pez tropical' },
      { id: 'snake-1f40d', name: 'Serpiente' },
      { id: 'toucan-1f9a4', name: 'Tucán' },
    ]
  },
  cozy: {
    fluent: [
      { id: 'mug-with-hot-beverage-2615', name: 'Taza de te' },
      { id: 'candle-1f56f', name: 'Vela' },
      { id: 'book-1f4d5', name: 'Libro' },
      { id: 'cat-face-1f431', name: 'Gato' },
      { id: 'couch-1f6cb', name: 'Sofa' },
      { id: 'blanket-1f6f3', name: 'Manta' },
      { id: 'lamp-1f4a1', name: 'Lampara' },
      { id: 'teacup-without-handle-2690', name: 'Taza de te pequena' },
    ]
  },
  cafe_te: {
    fluent: [
      { id: 'mug-with-hot-beverage-2615', name: 'Taza caliente' },
      { id: 'teacup-without-handle-2690', name: 'Taza de te' },
      { id: 'cup-with-straw-1f9cb', name: 'Vaso con popote' },
      { id: 'water-wave-1f30a', name: 'Ola' },
      { id: 'spoon-1f944', name: 'Cuchara' },
      { id: 'cup-1f375', name: 'Taza' },
    ]
  },
  cielo_nocturno: {
    fluent: [
      { id: 'crescent-moon-1f319', name: 'Luna creciente' },
      { id: 'full-moon-1f315', name: 'Luna llena' },
      { id: 'star-2b50', name: 'Estrella' },
      { id: 'sparkles-2728', name: 'Destellos' },
      { id: 'telescope-1f52d', name: 'Telescopio' },
      { id: 'saturn-1fa90', name: 'Saturno' },
      { id: 'globe-showing-americas-1f30e', name: 'Globo' },
      { id: 'cloud-1f32b', name: 'Nube' },
    ]
  },
  acuario: {
    fluent: [
      { id: 'tropical-fish-1f420', name: 'Pez tropical' },
      { id: 'fish-1f41f', name: 'Pez' },
      { id: 'blowfish-1f421', name: 'Pez globo' },
      { id: 'coral-1fab8', name: 'Coral' },
      { id: 'water-wave-1f30a', name: 'Ola' },
      { id: 'bubble-1f4ab', name: 'Burbuja' },
      { id: 'squid-1f991', name: 'Calamar' },
      { id: 'shrimp-1f99e', name: 'Camaron' },
    ]
  },
  pasatiempos_geek: {
    fluent: [
      { id: 'video-game-controller-1f3ae', name: 'Control de video juego' },
      { id: 'dices-1f3b2', name: 'Dados' },
      { id: 'compact-disc-1f4bf', name: 'CD' },
      { id: 'computer-1f4bb', name: 'Computadora' },
      { id: 'keyboard-2328', name: 'Teclado' },
      { id: 'robot-1f920', name: 'Robot' },
      { id: 'space-invader-1f47e', name: 'Invasor del espacio' },
      { id: 'game-die-1f3af', name: 'Dado de juego' },
    ]
  },
};

// Configuración de fuentes
const SOURCES = {
  fluent: {
    name: 'Fluent Emoji (Microsoft)',
    license: 'MIT',
    attribution: false,
    baseUrl: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets',
    format: 'svg',
  },
};

/**
 * Descarga un archivo desde una URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve) => {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        fs.unlink(filepath, () => {});
        resolve(false);
      }
    }).on('error', () => {
      file.close();
      fs.unlink(filepath, () => {});
      resolve(false);
    });
  });
}

/**
 * Descarga emojis de Fluent
 */
async function downloadFluentEmojis() {
  console.log('\n📥 Descargando de Fluent Emoji (MIT)...\n');

  for (const [theme, emojiConfig] of Object.entries(EMOJI_CATALOG)) {
    if (!emojiConfig.fluent) continue;

    const themeDir = path.join(BASE_PATH, 'fluent', theme);
    fs.mkdirSync(themeDir, { recursive: true });

    console.log(`  Tema: ${theme}`);
    const manifest = { license: 'MIT', source: 'microsoft/fluentui-emoji', attribution: false, files: {} };

    for (const emoji of emojiConfig.fluent) {
      const filename = `${emoji.id}.svg`;
      const url = `${SOURCES.fluent.baseUrl}/${emoji.id}/default/Color/SVG/${emoji.id}.svg`;
      const filepath = path.join(themeDir, filename);

      const success = await downloadFile(url, filepath);
      if (success) {
        manifest.files[filename] = {
          name: emoji.name,
          url: url,
          downloaded: new Date().toISOString()
        };
        process.stdout.write('.');
      } else {
        process.stdout.write('F');
      }
    }

    // Guardar manifest
    fs.writeFileSync(
      path.join(themeDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log(' OK\n');
  }
}

/**
 * Main
 */
async function main() {
  console.log('🎨 Descargando candidatos de emojis para Memorice Cozy v2...\n');

  // Crear estructura base
  fs.mkdirSync(BASE_PATH, { recursive: true });

  // Descargar de fuentes
  await downloadFluentEmojis();

  console.log('\nOK: Descargas completadas.');
  console.log(`Ubicacion: ${BASE_PATH}`);
}

main().catch(console.error);
