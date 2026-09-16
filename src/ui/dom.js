// Utilidades DOM compartidas por los módulos de UI. Sin frameworks.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Raíz del repo (src/ui/ → ../../). Resuelve rutas del manifiesto ("img/x.png") sin importar
// desde qué página se sirva la UI (index.html, tests/ui-harness.html, subpath de GitHub Pages).
export const ROOT_URL = new URL('../../', import.meta.url);
export const assetUrl = (src) => (src ? new URL(String(src), ROOT_URL).href : '');

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// h('button', { class: 'btn', onclick: fn, aria: { pressed: true }, data: { id: 1 } }, 'texto', node)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;            // solo con contenido ya escapado
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'data') { for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv; }
    else if (k === 'aria') { for (const [ak, av] of Object.entries(v)) { if (av != null) el.setAttribute(`aria-${ak}`, String(av)); } }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

// mm:ss (h:mm:ss si pasa de una hora). Acepta segundos (número) y tolera null/NaN.
export function fmtTime(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function prefersReducedMotion(settings) {
  const v = settings?.get?.('reducedMotion') ?? 'auto';
  if (v === 'on') return true;
  // 'auto' y 'off' = animación completa; el modo reducido es elección explícita (ver src/scene/index.js).
  return false;
}

// Tween numérico (300 ms por defecto) para el puntaje. Devuelve una función de cancelación.
export function tweenNumber(el, from, to, { ms = 300, format = (n) => String(Math.round(n)), reduced = false } = {}) {
  if (reduced || ms <= 0 || from === to || typeof requestAnimationFrame !== 'function') {
    el.textContent = format(to);
    return () => {};
  }
  const t0 = performance.now();
  let raf = 0;
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    el.textContent = format(from + (to - from) * ease(p));
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function debounce(fn, ms = 80) {
  let id = 0;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}

// Iconos SVG inline (trazo 2, 24 px). Se pintan con currentColor.
const ICONS = {
  hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  new: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  soundOn: '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>',
  soundOff: '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  star: '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z"/>',
  theme: '<path d="M4 6h16v12H4z"/><path d="M4 14l4-4 4 4 3-3 5 5"/><circle cx="16" cy="9" r="1.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
};
export function icon(name, { size = 22, filled = false } = {}) {
  const d = ICONS[name] ?? '';
  const fill = filled ? 'currentColor' : 'none';
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg class="ico ico-${esc(name)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  return tpl.content.firstElementChild;
}
