// node --test tests/  — cubre barajado con semilla, match/miss, puntaje, win y récord.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bus, EV } from '../src/core/bus.js';
import {
  createGame, buildDeck, mulberry32, hashSeed, shuffle, dailySeed, resolveGrid,
  comboMultiplier, starsFor, timeBonus, recordKey, memoryStorage, loadRecords, RULES, RECORDS_KEY,
} from '../src/core/state.js';

const theme = {
  id: 'plantas',
  easterEgg: { match: 'michi', sfx: 'cat_purr' },
  cards: Array.from({ length: 20 }, (_, i) => ({ id: i === 3 ? 'michi' : `c${i}` })),
};
const manifest = { themes: [theme] };

/** Reloj falso: timers ordenados por tiempo, avanzables con tick(ms). */
function fakeClock() {
  let t = 0; let id = 0; const timers = new Map();
  const add = (fn, ms, repeat) => { id += 1; timers.set(id, { fn, at: t + ms, ms, repeat }); return id; };
  return {
    now: () => t,
    setTimeout: (fn, ms) => add(fn, ms, false),
    setInterval: (fn, ms) => add(fn, ms, true),
    clearTimeout: (h) => timers.delete(h),
    clearInterval: (h) => timers.delete(h),
    tick(ms) {
      const end = t + ms;
      for (;;) {
        let next = null;
        for (const [k, tm] of timers) if (tm.at <= end && (!next || tm.at < next[1].at)) next = [k, tm];
        if (!next) break;
        const [k, tm] = next;
        t = tm.at;
        if (tm.repeat) tm.at += tm.ms; else timers.delete(k);
        tm.fn();
      }
      t = end;
    },
  };
}

function setup(opts = {}) {
  const clock = fakeClock();
  const storage = memoryStorage();
  const events = [];
  const offs = Object.values(EV).map((e) => bus.on(e, (p) => events.push([e, p])));
  const game = createGame({ bus, EV, manifest, storage, random: () => 0.5, ...clock, ...opts });
  const of = (name) => events.filter(([e]) => e === name).map(([, p]) => p);
  const last = (name) => of(name).at(-1);
  const teardown = () => { game.destroy(); offs.forEach((f) => f()); };
  return { clock, storage, events, game, of, last, teardown };
}

/** Juega perfecto: encuentra pares por pairKey con el mazo del último game:dealt. */
function solve(ctx, { untilPairs = Infinity, missFirst = false } = {}) {
  const st = ctx.game.getState();
  const byKey = new Map();
  for (const c of st.cards) {
    if (st.matched[c.index]) continue;
    if (!byKey.has(c.pairKey)) byKey.set(c.pairKey, []);
    byKey.get(c.pairKey).push(c.index);
  }
  const pairs = [...byKey.values()];
  if (missFirst) {
    bus.emit(EV.CARD_PICK, { index: pairs[0][0] });
    bus.emit(EV.CARD_PICK, { index: pairs[1][0] });
    ctx.clock.tick(RULES.missDelayMs + 1);
  }
  let n = 0;
  for (const [a, b] of pairs) {
    if (n >= untilPairs) break;
    bus.emit(EV.CARD_PICK, { index: a });
    bus.emit(EV.CARD_PICK, { index: b });
    n += 1;
  }
}

test('mulberry32 y hashSeed son deterministas', () => {
  const a = mulberry32(hashSeed('2026-09-16')); const b = mulberry32(hashSeed('2026-09-16'));
  const sa = [a(), a(), a()]; const sb = [b(), b(), b()];
  assert.deepEqual(sa, sb);
  assert.ok(sa.every((v) => v >= 0 && v < 1));
  assert.notEqual(hashSeed('a'), hashSeed('b'));
  assert.equal(hashSeed(42), 42);
});

test('shuffle no muta y buildDeck es reproducible por semilla', () => {
  const src = [1, 2, 3, 4, 5];
  const out = shuffle(src, mulberry32(7));
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), src);

  const d1 = buildDeck(theme, 4, 4, 'semilla');
  const d2 = buildDeck(theme, 4, 4, 'semilla');
  const d3 = buildDeck(theme, 4, 4, 'otra');
  assert.deepEqual(d1.cards, d2.cards);
  assert.notDeepEqual(d1.cards.map((c) => c.id), d3.cards.map((c) => c.id));
  assert.equal(d1.cards.length, 16);
  assert.equal(d1.pairs, 8);
  const counts = {};
  for (const c of d1.cards) counts[c.pairKey] = (counts[c.pairKey] || 0) + 1;
  assert.ok(Object.values(counts).every((n) => n === 2), 'cada pairKey aparece exactamente 2 veces');
  d1.cards.forEach((c, i) => assert.equal(c.index, i));
});

test('resolveGrid valida contra la cantidad de cartas', () => {
  assert.deepEqual(resolveGrid(4, 4, 20), { cols: 4, rows: 4, pairs: 8, adjusted: false });
  assert.equal(resolveGrid(6, 6, 20).adjusted, false);          // 18 pares ≤ 20 cartas → válido
  assert.equal(resolveGrid(6, 6, 20).pairs, 18);
  const small = resolveGrid(6, 6, 10);                           // solo caben 10 pares → 4x4 (8)
  assert.deepEqual([small.cols, small.rows, small.adjusted], [4, 4, true]);
  assert.equal(resolveGrid(3, 3, 20).adjusted, true);            // impar
  assert.throws(() => resolveGrid(4, 4, 2));
  assert.match(dailySeed(new Date(2026, 8, 16)), /^2026-09-16$/);
});

test('puntaje: combos, estrellas y bonus de tiempo', () => {
  assert.equal(comboMultiplier(1), 1);
  assert.equal(comboMultiplier(2), 1.5);
  assert.equal(comboMultiplier(4), 2);
  assert.equal(comboMultiplier(6), 3);
  assert.equal(comboMultiplier(9), 3);
  assert.equal(starsFor(10, 8), 3);
  assert.equal(starsFor(16, 8), 2);
  assert.equal(starsFor(17, 8), 1);
  assert.equal(timeBonus('zen', 10, null, 8), 0);
  assert.equal(timeBonus('classic', 30, null, 8), (80 - 30) * 5);
  assert.equal(timeBonus('classic', 500, null, 8), 0);
  assert.equal(timeBonus('timed', 30, 40, 8), 400);
  assert.equal(recordKey('plantas', 4, 4, 'classic'), 'plantas:4x4:classic');
});

test('game:new reparte con la rejilla pedida y emite tick inicial', () => {
  const c = setup();
  bus.emit(EV.GAME_NEW, { mode: 'classic', cols: 4, rows: 3, themeId: 'plantas', seed: 'abc' });
  const dealt = c.last(EV.GAME_DEALT);
  assert.equal(dealt.cards.length, 12);
  assert.equal(dealt.seed, 'abc');
  assert.equal(dealt.cols, 4); assert.equal(dealt.rows, 3);
  assert.equal(dealt.hints, 1);
  assert.deepEqual(c.last(EV.GAME_TICK), { elapsed: 0, remaining: null });
  const st = c.game.getState();
  assert.equal(st.phase, 'playing');
  c.teardown();
});

test('modo daily usa la fecha como semilla; timed calcula límite y 2 pistas en rejilla grande', () => {
  const c = setup();
  bus.emit(EV.GAME_NEW, { mode: 'daily', cols: 4, rows: 4, themeId: 'plantas', seed: 'ignorada' });
  assert.equal(c.last(EV.GAME_DEALT).seed, dailySeed());
  bus.emit(EV.GAME_NEW, { mode: 'timed', cols: 6, rows: 5, themeId: 'plantas' });
  const d = c.last(EV.GAME_DEALT);
  assert.equal(d.pairs, 15);
  assert.equal(d.hints, 2);
  assert.equal(d.timeLimit, 60 + 6 * 15);
  assert.deepEqual(c.last(EV.GAME_TICK), { elapsed: 0, remaining: 150 });
  c.teardown();
});

test('match y miss: flips, bloqueo, racha, puntaje y easter egg', () => {
  const c = setup();
  bus.emit(EV.GAME_NEW, { mode: 'classic', cols: 4, rows: 4, themeId: 'plantas', seed: 's1' });
  const dealt = c.last(EV.GAME_DEALT);
  const idx = (key) => dealt.cards.filter((k) => k.pairKey === key).map((k) => k.index);
  const keys = [...new Set(dealt.cards.map((k) => k.pairKey))];
  const [k0, k1] = keys.filter((k) => k !== 'michi');

  // miss
  bus.emit(EV.CARD_PICK, { index: idx(k0)[0] });
  bus.emit(EV.CARD_PICK, { index: idx(k1)[0] });
  assert.equal(c.of(EV.CARD_FLIP).length, 2);
  assert.deepEqual(c.last(EV.PAIR_MISS).indices, [idx(k0)[0], idx(k1)[0]]);
  // selección fluida: un tercer pick cierra la pareja fallida al instante (2 flips a dorso)
  // y abre la nueva carta (1 flip) sin esperar el temporizador del fallo.
  bus.emit(EV.CARD_PICK, { index: idx(k0)[1] });
  assert.equal(c.of(EV.CARD_FLIP).length, 5);
  const downs = c.of(EV.CARD_FLIP).filter((f) => f.faceUp === false);
  assert.equal(downs.length, 2);
  assert.equal(c.game.getState().locked, false);
  assert.equal(c.game.getState().moves, 1);
  c.clock.tick(RULES.missDelayMs); // el temporizador quedó cancelado: nada cambia
  assert.equal(c.of(EV.CARD_FLIP).length, 5);

  // match simple → 100 (idx(k0)[1] sigue abierta)
  bus.emit(EV.CARD_PICK, { index: idx(k0)[1] }); // misma carta abierta: ignorada
  bus.emit(EV.CARD_PICK, { index: idx(k0)[0] });
  let m = c.last(EV.PAIR_MATCH);
  assert.equal(m.streak, 1); assert.equal(m.score, 100); assert.equal(m.pairKey, k0);
  assert.equal(m.easterEgg, undefined);

  // segundo seguido → ×1.5 → 250
  bus.emit(EV.CARD_PICK, { index: idx(k1)[0] });
  bus.emit(EV.CARD_PICK, { index: idx(k1)[1] });
  m = c.last(EV.PAIR_MATCH);
  assert.equal(m.streak, 2); assert.equal(m.multiplier, 1.5); assert.equal(m.score, 250);

  // easter egg si michi está en el mazo
  if (keys.includes('michi')) {
    bus.emit(EV.CARD_PICK, { index: idx('michi')[0] });
    bus.emit(EV.CARD_PICK, { index: idx('michi')[1] });
    assert.equal(c.last(EV.PAIR_MATCH).easterEgg, 'cat_purr');
  }
  // las cartas emparejadas no se pueden volver a elegir
  const flips = c.of(EV.CARD_FLIP).length;
  bus.emit(EV.CARD_PICK, { index: idx(k0)[0] });
  assert.equal(c.of(EV.CARD_FLIP).length, flips);
  c.teardown();
});

test('pista: penaliza, bloquea 1.2 s y se agota', () => {
  const c = setup();
  bus.emit(EV.GAME_NEW, { mode: 'classic', cols: 4, rows: 4, themeId: 'plantas', seed: 'h' });
  solve(c, { untilPairs: 2 });
  assert.equal(c.game.getState().score, 250);
  bus.emit('hint:request');
  assert.deepEqual(c.last(EV.HINT_USED).remaining, 0);
  assert.equal(c.game.getState().score, 100);
  assert.equal(c.game.getState().locked, true);
  c.clock.tick(RULES.hintRevealMs);
  assert.equal(c.game.getState().locked, false);
  bus.emit('hint:request');
  assert.equal(c.of(EV.HINT_USED).length, 1);
  c.teardown();
});

test('timer 1 Hz, pausa y reanudación; timed pierde por timeout', () => {
  const c = setup();
  bus.emit(EV.GAME_NEW, { mode: 'timed', cols: 3, rows: 2, themeId: 'plantas', seed: 't' });
  assert.equal(c.last(EV.GAME_DEALT).timeLimit, 78);
  c.clock.tick(5000);
  assert.equal(c.of(EV.GAME_TICK).length, 1, 'el reloj arranca con el primer pick');
  bus.emit(EV.CARD_PICK, { index: 0 });
  c.clock.tick(3000);
  assert.deepEqual(c.last(EV.GAME_TICK), { elapsed: 3, remaining: 75 });
  bus.emit(EV.GAME_PAUSE);
  c.clock.tick(10000);
  assert.deepEqual(c.last(EV.GAME_TICK), { elapsed: 3, remaining: 75 });
  assert.equal(c.game.getState().phase, 'paused');
  bus.emit(EV.CARD_PICK, { index: 1 });
  assert.equal(c.of(EV.CARD_FLIP).length, 1, 'en pausa no se voltea');
  bus.emit(EV.GAME_RESUME);
  c.clock.tick(2000);
  assert.deepEqual(c.last(EV.GAME_TICK), { elapsed: 5, remaining: 73 });
  c.clock.tick(80000);
  const lose = c.last(EV.GAME_LOSE);
  assert.equal(lose.reason, 'timeout');
  assert.equal(c.game.getState().phase, 'lost');
  c.teardown();
});

test('win: estrellas, bonus, récord persistido y segunda partida sin récord', () => {
  const c = setup();
  bus.emit(EV.GAME_NEW, { mode: 'classic', cols: 4, rows: 3, themeId: 'plantas', seed: 'w' });
  bus.emit(EV.CARD_PICK, { index: 0 });   // arranca el reloj
  c.clock.tick(RULES.missDelayMs + 1);    // (nada pendiente; solo avanza el tiempo)
  // Deshacer el pick suelto: elegir su pareja resolvería… mejor resolver todo con solve tras conocer estado.
  const st = c.game.getState();
  const openIdx = st.open[0];
  const pairIdx = st.cards.find((k) => k.pairKey === st.cards[openIdx].pairKey && k.index !== openIdx).index;
  bus.emit(EV.CARD_PICK, { index: pairIdx });
  c.clock.tick(20000);
  solve(c);
  const w = c.last(EV.GAME_WIN);
  assert.ok(w, 'emite game:win');
  assert.equal(w.moves, 6);
  assert.equal(w.stars, 3);
  assert.equal(w.elapsed, 21);
  // 6 pares seguidos: 100 + 150 + 150 + 200 + 200 + 300 = 1100 ; bonus clásico (60-21)*5 = 195
  assert.equal(w.timeBonus, 195);
  assert.equal(w.score, 1100 + 195);
  assert.equal(w.isRecord, true);
  assert.deepEqual(w.improved, ['time', 'moves', 'score']);
  assert.equal(w.recordKey, 'plantas:4x3:classic');
  const stored = loadRecords(c.storage)['plantas:4x3:classic'];
  assert.equal(stored.bestTime, 21); assert.equal(stored.bestMoves, 6); assert.equal(stored.bestScore, 1295); assert.equal(stored.plays, 1);
  assert.ok(c.storage.getItem(RECORDS_KEY).includes('plantas:4x3:classic'));

  // segunda partida igual pero más lenta y con un fallo → no es récord
  bus.emit(EV.GAME_NEW, { mode: 'classic', cols: 4, rows: 3, themeId: 'plantas', seed: 'w' });
  bus.emit(EV.CARD_PICK, { index: 0 });
  const s2 = c.game.getState();
  const p2 = s2.cards.find((k) => k.pairKey === s2.cards[0].pairKey && k.index !== 0).index;
  bus.emit(EV.CARD_PICK, { index: p2 });
  c.clock.tick(60000);
  solve(c, { missFirst: true });
  const w2 = c.last(EV.GAME_WIN);
  assert.equal(w2.isRecord, false);
  assert.equal(w2.moves, 7);
  assert.equal(loadRecords(c.storage)['plantas:4x3:classic'].plays, 2);
  assert.equal(loadRecords(c.storage)['plantas:4x3:classic'].bestMoves, 6);
  // zen no puntúa
  bus.emit(EV.GAME_NEW, { mode: 'zen', cols: 3, rows: 2, themeId: 'plantas', seed: 'z' });
  solve(c);
  assert.equal(c.last(EV.GAME_WIN).score, 0);
  c.teardown();
});
