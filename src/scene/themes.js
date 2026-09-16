// Cargador de temas: theme:load → carga imágenes del manifiesto → theme:ready { theme, textures }.
// Si existe window.__pixelate (pixel-3) procesa cada imagen antes de crear la textura y
// reprocesa al cambiar pixelScale/palette/dither. No asume tamaños: lee todo del manifiesto.
import * as THREE from 'three';

const PIXEL_KEYS = new Set(['pixelScale', 'palette', 'dither', '*']);
export const BACK_KEY = '_back';

function rel(src) {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('./') || src.startsWith('../')) return src;
  return './' + src.replace(/^\/+/, '');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = rel(src);
  });
}

/** Encaja (contain) cualquier imagen/canvas en un lienzo cuadrado transparente. */
export function squareContain(source, size) {
  const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
  if (sw === sh && sw === size) return source;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const k = Math.min(size / sw, size / sh);
  const dw = Math.round(sw * k), dh = Math.round(sh * k);
  g.drawImage(source, Math.round((size - dw) / 2), Math.round((size - dh) / 2), dw, dh);
  return c;
}

/** Signo "?" pixel art generado por si el tema no declara backSymbol. */
export function makeQuestionTexture(color = '#f4ead8', size = 64) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const px = size / 16;
  const rows = [
    '...XXXXXXXX.....',
    '..XXXXXXXXXX....',
    '.XXX......XXX...',
    '.XX........XX...',
    '...........XX...',
    '..........XXX...',
    '........XXXX....',
    '.......XXX......',
    '......XXX.......',
    '......XX........',
    '......XX........',
    '................',
    '......XX........',
    '.....XXXX.......',
    '.....XXXX.......',
    '......XX........',
  ];
  g.fillStyle = color;
  rows.forEach((r, y) => { for (let x = 0; x < 16; x++) if (r[x] === 'X') g.fillRect(x * px, y * px, px, px); });
  return finishTexture(new THREE.CanvasTexture(c));
}

export function finishTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  // Minificación lineal (sin mipmaps): en móvil una carta de 80 px muestra una textura de
  // 256 px; Nearest puro "chispea" al reducir. Magnificación Nearest conserva el pixel art.
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 1;
  tex.needsUpdate = true;
  return tex;
}

export function createThemeLoader({ bus, EV, settings, manifest }) {
  const cache = new Map();   // themeId → { theme, images: Map, textures: Map }
  let current = null;
  let loading = null;

  function pixelOpts() {
    const s = settings?.all ?? {};
    return { pixelScale: s.pixelScale ?? 94, palette: s.palette ?? 'original', dither: s.dither ?? 'none', size: 256 };
  }

  function process(img, theme) {
    const fn = globalThis.__pixelate;
    let src = img;
    if (typeof fn === 'function') {
      try { src = fn(img, { ...pixelOpts(), themePalette: theme?.palette }) || img; }
      catch (err) { console.warn('[scene/themes] __pixelate falló, se usa la imagen original', err); src = img; }
    }
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    const size = src === img ? Math.min(512, Math.max(w, h)) : Math.max(w, h);
    return squareContain(src, size);
  }

  function buildTextures(entry) {
    const { theme, images } = entry;
    if (!entry.textures) entry.textures = new Map();
    for (const [id, img] of images) {
      const canvas = process(img, theme);
      const prev = entry.textures.get(id);
      if (prev) { prev.image = canvas; prev.needsUpdate = true; }
      else entry.textures.set(id, finishTexture(new THREE.Texture(canvas)));
    }
    if (!entry.textures.has(BACK_KEY)) entry.textures.set(BACK_KEY, makeQuestionTexture());
    return entry.textures;
  }

  function resolveTheme(themeId) {
    const themes = manifest?.themes ?? [];
    let theme = themes.find((t) => t.id === themeId);
    if (!theme || !theme.cards?.length) {
      const fallback = themes.find((t) => t.cards?.length);
      console.warn(`[scene/themes] tema "${themeId}" sin cartas; se usa "${fallback?.id}"`);
      theme = fallback;
    }
    return theme;
  }

  async function load(themeId) {
    const theme = resolveTheme(themeId);
    if (!theme) { console.error('[scene/themes] el manifiesto no tiene ningún tema con cartas'); return; }
    let entry = cache.get(theme.id);
    if (!entry) {
      const images = new Map();
      const jobs = theme.cards.map(async (c) => { images.set(c.id, await loadImage(c.src)); });
      if (theme.backSymbol) jobs.push(loadImage(theme.backSymbol).then((img) => images.set(BACK_KEY, img)).catch((e) => console.warn(e.message)));
      const results = await Promise.allSettled(jobs);
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) console.warn(`[scene/themes] ${failed.length} imágenes fallaron`, failed.map((f) => f.reason?.message));
      entry = { theme: { ...theme, cards: theme.cards.filter((c) => images.has(c.id)) }, images, textures: null };
      cache.set(theme.id, entry);
    }
    buildTextures(entry);
    current = entry;
    bus.emit(EV.THEME_READY, { theme: entry.theme, textures: entry.textures });
  }

  bus.on(EV.THEME_LOAD, ({ themeId } = {}) => {
    loading = (loading ?? Promise.resolve()).then(() => load(themeId)).catch((err) => console.error('[scene/themes]', err));
  });

  bus.on(EV.SETTINGS_CHANGED, ({ key } = {}) => {
    if (!PIXEL_KEYS.has(key) || !current || typeof globalThis.__pixelate !== 'function') return;
    buildTextures(current);
    bus.emit(EV.THEME_READY, { theme: current.theme, textures: current.textures, reprocessed: true });
  });

  return { load, get current() { return current; } };
}
