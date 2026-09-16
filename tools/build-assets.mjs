#!/usr/bin/env node
/**
 * build-assets.mjs — pipeline de assets de Memorice Cozy v2 (tarea assets-2).
 *
 *   node tools/build-assets.mjs            construye todo (idempotente: solo escribe si cambia)
 *   node tools/build-assets.mjs --check    solo valida assets/manifest.json contra el disco
 *   node tools/build-assets.mjs --fetch    solo descarga/extrae crudos faltantes a assets/raw/
 *   node tools/build-assets.mjs --verbose  detalle por carta
 *
 * Lee  assets/src-config.json + assets/raw/<themeId>/<cardId>.{png,jpg,jpeg,webp}
 * Genera assets/themes/<themeId>/<cardId>.webp (256×256, contain, fondo transparente)
 *         assets/themes/<themeId>/_back.webp   (dorso `?` recoloreado a la paleta del tema)
 *         assets/bg/<id>-{1280,1920,2560}.webp
 *         assets/manifest.json  (conserva la sección `audio` del manifiesto existente)
 *         CREDITS.md
 * Dependencia única: sharp (tools/package.json). Sin ffmpeg ni ImageMagick.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const RAW = path.join(ASSETS, 'raw');
const CACHE = path.join(ROOT, 'tools', '.cache');
const CONFIG_PATH = path.join(ASSETS, 'src-config.json');
const MANIFEST_PATH = path.join(ASSETS, 'manifest.json');
const CREDITS_PATH = path.join(ROOT, 'CREDITS.md');

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const SIZE = cfg.cardSize ?? 256;
const warnings = [];
const warn = (m) => { warnings.push(m); console.warn('  ! ' + m); };
const log = (...m) => VERBOSE && console.log('   ', ...m);

// ───────────────────────── utilidades ─────────────────────────
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Escribe solo si el contenido cambia; devuelve true si escribió. */
function writeIfChanged(file, buf, text = false) {
  if (fs.existsSync(file)) {
    const cur = fs.readFileSync(file);
    if (Buffer.compare(cur, buf) === 0) return false;
    // texto: tolerar CRLF que git autocrlf pueda haber puesto en el checkout
    if (text && cur.toString('utf8').replace(/\r\n/g, '\n') === buf.toString('utf8')) return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return true;
}

function findRaw(themeId, cardId) {
  for (const ext of ['png', 'webp', 'jpg', 'jpeg']) {
    const p = path.join(RAW, themeId, `${cardId}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ───────────────────────── ZIP mínimo (sin dependencias) ─────────────────────────
/** Devuelve Map<nombre, () => Buffer> con las entradas del zip (métodos 0 y 8). */
function readZip(zipBuf) {
  let eocd = -1;
  for (let i = zipBuf.length - 22; i >= Math.max(0, zipBuf.length - 70000); i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP sin EOCD');
  const count = zipBuf.readUInt16LE(eocd + 10);
  let off = zipBuf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (zipBuf.readUInt32LE(off) !== 0x02014b50) throw new Error('ZIP: directorio central corrupto');
    const method = zipBuf.readUInt16LE(off + 10);
    const csize = zipBuf.readUInt32LE(off + 20);
    const nameLen = zipBuf.readUInt16LE(off + 28);
    const extraLen = zipBuf.readUInt16LE(off + 30);
    const commentLen = zipBuf.readUInt16LE(off + 32);
    const localOff = zipBuf.readUInt32LE(off + 42);
    const name = zipBuf.subarray(off + 46, off + 46 + nameLen).toString('utf8');
    entries.set(name, () => {
      const ln = zipBuf.readUInt16LE(localOff + 26);
      const le = zipBuf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + ln + le;
      const data = zipBuf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return zlib.inflateRawSync(data);
      throw new Error(`ZIP: método ${method} no soportado (${name})`);
    });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const zipCache = new Map();
async function getZip(sourceId) {
  if (zipCache.has(sourceId)) return zipCache.get(sourceId);
  const src = cfg.sources[sourceId];
  if (!src?.download) throw new Error(`fuente ${sourceId} sin URL de descarga`);
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${sourceId}.zip`);
  if (!fs.existsSync(file)) {
    console.log(`  ↓ descargando ${src.download}`);
    const res = await fetch(src.download);
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${src.download}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const entries = readZip(fs.readFileSync(file));
  zipCache.set(sourceId, entries);
  return entries;
}

async function fetchRawFromZip(themeId, card) {
  const { source, path: inner } = card.from;
  const entries = await getZip(source);
  // tolerante a prefijo de carpeta raíz dentro del zip
  const key = [...entries.keys()].find((k) => k === inner || k.endsWith('/' + inner));
  if (!key) throw new Error(`"${inner}" no está en el zip de ${source}`);
  const ext = path.extname(inner).slice(1).toLowerCase() || 'png';
  const out = path.join(RAW, themeId, `${card.id}.${ext}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, entries.get(key)());
  log('extraído', rel(out));
  return out;
}

async function fetchRawBackground(bg) {
  const src = cfg.sources[bg.source];
  const out = path.join(RAW, 'bg', bg.raw);
  if (fs.existsSync(out)) return out;
  if (!src?.download) throw new Error(`fondo ${bg.id}: crudo ausente y sin URL`);
  console.log(`  ↓ descargando ${src.download}`);
  const res = await fetch(src.download);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${src.download}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return out;
}

// ───────────────────────── procesamiento de imagen ─────────────────────────
/** Quita fondo plano por flood-fill desde el borde (color de las esquinas, tolerancia euclídea). */
function keyBackground(raw, w, h, tol = 48) {
  const idx = (x, y) => (y * w + x) * 4;
  const corners = [idx(0, 0), idx(w - 1, 0), idx(0, h - 1), idx(w - 1, h - 1)];
  const ref = [0, 1, 2].map((c) => corners.reduce((s, i) => s + raw[i + c], 0) / 4);
  const near = (i) => raw[i + 3] > 0 && Math.hypot(raw[i] - ref[0], raw[i + 1] - ref[1], raw[i + 2] - ref[2]) <= tol;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0, x, h - 1); }
  for (let y = 0; y < h; y++) { stack.push(0, y, w - 1, y); }
  let removed = 0;
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!near(i)) continue;
    raw[i + 3] = 0; removed++;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  return removed;
}

/** Cuenta colores opacos distintos (tope para cortar temprano). */
function countColors(raw, cap = 4096) {
  const set = new Set();
  for (let i = 0; i < raw.length; i += 4) {
    if (raw[i + 3] < 8) continue;
    set.add((raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2]);
    if (set.size > cap) break;
  }
  return set.size;
}

async function encodeCard(pipeline) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== SIZE || info.height !== SIZE) throw new Error(`salida ${info.width}×${info.height}, se esperaba ${SIZE}²`);
  const colors = countColors(data, cfg.losslessMaxColors ?? 256);
  const lossless = colors <= (cfg.losslessMaxColors ?? 256);
  const img = sharp(data, { raw: { width: SIZE, height: SIZE, channels: 4 } });
  const buf = lossless
    ? await img.webp({ lossless: true, effort: 6 }).toBuffer()
    : await img.webp({ quality: cfg.lossyQuality ?? 80, alphaQuality: 100, effort: 6, smartSubsample: false }).toBuffer();
  return { buf, colors, lossless };
}

/** Crudo → sharp 256×256 según modo. */
async function renderCard(rawPath, card, mode, pixelate) {
  let img = sharp(rawPath).ensureAlpha();
  const meta = await img.metadata();

  if (card.keyBg) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const n = keyBackground(data, info.width, info.height);
    log(`keyBg: ${n} px quitados`);
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  if (card.tint) {
    // multiplicación por canal: blanco → color, grises → color más oscuro (sharp.tint preserva luminancia y dejaría el blanco intacto)
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const c = hexToRgb(card.tint);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = (data[i] * c.r) / 255; data[i + 1] = (data[i + 1] * c.g) / 255; data[i + 2] = (data[i + 2] * c.b) / 255;
    }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  if (card.trim) img = img.trim({ threshold: 1, background: TRANSPARENT });

  const maxDim = Math.max(meta.width, meta.height);
  if (mode === 'vector') {
    // pixelar: bajar a `pixelate` px con filtro suave y subir con nearest (256/pixelate entero)
    const n = pixelate ?? 64;
    const buf = await img.resize(n, n, { fit: 'contain', background: TRANSPARENT, kernel: 'lanczos3' }).png().toBuffer();
    return sharp(buf).resize(SIZE, SIZE, { fit: 'contain', background: TRANSPARENT, kernel: 'nearest' });
  }
  // pixel: sprites pequeños → escala entera con nearest y relleno; grandes → contain nearest
  if (maxDim <= SIZE / 2) {
    const s = Math.floor(SIZE / maxDim);
    const w = meta.width * s, h = meta.height * s;
    const buf = await img.resize(w, h, { kernel: 'nearest' }).png().toBuffer();
    return sharp(buf).extend({
      top: Math.floor((SIZE - h) / 2), bottom: Math.ceil((SIZE - h) / 2),
      left: Math.floor((SIZE - w) / 2), right: Math.ceil((SIZE - w) / 2),
      background: TRANSPARENT,
    });
  }
  return img.resize(SIZE, SIZE, { fit: 'contain', background: TRANSPARENT, kernel: 'nearest' });
}

/** Dorso: `?` pixel art recoloreado por rango de luminancia a la rampa del tema (oscuro → claro). */
async function renderBack(ramp) {
  const src = findRaw('plantas', '_back_source');
  if (!src) throw new Error('falta assets/raw/plantas/_back_source.png (antes img/question.png)');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lums = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 8) lums.push(lum(data[i], data[i + 1], data[i + 2]));
  const lo = Math.min(...lums), hi = Math.max(...lums);
  const cols = ramp.map(hexToRgb);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 8) { data[i + 3] = 0; continue; }
    const t = hi > lo ? (lum(data[i], data[i + 1], data[i + 2]) - lo) / (hi - lo) : 0;
    const c = cols[Math.min(cols.length - 1, Math.round(t * (cols.length - 1)))];
    data[i] = c.r; data[i + 1] = c.g; data[i + 2] = c.b; data[i + 3] = 255;
  }
  const img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1, background: TRANSPARENT });
  const buf = await img.png().toBuffer();
  const m = await sharp(buf).metadata();
  const s = Math.max(1, Math.floor((SIZE * 0.7) / Math.max(m.width, m.height)));
  const w = m.width * s, h = m.height * s;
  return sharp(buf).resize(w, h, { kernel: 'nearest' }).extend({
    top: Math.floor((SIZE - h) / 2), bottom: Math.ceil((SIZE - h) / 2),
    left: Math.floor((SIZE - w) / 2), right: Math.ceil((SIZE - w) / 2),
    background: TRANSPARENT,
  });
}

async function renderBackground(bg, rawPath) {
  // Variantes por aspecto (elegidas en src/scene/environment.js según w/h del viewport):
  //   landscape 16:9 en cfg.backgroundWidths · ultrawide 32:9 en 3840 · portrait 9:19.5 en 1080.
  // El recorte es "cover" alrededor de un punto focal normalizado bg.focal = { x, y } (0..1).
  const variants = cfg.backgroundVariants ?? {
    landscape: { aspect: [16, 9], widths: cfg.backgroundWidths ?? [1280, 1920, 2560] },
    ultrawide: { aspect: [32, 9], widths: [3840] },
    portrait: { aspect: [9, 19.5], widths: [1080] },
  };
  const maxBytes = cfg.backgroundMaxBytes ?? 256000;
  const meta = await sharp(rawPath).rotate().metadata();
  const focal = { x: bg.focal?.x ?? 0.5, y: bg.focal?.y ?? 0.5 };
  const out = {};
  for (const [variant, spec] of Object.entries(variants)) {
    const [aw, ah] = spec.aspect;
    // Rectángulo fuente máximo con el aspecto pedido, centrado en el focal y acotado a la imagen.
    const srcAspect = meta.width / meta.height, want = aw / ah;
    let cw, ch;
    if (srcAspect > want) { ch = meta.height; cw = Math.round(ch * want); } else { cw = meta.width; ch = Math.round(cw / want); }
    const left = Math.round(Math.min(Math.max(focal.x * meta.width - cw / 2, 0), meta.width - cw));
    const top = Math.round(Math.min(Math.max(focal.y * meta.height - ch / 2, 0), meta.height - ch));
    for (const w of spec.widths) {
      const h = Math.round((w * ah) / aw);
      if (cw < w) warn(`fondo ${bg.id}/${variant}: recorte ${cw}px < ${w}px, se escala hacia arriba`);
      let q = cfg.backgroundQuality ?? 78, buf;
      for (;;) {
        let img = sharp(rawPath).rotate().extract({ left, top, width: cw, height: ch }).resize(w, h);
        // Suavizado leve: el fondo va detrás de cristal esmerilado; baja entropía y peso sin perder lectura.
        const soften = bg.soften ?? cfg.backgroundSoften ?? 0.6;
        if (soften > 0) img = img.blur(soften);
        if (bg.grade) img = img.modulate({ brightness: bg.grade.brightness ?? 1, saturation: bg.grade.saturation ?? 1, hue: bg.grade.hue ?? 0 });
        buf = await img.webp({ quality: q, effort: 6 }).toBuffer();
        if (buf.length <= maxBytes || q <= 50) break;
        q -= 4;
      }
      if (buf.length > maxBytes) warn(`fondo ${bg.id}/${variant}-${w}: ${kb(buf.length)} > ${kb(maxBytes)} incluso a q${q}`);
      const file = path.join(ASSETS, 'bg', `${bg.id}-${variant}-${w}.webp`);
      const changed = writeIfChanged(file, buf);
      (out[variant] ??= {})[w] = { file, bytes: buf.length, q, changed };
    }
  }
  return out;
}

// ───────────────────────── construcción ─────────────────────────
async function buildTheme(theme) {
  const outDir = path.join(ASSETS, 'themes', theme.id);
  const cards = [];
  const seenHash = new Map();
  let bytes = 0, changed = 0;
  const themeSource = theme.source ?? null;

  for (const card of theme.cards) {
    const sourceId = card.source ?? card.from?.source ?? themeSource;
    const src = cfg.sources[sourceId];
    if (!src) { warn(`${theme.id}/${card.id}: fuente "${sourceId}" desconocida, se omite`); continue; }

    let rawPath = findRaw(theme.id, card.id);
    if (!rawPath && card.copyOf) {
      const [t, c] = card.copyOf.split('/');
      const from = findRaw(t, c);
      if (from) { rawPath = path.join(RAW, theme.id, `${card.id}${path.extname(from)}`); fs.mkdirSync(path.dirname(rawPath), { recursive: true }); fs.copyFileSync(from, rawPath); }
    }
    if (!rawPath && card.from) {
      try { rawPath = await fetchRawFromZip(theme.id, card); }
      catch (e) { warn(`${theme.id}/${card.id}: ${e.message}`); continue; }
    }
    if (!rawPath) { warn(`${theme.id}/${card.id}: crudo ausente en assets/raw/${theme.id}/, se omite`); continue; }
    if (args.has('--fetch')) continue;

    const rawBuf = fs.readFileSync(rawPath);
    const h = sha1(rawBuf);
    if (seenHash.has(h)) { warn(`${theme.id}/${card.id}: duplicado exacto de ${seenHash.get(h)}, se omite`); continue; }
    seenHash.set(h, card.id);

    const mode = card.mode ?? src.mode ?? 'pixel';
    const pixelate = card.pixelate ?? src.pixelate;
    try {
      const pipeline = await renderCard(rawPath, card, mode, pixelate);
      const { buf, colors, lossless } = await encodeCard(pipeline);
      const file = path.join(outDir, `${card.id}.webp`);
      if (writeIfChanged(file, buf)) changed++;
      bytes += buf.length;
      log(`${card.id.padEnd(22)} ${mode.padEnd(6)} ${String(colors).padStart(4)} col ${lossless ? 'lossless' : 'q' + (cfg.lossyQuality ?? 80)} ${kb(buf.length)}`);
      cards.push({
        id: card.id,
        src: rel(file),
        w: SIZE, h: SIZE,
        license: card.license ?? src.license,
        attribution: card.attribution ?? (src.license === 'own' ? '' : `${src.name} — ${src.author} — ${src.url}`),
        _credit: { sourceId, source: src, from: card.from?.path ?? path.basename(rawPath), bytes: buf.length },
      });
    } catch (e) {
      warn(`${theme.id}/${card.id}: ${e.message}`);
    }
  }

  // dorso
  let backSrc = null, backBytes = 0;
  if (!args.has('--fetch')) {
    try {
      const { buf } = await encodeCard(await renderBack(theme.back ?? ['#0f2a22', '#1f4d3a', '#6a9a5b', '#b8d96a']));
      const file = path.join(outDir, '_back.webp');
      if (writeIfChanged(file, buf)) changed++;
      backSrc = rel(file); backBytes = buf.length; bytes += buf.length;
    } catch (e) { warn(`${theme.id}/_back: ${e.message}`); }
  }

  // limpiar salidas huérfanas del tema
  if (fs.existsSync(outDir)) {
    const keep = new Set([...cards.map((c) => `${c.id}.webp`), '_back.webp']);
    for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) { fs.unlinkSync(path.join(outDir, f)); changed++; log('borrado huérfano', f); }
  }
  return { cards, backSrc, backBytes, bytes, changed };
}

function buildManifest(themesOut, bgOut, prevAudio) {
  const themes = cfg.themes.map((t) => {
    const o = themesOut.get(t.id);
    const entry = {
      id: t.id,
      name: t.name,
      palette: t.palette,
      backSymbol: o?.backSrc ?? null,
    };
    if (t.easterEgg) entry.easterEgg = { match: t.easterEgg.match, sfx: t.easterEgg.sfx };
    entry.cards = (o?.cards ?? []).map(({ _credit, ...c }) => c);
    return entry;
  });
  const backgrounds = cfg.backgrounds.map((bg) => {
    const src = cfg.sources[bg.source];
    const o = bgOut.get(bg.id) ?? {};
    const variants = {};
    for (const [variant, byW] of Object.entries(o)) {
      variants[variant] = {};
      for (const w of Object.keys(byW).sort((a, b) => a - b)) variants[variant][w] = rel(byW[w].file);
    }
    // `srcset` conserva la variante landscape (compatibilidad con lectores antiguos).
    return { id: bg.id, name: bg.name ?? { es: bg.id, en: bg.id }, focal: bg.focal ?? { x: 0.5, y: 0.5 }, srcset: variants.landscape ?? {}, variants,
      license: src.license, attribution: `${src.name} — ${src.author} — ${src.url}` };
  });
  return { version: 2, themes, backgrounds, audio: prevAudio, palettes: cfg.palettes };
}

function buildCredits(themesOut, bgOut) {
  const L = [];
  L.push('# CREDITS — Memorice Cozy v2');
  L.push('');
  L.push('Generado por `node tools/build-assets.mjs` a partir de `assets/src-config.json`. No editar a mano.');
  L.push('');
  L.push('## Fuentes');
  L.push('');
  L.push('| id | Fuente | Autor | Licencia | URL |');
  L.push('|---|---|---|---|---|');
  for (const [id, s] of Object.entries(cfg.sources)) L.push(`| \`${id}\` | ${s.name} | ${s.author} | ${s.license} | ${s.url} |`);
  L.push('');
  L.push('Licencia `own`: arte propio del proyecto (v1). `CC0-1.0`: dominio público, https://creativecommons.org/publicdomain/zero/1.0/ . Pexels License: https://www.pexels.com/license/ .');
  L.push('');
  L.push('## Cartas');
  L.push('');
  L.push('| Tema | id | Fuente | Archivo origen | Autor | Licencia | URL |');
  L.push('|---|---|---|---|---|---|---|');
  for (const t of cfg.themes) {
    const o = themesOut.get(t.id);
    for (const c of o?.cards ?? []) {
      const s = c._credit.source;
      L.push(`| ${t.id} | \`${c.id}\` | ${s.name} | \`${c._credit.from}\` | ${s.author} | ${s.license} | ${s.url} |`);
    }
  }
  L.push('');
  L.push('## Dorsos');
  L.push('');
  L.push('`assets/themes/<tema>/_back.webp`: signo `?` pixel art propio (v1 `img/question.png`, ahora `assets/raw/plantas/_back_source.png`), recoloreado por código a la paleta de cada tema. Licencia: own.');
  L.push('');
  L.push('## Fondos');
  L.push('');
  L.push('| id | Tamaños | Fuente | Autor | Licencia | URL |');
  L.push('|---|---|---|---|---|---|');
  for (const bg of cfg.backgrounds) {
    const s = cfg.sources[bg.source];
    const o = bgOut.get(bg.id) ?? {};
    const sizes = Object.entries(o).map(([w, v]) => `${w}px ${kb(v.bytes)}`).join(', ');
    L.push(`| ${bg.id} | ${sizes} | ${s.name} | ${s.author} | ${s.license} | ${s.url} |`);
  }
  L.push('');
  L.push('## Audio');
  L.push('');
  L.push('Los sfx v1 en `sound/` y los ambientes nuevos los documenta la tarea `audio-4` (sección `audio` del manifiesto).');
  L.push('');
  return L.join('\n');
}

// ───────────────────────── validación ─────────────────────────
async function check() {
  const m = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const errors = [];
  const ids = new Set();
  const must = async (p, what, square = true) => {
    if (!p) return errors.push(`${what}: ruta vacía`);
    if (p.startsWith('/') || p.startsWith('./')) errors.push(`${what}: la ruta debe ser relativa sin ./ (${p})`);
    const abs = path.join(ROOT, p);
    if (!fs.existsSync(abs)) return errors.push(`${what}: no existe ${p}`);
    if (square) {
      const meta = await sharp(abs).metadata();
      if (meta.width !== SIZE || meta.height !== SIZE) errors.push(`${what}: ${meta.width}×${meta.height}, se esperaba ${SIZE}²`);
      if (meta.format !== 'webp') errors.push(`${what}: formato ${meta.format}`);
    }
  };
  for (const t of m.themes) {
    if (ids.has(t.id)) errors.push(`tema duplicado ${t.id}`); ids.add(t.id);
    if (!m.palettes[t.palette] && t.palette !== 'original') errors.push(`${t.id}: paleta "${t.palette}" no existe`);
    if (t.backSymbol) await must(t.backSymbol, `${t.id}/_back`);
    else if (t.cards.length) errors.push(`${t.id}: sin backSymbol`);
    const cids = new Set();
    for (const c of t.cards) {
      if (cids.has(c.id)) errors.push(`${t.id}: carta duplicada ${c.id}`); cids.add(c.id);
      await must(c.src, `${t.id}/${c.id}`);
      if (c.w !== SIZE || c.h !== SIZE) errors.push(`${t.id}/${c.id}: w/h en manifiesto ≠ ${SIZE}`);
      if (!c.license) errors.push(`${t.id}/${c.id}: licencia vacía`);
      if (c.license !== 'own' && !c.attribution) errors.push(`${t.id}/${c.id}: atribución vacía para licencia ${c.license}`);
    }
    if (t.easterEgg && t.cards.length && !t.cards.some((c) => c.id.startsWith(t.easterEgg.match))) errors.push(`${t.id}: easterEgg.match "${t.easterEgg.match}" no coincide con ninguna carta`);
  }
  for (const bg of m.backgrounds) {
    if (!bg.license) errors.push(`fondo ${bg.id}: licencia vacía`);
    for (const [w, p] of Object.entries(bg.srcset)) {
      await must(p, `fondo ${bg.id}-${w}`, false);
      const abs = path.join(ROOT, p);
      if (fs.existsSync(abs)) {
        const meta = await sharp(abs).metadata();
        if (meta.width !== +w) errors.push(`fondo ${bg.id}-${w}: ancho real ${meta.width}`);
        if (fs.statSync(abs).size > (cfg.backgroundMaxBytes ?? 256000)) errors.push(`fondo ${bg.id}-${w}: excede ${kb(cfg.backgroundMaxBytes ?? 256000)}`);
      }
    }
  }
  for (const [name, arr] of Object.entries(m.palettes)) for (const hex of arr) if (!/^#[0-9a-f]{6}$/.test(hex)) errors.push(`paleta ${name}: color inválido ${hex}`);
  if (!m.audio || typeof m.audio !== 'object') errors.push('sección audio ausente');
  if (errors.length) { console.error('✗ manifiesto inválido:\n  - ' + errors.join('\n  - ')); process.exit(1); }
  console.log(`✓ manifiesto válido: ${m.themes.length} temas, ${m.themes.reduce((n, t) => n + t.cards.length, 0)} cartas, ${m.backgrounds.length} fondo(s)`);
}

// ───────────────────────── main ─────────────────────────
async function main() {
  if (args.has('--check')) return check();

  const prev = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : {};
  const prevAudio = prev.audio ?? { ambient: {}, sfx: {} };

  const themesOut = new Map();
  let total = 0, totalChanged = 0;
  console.log('Temas');
  for (const theme of cfg.themes) {
    const o = await buildTheme(theme);
    themesOut.set(theme.id, o);
    total += o.bytes; totalChanged += o.changed;
    if (theme.cards.length || o.backBytes) {
      const avg = o.cards.length ? kb(o.cards.reduce((n, c) => n + c._credit.bytes, 0) / o.cards.length) : '-';
      const over = o.bytes > 350 * 1024 ? '  (> 350 KB)' : '';
      console.log(`  ${theme.id.padEnd(13)} ${String(o.cards.length).padStart(2)} cartas  ${kb(o.bytes).padStart(9)} total  ${avg.padStart(8)}/carta  dorso ${kb(o.backBytes)}  ${o.changed ? o.changed + ' archivo(s) escritos' : 'sin cambios'}${over}`);
    }
  }

  const bgOut = new Map();
  if (!args.has('--fetch')) console.log('Fondos');
  for (const bg of cfg.backgrounds) {
    try {
      const rawPath = await fetchRawBackground(bg);
      if (args.has('--fetch')) continue;
      const o = await renderBackground(bg, rawPath);
      bgOut.set(bg.id, o);
      const parts = Object.entries(o).map(([w, v]) => `${w}px ${kb(v.bytes)} q${v.q}`).join(' · ');
      const ch = Object.values(o).filter((v) => v.changed).length;
      total += Object.values(o).reduce((n, v) => n + v.bytes, 0); totalChanged += ch;
      console.log(`  ${bg.id.padEnd(13)} ${parts}  ${ch ? ch + ' archivo(s) escritos' : 'sin cambios'}`);
    } catch (e) { warn(`fondo ${bg.id}: ${e.message}`); }
  }
  if (args.has('--fetch')) { console.log('Crudos listos en assets/raw/'); return; }

  const manifest = buildManifest(themesOut, bgOut, prevAudio);
  const mChanged = writeIfChanged(MANIFEST_PATH, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), true);
  const cChanged = writeIfChanged(CREDITS_PATH, Buffer.from(buildCredits(themesOut, bgOut)), true);
  totalChanged += (mChanged ? 1 : 0) + (cChanged ? 1 : 0);

  console.log(`Total assets: ${kb(total)} · ${totalChanged ? totalChanged + ' archivo(s) escritos' : 'sin cambios (idempotente)'} · manifiesto ${mChanged ? 'actualizado' : 'igual'} · CREDITS.md ${cChanged ? 'actualizado' : 'igual'}`);
  if (warnings.length) console.log(`${warnings.length} aviso(s).`);
  await check();
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
