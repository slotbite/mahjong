// Máquina de estados del juego (core-1). Contratos: doc/v2/PROPUESTA_V2.md §4 y §7.1.
// Sin dependencias del DOM: todo lo externo (reloj, timers, storage, bus) se inyecta en
// `createGame(deps)`. `init(ctx)` cablea con los globales reales del navegador.

export const MODES = Object.freeze(['zen', 'classic', 'timed', 'daily']);
export const GRIDS = Object.freeze([[3, 2], [4, 3], [4, 4], [6, 4], [6, 5], [6, 6]]);

export const RULES = Object.freeze({
  basePerPair: 100,
  hintPenalty: 150,
  // [rachaMinima, multiplicador], evaluado de mayor a menor.
  combo: [[6, 3], [4, 2], [2, 1.5]],
  missDelayMs: 1100,      // vuelta a dorso tras un fallo (§2.2)
  hintRevealMs: 1200,     // duración de la pista (§4)
  timedBaseSec: 60,
  timedPerPairSec: 6,
  bigGridPairs: 15,       // desde aquí hay 2 pistas
  starsGood: 1.3,         // movimientos ≤ pares×1.3 → 3 estrellas
  starsOk: 2.0,           // movimientos ≤ pares×2   → 2 estrellas
});

export const RECORDS_KEY = 'memorice.v2.records';

// ---------- utilidades puras ----------

/** PRNG mulberry32: determinista, 32 bits, devuelve [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convierte cualquier semilla (número o texto) en un entero de 32 bits (FNV-1a). */
export function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates con PRNG inyectado. No muta la entrada. */
export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Semilla del modo diario: fecha local YYYY-MM-DD. */
export function dailySeed(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function randomSeed(rand = Math.random) {
  return Math.floor(rand() * 0xFFFFFFFF).toString(36);
}

/**
 * Valida la rejilla contra la cantidad de cartas del tema. Si no es válida (impar,
 * o más pares que cartas) baja a la rejilla estándar más grande que quepa.
 */
export function resolveGrid(cols, rows, cardCount) {
  cols = Number(cols) | 0; rows = Number(rows) | 0;
  const cells = cols * rows;
  if (cols > 0 && rows > 0 && cells % 2 === 0 && cells / 2 <= cardCount && cells >= 4) {
    return { cols, rows, pairs: cells / 2, adjusted: false };
  }
  for (let i = GRIDS.length - 1; i >= 0; i--) {
    const [c, r] = GRIDS[i];
    if ((c * r) / 2 <= cardCount) return { cols: c, rows: r, pairs: (c * r) / 2, adjusted: true };
  }
  throw new Error(`El tema tiene ${cardCount} cartas; se necesitan al menos 3`);
}

/**
 * Construye el mazo barajado de forma determinista. Elige `pairs` cartas del tema con
 * el PRNG (para que el diario sea el mismo para todos) y baraja las posiciones.
 */
export function buildDeck(theme, cols, rows, seed) {
  const grid = resolveGrid(cols, rows, theme.cards.length);
  const rng = mulberry32(hashSeed(seed));
  const chosen = shuffle(theme.cards, rng).slice(0, grid.pairs);
  const deck = shuffle([...chosen, ...chosen], rng);
  const cards = deck.map((c, index) => ({ id: c.id, pairKey: c.id, index }));
  return { cards, seed: String(seed), ...grid };
}

export function comboMultiplier(streak) {
  for (const [min, mult] of RULES.combo) if (streak >= min) return mult;
  return 1;
}

export function starsFor(moves, pairs) {
  if (moves <= pairs * RULES.starsGood) return 3;
  if (moves <= pairs * RULES.starsOk) return 2;
  return 1;
}

export function timeLimitFor(mode, pairs) {
  return mode === 'timed' ? RULES.timedBaseSec + RULES.timedPerPairSec * pairs : null;
}

/** Bonus de tiempo al ganar. Clásico: 5 pts por segundo bajo un par cada 10 s. Contrarreloj: 10 pts por segundo restante. */
export function timeBonus(mode, elapsedSec, remainingSec, pairs) {
  if (mode === 'classic') return Math.max(0, pairs * 10 - elapsedSec) * 5;
  if (mode === 'timed') return Math.max(0, remainingSec ?? 0) * 10;
  return 0;
}

export function recordKey(themeId, cols, rows, mode) {
  return `${themeId}:${cols}x${rows}:${mode}`;
}

/** Storage en memoria para Node o cuando localStorage falla. */
export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

export function loadRecords(storage) {
  try { return JSON.parse(storage.getItem(RECORDS_KEY) || '{}') || {}; }
  catch { return {}; }
}

/**
 * Actualiza el récord de una clave. Devuelve { entry, improved, isRecord, all }.
 * `improved` lista qué marcas bajaron/subieron; la primera partida cuenta como récord.
 */
export function updateRecord(storage, key, { time, moves, score }, now = Date.now()) {
  const all = loadRecords(storage);
  const prev = all[key];
  const improved = [];
  const entry = prev ? { ...prev } : { bestTime: null, bestMoves: null, bestScore: null, plays: 0, updatedAt: 0 };
  if (entry.bestTime == null || time < entry.bestTime) { entry.bestTime = time; improved.push('time'); }
  if (entry.bestMoves == null || moves < entry.bestMoves) { entry.bestMoves = moves; improved.push('moves'); }
  if (entry.bestScore == null || score > entry.bestScore) { entry.bestScore = score; improved.push('score'); }
  entry.plays += 1;
  entry.updatedAt = now;
  all[key] = entry;
  try { storage.setItem(RECORDS_KEY, JSON.stringify(all)); } catch {}
  return { entry, improved, isRecord: improved.length > 0, all };
}

// ---------- juego ----------

/**
 * Crea la máquina de estados. deps:
 *  bus, EV                — contrato §7.1
 *  manifest               — para buscar las cartas del tema
 *  now()                  — reloj en ms (Date.now)
 *  setTimeout/clearTimeout/setInterval/clearInterval
 *  storage                — localStorage-like para récords
 *  random()               — para semillas no deterministas
 */
export function createGame(deps) {
  const {
    bus, EV, manifest,
    now = () => Date.now(),
    setTimeout: setT = globalThis.setTimeout,
    clearTimeout: clearT = globalThis.clearTimeout,
    setInterval: setI = globalThis.setInterval,
    clearInterval: clearI = globalThis.clearInterval,
    storage = memoryStorage(),
    random = Math.random,
  } = deps;

  const themes = new Map((manifest?.themes ?? []).map((t) => [t.id, t]));

  /** @type {ReturnType<typeof freshState>} */
  let S = freshState();
  let tickHandle = null;
  let missHandle = null;
  let hintHandle = null;
  const offs = [];

  function freshState() {
    return {
      phase: 'idle',          // idle | dealt | playing | paused | won | lost
      mode: 'classic', themeId: null, cols: 0, rows: 0, pairs: 0, seed: null,
      cards: [], faceUp: [], matched: [],
      open: [],               // índices actualmente destapados sin resolver (0..2)
      locked: false,          // bloqueo durante miss/pista
      moves: 0, matchedPairs: 0, streak: 0, bestStreak: 0, score: 0,
      hintsLeft: 0, hintsUsed: 0,
      timeLimit: null,        // segundos, solo timed
      startedAt: null, accumulatedMs: 0, pausedForTimer: false,
      easterEgg: null,
    };
  }

  function elapsedMs() {
    if (S.startedAt == null) return S.accumulatedMs;
    return S.accumulatedMs + (now() - S.startedAt);
  }
  function elapsedSec() { return Math.floor(elapsedMs() / 1000); }
  function remainingSec() {
    if (S.timeLimit == null) return null;
    return Math.max(0, S.timeLimit - elapsedSec());
  }

  function stopTimer() {
    if (tickHandle != null) { clearI(tickHandle); tickHandle = null; }
  }
  function startTimerIfNeeded() {
    if (S.startedAt != null || S.phase !== 'playing') return;
    S.startedAt = now();
    tickHandle = setI(tick, 1000);
  }
  function emitTick() {
    bus.emit(EV.GAME_TICK, { elapsed: elapsedSec(), remaining: remainingSec() });
  }
  function tick() {
    if (S.phase !== 'playing') return;
    emitTick();
    if (S.timeLimit != null && remainingSec() <= 0) lose('timeout');
  }

  function clearPending() {
    if (missHandle != null) { clearT(missHandle); missHandle = null; }
    if (hintHandle != null) { clearT(hintHandle); hintHandle = null; }
  }

  // --- game:new ---
  function onNew(p = {}) {
    clearPending();
    stopTimer();
    const mode = MODES.includes(p.mode) ? p.mode : 'classic';
    const themeId = p.themeId ?? S.themeId ?? manifest?.themes?.[0]?.id;
    const theme = themes.get(themeId);
    if (!theme || !theme.cards?.length) {
      console.warn(`[state] tema "${themeId}" sin cartas; no se reparte`);
      return;
    }
    let seed = p.seed;
    if (mode === 'daily') seed = dailySeed();
    else if (seed == null || seed === '') seed = randomSeed(random);

    const deck = buildDeck(theme, p.cols, p.rows, seed);
    if (deck.adjusted) console.warn(`[state] rejilla ${p.cols}x${p.rows} inválida para ${theme.cards.length} cartas; se usa ${deck.cols}x${deck.rows}`);

    S = freshState();
    S.phase = 'playing';
    S.mode = mode; S.themeId = themeId; S.seed = deck.seed;
    S.cols = deck.cols; S.rows = deck.rows; S.pairs = deck.pairs;
    S.cards = deck.cards;
    S.faceUp = new Array(deck.cards.length).fill(false);
    S.matched = new Array(deck.cards.length).fill(false);
    S.hintsLeft = deck.pairs >= RULES.bigGridPairs ? 2 : 1;
    S.timeLimit = timeLimitFor(mode, deck.pairs);
    S.easterEgg = theme.easterEgg ?? null;

    bus.emit(EV.GAME_DEALT, {
      cards: deck.cards, seed: deck.seed,
      mode, themeId, cols: deck.cols, rows: deck.rows, pairs: deck.pairs,
      hints: S.hintsLeft, timeLimit: S.timeLimit,
    });
    emitTick();
  }

  // --- card:pick ---
  function onPick(p = {}) {
    const i = Number(p.index);
    if (S.phase !== 'playing' || S.locked) return;
    if (!Number.isInteger(i) || i < 0 || i >= S.cards.length) return;
    if (S.matched[i] || S.faceUp[i] || S.open.includes(i)) return;

    startTimerIfNeeded();
    S.faceUp[i] = true;
    S.open.push(i);
    bus.emit(EV.CARD_FLIP, { index: i, faceUp: true });

    if (S.open.length < 2) return;
    const [a, b] = S.open;
    S.moves += 1;
    if (S.cards[a].pairKey === S.cards[b].pairKey) resolveMatch(a, b);
    else resolveMiss(a, b);
  }

  function resolveMatch(a, b) {
    S.open = [];
    S.matched[a] = S.matched[b] = true;
    S.matchedPairs += 1;
    S.streak += 1;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    const mult = comboMultiplier(S.streak);
    const gained = S.mode === 'zen' ? 0 : Math.round(RULES.basePerPair * mult);
    S.score += gained;
    const pairKey = S.cards[a].pairKey;
    const payload = { indices: [a, b], pairKey, streak: S.streak, score: S.score, multiplier: mult, gained, matchedPairs: S.matchedPairs, pairs: S.pairs };
    if (S.easterEgg && S.easterEgg.match === pairKey) payload.easterEgg = S.easterEgg.sfx;
    bus.emit(EV.PAIR_MATCH, payload);
    if (S.matchedPairs >= S.pairs) win();
  }

  function resolveMiss(a, b) {
    S.streak = 0;
    S.locked = true;
    bus.emit(EV.PAIR_MISS, { indices: [a, b], moves: S.moves });
    missHandle = setT(() => {
      missHandle = null;
      if (S.phase === 'idle') return;
      for (const i of [a, b]) {
        if (S.matched[i]) continue;
        S.faceUp[i] = false;
        bus.emit(EV.CARD_FLIP, { index: i, faceUp: false });
      }
      S.open = [];
      S.locked = false;
    }, RULES.missDelayMs);
  }

  // --- pista ---
  function onHint() {
    if (S.phase !== 'playing' || S.locked || S.hintsLeft <= 0 || S.open.length > 0) return;
    startTimerIfNeeded();
    S.hintsLeft -= 1;
    S.hintsUsed += 1;
    if (S.mode !== 'zen') S.score = Math.max(0, S.score - RULES.hintPenalty);
    S.locked = true;
    bus.emit(EV.HINT_USED, { remaining: S.hintsLeft, score: S.score, duration: RULES.hintRevealMs });
    hintHandle = setT(() => { hintHandle = null; S.locked = false; }, RULES.hintRevealMs);
  }

  // --- pausa ---
  function onPause() {
    if (S.phase !== 'playing') return;
    S.phase = 'paused';
    if (S.startedAt != null) {
      S.accumulatedMs += now() - S.startedAt;
      S.startedAt = null;
      S.pausedForTimer = true;
    }
    stopTimer();
  }
  function onResume() {
    if (S.phase !== 'paused') return;
    S.phase = 'playing';
    if (S.pausedForTimer) {
      S.pausedForTimer = false;
      S.startedAt = now();
      tickHandle = setI(tick, 1000);
      emitTick();
    }
  }

  // --- fin ---
  function finishTimer() {
    if (S.startedAt != null) { S.accumulatedMs += now() - S.startedAt; S.startedAt = null; }
    stopTimer();
  }

  function win() {
    finishTimer();
    clearPending();
    S.phase = 'won';
    const elapsed = elapsedSec();
    const remaining = remainingSec();
    const bonus = S.mode === 'zen' ? 0 : timeBonus(S.mode, elapsed, remaining, S.pairs);
    S.score += bonus;
    const stars = starsFor(S.moves, S.pairs);
    const key = recordKey(S.themeId, S.cols, S.rows, S.mode);
    const rec = updateRecord(storage, key, { time: elapsed, moves: S.moves, score: S.score }, now());
    bus.emit(EV.GAME_WIN, {
      elapsed, moves: S.moves, score: S.score, stars,
      isRecord: rec.isRecord, records: rec.entry, improved: rec.improved, recordKey: key,
      timeBonus: bonus, bestStreak: S.bestStreak, hintsUsed: S.hintsUsed,
      mode: S.mode, themeId: S.themeId, cols: S.cols, rows: S.rows, pairs: S.pairs, seed: S.seed,
    });
  }

  function lose(reason) {
    finishTimer();
    clearPending();
    S.phase = 'lost';
    S.locked = true;
    bus.emit(EV.GAME_LOSE, { reason, elapsed: elapsedSec(), moves: S.moves, score: S.score, matchedPairs: S.matchedPairs, pairs: S.pairs });
  }

  function onThemeReady(p = {}) {
    if (p.theme?.id) themes.set(p.theme.id, p.theme);
  }

  function onSettings() { /* la partida en curso no cambia; la UI emite game:new si corresponde */ }

  // --- cableado ---
  offs.push(bus.on(EV.GAME_NEW, onNew));
  offs.push(bus.on(EV.CARD_PICK, onPick));
  offs.push(bus.on(EV.GAME_PAUSE, onPause));
  offs.push(bus.on(EV.GAME_RESUME, onResume));
  offs.push(bus.on(EV.SETTINGS_CHANGED, onSettings));
  offs.push(bus.on(EV.THEME_READY, onThemeReady));
  // Fuera de contrato (propuesto en el hallazgo): la UI pide una pista con `hint:request`.
  offs.push(bus.on('hint:request', onHint));

  return {
    getState: () => ({ ...S, cards: S.cards.slice(), faceUp: S.faceUp.slice(), matched: S.matched.slice(), open: S.open.slice() }),
    records: () => loadRecords(storage),
    hint: onHint,
    destroy() {
      clearPending(); stopTimer();
      for (const off of offs) off();
    },
  };
}

let instance = null;

/** Punto de entrada para src/main.js. */
export function init(ctx) {
  instance?.destroy();
  let storage;
  try { storage = globalThis.localStorage; storage.getItem(RECORDS_KEY); } catch { storage = memoryStorage(); }
  instance = createGame({ bus: ctx.bus, EV: ctx.EV, manifest: ctx.manifest, storage: storage ?? memoryStorage() });
  return instance;
}

export function getGame() { return instance; }
