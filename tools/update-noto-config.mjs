#!/usr/bin/env node
/**
 * Actualiza assets/src-config.json para incorporar Noto Emoji (Apache-2.0)
 * en temas selva, cozy, geek y acuario. Reemplaza cartas Kenney.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'assets', 'src-config.json');

const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Agregar fuente Noto Emoji
cfg.sources.noto_emoji = {
  "name": "Noto Emoji (Google)",
  "author": "Google Fonts",
  "license": "Apache-2.0",
  "url": "https://github.com/googlefonts/noto-emoji",
  "mode": "vector",
  "pixelate": 32
};

// Mapeo: emoji name → codepoint (Noto Emoji Unicode, Apache-2.0)
const CODEPOINTS = {
  frog: '1f438', parrot: '1f99c', butterfly: '1f98b', leaf: '1f343', flower: '1f337',
  tropical_fish: '1f420', snake: '1f40d', toucan: '1f9a4', monkey_face: '1f435', tiger_face: '1f42f',
  elephant: '1f418', crocodile: '1f40a', turtle: '1f422', mushroom: '1f344', snail: '1f40c',
  bee: '1f41d', palm_tree: '1f334', potted_plant: '1f331', banana: '1f34c', pineapple: '1f349',
  hibiscus: '1f33a', lizard: '1f98e', ant: '1f41c', ladybug: '1f41e', beetle: '1f41b',
  spider: '1f577', scorpion: '1f982',

  mug_hot: '2615', candle: '1f56f', book: '1f4d5', cat_face: '1f431', couch: '1f6cb', lamp: '1f4a1',
  rose: '1f339', herb: '1f33f', tea: '1f375', cake: '1f370', biscuit: '1f96f', heart: '2764',
  star: '2b50', sparkles: '2728', cookie: '1f36a', chocolate: '1f36b', donut: '1f369',
  pancakes: '1f95e', cupcake: '1f9c1', yarn: '1f9f6', pillow: '1f6cc', bed: '1f6cf', chair: '1fa85',

  fish: '1f41f', blowfish: '1f421', coral: '1fab8', water_wave: '1f30a', octopus: '1f991',
  shrimp: '1f99e', dolphin: '1f42c', whale: '1f40b', penguin: '1f427', seal: '1f68d', otter: '1f78d',
  jellyfish: '1f9aa', shell: '1f41a', crab: '1f980', sea_horse: '1f93f', starfish: '1f31f',
  bubble: '1fab7', squid: '1f991', droplet: '1f4a7',

  video_game: '1f3ae', dice: '1f3b2', cd: '1f4bf', computer: '1f4bb', keyboard: '2328', robot: '1f920',
  alien: '1f47d', space_invader: '1f46e', rocket: '1f680', telescope: '1f52d', game_die: '1f3b2',
  chess_pawn: '265f', arcade_stick: '1f579', bomb: '1f4a3', crystal_ball: '1f52e', magnet: '1f9f2',
  gear: '2699', satellite: '1f6f0', airplane: '2708',
};

function makeCard(name) {
  return { id: name, mode: 'vector' };
}

// Listas de cartas por tema
const THEMES = {
  'selva': [
    'frog', 'parrot', 'butterfly', 'leaf', 'flower', 'tropical_fish', 'snake', 'toucan',
    'monkey_face', 'tiger_face', 'elephant', 'crocodile', 'turtle', 'mushroom', 'snail',
    'bee', 'palm_tree', 'potted_plant', 'banana', 'pineapple', 'hibiscus', 'lizard',
    'ant', 'ladybug', 'beetle', 'spider', 'scorpion'
  ],
  'cozy': [
    'mug_hot', 'candle', 'book', 'cat_face', 'couch', 'lamp', 'rose', 'butterfly',
    'herb', 'tea', 'cake', 'biscuit', 'heart', 'star', 'sparkles', 'cookie',
    'chocolate', 'donut', 'pancakes', 'cupcake', 'yarn', 'pillow', 'bed', 'chair'
  ],
  'geek': [
    'video_game', 'dice', 'cd', 'computer', 'keyboard', 'robot', 'star', 'sparkles',
    'alien', 'space_invader', 'rocket', 'telescope', 'game_die', 'chess_pawn',
    'arcade_stick', 'bomb', 'crystal_ball', 'magnet', 'gear', 'satellite', 'airplane'
  ],
  'acuario': [
    'tropical_fish', 'fish', 'blowfish', 'coral', 'water_wave', 'octopus', 'shrimp',
    'dolphin', 'whale', 'penguin', 'seal', 'otter', 'jellyfish', 'shell', 'crab',
    'sea_horse', 'starfish', 'bubble', 'squid', 'star', 'droplet'
  ]
};

// Actualizar temas
for (let i = 0; i < cfg.themes.length; i++) {
  const t = cfg.themes[i];
  if (THEMES[t.id]) {
    t.source = 'noto_emoji';
    t.cards = THEMES[t.id].map((name) => {
      if (!CODEPOINTS[name]) throw new Error(`Codepoint desconocido: ${name}`);
      return makeCard(name);
    });
  }
}

// Guardar
fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
console.log('✓ Config actualizado');
for (const [id, cards] of Object.entries(THEMES)) {
  const theme = cfg.themes.find(t => t.id === id);
  console.log(`  ${id}: ${theme?.cards?.length || 0} cartas (Noto Emoji, Apache-2.0)`);
}
