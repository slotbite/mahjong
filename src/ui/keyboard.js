// Teclado y accesibilidad del tablero. `#board-a11y[role=grid]` con celdas `role=gridcell` que
// contienen un <button> invisible por carta. Flechas mueven el foco (roving tabindex), Enter/Espacio
// emite card:pick {index}. Si core-1 publica la geometría del tablero (`board:{x,y,w,h}` en
// layout:changed o game:dealt) las celdas se superponen a las fichas; si no, rejilla lógica no visual.
import { h, clear } from './dom.js';
import { t, onLangChange } from '../i18n/index.js';
import { session, onSession, newGame } from './session.js';
import { EV_HINT_REQUEST } from './hud.js';

export function initKeyboard(ui) {
  const { bus, EV } = ui;
  const grid = document.getElementById('board-a11y');
  if (!grid) return null;
  grid.setAttribute('role', 'grid');
  grid.tabIndex = -1;
  const help = h('p', { id: 'board-a11y-help', class: 'sr-only' });
  grid.setAttribute('aria-describedby', 'board-a11y-help');
  let cells = [];
  let focusIdx = 0;

  function labelFor(i) {
    const cols = session.cols || 1;
    const state = session.matched.has(i) ? t('a11y.matched') : session.faceUp.has(i) ? t('a11y.faceUp') : t('a11y.faceDown');
    return t('a11y.card', { n: i + 1, total: session.cards.length || session.cols * session.rows, r: Math.floor(i / cols) + 1, c: (i % cols) + 1, state });
  }

  function build() {
    clear(grid);
    grid.append(help);
    const { cols, rows } = session;
    const total = cols * rows;
    const hole = total % 2 ? Math.floor(total / 2) : -1;   // casilla central vacía en 3×3
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--rows', rows);
    grid.setAttribute('aria-label', t('a11y.board'));
    grid.setAttribute('aria-rowcount', rows); grid.setAttribute('aria-colcount', cols);
    help.textContent = t('a11y.boardHelp');
    cells = [];
    for (let r = 0; r < rows; r++) {
      const row = h('div', { role: 'row', class: 'a11y-row' });
      for (let c = 0; c < cols; c++) {
        const cell = r * cols + c;
        if (cell >= total) break;
        if (cell === hole) { row.append(h('div', { role: 'gridcell', class: 'a11y-cell a11y-cell-empty', aria: { hidden: 'true' } })); continue; }
        const i = hole >= 0 && cell > hole ? cell - 1 : cell;   // índice de carta
        const btn = h('button', { type: 'button', class: 'a11y-card', tabindex: i === 0 ? 0 : -1, data: { index: i }, aria: { label: labelFor(i), pressed: 'false' } });
        btn.addEventListener('click', () => pick(i));
        btn.addEventListener('focus', () => { focusIdx = i; });
        row.append(h('div', { role: 'gridcell', class: 'a11y-cell' }, btn));
        cells.push(btn);
      }
      grid.append(row);
    }
    focusIdx = 0;
    placeBoard();
  }

  function pick(i) {
    if (!session.dealt || session.over || session.paused) return;
    if (session.matched.has(i)) return;
    bus.emit(EV.CARD_PICK, { index: i });
  }

  function refreshCell(i) {
    const btn = cells[i]; if (!btn) return;
    btn.setAttribute('aria-label', labelFor(i));
    btn.setAttribute('aria-pressed', String(session.faceUp.has(i)));
    btn.classList.toggle('is-up', session.faceUp.has(i));
    btn.classList.toggle('is-matched', session.matched.has(i));
    btn.setAttribute('aria-disabled', String(session.matched.has(i)));
  }
  const refreshAll = () => cells.forEach((_, i) => refreshCell(i));

  function moveFocus(to) {
    if (!cells.length) return;
    const n = cells.length;
    to = ((to % n) + n) % n;
    cells[focusIdx]?.setAttribute('tabindex', '-1');
    focusIdx = to;
    cells[to].setAttribute('tabindex', '0');
    cells[to].focus({ preventScroll: true });
  }

  grid.addEventListener('keydown', (e) => {
    const cols = session.cols || 1;
    const i = focusIdx;
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: cells.length - 1 };
    if (e.key in map) { e.preventDefault(); moveFocus(map[e.key]); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); }
  });

  // Geometría: si hay `session.board` se superpone en px; si no, área lógica centrada por CSS.
  function placeBoard() {
    const b = session.board;
    if (b && Number.isFinite(b.x) && Number.isFinite(b.w)) {
      grid.classList.add('has-geometry');
      Object.assign(grid.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    } else {
      grid.classList.remove('has-geometry');
      grid.style.left = grid.style.top = grid.style.width = grid.style.height = '';
    }
  }

  onSession((evt, p) => {
    switch (evt) {
      case 'new': case 'dealt': build(); break;
      case 'flip': refreshCell(p.index); break;
      case 'match': case 'miss': (p.indices ?? []).forEach(refreshCell); break;
      case 'board': placeBoard(); break;
      case 'win': case 'lose': refreshAll(); break;
    }
  });
  onLangChange(() => { grid.setAttribute('aria-label', t('a11y.board')); help.textContent = t('a11y.boardHelp'); refreshAll(); });
  ui.layout.onChange(() => placeBoard(), { immediate: false });

  // Atajos globales (fuera de campos de texto y sin diálogo abierto).
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.querySelector('dialog[open]')) return;
    switch (e.key.toLowerCase()) {
      case 'p': if (session.dealt && !session.over) bus.emit(session.paused ? EV.GAME_RESUME : EV.GAME_PAUSE, { reason: 'user' }); break;
      case 'h': if (session.hints > 0 && session.dealt && !session.over) bus.emit(EV_HINT_REQUEST, {}); break;
      case 'n': newGame(ui); break;
      case ',': ui.openSettings?.(); break;
      case 'b': if (cells.length && !grid.contains(document.activeElement)) { e.preventDefault(); moveFocus(focusIdx); } break;
    }
  });

  build();
  return { el: grid, focusBoard: () => moveFocus(focusIdx) };
}
