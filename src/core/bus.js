// Bus de eventos mínimo. Contrato en doc/v2/PROPUESTA_V2.md §7.1.
// Todos los módulos se comunican SOLO por acá; nadie importa a otro módulo de feature directamente.

const listeners = new Map();

export const bus = {
  on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => bus.off(evt, fn);
  },
  once(evt, fn) {
    const off = bus.on(evt, (p) => { off(); fn(p); });
    return off;
  },
  off(evt, fn) {
    listeners.get(evt)?.delete(fn);
  },
  emit(evt, payload = {}) {
    const set = listeners.get(evt);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); }
      catch (err) { console.error(`[bus] error en listener de "${evt}"`, err); }
    }
  },
};

// Nombres canónicos para evitar typos entre módulos.
export const EV = Object.freeze({
  SETTINGS_CHANGED: 'settings:changed',
  THEME_LOAD: 'theme:load',
  THEME_READY: 'theme:ready',
  GAME_NEW: 'game:new',
  GAME_DEALT: 'game:dealt',
  CARD_PICK: 'card:pick',
  CARD_FLIP: 'card:flip',
  PAIR_MATCH: 'pair:match',
  PAIR_MISS: 'pair:miss',
  HINT_USED: 'hint:used',
  GAME_TICK: 'game:tick',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_WIN: 'game:win',
  GAME_LOSE: 'game:lose',
  AUDIO_UNLOCKED: 'audio:unlocked',
  LAYOUT_CHANGED: 'layout:changed',
});
