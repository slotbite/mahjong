// Ajustes persistentes. Contrato en doc/v2/PROPUESTA_V2.md §7.2.
import { bus, EV } from './bus.js';

const KEY = 'memorice.v2.settings';

export const DEFAULTS = Object.freeze({
  themeId: 'plantas',
  mode: 'classic',        // zen | classic | timed | daily
  cols: 4,
  rows: 4,
  lang: 'es',
  ambientVolume: 0.6,
  sfxVolume: 0.8,
  ambientOn: true,
  muted: false,           // silencio general (botón de sonido del HUD)
  pixelScale: 94,         // 0..100, referencia del autor
  palette: 'original',
  dither: 'none',         // none | bayer | floyd
  reducedMotion: 'auto',  // auto | on | off
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

let current = load();

export const settings = {
  get all() { return { ...current }; },
  get(key) { return current[key]; },
  set(key, value) {
    if (current[key] === value) return;
    current = { ...current, [key]: value };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch {}
    bus.emit(EV.SETTINGS_CHANGED, { key, value, all: settings.all });
  },
  reset() {
    current = { ...DEFAULTS };
    try { localStorage.removeItem(KEY); } catch {}
    bus.emit(EV.SETTINGS_CHANGED, { key: '*', value: null, all: settings.all });
  },
};
