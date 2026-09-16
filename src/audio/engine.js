// Motor Web Audio de Memorice Cozy v2 (tarea audio-4).
// Contrato en doc/v2/PROPUESTA_V2.md §7.5: init(ctx), unlock(), playSfx, ambient.*.
// Sin dependencias, tolerante a archivos faltantes, comentarios breves en español.

let ctx = null;
let audioCtx = null;
const sources = new Map();
const buffers = {};
let masterGain, ambientGain, sfxGain;
const ambientGainNodes = {};
let currentAmbientIds = [];
let defaultAmbientIds = []; // IDs de ambiente por defecto (loops)
const ambientBase = {};      // ganancia base por loop desde el manifiesto (gain), ~0.7
// Curvas perceptuales: el oído es logarítmico; con lineal el 5 % ya suena fuerte.
const curveAmbient = (v) => Math.pow(v, 2) * 0.5;
const curveSfx = (v) => Math.pow(v, 1.5);
const fileHashes = {}; // Cache de hashes por ID para cache-busting

// ─────────────────────────────────────────────────────────────────────────────────
// Infraestructura de audio
// ─────────────────────────────────────────────────────────────────────────────────

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Nodos raíz
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    ambientGain = audioCtx.createGain();
    ambientGain.connect(masterGain);
    sfxGain = audioCtx.createGain();
    sfxGain.connect(masterGain);
  }
}

function resume() {
  ensureAudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.info('[audio] contexto reanudado');
      // Arrancar ambiente tras desbloquear si está habilitado
      if (ctx && ctx.settings && ctx.settings.get('ambientOn') && defaultAmbientIds.length > 0) {
        ambient.start(defaultAmbientIds);
      }
      ctx.bus.emit(ctx.EV.AUDIO_UNLOCKED, {});
    });
  } else {
    // Si contexto ya está running, también arrancar
    if (ctx && ctx.settings && ctx.settings.get('ambientOn') && defaultAmbientIds.length > 0) {
      ambient.start(defaultAmbientIds);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Precarga de buffers (ogg si se puede, si no m4a)
// ─────────────────────────────────────────────────────────────────────────────────

async function loadBuffer(path, fileId) {
  try {
    // Resolver la ruta contra la raíz del sitio (document.baseURI)
    let url = new URL(path, document.baseURI).href;
    // Agregar cache-busting si hay hash disponible
    if (fileId && fileHashes[fileId]) {
      url += (url.includes('?') ? '&' : '?') + 'v=' + fileHashes[fileId];
    }
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const ab = await resp.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(ab);
    return decoded;
  } catch (err) {
    console.warn(`[audio] no se pudo cargar ${path}:`, err.message);
    return null;
  }
}

function canPlayOgg() {
  const audio = new Audio();
  return audio.canPlayType('audio/ogg; codecs=vorbis') !== '';
}

async function preloadBuffers(manifestAudio) {
  const isOgg = canPlayOgg();

  // Cargar report.json para hashes de cache-busting
  try {
    const reportUrl = new URL('./assets/audio/report.json', document.baseURI).href;
    const resp = await fetch(reportUrl);
    if (resp.ok) {
      const report = await resp.json();
      for (const [id, meta] of Object.entries(report.sounds || {})) {
        if (meta.hash) fileHashes[id] = meta.hash;
      }
    }
  } catch (err) {
    console.warn('[audio] no se pudo cargar report.json:', err.message);
  }

  const doLoad = async (entry, id) => {
    const path = isOgg ? entry.ogg : entry.m4a;
    if (!path) return null;
    return loadBuffer(path, id);
  };

  // Ambientes
  defaultAmbientIds = []; // Reset
  for (const [id, entry] of Object.entries(manifestAudio.ambient || {})) {
    const buf = await doLoad(entry, id);
    if (buf) {
      buffers[id] = buf;
      // Guardar IDs de ambiente con loop para arranque automático
      if (entry.loop) defaultAmbientIds.push(id);
      ambientBase[id] = typeof entry.gain === 'number' ? entry.gain : 0.7;
    }
  }

  // SFX
  for (const [id, entry] of Object.entries(manifestAudio.sfx || {})) {
    const buf = await doLoad(entry, id);
    if (buf) buffers[id] = buf;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Reproducción de SFX
// ─────────────────────────────────────────────────────────────────────────────────

function playSfx(id, opts = {}) {
  if (!audioCtx || !buffers[id]) {
    console.warn(`[audio] SFX "${id}" no disponible`);
    return;
  }
  const { rate = 1, gain = 1 } = opts;
  const src = audioCtx.createBufferSource();
  src.buffer = buffers[id];
  src.playbackRate.value = rate;
  const g = audioCtx.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

// ─────────────────────────────────────────────────────────────────────────────────
// Ambiente: loops con fade-in, intensity, truenos aleatorios
// ─────────────────────────────────────────────────────────────────────────────────

const ambient = {
  async start(ids) {
    if (!audioCtx || ids.length === 0) return;
    currentAmbientIds = ids;
    const fadeDur = 3; // fade-in 3 s

    for (const id of ids) {
      const buf = buffers[id];
      if (!buf) {
        console.warn(`[audio] ambiente "${id}" no disponible`);
        continue;
      }

      // Nodo de ganancia para este ambiente (podrá variar intensidad)
      const g = audioCtx.createGain();
      g.gain.value = 0;
      g.connect(ambientGain);
      ambientGainNodes[id] = g;

      // Reproducción cíclica
      function playLoop() {
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(g);
        src.start(0);
        sources.set(id, src);
      }

      playLoop();

      // Fade-in
      g.gain.linearRampToValueAtTime(ambientBase[id] ?? 0.7, audioCtx.currentTime + fadeDur);
    }

    // Truenos aleatorios si están en el manifiesto
    if (ids.includes('rain-tropical') && buffers['thunder-1']) {
      ambient._startThunder();
    }
  },

  stop() {
    for (const [id, src] of sources) {
      if (src && src.stop) {
        src.stop();
        sources.delete(id);
      }
    }
    currentAmbientIds = [];
    for (const k of Object.keys(ambientGainNodes)) { try { ambientGainNodes[k].disconnect(); } catch {} delete ambientGainNodes[k]; }
  },

  setIntensity(v) {
    // v: 0..1, modula la mezcla de ambientes y aplica pasa-bajos
    // Por simplicidad: multiplicar ganancia del ambiente
    v = Math.max(0, Math.min(1, v));
    for (const [id, g] of Object.entries(ambientGainNodes)) {
      g.gain.linearRampToValueAtTime(v * (ambientBase[id] ?? 0.7), audioCtx.currentTime + 0.5);
    }
  },

  _startThunder() {
    if (!buffers['thunder-1']) return;
    const interval = 40 + Math.random() * 80; // 40–120 s
    const nextThunder = () => {
      if (currentAmbientIds.length === 0) return;
      const src = audioCtx.createBufferSource();
      src.buffer = buffers['thunder-1'];
      const g = audioCtx.createGain();
      g.gain.value = 0.3; // bajo volumen
      src.connect(g);
      g.connect(sfxGain);
      src.start(0);
      setTimeout(nextThunder, (40 + Math.random() * 80) * 1000);
    };
    setTimeout(nextThunder, interval * 1000);
  },
};

// ─────────────────────────────────────────────────────────────────────────────────
// Control de volumen y listeners de eventos
// ─────────────────────────────────────────────────────────────────────────────────

function setVolume(channel, v) {
  v = Math.max(0, Math.min(1, v));
  if (channel === 'ambient') ambientGain.gain.value = curveAmbient(v);
  else if (channel === 'sfx') sfxGain.gain.value = curveSfx(v);
  else if (channel === 'master') masterGain.gain.linearRampToValueAtTime(v, audioCtx.currentTime + 0.15);
}

function handleBusEvents() {
  // card:flip → flip (solo si faceUp: true)
  ctx.bus.on(ctx.EV.CARD_FLIP, ({ faceUp }) => {
    if (faceUp) playSfx('flip', { rate: 0.99 + Math.random() * 0.02 }); // marimba: tono base con ±1 %
  });

  // pair:match → match con rate variable según racha
  ctx.bus.on(ctx.EV.PAIR_MATCH, ({ streak = 0, easterEgg = null }) => {
    if (easterEgg) playSfx(easterEgg, { rate: 1 });
    playSfx('match', { rate: 1 + streak * 0.03 });
  });

  // pair:miss → miss
  // pair:miss → sin sonido (pedido del dueño: la 'burbuja' molestaba). El archivo miss.* se conserva.
  ctx.bus.on(ctx.EV.PAIR_MISS, () => {});

  // game:dealt → deal
  // game:dealt → sin sonido por ahora (el dueño descartó el reparto sintetizado; candidato 'deal-bottle' en el banco)
  ctx.bus.on(ctx.EV.GAME_DEALT, () => {});

  // hint:used → hint
  ctx.bus.on(ctx.EV.HINT_USED, () => {
    playSfx('hint');
  });

  // game:win → win + intensidad 0.7 durante 8 s
  ctx.bus.on(ctx.EV.GAME_WIN, () => {
    playSfx('win');
    ambient.setIntensity(0.7);
    setTimeout(() => ambient.setIntensity(ctx.settings.get('ambientOn') ? 1 : 0), 8000);
  });

  // game:lose → lose (opcional, aún sin sonido definido)
  ctx.bus.on(ctx.EV.GAME_LOSE, () => {
    // placeholder
  });

  // game:pause → duck ambiente −12 dB
  ctx.bus.on(ctx.EV.GAME_PAUSE, () => {
    ambientGain.gain.linearRampToValueAtTime(
      ambientGain.gain.value * Math.pow(10, -12 / 20),
      audioCtx.currentTime + 0.3
    );
  });

  // game:resume → restaurar
  ctx.bus.on(ctx.EV.GAME_RESUME, () => {
    const target = ctx.settings.get('ambientOn') ? curveAmbient(ctx.settings.get('ambientVolume') ?? 0.6) : 0;
    ambientGain.gain.linearRampToValueAtTime(target, audioCtx.currentTime + 0.3);
  });

  // settings:changed → volúmenes y ambientOn
  ctx.bus.on(ctx.EV.SETTINGS_CHANGED, ({ key, value }) => {
    if (key === 'muted') setVolume('master', value ? 0 : 1);
    else if (key === 'ambientVolume') setVolume('ambient', value);
    else if (key === 'sfxVolume') setVolume('sfx', value);
    else if (key === 'ambientOn') {
      if (value) {
        // Usar IDs por defecto si está vacío
        const idsToStart = currentAmbientIds.length > 0 ? currentAmbientIds : defaultAmbientIds;
        ambient.start(idsToStart);
      } else {
        ambient.stop();
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// Interfaz pública
// ─────────────────────────────────────────────────────────────────────────────────

export const audio = {
  async init(manifestAudio) {
    ensureAudioContext();

    // Si no viene el manifiesto, cargar desde manifest.audio.json relativo al módulo
    if (!manifestAudio) {
      try {
        const url = new URL('./manifest.audio.json', import.meta.url);
        const resp = await fetch(url);
        manifestAudio = resp.ok ? await resp.json() : {};
      } catch (err) {
        console.warn('[audio] no se pudo cargar manifest.audio.json:', err.message);
        manifestAudio = {};
      }
    }

    await preloadBuffers(manifestAudio);
    console.info('[audio] motor listo, buffers precargados');
    // Volúmenes iniciales desde ajustes y arranque del ambiente si el contexto ya está desbloqueado
    if (ctx?.settings?.get) {
      setVolume('ambient', ctx.settings.get('ambientVolume') ?? 0.6);
      setVolume('sfx', ctx.settings.get('sfxVolume') ?? 0.8);
      setVolume('master', ctx.settings.get('muted') ? 0 : 1);
      if (audioCtx.state === 'running' && ctx.settings.get('ambientOn') && defaultAmbientIds.length > 0 && currentAmbientIds.length === 0) {
        ambient.start(defaultAmbientIds);
      }
    }
  },

  unlock() {
    resume();
    document.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  },

  playSfx,

  ambient,

  setVolume,
};

// ─────────────────────────────────────────────────────────────────────────────────
// Inicialización por el bus (main.js llama init(ctx))
// ─────────────────────────────────────────────────────────────────────────────────

export async function init(context) {
  ctx = context;
  await audio.init(ctx.manifest?.audio);
  handleBusEvents();
  audio.unlock();

  // Exposición global para que la UI pueda llamar unlock() tras primer gesto
  window.__audio = audio;
}
