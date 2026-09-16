// Avisos breves en `#toast[role=status]`. Cola simple, un aviso a la vez.
import { h, clear } from './dom.js';

export function initToast() {
  const root = document.getElementById('toast');
  if (!root) return () => {};
  const queue = [];
  let busy = false;

  function next() {
    if (busy || queue.length === 0) return;
    busy = true;
    const { msg, ms, kind } = queue.shift();
    clear(root);
    const el = h('div', { class: `toast-item glass ${kind}` }, msg);
    root.append(el);
    // Forzar reflow para que la transición de entrada se aplique.
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { if (el.parentNode === root) root.removeChild(el); busy = false; next(); }, 260);
    }, ms);
  }

  return function toast(msg, { ms = 2200, kind = '' } = {}) {
    if (!msg) return;
    if (queue.length > 3) queue.shift();
    queue.push({ msg: String(msg), ms, kind });
    next();
  };
}
