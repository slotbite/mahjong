// Bootstrap de Memorice v2. Cablea los módulos por el bus; cada módulo exporta `init(ctx)`.
// Los módulos que aún no existen se cargan de forma tolerante para que las ramas de cada
// agente funcionen de manera aislada durante el lote v2-lote-1.
import { bus, EV } from './core/bus.js';
import { settings } from './core/settings.js';

const ctx = { bus, EV, settings, manifest: null };

async function loadManifest() {
  const res = await fetch('./assets/manifest.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}

async function tryInit(path, name) {
  try {
    const mod = await import(path);
    if (typeof mod.init === 'function') await mod.init(ctx);
    console.info(`[main] ${name} listo`);
    return mod;
  } catch (err) {
    console.warn(`[main] módulo ${name} no disponible (${path})`, err?.message ?? err);
    return null;
  }
}

async function boot() {
  ctx.manifest = await loadManifest();

  // Orden: audio y pixel primero (sin efectos visibles), luego escena, estado y UI.
  await tryInit('./audio/engine.js', 'audio');
  await tryInit('./pixel/pixelator.js', 'pixel');
  await tryInit('./scene/index.js', 'scene');
  await tryInit('./core/state.js', 'state');
  await tryInit('./ui/index.js', 'ui');

  // Primer gesto: desbloquea audio (política de autoplay) y arranca la partida inicial.
  const s = settings.all;
  bus.emit(EV.THEME_LOAD, { themeId: s.themeId });
  bus.once(EV.THEME_READY, () => {
    bus.emit(EV.GAME_NEW, { mode: s.mode, cols: s.cols, rows: s.rows, themeId: s.themeId, seed: null });
  });

  document.addEventListener('visibilitychange', () => {
    bus.emit(document.hidden ? EV.GAME_PAUSE : EV.GAME_RESUME, { reason: 'visibility' });
  });
}

boot().catch((err) => {
  console.error('[main] fallo al iniciar', err);
  const el = document.getElementById('boot-error');
  if (el) { el.hidden = false; el.textContent = `No se pudo iniciar el juego: ${err.message}`; }
});
