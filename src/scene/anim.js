// Tweens mínimos sin librerías. Easing "cozy" ≈ cubic-bezier(.45,.05,.2,1).

export const ease = {
  linear: (t) => t,
  // Aproximación suave de cubic-bezier(.45,.05,.2,1): arranque perezoso, frenada larga.
  cozy: (t) => {
    const a = t * t * (3 - 2 * t);           // smoothstep
    const b = 1 - Math.pow(1 - t, 3);        // easeOutCubic
    return a * (1 - t) + b * t;
  },
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  // Caída con rebote mínimo (overshoot ≈ 3 %).
  drop: (t) => {
    const s = 0.7;
    const u = t - 1;
    return 1 + u * u * ((s + 1) * u + s);
  },
};

const active = new Set();

/**
 * tween({ dur, delay, ease, onUpdate(k, t), onDone }) — k es el progreso con easing, t el lineal.
 * Devuelve un handle con cancel().
 */
export function tween(opts) {
  const h = {
    t: -(opts.delay || 0) / 1000,
    dur: Math.max(0.0001, (opts.dur ?? 300) / 1000),
    ease: opts.ease || ease.cozy,
    onUpdate: opts.onUpdate || (() => {}),
    onDone: opts.onDone || null,
    done: false,
    cancel() { h.done = true; active.delete(h); },
  };
  if (opts.dur === 0) {
    // Instantáneo: aplica el estado final en el próximo update para respetar el delay 0.
    h.dur = 0.0001;
  }
  active.add(h);
  return h;
}

/** Avanza todos los tweens. dt en segundos. */
export function updateTweens(dt) {
  for (const h of [...active]) {
    if (h.done) continue;
    h.t += dt;
    if (h.t < 0) continue;
    const lin = Math.min(1, h.t / h.dur);
    h.onUpdate(h.ease(lin), lin);
    if (lin >= 1) {
      h.done = true;
      active.delete(h);
      h.onDone?.();
    }
  }
}

export function activeTweens() { return active.size; }

export function delay(ms, fn) {
  return tween({ dur: 0, delay: ms, onDone: fn });
}
