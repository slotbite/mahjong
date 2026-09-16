// node --test tests/pixelator.test.mjs
// Prueba las funciones puras de src/pixel/quantize.js (sin canvas) y la tabla de paletas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cellsFor, cellPxFor, MIN_CELLS, MAX_CELLS, hexToRgb, rgbToHex, rgbToLab, colorDistance,
  preparePalette, nearestIndex, downsampleAverage, upscaleNearest, binarizeAlpha, medianCut,
  BAYER4, ditherBayer, ditherFloydSteinberg, mapToPalette, quantizeBuffer,
} from '../src/pixel/quantize.js';
import { PALETTES, registerPalettes, listPalettes } from '../src/pixel/pixelator.js';

// --- cellsFor -----------------------------------------------------------------------------
test('cellsFor: extremos y referencia del autor (94 → 128 celdas = 4 px sobre 512)', () => {
  assert.equal(cellsFor(0), MIN_CELLS);
  assert.equal(cellsFor(100), MAX_CELLS);
  assert.equal(cellsFor(94), 128);
  assert.equal(cellPxFor(94), 4);
  assert.equal(cellsFor(88), 64);
});

test('cellsFor: monótona no decreciente y acotada en 0..100', () => {
  let prev = -1;
  for (let s = 0; s <= 100; s++) {
    const n = cellsFor(s);
    assert.ok(n >= prev, `no monótona en ${s}: ${n} < ${prev}`);
    assert.ok(n >= MIN_CELLS && n <= MAX_CELLS);
    prev = n;
  }
  assert.equal(cellsFor(-50), MIN_CELLS);
  assert.equal(cellsFor(500), MAX_CELLS);
  assert.equal(cellsFor('abc'), MIN_CELLS);
});

// --- color ----------------------------------------------------------------------------------
test('hexToRgb / rgbToHex: ida y vuelta, forma corta y sin #', () => {
  assert.deepEqual(hexToRgb('#c8744a'), [200, 116, 74]);
  assert.deepEqual(hexToRgb('fff'), [255, 255, 255]);
  assert.equal(rgbToHex([200, 116, 74]), '#c8744a');
  assert.throws(() => hexToRgb('#zzz'));
});

test('rgbToLab: blanco L≈100, negro L≈0, gris neutro a≈b≈0', () => {
  const w = rgbToLab(255, 255, 255), k = rgbToLab(0, 0, 0), g = rgbToLab(128, 128, 128);
  assert.ok(Math.abs(w[0] - 100) < 0.5);
  assert.ok(Math.abs(k[0]) < 0.5);
  assert.ok(Math.abs(g[1]) < 1 && Math.abs(g[2]) < 1);
});

test('colorDistance: perceptual (Lab) y simétrica', () => {
  const d1 = colorDistance([0, 0, 0], [255, 255, 255]);
  const d2 = colorDistance([0, 0, 0], [40, 40, 40]);
  assert.ok(d1 > d2);
  assert.equal(colorDistance([10, 20, 30], [200, 100, 50]), colorDistance([200, 100, 50], [10, 20, 30]));
  assert.equal(colorDistance([1, 2, 3], [1, 2, 3]), 0);
});

test('nearestIndex: elige el color exacto y cachea', () => {
  const pal = preparePalette(PALETTES.pico8);
  assert.equal(pal.size, 16);
  assert.equal(nearestIndex(pal, 255, 0, 77), 8);        // #ff004d
  assert.equal(nearestIndex(pal, 0, 0, 0), 0);
  assert.equal(nearestIndex(pal, 250, 3, 80), 8);        // cercano
  assert.ok(pal.cache.size >= 2);
});

// --- remuestreo -----------------------------------------------------------------------------
function rgbaBuffer(w, h, fn) {
  const b = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, bl, a] = fn(x, y); const i = (y * w + x) * 4;
    b[i] = r; b[i + 1] = g; b[i + 2] = bl; b[i + 3] = a;
  }
  return b;
}

test('downsampleAverage: promedia por celda y pondera por alfa', () => {
  // 4×4 → 2×2; cuadrante superior izquierdo mitad rojo/mitad azul opaco → violeta
  const src = rgbaBuffer(4, 4, (x, y) => {
    if (y < 2 && x < 2) return x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255];
    if (y < 2) return [0, 255, 0, 255];
    if (x < 2) return [0, 0, 0, 0];                       // totalmente transparente
    return x === 2 ? [255, 255, 255, 255] : [0, 0, 0, 0];  // opaco blanco + transparente negro
  });
  const out = downsampleAverage(src, 4, 4, 2, 2);
  assert.deepEqual([...out.slice(0, 4)], [128, 0, 128, 255]);
  assert.deepEqual([...out.slice(4, 8)], [0, 255, 0, 255]);
  assert.equal(out[11], 0);                             // celda transparente
  assert.deepEqual([...out.slice(12, 15)], [255, 255, 255]); // el negro transparente no ensucia el blanco
  assert.equal(out[15], 128);                           // cobertura 50 %
});

test('upscaleNearest: replica bloques sin interpolar', () => {
  const src = rgbaBuffer(2, 1, (x) => (x ? [0, 0, 255, 255] : [255, 0, 0, 255]));
  const out = upscaleNearest(src, 2, 1, 4, 2);
  assert.deepEqual([...out.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...out.slice(4, 8)], [255, 0, 0, 255]);
  assert.deepEqual([...out.slice(8, 12)], [0, 0, 255, 255]);
  assert.deepEqual([...out.slice(16, 20)], [255, 0, 0, 255]); // segunda fila
});

test('binarizeAlpha: umbral 128 y limpia color de los transparentes', () => {
  const b = new Uint8ClampedArray([10, 20, 30, 100, 10, 20, 30, 200]);
  binarizeAlpha(b);
  assert.deepEqual([...b], [0, 0, 0, 0, 10, 20, 30, 255]);
});

// --- cuantización ---------------------------------------------------------------------------
test('medianCut: recupera exactamente los colores de una imagen de 3 colores', () => {
  const cols = [[255, 0, 0], [0, 200, 0], [20, 20, 240]];
  const src = rgbaBuffer(30, 30, (x) => [...cols[x % 3], 255]);
  const pal = medianCut(src, 8).map(rgbToHex).sort();
  assert.deepEqual(pal, cols.map(rgbToHex).sort());
});

test('medianCut: reduce un degradado a k colores ordenables e ignora transparentes', () => {
  const src = rgbaBuffer(64, 4, (x, y) => (y === 3 ? [255, 0, 255, 0] : [x * 4, x * 4, x * 4, 255]));
  const pal = medianCut(src, 4);
  assert.equal(pal.length, 4);
  for (const [r, g, b] of pal) { assert.ok(Math.abs(r - g) < 2 && Math.abs(g - b) < 2, 'gris'); }
  const ls = pal.map((c) => c[0]).sort((a, b) => a - b);
  assert.ok(ls[0] < 64 && ls[3] > 190, `cubre el rango: ${ls}`);
  assert.deepEqual(medianCut(new Uint8ClampedArray(16), 4), []);
});

test('mapToPalette: snap de cada píxel opaco al color más cercano', () => {
  const pal = preparePalette(['#000000', '#ffffff']);
  const b = new Uint8ClampedArray([30, 30, 30, 255, 230, 230, 230, 255, 200, 0, 0, 0]);
  mapToPalette(b, pal);
  assert.deepEqual([...b], [0, 0, 0, 255, 255, 255, 255, 255, 200, 0, 0, 0]);
});

// --- dithering ------------------------------------------------------------------------------
test('BAYER4: 16 umbrales distintos, centrados en 0', () => {
  assert.equal(new Set(BAYER4).size, 16);
  const sum = BAYER4.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum) < 1e-5);
  assert.ok(Math.max(...BAYER4) < 0.5 && Math.min(...BAYER4) > -0.5);
});

test('ditherBayer: patrón determinista, media conservada, transparentes intactos', () => {
  const b = rgbaBuffer(8, 8, (x, y) => (y === 7 ? [0, 0, 0, 0] : [128, 128, 128, 255]));
  const before = [...b];
  ditherBayer(b, 8, 8, 32);
  let sum = 0, n = 0, distinct = new Set();
  for (let i = 0; i < 7 * 8 * 4; i += 4) { sum += b[i]; n++; distinct.add(b[i]); }
  assert.ok(Math.abs(sum / n - 128) < 1);
  assert.equal(distinct.size, 16);
  assert.deepEqual([...b.slice(7 * 8 * 4)], before.slice(7 * 8 * 4));
  // misma entrada → misma salida
  const c = rgbaBuffer(8, 8, (x, y) => (y === 7 ? [0, 0, 0, 0] : [128, 128, 128, 255]));
  assert.deepEqual([...ditherBayer(c, 8, 8, 32)], [...b]);
});

test('ditherFloydSteinberg: gris 50 % en blanco/negro → ~50 % de píxeles blancos', () => {
  const pal = preparePalette(['#000000', '#ffffff']);
  const b = rgbaBuffer(32, 32, () => [128, 128, 128, 255]);
  ditherFloydSteinberg(b, 32, 32, pal, 1);
  let white = 0;
  for (let i = 0; i < b.length; i += 4) { assert.ok(b[i] === 0 || b[i] === 255); if (b[i] === 255) white++; }
  const ratio = white / (32 * 32);
  assert.ok(ratio > 0.42 && ratio < 0.58, `ratio ${ratio}`);
});

test('ditherFloydSteinberg: con strength 0 equivale a mapToPalette', () => {
  const pal = preparePalette(['#000000', '#ffffff']);
  const a = rgbaBuffer(16, 16, (x) => [x * 16, x * 16, x * 16, 255]);
  const b = new Uint8ClampedArray(a);
  ditherFloydSteinberg(a, 16, 16, pal, 0);
  mapToPalette(b, pal);
  assert.deepEqual([...a], [...b]);
});

test('quantizeBuffer: paleta nombrada vs original, respeta alfa', () => {
  const src = rgbaBuffer(16, 16, (x, y) => (x === 0 ? [0, 0, 0, 0] : [x * 15, 100, 255 - x * 15, 255]));
  const named = quantizeBuffer(new Uint8ClampedArray(src), 16, 16, { paletteColors: PALETTES.gameboy });
  const set = new Set();
  for (let i = 0; i < named.length; i += 4) if (named[i + 3]) set.add(rgbToHex([named[i], named[i + 1], named[i + 2]]));
  for (const h of set) assert.ok(PALETTES.gameboy.includes(h), `fuera de paleta: ${h}`);
  assert.equal(named[3], 0);
  const orig = quantizeBuffer(new Uint8ClampedArray(src), 16, 16, { colors: 4 });
  const set2 = new Set();
  for (let i = 0; i < orig.length; i += 4) if (orig[i + 3]) set2.add(rgbToHex([orig[i], orig[i + 1], orig[i + 2]]));
  assert.ok(set2.size <= 4 && set2.size >= 2, `colores: ${set2.size}`);
});

// --- paletas --------------------------------------------------------------------------------
test('PALETTES: tamaños canónicos y hex válidos', () => {
  assert.equal(PALETTES.gameboy.length, 4);
  assert.equal(PALETTES.pico8.length, 16);
  assert.equal(PALETTES.nes.length, 54);
  assert.equal(new Set(PALETTES.nes).size, 54);
  assert.equal(PALETTES.sweetie16.length, 16);
  assert.equal(PALETTES.endesga32.length, 32);
  assert.equal(PALETTES.cga.length, 16);
  for (const [id, cols] of Object.entries(PALETTES)) for (const c of cols) assert.match(c, /^#[0-9a-f]{6}$/, `${id}: ${c}`);
});

test('registerPalettes: fusiona, tolera duplicados y entradas inválidas; listPalettes expone todo', () => {
  const before = PALETTES.gameboy.slice();
  registerPalettes({ gameboy: ['#000', '#FFFFFF'], nueva: { name: 'Nueva', colors: ['#123456'] }, rota: ['zzz'], vacia: [], nada: null });
  assert.deepEqual(PALETTES.gameboy, ['#000000', '#ffffff']);
  assert.deepEqual(PALETTES.nueva, ['#123456']);
  assert.equal(PALETTES.rota, undefined);
  assert.equal(PALETTES.vacia, undefined);
  const list = listPalettes();
  assert.equal(list[0].id, 'original');
  assert.ok(list.find((p) => p.id === 'nueva' && p.name === 'Nueva' && p.colors.length === 1));
  assert.ok(list.every((p) => typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.colors)));
  registerPalettes({ gameboy: before });
  assert.deepEqual(PALETTES.gameboy, before);
});
