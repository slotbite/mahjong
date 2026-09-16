// Core simulado para probar la UI sin core-1 (escena/estado). Implementa el contrato §7.1 en
// versión mínima: reparte, cuenta, empareja, cronometra, pista, pausa, victoria/derrota, layout
// (con la geometría del tablero propuesta por ui-6) y pinta un tablero DOM de mentira.
import { classify } from '../src/ui/layout.js';

export const EV_HINT_REQUEST = 'hint:request';

export function startFakeCore({ bus, EV, manifest, settings }) {
  const board = document.getElementById('fake-board');
  const log = document.getElementById('fake-log');
  const state = { cards: [], up: [], matched: new Set(), moves: 0, streak: 0, score: 0, elapsed: 0, limit: null, hints: 1, timer: 0, paused: false, over: false, busy: false, seed: null, cols: 4, rows: 4, mode: 'classic', themeId: 'plantas', theme: null };

  const say = (evt, p) => { if (!log) return; const li = document.createElement('li'); li.textContent = `${evt} ${JSON.stringify(p ?? {})}`.slice(0, 140); log.prepend(li); while (log.children.length > 12) log.lastChild.remove(); };
  const emit = (evt, p) => { say(evt, p); bus.emit(evt, p); };

  // RNG con semilla (mulberry32) para el modo diario / reintento.
  function rng(seedStr) { let a = 0; for (const ch of String(seedStr)) a = (a * 31 + ch.charCodeAt(0)) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  bus.on(EV.THEME_LOAD, ({ themeId }) => {
    state.themeId = themeId; state.theme = manifest.themes.find((t) => t.id === themeId) ?? manifest.themes[0];
    setTimeout(() => emit(EV.THEME_READY, { theme: state.theme, textures: {} }), 80);
  });

  bus.on(EV.GAME_NEW, ({ mode, cols, rows, themeId, seed }) => {
    stopTimer();
    if (themeId !== state.themeId || !state.theme) { state.themeId = themeId; state.theme = manifest.themes.find((t) => t.id === themeId) ?? manifest.themes[0]; }
    Object.assign(state, { mode, cols, rows, moves: 0, streak: 0, score: 0, elapsed: 0, paused: false, over: false, busy: false, up: [], matched: new Set() });
    state.seed = seed ?? `s${Date.now().toString(36)}`;
    const pairs = (cols * rows) / 2;
    const pool = state.theme.cards.length ? state.theme.cards : manifest.themes[0].cards;
    const rand = rng(state.seed);
    const chosen = [...pool].sort(() => rand() - 0.5).slice(0, pairs);
    const deck = chosen.flatMap((c) => [c, c]).sort(() => rand() - 0.5);
    state.cards = deck.map((c, i) => ({ id: `${c.id}-${i}`, pairKey: c.id, index: i, src: c.src }));
    state.hints = cols * rows >= 24 ? 2 : 1;
    state.limit = mode === 'timed' ? pairs * 9 : null;
    renderBoard();
    emit(EV.GAME_DEALT, { cards: state.cards.map(({ id, pairKey, index }) => ({ id, pairKey, index })), seed: state.seed, cols, rows, hints: state.hints, limit: state.limit, board: boardRect() });
    if (mode !== 'zen') startTimer();
    tick();
  });

  bus.on(EV.CARD_PICK, ({ index }) => {
    if (state.over || state.paused || state.busy) return;
    if (state.matched.has(index) || state.up.includes(index)) return;
    state.up.push(index); flip(index, true); emit(EV.CARD_FLIP, { index, faceUp: true });
    if (state.up.length < 2) return;
    const [a, b] = state.up; state.busy = true;
    setTimeout(() => {
      state.busy = false; state.up = [];
      if (state.cards[a].pairKey === state.cards[b].pairKey) {
        state.matched.add(a); state.matched.add(b); state.streak += 1; state.moves += 1;
        const mult = state.streak >= 6 ? 3 : state.streak >= 4 ? 2 : state.streak >= 2 ? 1.5 : 1;
        state.score += Math.round(100 * mult);
        markMatched(a, b);
        emit(EV.PAIR_MATCH, { indices: [a, b], pairKey: state.cards[a].pairKey, streak: state.streak, score: state.score });
        if (state.matched.size === state.cards.length) win();
      } else {
        state.streak = 0; state.moves += 1; flip(a, false); flip(b, false);
        emit(EV.CARD_FLIP, { index: a, faceUp: false }); emit(EV.CARD_FLIP, { index: b, faceUp: false });
        emit(EV.PAIR_MISS, { indices: [a, b] });
      }
    }, 650);
  });

  bus.on(EV_HINT_REQUEST, () => {
    if (state.hints <= 0 || state.over) return;
    state.hints -= 1; state.score = Math.max(0, state.score - 50);
    board?.classList.add('hinting'); setTimeout(() => board?.classList.remove('hinting'), 1200);
    emit(EV.HINT_USED, { remaining: state.hints });
  });

  bus.on(EV.GAME_PAUSE, () => { if (!state.over) { state.paused = true; stopTimer(); } });
  bus.on(EV.GAME_RESUME, () => { if (state.paused && !state.over) { state.paused = false; if (state.mode !== 'zen') startTimer(); } });

  function tick() { emit(EV.GAME_TICK, { elapsed: state.elapsed, remaining: state.limit != null ? Math.max(0, state.limit - state.elapsed) : null }); }
  function startTimer() { stopTimer(); state.timer = setInterval(() => { state.elapsed += 1; tick(); if (state.limit != null && state.elapsed >= state.limit) lose(); }, 1000); }
  function stopTimer() { clearInterval(state.timer); state.timer = 0; }

  function win() {
    stopTimer(); state.over = true;
    const pairs = state.cards.length / 2;
    const stars = state.moves <= pairs * 1.4 ? 3 : state.moves <= pairs * 2 ? 2 : 1;
    const key = `${state.themeId}:${state.cols}x${state.rows}:${state.mode}`;
    const all = JSON.parse(localStorage.getItem('memorice.v2.records') || '{}');
    const prev = all[key];
    const isRecord = !prev || state.elapsed < prev.bestTime || state.moves < prev.bestMoves || state.score > prev.bestScore;
    all[key] = { bestTime: Math.min(prev?.bestTime ?? Infinity, state.elapsed), bestMoves: Math.min(prev?.bestMoves ?? Infinity, state.moves), bestScore: Math.max(prev?.bestScore ?? 0, state.score), plays: (prev?.plays ?? 0) + 1, updatedAt: Date.now() };
    localStorage.setItem('memorice.v2.records', JSON.stringify(all));
    emit(EV.GAME_WIN, { elapsed: state.elapsed, moves: state.moves, score: state.score, stars, isRecord, records: all[key] });
  }
  function lose() { stopTimer(); state.over = true; emit(EV.GAME_LOSE, { reason: 'timeout' }); }

  // ---- tablero DOM de mentira + geometría ----------------------------------------------------
  function boardRect() { const r = board?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; }
  function layoutBoard() {
    if (!board) return;
    const w = innerWidth, h = innerHeight, kind = classify(w, h);
    const { cols, rows } = state;
    let top, bottom, maxW;
    if (kind === 'mobile') { top = h * 0.08; bottom = h * 0.24; maxW = w - 32; }
    else if (kind === 'ultrawide') { top = 32; bottom = 32; maxW = 1600; }
    else if (kind === 'tablet') { top = 100; bottom = 32; maxW = 760; }
    else { top = 104; bottom = 32; maxW = 900; }
    const availW = Math.min(maxW, w - 32), availH = h - top - bottom;
    const cell = Math.floor(Math.min(availW / cols, availH / rows));
    const bw = cell * cols, bh = cell * rows;
    const y = kind === 'ultrawide' ? (h - bh) / 2 : top + Math.max(0, (availH - bh) / 2);
    Object.assign(board.style, { left: `${(w - bw) / 2}px`, top: `${y}px`, width: `${bw}px`, height: `${bh}px`, gridTemplateColumns: `repeat(${cols}, 1fr)` });
    return kind;
  }
  function renderBoard() {
    if (!board) return;
    board.innerHTML = '';
    for (const c of state.cards) {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'fcard'; el.tabIndex = -1; el.dataset.index = c.index; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<span class="back">?</span><img class="front" alt="" src="${new URL(c.src, new URL('../', import.meta.url)).href}">`;
      el.addEventListener('click', () => bus.emit(EV.CARD_PICK, { index: c.index }));
      board.append(el);
    }
    layoutBoard();
  }
  const cardEl = (i) => board?.children[i];
  function flip(i, up) { cardEl(i)?.classList.toggle('up', up); }
  function markMatched(a, b) { cardEl(a)?.classList.add('matched'); cardEl(b)?.classList.add('matched'); }

  function emitLayout() { const kind = layoutBoard() ?? classify(innerWidth, innerHeight); emit(EV.LAYOUT_CHANGED, { kind, w: innerWidth, h: innerHeight, board: boardRect() }); }
  addEventListener('resize', emitLayout, { passive: true });
  setTimeout(emitLayout, 0);

  // ---- controles de prueba ------------------------------------------------------------------
  const api = {
    matchOne() { const left = state.cards.filter((c) => !state.matched.has(c.index)); if (!left.length) return; const first = left[0]; const twin = left.find((c) => c.pairKey === first.pairKey && c.index !== first.index); bus.emit(EV.CARD_PICK, { index: first.index }); setTimeout(() => bus.emit(EV.CARD_PICK, { index: twin.index }), 60); },
    missOne() { const left = state.cards.filter((c) => !state.matched.has(c.index)); const a = left[0]; const b = left.find((c) => c.pairKey !== a.pairKey); if (a && b) { bus.emit(EV.CARD_PICK, { index: a.index }); setTimeout(() => bus.emit(EV.CARD_PICK, { index: b.index }), 60); } },
    streak(n = 6) { let i = 0; const step = () => { if (i++ >= n) return; api.matchOne(); setTimeout(step, 800); }; step(); },
    addTime(s) { state.elapsed += s; tick(); },
    winNow() { if (state.over) return; for (const c of state.cards) state.matched.add(c.index); state.moves = state.moves || state.cards.length / 2 + 3; state.score = state.score || 1250; win(); },
    loseNow() { if (!state.over) lose(); },
    nearTimeout() { if (state.limit != null) { state.elapsed = state.limit - 9; tick(); } },
    state,
  };
  return api;
}
