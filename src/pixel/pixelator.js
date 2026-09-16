// Pixelador de Memorice v2: pixelado por grado + paleta + dithering sobre canvas 2D.
// Contrato: doc/v2/PROPUESTA_V2.md §2.5 y §7.4. Hallazgos: doc/v2/pixel-3-pixelador.md.
// La aritmética de píxeles vive en ./quantize.js (pura, testeable en Node); acá va el pegamento canvas.
import {
  cellsFor, cellPxFor, hexToRgb, rgbToHex, downsampleAverage, upscaleNearest, binarizeAlpha,
  quantizeBuffer, medianCut, clamp,
} from './quantize.js';

export { cellsFor, cellPxFor, hexToRgb, rgbToHex, medianCut };

// ---------------------------------------------------------------------------
// Paletas. Fuentes en doc/v2/pixel-3-pixelador.md §4. `cozy-pastel` y `jungle-dusk` replican el
// manifiesto/tokens del director; el manifiesto siempre gana vía registerPalettes().
// ---------------------------------------------------------------------------
export const PALETTES = {
  gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  pico8: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
    '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
  nes: ['#000000', '#fcfcfc', '#bcbcbc', '#7c7c7c', '#a4e4fc', '#3cbcfc', '#0078f8', '#0000fc',
    '#b8b8f8', '#6888fc', '#0058f8', '#0000bc', '#d8b8f8', '#9878f8', '#6844fc', '#4428bc', '#f8b8f8',
    '#f878f8', '#d800cc', '#940084', '#f8a4c0', '#f85898', '#e40058', '#a80020', '#f0d0b0', '#f87858',
    '#f83800', '#a81000', '#fce0a8', '#fca044', '#e45c10', '#881400', '#f8d878', '#f8b800', '#ac7c00',
    '#503000', '#d8f878', '#b8f818', '#00b800', '#007800', '#b8f8b8', '#58d854', '#00a800', '#006800',
    '#b8f8d8', '#58f898', '#00a844', '#005800', '#00fcfc', '#00e8d8', '#008888', '#004058', '#f8d8f8',
    '#787878'],
  sweetie16: ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179',
    '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57'],
  endesga32: ['#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
    '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e', '#124e89',
    '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466', '#262b44', '#181425',
    '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569'],
  cga: ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
    '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'],
  'cozy-pastel': ['#2b2a33', '#5a4a5f', '#8c6f8a', '#c9a7b8', '#f4ead8', '#e8c39e', '#c8744a', '#9a5a3c',
    '#6a9a5b', '#b8d96a', '#8fb3c7', '#5d7f94'],
  'jungle-dusk': ['#0f2a22', '#1f4d3a', '#2f6b4b', '#6a9a5b', '#b8d96a', '#f4ead8', '#c8744a', '#8fb3c7',
    '#e0b04c', '#7b3f5c', '#3b6f8a', '#1a1a24'],
  // Medida sobre las 30 cartas v1 (img/*.png): los 16 colores más frecuentes. Reproduce el look actual.
  'plantas-v1': ['#000000', '#0a2a33', '#353f23', '#5c5d41', '#919b45', '#afd370', '#cdc599', '#988f64',
    '#ffccd0', '#c1d9f2', '#895654', '#61393b', '#ffd3ad', '#a293c4', '#3f1f3c', '#ffffff'],
};

const PALETTE_NAMES = {
  original: 'Original (colores de la imagen)',
  gameboy: 'Game Boy (4)',
  pico8: 'PICO-8 (16)',
  nes: 'NES (54)',
  sweetie16: 'Sweetie 16',
  endesga32: 'Endesga 32',
  cga: 'CGA (16)',
  'cozy-pastel': 'Cozy pastel (12)',
  'jungle-dusk': 'Jungle dusk (12)',
  'plantas-v1': 'Plantas v1 (16)',
};

/**
 * Fusiona paletas externas (p. ej. `manifest.palettes`). Tolera duplicados: la entrada nueva
 * reemplaza a la existente si es un array válido de hex; entradas inválidas se ignoran.
 * Acepta `{ id: ['#hex', ...] }` o `{ id: { name, colors: [...] } }`.
 */
export function registerPalettes(obj) {
  if (!obj || typeof obj !== 'object') return PALETTES;
  for (const [id, val] of Object.entries(obj)) {
    const colors = Array.isArray(val) ? val : val?.colors;
    if (!Array.isArray(colors) || colors.length === 0) continue;
    const clean = [];
    for (const c of colors) {
      try { clean.push(rgbToHex(hexToRgb(c))); } catch { /* color inválido: se omite */ }
    }
    if (!clean.length) continue;
    PALETTES[id] = clean;
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof val.name === 'string') PALETTE_NAMES[id] = val.name;
  }
  return PALETTES;
}

/** Para el panel de ajustes (ui-6): `[{ id, name, colors }]`, con `original` primero. */
export function listPalettes() {
  const out = [{ id: 'original', name: PALETTE_NAMES.original, colors: [] }];
  for (const [id, colors] of Object.entries(PALETTES)) {
    out.push({ id, name: PALETTE_NAMES[id] ?? `${id} (${colors.length})`, colors: [...colors] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------
function sourceSize(src) {
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) {
    return [src.naturalWidth || src.width, src.naturalHeight || src.height];
  }
  if (typeof HTMLVideoElement !== 'undefined' && src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
  return [src.width, src.height];
}

function makeCanvas(w, h, likeOffscreen) {
  if (likeOffscreen && typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * Pixela `source` y devuelve un canvas `size×size` con transparencia.
 *
 * Pasos: 1) encuadre contain en un lienzo size×size, downsampling alineado con rejilla N×N;
 * 2) promedio por celda respetando alfa → rejilla N×N (N = cellsFor(pixelScale));
 * 3) alfa binario; 4) dithering opcional (bayer antes de cuantizar; floyd difunde el error mientras
 * cuantiza); 5) cuantización: `original` = median-cut+k-means a `colors` colores, nombre de paleta =
 * color más cercano en Lab; 6) upscale nearest a `size`.
 *
 * @param {HTMLImageElement|ImageBitmap|HTMLCanvasElement|OffscreenCanvas} source
 * @returns {HTMLCanvasElement|OffscreenCanvas} OffscreenCanvas si `source` lo es.
 */
export function pixelate(source, {
  pixelScale = 94, palette = 'original', dither = 'none', size = 256, colors = 16, ditherStrength = 1,
} = {}) {
  const [sw, sh] = sourceSize(source);
  if (!sw || !sh) throw new Error('pixelate: fuente sin dimensiones (¿imagen no cargada?)');
  size = clamp(Math.round(size) || 256, 8, 2048);
  const N = cellsFor(pixelScale);
  const W = size;  // fix center-10: usar size exacto para evitar mismatch downsampling→upsampling
  const isOffscreen = typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas;

  // 1) contain en W×W
  const work = makeCanvas(W, W, isOffscreen);
  const wctx = work.getContext('2d', { willReadFrequently: true });
  wctx.imageSmoothingEnabled = true;
  wctx.imageSmoothingQuality = 'high';
  const scale = Math.min(W / sw, W / sh);
  const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
  wctx.clearRect(0, 0, W, W);
  wctx.drawImage(source, Math.floor((W - dw) / 2), Math.floor((W - dh) / 2), dw, dh);
  const src = wctx.getImageData(0, 0, W, W).data;

  // 2) + 3)
  const grid = binarizeAlpha(downsampleAverage(src, W, W, N, N));

  // 4) + 5)
  const paletteColors = palette && palette !== 'original' ? (PALETTES[palette] ?? null) : null;
  if (palette && palette !== 'original' && !paletteColors) console.warn(`[pixel] paleta desconocida "${palette}", uso "original"`);
  quantizeBuffer(grid, N, N, { paletteColors, colors: clamp(Math.round(colors) || 16, 2, 256), dither, ditherStrength });

  // 6) upscale nearest
  const out = makeCanvas(size, size, isOffscreen);
  const octx = out.getContext('2d');
  const pixels = size === N ? grid : upscaleNearest(grid, N, N, size, size);
  octx.putImageData(new ImageData(pixels, size, size), 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// init(ctx): registro de paletas del manifiesto + puente cacheado para core-1
// ---------------------------------------------------------------------------
const MAX_CACHE = 200;
const cache = new Map(); // key → canvas (inserción = antigüedad; se borra el más viejo)

function srcIdOf(img) {
  return img?.dataset?.cardId || img?.dataset?.srcId || img?.currentSrc || img?.src || img?.id || null;
}

/** Pixela con los ajustes actuales y cachea por (srcId, pixelScale, palette, dither, size). */
export function pixelateCached(img, settingsLike, extra = {}) {
  const opts = {
    pixelScale: settingsLike.get('pixelScale') ?? 94,
    palette: settingsLike.get('palette') ?? 'original',
    dither: settingsLike.get('dither') ?? 'none',
    size: extra.size ?? 256,
    colors: extra.colors ?? 16,
  };
  const id = extra.srcId ?? srcIdOf(img);
  const key = id ? `${id}|${opts.pixelScale}|${opts.palette}|${opts.dither}|${opts.size}|${opts.colors}` : null;
  if (key && cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key); cache.set(key, hit); // refresca antigüedad
    return hit;
  }
  const canvas = pixelate(img, opts);
  if (key) {
    cache.set(key, canvas);
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  }
  return canvas;
}

export function clearCache() { cache.clear(); }

export function init(ctx) {
  registerPalettes(ctx?.manifest?.palettes);
  const settings = ctx?.settings ?? { get: () => undefined };
  if (typeof window !== 'undefined') {
    window.__pixelate = (img, extra) => pixelateCached(img, settings, extra);
    window.__pixelateInfo = () => ({ cells: cellsFor(settings.get('pixelScale')), cacheSize: cache.size, palettes: listPalettes() });
  }
  // Al cambiar el pixelado ya nadie va a pedir la variante anterior: soltamos memoria.
  ctx?.bus?.on?.(ctx.EV?.SETTINGS_CHANGED ?? 'settings:changed', ({ key }) => {
    if (key === '*' || key === 'pixelScale' || key === 'palette' || key === 'dither') clearCache();
  });
  return { pixelate, pixelateCached, listPalettes, registerPalettes, cellsFor };
}
