// Estado de la partida visto desde la UI. Se alimenta SOLO de eventos del bus (§7.1);
// no toca el estado de core-1. Los módulos de UI leen `session` y se suscriben con `onSession`.
export const GRIDS = Object.freeze([[3, 2], [4, 3], [4, 4], [6, 4], [6, 5], [6, 6]]);
export const MODES = Object.freeze(['zen', 'classic', 'timed', 'daily']);

// Umbrales de combo (asunción de UI mientras core-1 no publique `multiplier` en pair:match).
export function comboMultiplier(streak) {
  if (streak >= 6) return 3;
  if (streak >= 4) return 2;
  if (streak >= 2) return 1.5;
  return 1;
}

export function defaultHints(cols, rows) { return cols * rows >= 24 ? 2 : 1; }

export const session = {
  mode: 'classic', cols: 4, rows: 4, themeId: 'plantas', seed: null,
  elapsed: 0, remaining: null, moves: 0, pairs: 0, totalPairs: 0,
  streak: 0, score: 0, hints: 1, paused: false, over: false, dealt: false,
  cards: [], faceUp: new Set(), matched: new Set(),
  board: null,               // { x, y, w, h } si core-1 lo publica (propuesta de contrato)
  lastWin: null, lastLose: null,
};

const subs = new Set();
export function onSession(fn) { subs.add(fn); return () => subs.delete(fn); }
function notify(evt, payload) { for (const fn of [...subs]) { try { fn(evt, payload, session); } catch (e) { console.error('[ui/session]', e); } } }

export function trackSession({ bus, EV, settings }) {
  const s = settings.all;
  Object.assign(session, { mode: s.mode, cols: s.cols, rows: s.rows, themeId: s.themeId });

  // Orden de listeners: si el estado (core-1) se registró antes que la UI y reparte de forma
  // sincrónica dentro de su handler de game:new, game:dealt llega ANTES de que corra este handler.
  // dealSeq/lastNewSeq detectan ese caso para no pisar el reparto recién recibido.
  let dealSeq = 0, lastNewSeq = 0, awaitingDeal = false;

  bus.on(EV.GAME_NEW, (p = {}) => {
    Object.assign(session, {
      mode: p.mode ?? session.mode, cols: p.cols ?? session.cols, rows: p.rows ?? session.rows,
      themeId: p.themeId ?? session.themeId, seed: p.seed ?? session.seed ?? null,
      lastWin: null, lastLose: null,
    });
    if (dealSeq !== lastNewSeq) {
      lastNewSeq = dealSeq;                 // el reparto de esta partida ya llegó: no resetear
    } else {
      awaitingDeal = true;
      Object.assign(session, { seed: p.seed ?? null, elapsed: 0, remaining: null, moves: 0, pairs: 0, streak: 0, score: 0, paused: false, over: false, dealt: false });
      session.hints = defaultHints(session.cols, session.rows);
      session.faceUp = new Set(); session.matched = new Set();
    }
    notify('new', p);
  });

  bus.on(EV.GAME_DEALT, (p = {}) => {
    dealSeq += 1;
    if (awaitingDeal) { awaitingDeal = false; lastNewSeq = dealSeq; }
    session.cards = Array.isArray(p.cards) ? p.cards : [];
    session.seed = p.seed ?? session.seed;
    if (Number.isInteger(p.cols) && Number.isInteger(p.rows)) { session.cols = p.cols; session.rows = p.rows; }
    session.totalPairs = Math.floor(session.cards.length / 2) || Math.floor((session.cols * session.rows) / 2);
    if (Number.isInteger(p.hints)) session.hints = p.hints;
    if (p.board) session.board = p.board;
    Object.assign(session, { elapsed: 0, remaining: p.limit ?? null, moves: 0, pairs: 0, streak: 0, score: 0, paused: false, over: false, dealt: true });
    session.faceUp = new Set(); session.matched = new Set();
    notify('dealt', p);
  });

  bus.on(EV.GAME_TICK, (p = {}) => {
    if (typeof p.elapsed === 'number') session.elapsed = p.elapsed;
    session.remaining = (typeof p.remaining === 'number') ? p.remaining : null;
    notify('tick', p);
  });

  bus.on(EV.CARD_FLIP, (p = {}) => {
    if (!Number.isInteger(p.index)) return;
    if (p.faceUp) session.faceUp.add(p.index); else session.faceUp.delete(p.index);
    notify('flip', p);
  });

  bus.on(EV.PAIR_MATCH, (p = {}) => {
    session.moves += 1;
    session.pairs += 1;
    session.streak = Number.isInteger(p.streak) ? p.streak : session.streak + 1;
    if (typeof p.score === 'number') session.score = p.score;
    for (const i of p.indices ?? []) { session.matched.add(i); session.faceUp.delete(i); }
    notify('match', p);
  });

  bus.on(EV.PAIR_MISS, (p = {}) => {
    session.moves += 1;
    session.streak = 0;
    for (const i of p.indices ?? []) session.faceUp.delete(i);
    notify('miss', p);
  });

  bus.on(EV.HINT_USED, (p = {}) => {
    if (Number.isInteger(p.remaining)) session.hints = p.remaining; else session.hints = Math.max(0, session.hints - 1);
    notify('hint', p);
  });

  bus.on(EV.GAME_PAUSE, (p) => { if (!session.over && session.dealt) { session.paused = true; notify('pause', p); } });
  bus.on(EV.GAME_RESUME, (p) => { if (session.paused) { session.paused = false; notify('resume', p); } });

  bus.on(EV.GAME_WIN, (p = {}) => {
    session.over = true; session.paused = false; session.lastWin = p;
    if (typeof p.elapsed === 'number') session.elapsed = p.elapsed;
    if (typeof p.moves === 'number') session.moves = p.moves;
    if (typeof p.score === 'number') session.score = p.score;
    notify('win', p);
  });
  bus.on(EV.GAME_LOSE, (p = {}) => { session.over = true; session.paused = false; session.lastLose = p; notify('lose', p); });

  bus.on(EV.LAYOUT_CHANGED, (p = {}) => { if (p.board) { session.board = p.board; notify('board', p); } });

  return session;
}

// Nueva partida con los ajustes actuales. `seed` solo se conserva si se pide (reintento / diario).
export function newGame({ bus, EV, settings }, { seed = null, themeChanged = false } = {}) {
  const s = settings.all;
  const payload = { mode: s.mode, cols: s.cols, rows: s.rows, themeId: s.themeId, seed: s.mode === 'daily' ? (seed ?? dailySeed()) : seed };
  const changed = themeChanged || s.themeId !== session.themeId;
  if (changed) {
    let done = false;
    const go = () => { if (done) return; done = true; bus.emit(EV.GAME_NEW, payload); };
    bus.once(EV.THEME_READY, go);
    bus.emit(EV.THEME_LOAD, { themeId: s.themeId });
    setTimeout(go, 4000);            // respaldo si el cargador de temas no responde
  } else {
    bus.emit(EV.GAME_NEW, payload);
  }
  return payload;
}

// Semilla del modo diario: YYYYMMDD en hora local; core-1 puede sustituirla por la suya.
export function dailySeed(d = new Date()) {
  return `daily-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
