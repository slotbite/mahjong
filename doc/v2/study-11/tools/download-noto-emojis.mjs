#!/usr/bin/env node
/**
 * Descarga emojis Noto (Google, Apache-2.0) para study-11
 * Estructura: assets/raw/study-11/noto/<tema>/<emoji-name>.png
 */

import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.join(__dirname, '../assets/raw/study-11');

// Mapeo: emoji name -> unicode codepoint (para Noto Emoji PNG)
const EMOJI_MAP = {
  // Plantas de interior
  potted_plant: 'u1f331',
  leaf: 'u1f343',
  herb: 'u1f33f',
  flower: 'u1f337',
  bouquet: 'u1f490',
  shamrock: 'u2618',
  four_leaf_clover: 'u1f340',
  sunflower: 'u1f33b',
  rose: 'u1f339',
  wilted_flower: 'u1f940',

  // Fauna
  frog: 'u1f438',
  parrot: 'u1f99c',
  butterfly: 'u1f98b',
  tropical_fish: 'u1f420',
  snake: 'u1f40d',
  toucan: 'u1f9a4',
  fish: 'u1f41f',
  blowfish: 'u1f421',
  octopus: 'u1f991',
  squid: 'u1f991',
  shrimp: 'u1f99e',
  coral: 'u1fab8',
  cat_face: 'u1f431',
  tiger_face: 'u1f42f',
  monkey_face: 'u1f435',

  // Cozy
  mug_hot: 'u2615',
  candle: 'u1f56f',
  book: 'u1f4d5',
  teacup: 'u2690',
  couch: 'u1f6cb',
  lamp: 'u1f4a1',

  // Otros
  full_moon: 'u1f315',
  crescent_moon: 'u1f319',
  star: 'u2b50',
  sparkles: 'u2728',
  telescope: 'u1f52d',
  water_wave: 'u1f30a',
  cloud_with_rain: 'u1f327',
  rainbow: 'u1f308',
  video_game: 'u1f3ae',
  dice: 'u1f3b2',
  cd: 'u1f4bf',
  computer: 'u1f4bb',
  keyboard: 'u2328',
  robot: 'u1f920',
};

// Configuración de temas
const TEMAS = {
  plantas_interior: [
    'potted_plant', 'leaf', 'herb', 'flower', 'bouquet',
    'shamrock', 'four_leaf_clover', 'sunflower', 'rose', 'wilted_flower'
  ],
  selva_tropical: [
    'frog', 'parrot', 'butterfly', 'leaf', 'flower',
    'tropical_fish', 'snake', 'toucan', 'monkey_face', 'tiger_face'
  ],
  cozy: [
    'mug_hot', 'candle', 'book', 'cat_face', 'couch', 'lamp',
    'teacup', 'rose', 'butterfly', 'herb'
  ],
  cafe_te: [
    'mug_hot', 'teacup', 'water_wave', 'herb', 'flower'
  ],
  cielo_nocturno: [
    'full_moon', 'crescent_moon', 'star', 'sparkles',
    'telescope', 'cloud_with_rain', 'water_wave'
  ],
  acuario: [
    'tropical_fish', 'fish', 'blowfish', 'coral', 'water_wave',
    'octopus', 'squid', 'shrimp', 'star', 'bubble'
  ],
  pasatiempos_geek: [
    'video_game', 'dice', 'cd', 'computer', 'keyboard',
    'robot', 'star', 'sparkles'
  ],
};

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

async function main() {
  console.log('Descargando emojis Noto (Google, Apache-2.0)...\n');

  fs.mkdirSync(BASE_PATH, { recursive: true });

  for (const [tema, emojis] of Object.entries(TEMAS)) {
    const temaDir = path.join(BASE_PATH, 'noto', tema);
    fs.mkdirSync(temaDir, { recursive: true });

    console.log(`Tema: ${tema}`);
    const manifest = {
      license: 'Apache-2.0',
      source: 'googlefonts/noto-emoji',
      attribution: false,
      files: {}
    };

    for (const emojiName of emojis) {
      const unicode = EMOJI_MAP[emojiName];
      if (!unicode) {
        process.stdout.write('?');
        continue;
      }

      const filename = `${emojiName}.png`;
      const url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_${unicode}.png`;
      const filepath = path.join(temaDir, filename);

      const success = await downloadFile(url, filepath);
      if (success) {
        manifest.files[filename] = {
          url: url,
          downloaded: new Date().toISOString()
        };
        process.stdout.write('.');
      } else {
        process.stdout.write('F');
      }
    }

    fs.writeFileSync(
      path.join(temaDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log(' OK\n');
  }

  console.log('OK: Descargas completadas.');
  console.log(`Ubicacion: ${BASE_PATH}`);
}

main().catch(console.error);
