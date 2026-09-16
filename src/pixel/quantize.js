// Núcleo de píxeles del pixelador: funciones puras sobre buffers RGBA, sin canvas ni DOM.
// Se prueba en Node (`node --test tests/pixelator.test.mjs`) y lo consume src/pixel/pixelator.js.
// Contrato y hallazgos: doc/v2/pixel-3-pixelador.md.

// ---------------------------------------------------------------------------
// 1. Grado de pixelado → celdas
// ---------------------------------------------------------------------------

export const MIN_CELLS = 8;
export const MAX_CELLS = 128;
/** Ancho de referencia (px) de las cartas v1 generadas con la herramienta original. */
export const REF_WIDTH = 512;

/**
 * Tamaño de celda (px) que el grado `s` (0..100) representa sobre una imagen de REF_WIDTH px.
 * Las cartas v1 (512 px de ancho) tienen celdas de exactamente 4 px y el autor usaba grado 94:
 * (100 − 94) · 2/3 = 4. En 0 la celda es 66.7 px (≈ 8 celdas), el mínimo legible.
 */
export function cellPxFor(pixelScale) {
  const s = clamp(Number(pixelScale) || 0, 0, 100);
  return Math.max(1, (100 - s) * (2 / 3));
}

/**
 * Número de celdas por lado de la rejilla para un grado 0..100.
 * Monótona no decreciente: 0 → 8, 50 → 15, 88 → 64, 94..100 → 128 (tope).
 */
export function cellsFor(pixelScale) {
  const n = Math.round(REF_WIDTH / cellPxFor(pixelScale));
  return clamp(n, MIN_CELLS, MAX_CELLS);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------------------------------------------------------------------------
// 2. Color: hex, Lab y distancia
// ---------------------------------------------------------------------------

export function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) throw new Error(`color inválido: ${hex}`);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

// sRGB → linear, tabla de 256 entradas.
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function labF(t) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** sRGB (0..255) → CIE Lab (D65). Devuelve [L, a, b]. */
export function rgbToLab(r, g, b) {
  const R = LIN[clamp(Math.round(r), 0, 255)];
  const G = LIN[clamp(Math.round(g), 0, 255)];
  const B = LIN[clamp(Math.round(b), 0, 255)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const fx = labF(x), fy = labF(y), fz = labF(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Distancia al cuadrado en Lab (ΔE76²) entre dos colores sRGB. */
export function colorDistance(a, b) {
  const la = rgbToLab(a[0], a[1], a[2]);
  const lb = rgbToLab(b[0], b[1], b[2]);
  const dl = la[0] - lb[0], da = la[1] - lb[1], db = la[2] - lb[2];
  return dl * dl + da * da + db * db;
}

/**
 * Prepara una paleta para búsquedas rápidas: RGB planos + Lab precalculado.
 * `colors` acepta hex strings o tuplas [r,g,b].
 */
export function preparePalette(colors) {
  const rgb = colors.map((c) => (typeof c === 'string' ? hexToRgb(c) : [c[0], c[1], c[2]]));
  const lab = new Float32Array(rgb.length * 3);
  rgb.forEach(([r, g, b], i) => {
    const l = rgbToLab(r, g, b);
    lab[i * 3] = l[0]; lab[i * 3 + 1] = l[1]; lab[i * 3 + 2] = l[2];
  });
  return { rgb, lab, size: rgb.length, cache: new Map() };
}

/** Índice del color de `pal` (de preparePalette) más cercano en Lab. Cachea por RGB de 24 bits. */
export function nearestIndex(pal, r, g, b) {
  r = clamp(Math.round(r), 0, 255); g = clamp(Math.round(g), 0, 255); b = clamp(Math.round(b), 0, 255);
  const key = (r << 16) | (g << 8) | b;
  const hit = pal.cache.get(key);
  if (hit !== undefined) return hit;
  const [L, A, B] = rgbToLab(r, g, b);
  let best = 0, bestD = Infinity;
  const lab = pal.lab;
  for (let i = 0; i < pal.size; i++) {
    const dl = lab[i * 3] - L, da = lab[i * 3 + 1] - A, db = lab[i * 3 + 2] - B;
    const d = dl * dl + da * da + db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (pal.cache.size < 65536) pal.cache.set(key, best);
  return best;
}

// ---------------------------------------------------------------------------
// 3. Remuestreo: promedio por celda respetando alfa
// ---------------------------------------------------------------------------

/**
 * Reduce un buffer RGBA `src` de `w×h` a `cols×rows` celdas promediando cada bloque.
 * El color se promedia ponderado por alfa (premultiplicado) para que los bordes transparentes
 * no arrastren negro. El alfa resultante es el promedio de cobertura de la celda.
 */
export function downsampleAverage(src, w, h, cols, rows = cols) {
  const out = new Uint8ClampedArray(cols * rows * 4);
  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.floor((cy * h) / rows), y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / rows));
    for (let cx = 0; cx < cols; cx++) {
      const x0 = Math.floor((cx * w) / cols), x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / cols));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * w + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) {
          const al = src[i + 3];
          r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al; n++;
        }
      }
      const o = (cy * cols + cx) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = a / n;
    }
  }
  return out;
}

/** Amplía `src` (cols×rows) a `w×h` con vecino más cercano. */
export function upscaleNearest(src, cols, rows, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  const xs = new Int32Array(w);
  for (let x = 0; x < w; x++) xs[x] = Math.min(cols - 1, Math.floor((x * cols) / w)) * 4;
  for (let y = 0; y < h; y++) {
    const sy = Math.min(rows - 1, Math.floor((y * rows) / h)) * cols * 4;
    let o = y * w * 4;
    for (let x = 0; x < w; x++, o += 4) {
      const i = sy + xs[x];
      out[o] = src[i]; out[o + 1] = src[i + 1]; out[o + 2] = src[i + 2]; out[o + 3] = src[i + 3];
    }
  }
  return out;
}

/** Alfa binario: por debajo de `threshold` transparente (y color a 0), si no opaco. */
export function binarizeAlpha(buf, threshold = 128) {
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] < threshold) { buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0; }
    else buf[i + 3] = 255;
  }
  return buf;
}

// ---------------------------------------------------------------------------
// 4. Cuantización: median-cut + refinamiento k-means (paleta "original")
// ---------------------------------------------------------------------------

/**
 * Deriva `k` colores representativos de un buffer RGBA (solo píxeles con alfa ≥ 128).
 * Median-cut sobre el histograma de 15 bits (5-5-5) y luego 3 iteraciones de k-means en RGB
 * ponderado por frecuencia. Devuelve un array de [r,g,b] (puede tener menos de k si la imagen
 * tiene menos colores distintos).
 */
export function medianCut(buf, k = 16) {
  // Histograma 5-5-5 para acotar el trabajo (32768 cubos máx).
  const hist = new Map();
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] < 128) continue;
    const key = ((buf[i] >> 3) << 10) | ((buf[i + 1] >> 3) << 5) | (buf[i + 2] >> 3);
    const e = hist.get(key);
    if (e) { e.n++; e.r += buf[i]; e.g += buf[i + 1]; e.b += buf[i + 2]; }
    else hist.set(key, { n: 1, r: buf[i], g: buf[i + 1], b: buf[i + 2] });
  }
  const bins = [...hist.values()].map((e) => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }));
  if (bins.length === 0) return [];
  if (bins.length <= k) return bins.map((e) => [Math.round(e.r), Math.round(e.g), Math.round(e.b)]);

  const boxes = [bins];
  while (boxes.length < k) {
    // Elegimos la caja con mayor rango (ponderado por población) y la partimos por su eje mayor.
    let bi = -1, bestScore = -1, bestAxis = 'r';
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const rng = range(box);
      const axis = rng.r >= rng.g && rng.r >= rng.b ? 'r' : rng.g >= rng.b ? 'g' : 'b';
      const pop = box.reduce((s, e) => s + e.n, 0);
      const score = rng[axis] * Math.sqrt(pop);
      if (score > bestScore) { bestScore = score; bi = i; bestAxis = axis; }
    });
    if (bi < 0) break;
    const box = boxes[bi];
    box.sort((a, b) => a[bestAxis] - b[bestAxis]);
    const total = box.reduce((s, e) => s + e.n, 0);
    let acc = 0, cut = 0;
    for (; cut < box.length - 1; cut++) { acc += box[cut].n; if (acc >= total / 2) { cut++; break; } }
    cut = clamp(cut, 1, box.length - 1);
    boxes.splice(bi, 1, box.slice(0, cut), box.slice(cut));
  }

  let centers = boxes.map(centroid);
  // Refinamiento k-means (RGB, 3 iteraciones): reasigna cada cubo al centro más cercano.
  for (let it = 0; it < 3; it++) {
    const acc = centers.map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
    for (const e of bins) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const dr = e.r - centers[c][0], dg = e.g - centers[c][1], db = e.b - centers[c][2];
        const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114; // RGB ponderado por luminancia
        if (d < bd) { bd = d; best = c; }
      }
      const a = acc[best]; a.n += e.n; a.r += e.r * e.n; a.g += e.g * e.n; a.b += e.b * e.n;
    }
    centers = acc.filter((a) => a.n > 0).map((a) => [a.r / a.n, a.g / a.n, a.b / a.n]);
  }
  return centers.map((c) => c.map((v) => clamp(Math.round(v), 0, 255)));
}

function range(box) {
  let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
  for (const e of box) {
    if (e.r < rmin) rmin = e.r; if (e.r > rmax) rmax = e.r;
    if (e.g < gmin) gmin = e.g; if (e.g > gmax) gmax = e.g;
    if (e.b < bmin) bmin = e.b; if (e.b > bmax) bmax = e.b;
  }
  return { r: rmax - rmin, g: gmax - gmin, b: bmax - bmin };
}

function centroid(box) {
  let n = 0, r = 0, g = 0, b = 0;
  for (const e of box) { n += e.n; r += e.r * e.n; g += e.g * e.n; b += e.b * e.n; }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

// ---------------------------------------------------------------------------
// 5. Dithering + mapeo a paleta
// ---------------------------------------------------------------------------

/** Matriz Bayer 4×4 normalizada a (−0.5, 0.5). */
export const BAYER4 = Float32Array.from(
  [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  (v) => (v + 0.5) / 16 - 0.5,
);

/**
 * Dithering ordenado Bayer 4×4 ANTES de cuantizar: desplaza cada canal ±amplitude/2 según la
 * posición en la rejilla. Muta y devuelve `buf`. `amplitude` en niveles 0..255 (32 ≈ suave).
 */
export function ditherBayer(buf, w, h, amplitude = 32) {
  if (amplitude <= 0) return buf;
  for (let y = 0; y < h; y++) {
    const row = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (buf[i + 3] === 0) continue;
      const t = BAYER4[row | (x & 3)] * amplitude;
      buf[i] = buf[i] + t; buf[i + 1] = buf[i + 1] + t; buf[i + 2] = buf[i + 2] + t;
    }
  }
  return buf;
}

/**
 * Mapea cada píxel opaco al color más cercano de `pal` (preparePalette). Muta y devuelve `buf`.
 */
export function mapToPalette(buf, pal) {
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    const c = pal.rgb[nearestIndex(pal, buf[i], buf[i + 1], buf[i + 2])];
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
  }
  return buf;
}

/**
 * Floyd-Steinberg: cuantiza difundiendo el error (7/16, 3/16, 5/16, 1/16) a los vecinos aún no
 * procesados. `strength` 0..1 escala el error difundido. Muta y devuelve `buf`.
 */
export function ditherFloydSteinberg(buf, w, h, pal, strength = 1) {
  const err = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x, i = p * 4, e = p * 3;
      if (buf[i + 3] === 0) continue;
      const r = buf[i] + err[e], g = buf[i + 1] + err[e + 1], b = buf[i + 2] + err[e + 2];
      const c = pal.rgb[nearestIndex(pal, r, g, b)];
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
      const dr = (r - c[0]) * strength, dg = (g - c[1]) * strength, db = (b - c[2]) * strength;
      if (x + 1 < w) spread(err, buf, p + 1, dr, dg, db, 7 / 16);
      if (y + 1 < h) {
        if (x > 0) spread(err, buf, p + w - 1, dr, dg, db, 3 / 16);
        spread(err, buf, p + w, dr, dg, db, 5 / 16);
        if (x + 1 < w) spread(err, buf, p + w + 1, dr, dg, db, 1 / 16);
      }
    }
  }
  return buf;
}

function spread(err, buf, p, dr, dg, db, k) {
  if (buf[p * 4 + 3] === 0) return; // no difundir hacia transparente
  const e = p * 3;
  err[e] += dr * k; err[e + 1] += dg * k; err[e + 2] += db * k;
}

/**
 * Pipeline completo sobre un buffer ya remuestreado (cols×rows):
 * paletteColors = array de hex/[r,g,b] o null (derivar `colors` de la imagen).
 * dither = 'none' | 'bayer' | 'floyd'.
 */
export function quantizeBuffer(buf, cols, rows, { paletteColors = null, colors = 16, dither = 'none', ditherStrength = 1 } = {}) {
  const src = paletteColors && paletteColors.length ? paletteColors : medianCut(buf, colors);
  if (!src.length) return buf; // imagen totalmente transparente
  const pal = preparePalette(src);
  if (dither === 'bayer') { ditherBayer(buf, cols, rows, 32 * ditherStrength); mapToPalette(buf, pal); }
  else if (dither === 'floyd') ditherFloydSteinberg(buf, cols, rows, pal, ditherStrength);
  else mapToPalette(buf, pal);
  return buf;
}
