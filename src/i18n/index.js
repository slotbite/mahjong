// i18n mínimo: diccionarios planos es/en cargados por fetch, `t(key, vars)` sincrónico,
// cambio en caliente con `setLang` + `onLangChange` (los módulos de UI re-renderizan sus textos).
const FILES = {
  es: new URL('./es.json', import.meta.url),
  en: new URL('./en.json', import.meta.url),
};
export const LANGS = Object.freeze(Object.keys(FILES));

const cache = new Map();
const listeners = new Set();
let lang = 'es';
let dict = {};
let fallback = {};

async function loadDict(code) {
  if (cache.has(code)) return cache.get(code);
  const res = await fetch(FILES[code], { cache: 'no-cache' });
  if (!res.ok) throw new Error(`i18n ${code} ${res.status}`);
  const json = await res.json();
  cache.set(code, json);
  return json;
}

export async function initI18n(initial = 'es') {
  try { fallback = await loadDict('es'); } catch (err) { console.warn('[i18n] sin diccionario es', err); fallback = {}; }
  await setLang(initial, { silent: true });
}

export async function setLang(code, { silent = false } = {}) {
  const next = FILES[code] ? code : 'es';
  try { dict = await loadDict(next); } catch (err) { console.warn(`[i18n] sin diccionario ${next}`, err); dict = fallback; }
  lang = next;
  document.documentElement.lang = next;
  if (!silent) for (const fn of [...listeners]) { try { fn(next); } catch (e) { console.error('[i18n] listener', e); } }
  return next;
}

export function t(key, vars) {
  let s = dict[key] ?? fallback[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
  return s;
}

export function getLang() { return lang; }

export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Nombre localizado de un tema del manifiesto (`name: { es, en }`).
export function themeName(theme) {
  if (!theme) return '';
  const n = theme.name;
  if (typeof n === 'string') return n;
  return n?.[lang] ?? n?.es ?? Object.values(n ?? {})[0] ?? theme.id ?? '';
}
