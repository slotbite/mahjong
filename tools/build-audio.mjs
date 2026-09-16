#!/usr/bin/env node
// tools/build-audio.mjs — pipeline de audio de Memorice Cozy v2 (tarea audio-4).
//
//   node tools/build-audio.mjs              construye lo que falte o esté desactualizado
//   node tools/build-audio.mjs --force      reconstruye todo
//   node tools/build-audio.mjs --only flip  solo un id (o varios separados por coma)
//   node tools/build-audio.mjs --check      no construye: verifica loops y tamaños de lo ya exportado
//   FFMPEG_BIN=<dir o exe>                  ubicación de ffmpeg; si no está en PATH se descarga a tools/.cache/ffmpeg
//
// Entradas:  assets/raw-audio/**  (fuera de git; se descargan solas desde freesound/Kenney/git si faltan)
// Salidas:   assets/audio/<id>.ogg + .m4a, assets/audio/CREDITS-audio.md, assets/audio/report.json,
//            src/audio/manifest.audio.json (sección `audio` del manifiesto §7.3)
//
// Decisiones (ver doc/v2/audio-4-audio.md): ambientes −23 LUFS estéreo 48 kHz ≤ 80 kbps con loop sin costura
// (crossfade cola→cabeza equal-power 1.5–2 s, verificado); SFX −18 LUFS mono 48 kHz ≤ 56 kbps con silencios
// recortados. Ganancia estática (medida con ebur128) + limitador, en vez de loudnorm dinámico, para que el
// punto de unión del loop no reciba cambios de ganancia distintos a cabeza y cola.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'assets', 'raw-audio');
const OUT = path.join(ROOT, 'assets', 'audio');
const CACHE = path.join(ROOT, 'tools', '.cache');
const MANIFEST_OUT = path.join(ROOT, 'src', 'audio', 'manifest.audio.json');
const CREDITS_OUT = path.join(OUT, 'CREDITS-audio.md');
const REPORT_OUT = path.join(OUT, 'report.json');
const BUDGET_BYTES = 2.5 * 1024 * 1024;
const SR = 48000;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CHECK = args.includes('--check');
const ONLY = (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean);
const onlyIdx = args.indexOf('--only');
if (onlyIdx < 0) ONLY.length = 0;

// ---------------------------------------------------------------------------------------------
// Fuentes crudas. `fetch` describe cómo recuperarlas si assets/raw-audio/ no las tiene.
// freesound: se usa la vista previa HQ (mp3 128 kbps) del CDN público, suficiente para ≤ 96 kbps finales.
// ---------------------------------------------------------------------------------------------
const FS = 'https://freesound.org';
const SOURCES = {
  rain: {
    file: 'fs-512334-rain-bananas.mp3',
    fetch: { kind: 'url', url: 'https://cdn.freesound.org/previews/512/512334_1661766-hq.mp3' },
    title: 'Light rain in a field of bananas trees', author: 'felix.blume',
    url: `${FS}/people/felix.blume/sounds/512334/`, license: 'CC0-1.0',
  },
  jungle: {
    file: 'fs-653743-amazon-birds-frogs.mp3',
    fetch: { kind: 'url', url: 'https://cdn.freesound.org/previews/653/653743_8323061-hq.mp3' },
    title: 'Peruvian Amazon birds frogs daytime', author: 'nonamethefish',
    url: `${FS}/people/nonamethefish/sounds/653743/`, license: 'CC0-1.0',
  },
  thunder: {
    file: 'fs-584946-distant-rumbles.mp3',
    fetch: { kind: 'url', url: 'https://cdn.freesound.org/previews/584/584946_1481531-hq.mp3' },
    title: 'Distant rumbles', author: 'richwise',
    url: `${FS}/people/richwise/sounds/584946/`, license: 'CC0-1.0',
  },
  kalimba: {
    file: 'fs-659909-kalimba.mp3',
    fetch: { kind: 'url', url: 'https://cdn.freesound.org/previews/659/659909_8499836-hq.mp3' },
    title: 'Kalimba.wav', author: 'PanPiper5',
    url: `${FS}/people/PanPiper5/sounds/659909/`, license: 'CC0-1.0',
  },
  chime: {
    file: 'fs-398496-wind-chime.mp3',
    fetch: { kind: 'url', url: 'https://cdn.freesound.org/previews/398/398496_5923045-hq.mp3' },
    title: 'wind chimes - single 04.wav', author: 'Anthousai',
    url: `${FS}/people/Anthousai/sounds/398496/`, license: 'CC0-1.0',
  },
  drop: {
    file: 'fs-683102-water-drop.mp3',
    fetch: { kind: 'url', url: 'https://cdn.freesound.org/previews/683/683102_6253486-hq.mp3' },
    title: 'water drop', author: 'florianreichelt',
    url: `${FS}/people/florianreichelt/sounds/683102/`, license: 'CC0-1.0',
  },
  glass: {
    file: 'kenney-interface-glass_001.ogg',
    fetch: { kind: 'zip', url: 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip', entry: 'Audio/glass_001.ogg' },
    title: 'Interface Sounds — glass_001', author: 'Kenney (kenney.nl)',
    url: 'https://kenney.nl/assets/interface-sounds', license: 'CC0-1.0',
  },
  shuffle: {
    file: 'v1-card_shuffle.mp3',
    fetch: { kind: 'git', ref: '6660043', path: 'sound/card_shuffle.mp3' },
    title: 'card_shuffle.mp3 (Memorice v1)', author: 'proyecto (v1)',
    url: 'legacy/v1', license: 'own',
  },
  purr: {
    file: 'v1-cat_purr.mp3',
    fetch: { kind: 'git', ref: '6660043', path: 'sound/cat_purr.mp3' },
    title: 'cat_purr.mp3 (Memorice v1)', author: 'proyecto (v1)',
    url: 'legacy/v1', license: 'own',
  },
};

// ---------------------------------------------------------------------------------------------
// Recetas. `af` son filtros ffmpeg previos a la normalización (recorte, pitch, mezcla…).
// ---------------------------------------------------------------------------------------------
const AMBIENT_KBPS = 64;   // estéreo 48 kHz; la lluvia es ruido ancho y Vorbis la resuelve bien a esta tasa
const SFX_KBPS = 56;       // mono
const ONESHOT_KBPS = 40;   // truenos: contenido grave, mono
const SOUNDS = [
  // --- ambientes (loop sin costura) ---
  { id: 'rain-tropical', kind: 'ambient', src: 'rain', ss: 5, t: 53.5, xfade: 1.5, lufs: -23, gain: 0.8,
    note: 'lluvia suave sobre hojas de plátano (Veracruz), tramo 5–58.5 s del original, loop 52 s' },
  { id: 'jungle-birds', kind: 'ambient', src: 'jungle', ss: 0.5, t: 48, xfade: 2.0, lufs: -23, gain: 0.55,
    note: 'ranas e insectos con aves (Amazonía peruana), tramo 0.5–48.5 s, loop 46 s' },
  // --- truenos lejanos (one-shots esporádicos, los dispara el motor) ---
  { id: 'thunder-1', kind: 'oneshot', src: 'thunder', ss: 4, t: 10, fade: [0.8, 3.0], lufs: -26, gain: 0.6, mono: true },
  // --- sfx ---
  { id: 'flip', kind: 'sfx', src: 'kalimba', lufs: -19, gain: 0.5, af: `asetrate=${SR * 1.75},aresample=${SR},highpass=f=350,lowpass=f=6500,afade=t=in:d=0.003`, maxDur: 0.14, fadeOut: 0.06,
    note: 'golpe de cristal agudo tipo xilófono (pedido del dueño): el cuenco de match ~1.6 octavas arriba, corto; el motor varía ±4 % el rate' },
  { id: 'deal-bottle', kind: 'sfx', src: 'glass', lufs: -18, gain: 0.55, maxDur: 1.0, fadeOut: 0.25,
    // Candidato: golpes de silicona sobre botella de vidrio. Tap de vidrio bajado ~1 octava, paso bajo
    // 1.4 kHz (mate, sin tintineo) y resonancia hueca ~420 Hz; 6 golpes escalonados con tonos distintos.
    af: (() => {
      const hits = [[0, 0.52], [70, 0.58], [150, 0.49], [230, 0.61], [320, 0.55], [420, 0.47]];
      const n = hits.length;
      const split = `asplit=${n}` + hits.map((_, i) => `[h${i}]`).join('');
      const chains = hits.map(([ms, r], i) => `[h${i}]asetrate=${Math.round(SR * r)},aresample=${SR},lowpass=f=1400,bass=g=6:f=420:w=0.5,adelay=${ms}|${ms}[o${i}]`).join(';');
      const mix = hits.map((_, i) => `[o${i}]`).join('') + `amix=inputs=${n}:normalize=0:dropout_transition=0`;
      return `${split};${chains};${mix}`;
    })(),
    note: 'candidato para el reparto (evaluar en el banco); no suena en el juego' },
  { id: 'deal-kalimba', kind: 'sfx', src: 'kalimba', lufs: -18, gain: 0.55, maxDur: 1.3, fadeOut: 0.35,
    // Candidato: arpegio de kalimba en pentatónica mayor (1, 9/8, 5/4, 3/2, 5/3, 2), ascendente, estilo Zuma.
    af: (() => {
      const notes = [[0, 1.0], [75, 1.125], [150, 1.25], [225, 1.5], [300, 1.6667], [375, 2.0]];
      const n = notes.length;
      const split = `asplit=${n}` + notes.map((_, i) => `[h${i}]`).join('');
      const chains = notes.map(([ms, r], i) => `[h${i}]asetrate=${Math.round(SR * r)},aresample=${SR},atrim=0:0.55,afade=t=out:st=0.3:d=0.25,lowpass=f=5200,adelay=${ms}|${ms}[o${i}]`).join(';');
      const mix = notes.map((_, i) => `[o${i}]`).join('') + `amix=inputs=${n}:normalize=0:dropout_transition=0`;
      return `${split};${chains};${mix}`;
    })(),
    note: 'candidato para el reparto (evaluar en el banco); no suena en el juego' },
  { id: 'flip-note', kind: 'sfx', src: 'kalimba', lufs: -18, gain: 0.5, af: `asetrate=${Math.round(SR * 1.2)},aresample=${SR},lowpass=f=5200,afade=t=in:d=0.003`, maxDur: 0.5, fadeOut: 0.22,
    note: 'nota base de kalimba; el motor la toca a una altura al azar de la pentatónica (1, 9/8, 5/4, 3/2, 5/3, 2) al seleccionar' },
  { id: 'flip-v1', kind: 'sfx', src: 'glass', lufs: -18, gain: 0.5, af: 'lowpass=f=9000', maxDur: 0.5,
    note: 'tap de vidrio v1 (comparación en el banco)' },
  { id: 'match', kind: 'sfx', src: 'kalimba', lufs: -18, gain: 0.7, maxDur: 1.8, fadeOut: 0.5,
    note: 'nota de kalimba (A3) que acompaña el desvanecido de la ficha; rate 1+racha·0.03 en el motor' },
  { id: 'miss', kind: 'sfx', src: 'drop', lufs: -20, gain: 0.5, af: `asetrate=${SR * 0.78},aresample=${SR},lowpass=f=4000`, maxDur: 1.0, fadeOut: 0.25,
    note: 'gota de agua transpuesta −4 semitonos: grave, sin castigo' },
  { id: 'deal', kind: 'sfx', src: 'glass', lufs: -18, gain: 0.55, maxDur: 1.1, fadeOut: 0.3,
    // 8 golpes de vidrio escalonados (~0.5 s, como el reparto de 40 ms por ficha) con tonos distintos,
    // y una capa grave filtrada que hace de superficie de vidrio templado.
    af: (() => {
      const hits = [[0, 1.0], [55, 1.08], [120, 0.94], [170, 1.15], [240, 1.03], [300, 0.9], [380, 1.1], [450, 1.2]];
      const n = hits.length;
      const split = `asplit=${n + 1}` + hits.map((_, i) => `[h${i}]`).join('') + '[surf]';
      const chains = hits.map(([ms, r], i) => `[h${i}]asetrate=${Math.round(SR * r)},aresample=${SR},adelay=${ms}|${ms}[o${i}]`).join(';');
      const surf = `[surf]asetrate=${Math.round(SR * 0.5)},aresample=${SR},lowpass=f=500,volume=0.5,adelay=20|20[os]`;
      const mix = hits.map((_, i) => `[o${i}]`).join('') + `[os]amix=inputs=${n + 1}:normalize=0:dropout_transition=0`;
      return `${split};${chains};${surf};${mix}`;
    })(),
    note: 'gemas cayendo sobre vidrio templado (pedido del dueño); sustituye el barajado v1' },
  { id: 'win', kind: 'sfx', src: 'kalimba', lufs: -17, gain: 0.8, maxDur: 3.2, fadeOut: 0.8,
    complex: arpeggio([1, 1.2599, 1.4983, 2.0], 0.14),
    note: 'acorde ascendente A3–C#4–E4–A4 construido con la misma kalimba (4 capas transpuestas, 140 ms entre notas)' },
  { id: 'hint', kind: 'sfx', src: 'kalimba', lufs: -21, gain: 0.45, maxDur: 3.0,
    af: `asetrate=${SR*0.5},aresample=${SR},lowpass=f=900,afade=t=in:d=0.08,afade=t=out:st=1.6:d=1.2`,
    note: 'cuenco grave de meditación: kalimba bajada una octava con ataque suavizado y cola larga meditativa' },
  { id: 'hint-v1', kind: 'sfx', src: 'chime', lufs: -19, gain: 0.55, maxDur: 2.6, fadeOut: 0.8,
    note: 'v1: campanilla suave (versión anterior, mantenida para comparación)' },
  { id: 'combo', kind: 'sfx', src: 'chime', lufs: -18, gain: 0.6, af: `asetrate=${SR * 1.5},aresample=${SR}`, maxDur: 1.8, fadeOut: 0.6,
    note: 'la misma campanilla una quinta arriba; el motor la sube más con la racha' },
  { id: 'cat_purr', kind: 'sfx', src: 'purr', lufs: -20, gain: 0.7, maxDur: 2.3, fadeOut: 0.3,
    note: 'easter egg v1 conservado (michi)' },
];

// Construye un filter_complex que apila N copias transpuestas del mismo input, desplazadas `step` s.
function arpeggio(rates, step) {
  const parts = rates.map((r, i) =>
    `[0:a]aformat=channel_layouts=mono,asetrate=${Math.round(SR * r)},aresample=${SR},adelay=${Math.round(i * step * 1000)}|${Math.round(i * step * 1000)},volume=${(0.9 - i * 0.12).toFixed(2)}[n${i}]`);
  return `${parts.join(';')};${rates.map((_, i) => `[n${i}]`).join('')}amix=inputs=${rates.length}:normalize=0[pre]`;
}

// ---------------------------------------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------------------------------------
const log = (...a) => console.log(...a);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const isWin = process.platform === 'win32';

function run(bin, argv, opts = {}) {
  const r = spawnSync(bin, argv, { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 1 << 30, ...opts.spawn });
  if (r.error) throw r.error;
  if (r.status !== 0 && !opts.allowFail) {
    const err = (opts.binary ? r.stderr?.toString() : r.stderr) || '';
    throw new Error(`${path.basename(bin)} ${argv.slice(0, 6).join(' ')}… falló (${r.status}):\n${err.slice(-1200)}`);
  }
  return r;
}

let FFMPEG, FFPROBE;
function locateFfmpeg() {
  const exe = isWin ? '.exe' : '';
  const cands = [];
  const env = process.env.FFMPEG_BIN;
  if (env) cands.push(env, path.join(env, `ffmpeg${exe}`));
  const whichCmd = isWin ? 'where' : 'which';
  const w = spawnSync(whichCmd, ['ffmpeg'], { encoding: 'utf8' });
  if (w.status === 0) cands.push(w.stdout.split(/\r?\n/)[0].trim());
  if (fs.existsSync(CACHE)) {
    for (const d of walk(CACHE)) if (path.basename(d) === `ffmpeg${exe}`) cands.push(d);
  }
  for (const c of cands) {
    if (c && fs.existsSync(c) && fs.statSync(c).isFile()) {
      FFMPEG = c; FFPROBE = path.join(path.dirname(c), `ffprobe${exe}`);
      return;
    }
  }
  if (!isWin) throw new Error('ffmpeg no encontrado: instálalo (apt/brew) o define FFMPEG_BIN.');
  // Windows: descarga portable a tools/.cache (gitignored), no se instala en el sistema.
  const url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
  log(`ffmpeg no encontrado; descargando build portable a ${path.relative(ROOT, CACHE)} …`);
  const zip = download(url, path.join(CACHE, 'ffmpeg-release-essentials.zip'));
  const extracted = unzipMatching(zip, path.join(CACHE, 'ffmpeg'), (n) => /bin\/ff(mpeg|probe)\.exe$/.test(n));
  FFMPEG = extracted.find((p) => p.endsWith('ffmpeg.exe'));
  FFPROBE = extracted.find((p) => p.endsWith('ffprobe.exe'));
  if (!FFMPEG) throw new Error('no se pudo extraer ffmpeg.exe');
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  log(`  ↓ ${url}`);
  const r = run('curl', ['-sSL', '--retry', '3', '-A', 'Mozilla/5.0 (memorice-build-audio)', '-o', dest, url]);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) throw new Error(`descarga vacía: ${url}`);
  return dest;
}

// Lector zip mínimo (store/deflate) para no depender de unzip/tar.
function unzipMatching(zipPath, destDir, match) {
  const buf = fs.readFileSync(zipPath);
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('zip inválido');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('zip: entrada central inválida');
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nlen);
    off += 46 + nlen + elen + clen;
    if (!match(name) || name.endsWith('/')) continue;
    const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lnlen + lelen;
    const data = buf.subarray(start, start + csize);
    const raw = method === 8 ? zlib.inflateRawSync(data) : method === 0 ? data : null;
    if (!raw) throw new Error(`zip: método ${method} no soportado (${name})`);
    const dest = path.join(destDir, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, raw);
    out.push(dest);
  }
  return out;
}

function ensureRaw(key) {
  const s = SOURCES[key];
  const dest = path.join(RAW, s.file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;
  fs.mkdirSync(RAW, { recursive: true });
  const f = s.fetch;
  log(`raw ${s.file} no existe; recuperando (${f.kind}) …`);
  if (f.kind === 'url') download(f.url, dest);
  else if (f.kind === 'zip') {
    const zip = download(f.url, path.join(CACHE, path.basename(new URL(f.url).pathname)));
    const [file] = unzipMatching(zip, path.join(CACHE, 'zip'), (n) => n === f.entry);
    if (!file) throw new Error(`entrada ${f.entry} no está en ${zip}`);
    fs.copyFileSync(file, dest);
  } else if (f.kind === 'git') {
    const r = run('git', ['-C', ROOT, 'show', `${f.ref}:${f.path}`], { binary: true });
    fs.writeFileSync(dest, r.stdout);
  }
  return dest;
}

function ffprobeDuration(file) {
  const r = run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(r.stdout) || 0;
}

// Loudness integrada (LUFS) según EBU R128. Sonidos cortos se rellenan a 1 s para que el gating tenga bloques.
function measureLufs(file, afPre = '') {
  const af = `${afPre ? afPre + ',' : ''}apad=pad_dur=1,ebur128=peak=true`;
  const r = run(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', af, '-f', 'null', '-'], { allowFail: true });
  const txt = r.stderr || '';
  const summary = txt.slice(txt.lastIndexOf('Summary'));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1];
  const TP = /Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1];
  return { I: I != null ? parseFloat(I) : -70, TP: TP != null ? parseFloat(TP) : 0 };
}

function decodeMono(file, extraAf = '') {
  const af = ['aformat=channel_layouts=mono', extraAf].filter(Boolean).join(',');
  const r = run(FFMPEG, ['-v', 'error', '-i', file, '-af', af, '-ar', String(SR), '-f', 'f32le', '-'], { binary: true });
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
}

// Métricas de costura de loop: discontinuidad en graves, salto de nivel y distancia espectral cabeza/cola.
// La discontinuidad se mide sobre cola+cabeza concatenadas (2 s + 2 s) filtradas a 300 Hz con un
// pasa-bajos propio, para que el transitorio inicial del filtro no contamine la unión.
function loopSeamMetrics(wav) {
  const x = decodeMono(wav);
  const n = x.length;
  const seg = Math.min(Math.floor(SR * 2), Math.floor(n / 2));
  const y = new Float32Array(seg * 2);
  y.set(x.subarray(n - seg, n), 0);
  y.set(x.subarray(0, seg), seg);
  const lf = lowpassIIR(y, 300);
  let sumd = 0;
  for (let i = 1; i < lf.length; i++) sumd += Math.abs(lf[i] - lf[i - 1]);
  const typ = sumd / (lf.length - 1);
  const jump = Math.abs(lf[seg] - lf[seg - 1]);
  const win = Math.floor(SR * 0.2);
  const rms = (a, s, e) => { let acc = 0; for (let i = s; i < e; i++) acc += a[i] * a[i]; return Math.sqrt(acc / (e - s)) || 1e-9; };
  const dbHead = 20 * Math.log10(rms(x, 0, win)), dbTail = 20 * Math.log10(rms(x, n - win, n));
  // espectro en 24 bandas log entre 60 Hz y 12 kHz sobre 8192 muestras de cabeza y cola
  const N = 8192;
  const spec = (seg) => {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = seg[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    const bands = new Float64Array(24);
    for (let k = 1; k < N / 2; k++) {
      const f = (k * SR) / N;
      if (f < 60 || f > 12000) continue;
      const b = Math.min(23, Math.floor((Math.log(f / 60) / Math.log(12000 / 60)) * 24));
      bands[b] += re[k] * re[k] + im[k] * im[k];
    }
    return Array.from(bands, (v) => 10 * Math.log10(v + 1e-12));
  };
  const sh = spec(x.subarray(0, N)), st = spec(x.subarray(n - N, n));
  const specDist = sh.reduce((acc, v, i) => acc + Math.abs(v - st[i]), 0) / sh.length;
  return { lfJumpRatio: +(jump / typ).toFixed(2), levelDeltaDb: +(dbHead - dbTail).toFixed(2), specDistDb: +specDist.toFixed(2), samples: n };
}

// Biquad pasa-bajos Butterworth de 2.º orden (RBJ), Q = 0.707.
function lowpassIIR(x, fc) {
  const w0 = (2 * Math.PI * fc) / SR, cosw = Math.cos(w0), alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const b0 = (1 - cosw) / 2, b1 = 1 - cosw, b2 = (1 - cosw) / 2, a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function fft(re, im) { // radix-2 in-place
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// construcción
// ---------------------------------------------------------------------------------------------
function recipeHash(s) {
  return createHash('sha1').update(JSON.stringify({ s, AMBIENT_KBPS, SFX_KBPS, ONESHOT_KBPS, SR, v: 4 })).digest('hex').slice(0, 10);
}

function upToDate(s, rawFile) {
  const ogg = path.join(OUT, `${s.id}.ogg`), m4a = path.join(OUT, `${s.id}.m4a`);
  if (!fs.existsSync(ogg) || !fs.existsSync(m4a)) return false;
  const rep = readReport();
  const prev = rep.sounds?.[s.id];
  if (!prev || prev.hash !== recipeHash(s)) return false;
  const t = Math.min(fs.statSync(ogg).mtimeMs, fs.statSync(m4a).mtimeMs);
  return t >= fs.statSync(rawFile).mtimeMs;
}

function readReport() {
  try { return JSON.parse(fs.readFileSync(REPORT_OUT, 'utf8')); } catch { return { sounds: {} }; }
}

function build(s, rawFile, tmpDir) {
  const wav = path.join(tmpDir, `${s.id}.wav`);
  const stage = path.join(tmpDir, `${s.id}.stage.wav`);
  const channels = s.kind === 'ambient' && !s.mono ? 2 : 1;
  const layout = channels === 2 ? 'stereo' : 'mono';

  // 1) recorte + filtros previos → stage (float, sin normalizar)
  const inArgs = ['-hide_banner', '-nostats', '-y'];
  if (s.ss != null) inArgs.push('-ss', String(s.ss));
  if (s.t != null) inArgs.push('-t', String(s.t));
  inArgs.push('-i', rawFile);
  let pre;
  if (s.complex) {
    inArgs.push('-filter_complex', `${s.complex};[pre]aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=${layout}[o]`, '-map', '[o]');
  } else {
    pre = [`aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=${layout}`];
    if (s.af) pre.push(s.af);
    if (s.kind === 'sfx') {
      // recorta silencio inicial y final
      pre.push('silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.002');
      pre.push('areverse', 'silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.01', 'areverse');
      if (s.maxDur) pre.push(`atrim=end=${s.maxDur}`);
    }
    inArgs.push('-af', pre.join(','));
  }
  inArgs.push('-c:a', 'pcm_f32le', stage);
  run(FFMPEG, inArgs);
  if (s.complex && s.maxDur) {
    run(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', stage, '-af', `atrim=end=${s.maxDur}`, '-c:a', 'pcm_f32le', `${stage}.t.wav`]);
    fs.renameSync(`${stage}.t.wav`, stage);
  }

  // 2) loudness: ganancia estática hacia el objetivo + limitador (−1 dBTP)
  const { I, TP } = measureLufs(stage);
  const gainDb = s.lufs - I;
  const post = [`volume=${gainDb.toFixed(2)}dB`, 'alimiter=limit=0.85:attack=5:release=50:level=false'];
  const dur = ffprobeDuration(stage);
  if (s.kind === 'sfx') {
    const fo = Math.min(s.fadeOut ?? 0.02, dur * 0.6);
    post.push(`afade=t=in:d=0.004`, `afade=t=out:st=${Math.max(0, dur - fo).toFixed(3)}:d=${fo.toFixed(3)}`);
  } else if (s.kind === 'oneshot') {
    const [fi, fo] = s.fade ?? [0.5, 1.5];
    post.push(`afade=t=in:d=${fi}`, `afade=t=out:st=${(dur - fo).toFixed(3)}:d=${fo}`);
  }

  let baseline = null;
  if (s.kind === 'ambient') {
    // 3) loop sin costura: [X..L] con su cola fundida (equal-power) sobre la cabeza [0..X]
    const X = s.xfade ?? 1.5;
    const fc = `[0:a]${post.join(',')},asplit[a][b];[a]atrim=start=${X},asetpts=PTS-STARTPTS[body];[b]atrim=end=${X},asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=${X}:c1=qsin:c2=qsin[o]`;
    run(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', stage, '-filter_complex', fc, '-map', '[o]', '-c:a', 'pcm_s24le', wav]);
    // referencia: el mismo tramo con corte duro, para cuantificar la mejora
    const hard = path.join(tmpDir, `${s.id}.hardcut.wav`);
    run(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', stage, '-af', `${post.join(',')},atrim=start=${X}`, '-c:a', 'pcm_s24le', hard]);
    baseline = loopSeamMetrics(hard);
  } else {
    run(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', stage, '-af', post.join(','), '-c:a', 'pcm_s24le', wav]);
  }

  // 4) exportación
  const kbps = s.kind === 'ambient' ? AMBIENT_KBPS : s.kind === 'oneshot' ? ONESHOT_KBPS : SFX_KBPS;
  const ogg = path.join(OUT, `${s.id}.ogg`), m4a = path.join(OUT, `${s.id}.m4a`);
  run(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', wav, '-c:a', 'libvorbis', '-b:a', `${kbps}k`, '-ar', String(SR), '-vn', '-map_metadata', '-1', ogg]);
  run(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', wav, '-c:a', 'aac', '-b:a', `${kbps}k`, '-ar', String(SR), '-vn', '-map_metadata', '-1', '-movflags', '+faststart', m4a]);

  const final = measureLufs(wav);
  const entry = {
    hash: recipeHash(s), kind: s.kind, src: s.src, duration: +ffprobeDuration(wav).toFixed(3),
    channels, kbps, lufsIn: I, lufsOut: final.I, truePeakOut: final.TP, gainDb: +gainDb.toFixed(2),
    ogg: fs.statSync(ogg).size, m4a: fs.statSync(m4a).size,
  };
  if (s.kind === 'ambient') {
    entry.loop = { xfade: s.xfade ?? 1.5, seam: loopSeamMetrics(wav), hardCut: baseline };
  }
  return entry;
}

function writeManifestAndCredits(report) {
  const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
  const audio = { ambient: {}, sfx: {} };
  for (const s of SOUNDS) {
    const src = SOURCES[s.src];
    const rep = report.sounds[s.id];
    const entry = {
      ogg: rel(path.join(OUT, `${s.id}.ogg`)), m4a: rel(path.join(OUT, `${s.id}.m4a`)),
      loop: s.kind === 'ambient', gain: s.gain,
      license: src.license, attribution: `${src.title} — ${src.author} (${src.url})`,
    };
    if (rep?.duration) entry.duration = rep.duration;
    if (s.kind === 'oneshot') entry.oneshot = true;
    if (s.kind === 'sfx') audio.sfx[s.id] = entry; else audio.ambient[s.id] = entry;
  }
  audio._generated = 'tools/build-audio.mjs — no editar a mano; el director fusiona esta sección en assets/manifest.json';
  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });
  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(audio, null, 2) + '\n');

  const lines = ['# Créditos de audio — Memorice Cozy v2', '',
    'Generado por `tools/build-audio.mjs`. Todos los archivos externos son **CC0 1.0** (dominio público); ' +
    'los dos marcados `own` provienen de la v1 del proyecto. Las fuentes de freesound se tomaron de la vista previa HQ del CDN público.', '',
    '| id | uso | fuente | autor | licencia | tramo / proceso |', '|---|---|---|---|---|---|'];
  for (const s of SOUNDS) {
    const src = SOURCES[s.src];
    const proc = [s.ss != null ? `${s.ss}s–${s.ss + s.t}s` : null, s.xfade ? `loop xfade ${s.xfade}s` : null, s.note].filter(Boolean).join('; ');
    lines.push(`| \`${s.id}\` | ${s.kind} | [${src.title}](${src.url}) | ${src.author} | ${src.license} | ${proc} |`);
  }
  lines.push('', '## Fuentes crudas (assets/raw-audio/, fuera de git)', '');
  for (const [k, src] of Object.entries(SOURCES)) {
    const f = src.fetch;
    lines.push(`- \`${src.file}\` ← ${f.kind === 'url' ? f.url : f.kind === 'zip' ? `${f.url} → ${f.entry}` : `git show ${f.ref}:${f.path}`} (${k})`);
  }
  lines.push('', 'Kenney: https://kenney.nl/assets/interface-sounds (CC0). freesound: cada URL indica la licencia CC0 en la ficha del sonido.', '');
  fs.writeFileSync(CREDITS_OUT, lines.join('\n'));
}

function printTable(report) {
  let total = 0;
  log('\n  id               kind     dur(s)  LUFS   TP    ogg       m4a       loop seam (lfJump / ΔdB / spec)');
  for (const s of SOUNDS) {
    const r = report.sounds[s.id];
    if (!r) continue;
    total += r.ogg + r.m4a;
    const seam = r.loop ? `${r.loop.seam.lfJumpRatio} / ${r.loop.seam.levelDeltaDb} / ${r.loop.seam.specDistDb}  (corte duro: ${r.loop.hardCut.lfJumpRatio} / ${r.loop.hardCut.levelDeltaDb} / ${r.loop.hardCut.specDistDb})` : '';
    log(`  ${s.id.padEnd(16)} ${s.kind.padEnd(8)} ${String(r.duration).padStart(6)}  ${String(r.lufsOut).padStart(5)} ${String(r.truePeakOut).padStart(5)}  ${kb(r.ogg).padStart(8)}  ${kb(r.m4a).padStart(8)}  ${seam}`);
  }
  const extra = fs.existsSync(CREDITS_OUT) ? fs.statSync(CREDITS_OUT).size : 0;
  const onDisk = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
  log(`\n  total ogg+m4a: ${kb(total)}  |  assets/audio/ en disco: ${kb(onDisk)}  |  presupuesto: ${kb(BUDGET_BYTES)}  ${onDisk <= BUDGET_BYTES ? 'OK' : 'EXCEDIDO'}`);
  const perFormat = SOUNDS.reduce((a, s) => a + (report.sounds[s.id]?.ogg || 0), 0);
  log(`  descarga real por cliente (solo .ogg): ${kb(perFormat)}  (créditos/report: ${kb(extra)})`);
  for (const s of SOUNDS) {
    const r = report.sounds[s.id];
    if (r?.loop && (r.loop.seam.lfJumpRatio > 4 || Math.abs(r.loop.seam.levelDeltaDb) > 2 || r.loop.seam.specDistDb > 6))
      log(`  AVISO: costura dudosa en ${s.id}: ${JSON.stringify(r.loop.seam)}`);
  }
  return onDisk;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = readReport();
  report.sounds ??= {};
  if (CHECK) {
    report.generatedAt && log(`report de ${report.generatedAt}`);
    const size = printTable(report);
    process.exitCode = size <= BUDGET_BYTES ? 0 : 1;
    return;
  }
  locateFfmpeg();
  log(`ffmpeg: ${FFMPEG}`);
  const tmpDir = fs.mkdtempSync(path.join(CACHE.length && fs.existsSync(CACHE) ? CACHE : (fs.mkdirSync(CACHE, { recursive: true }), CACHE), 'audio-'));
  let built = 0, skipped = 0;
  try {
    for (const s of SOUNDS) {
      if (ONLY.length && !ONLY.includes(s.id)) continue;
      const raw = ensureRaw(s.src);
      if (!FORCE && upToDate(s, raw)) { skipped++; continue; }
      log(`▶ ${s.id} ← ${path.basename(raw)}`);
      report.sounds[s.id] = build(s, raw, tmpDir);
      built++;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  report.generatedAt = new Date().toISOString();
  report.targets = { ambientLufs: -23, sfxLufs: -18, ambientKbps: AMBIENT_KBPS, sfxKbps: SFX_KBPS, oneshotKbps: ONESHOT_KBPS, sampleRate: SR, budgetBytes: BUDGET_BYTES };
  fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2) + '\n');
  writeManifestAndCredits(report);
  log(`\nconstruidos: ${built}, al día: ${skipped}`);
  const size = printTable(report);
  if (size > BUDGET_BYTES) process.exitCode = 1;
}

main();
