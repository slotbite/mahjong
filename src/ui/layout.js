// Layout responsivo (§5). Fuente primaria: `layout:changed` de la escena (core-1).
// Respaldo propio con matchMedia/resize para que la UI funcione aunque la escena no exista.
// Publica `data-layout` en <html> y avisa a los módulos con `onChange(kind)`.
export const KINDS = Object.freeze(['mobile', 'tablet', 'desktop', 'ultrawide']);

export function classify(w, h) {
  if (w / Math.max(1, h) >= 2.3 && w >= 1600) return 'ultrawide';
  if (w < 700) return 'mobile';
  if (w < 1280) return 'tablet';
  return 'desktop';
}

export function initLayout({ bus, EV }) {
  const html = document.documentElement;
  const subs = new Set();
  const state = { kind: null, w: innerWidth, h: innerHeight, board: null, source: 'media' };
  let sceneSeen = false;

  function apply(kind, w, h, source) {
    state.w = w; state.h = h; state.source = source;
    html.dataset.layout = kind;
    html.dataset.orientation = w >= h ? 'landscape' : 'portrait';
    if (kind === state.kind) return;
    state.kind = kind;
    for (const fn of [...subs]) { try { fn(kind, state); } catch (e) { console.error('[ui/layout]', e); } }
  }

  const fromMedia = () => { if (!sceneSeen) apply(classify(innerWidth, innerHeight), innerWidth, innerHeight, 'media'); };
  fromMedia();
  addEventListener('resize', fromMedia, { passive: true });
  addEventListener('orientationchange', fromMedia, { passive: true });

  bus.on(EV.LAYOUT_CHANGED, (p = {}) => {
    const kind = KINDS.includes(p.kind) ? p.kind : classify(p.w ?? innerWidth, p.h ?? innerHeight);
    sceneSeen = true;
    if (p.board) state.board = p.board;
    apply(kind, p.w ?? innerWidth, p.h ?? innerHeight, 'scene');
  });

  return {
    get kind() { return state.kind; },
    get state() { return state; },
    onChange(fn, { immediate = true } = {}) { subs.add(fn); if (immediate) fn(state.kind, state); return () => subs.delete(fn); },
  };
}
