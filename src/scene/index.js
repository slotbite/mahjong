// Escena Three.js de Memorice Cozy (core-1). Punto de entrada: init(ctx).
import * as THREE from 'three';
import { createRenderer, applyRendererLayout } from './renderer.js';
import { computeLayout, pixelRatioFor, CAMERA_TILT } from './layout.js';
import { createEnvironment } from './environment.js';
import { createRain } from './rain.js';
import { createCards } from './cards.js';
import { createInput } from './input.js';
import { createThemeLoader } from './themes.js';
import { updateTweens } from './anim.js';

const CAM_DIST = 40;
const RESIZE_DEBOUNCE = 120;

export function init(ctx) {
  const { bus, EV, settings, manifest } = ctx;
  const canvas = document.getElementById('scene');
  if (!canvas) throw new Error('falta <canvas id="scene">');

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  scene.add(camera);

  // Movimiento reducido: media query o ajuste explícito.
  const rmQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function isReducedMotion() {
    const s = settings?.get?.('reducedMotion') ?? 'auto';
    if (s === 'on') return true;
    // 'auto' y 'off' = animación completa. Decisión del dueño (2026-09-16): su sistema reporta
    // prefers-reduced-motion y el juego perdía giros y efectos sin que lo pidiera; el modo
    // reducido queda como elección explícita en Ajustes.
    void rmQuery;
    return false;
  }

  const view = {
    w: 1, h: 1, dpr: 1, kind: 'desktop', cols: 4, rows: 4,
    unitPx: 80, halfW: 1, halfH: 1, boardW: 0, boardH: 0, rect: { x: 0, y: 0, width: 0, height: 0 },
    target: new THREE.Vector3(),
    screenToWorld(px, py) {
      return {
        x: view.target.x + (px - view.w / 2) / view.unitPx,
        y: view.target.y - (py - view.h / 2) / (view.unitPx * Math.cos(CAMERA_TILT)),
      };
    },
  };

  const cards = createCards({ scene, bus, EV, isReducedMotion });
  const env = createEnvironment({ scene, camera, renderer, manifest, glassMaterial: cards.baseGlass, settings, bus, EV });
  const rain = createRain({ scene });
  const themes = createThemeLoader({ bus, EV, settings, manifest });
  const input = createInput({
    canvas, camera, bus, EV,
    getPickables: () => cards.pickables(),
    onHover: (i) => cards.setHover(i),
    onPointer: (nx, ny) => {
      env.setPointer(nx, ny);
      // Rayo de la cámara por el puntero, intersectado con el plano del tablero (z = 0).
      const a = new THREE.Vector3(nx, ny, -1).unproject(camera);
      const b = new THREE.Vector3(nx, ny, 1).unproject(camera);
      const dir = b.sub(a);
      const tHit = Math.abs(dir.z) > 1e-6 ? -a.z / dir.z : 0;
      const hit = a.add(dir.multiplyScalar(tHit));
      cards.setPointer(nx, ny, hit);
    },
  });

  function applyLayout(emit = true) {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const L = computeLayout(w, h, view.cols, view.rows);
    const dpr = pixelRatioFor(w, window.devicePixelRatio || 1);
    Object.assign(view, { w, h, dpr, kind: L.kind, unitPx: L.unitPx, boardW: L.boardW, boardH: L.boardH, rect: L.rect });
    view.halfW = w / (2 * L.unitPx);
    view.halfH = h / (2 * L.unitPx);

    applyRendererLayout(renderer, view);

    // Cámara ortográfica inclinada 10° mirando al objetivo (el tablero está en el origen).
    view.target.set(-L.offsetPx.dx / L.unitPx, L.offsetPx.dy / (L.unitPx * Math.cos(CAMERA_TILT)), 0);
    camera.left = -view.halfW; camera.right = view.halfW; camera.top = view.halfH; camera.bottom = -view.halfH;
    camera.position.set(view.target.x, view.target.y + CAM_DIST * Math.sin(CAMERA_TILT), CAM_DIST * Math.cos(CAMERA_TILT));
    camera.lookAt(view.target);
    camera.updateProjectionMatrix();

    env.layout(view);
    rain.layout(view);
    input.refreshHover();

    if (emit) bus.emit(EV.LAYOUT_CHANGED, { kind: L.kind, w, h, dpr, cardPx: L.cardPx, board: L.rect, cols: view.cols, rows: view.rows });
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => applyLayout(true), RESIZE_DEBOUNCE);
  });
  rmQuery?.addEventListener?.('change', () => { /* la próxima animación consulta isReducedMotion() */ });

  // --- eventos del juego ---
  bus.on(EV.THEME_READY, (p) => cards.setTheme(p));
  bus.on(EV.GAME_DEALT, (p) => {
    view.cols = p.cols; view.rows = p.rows;
    applyLayout(true);
    rain.setIntensity(1, 1500);
    cards.deal(p);
  });
  bus.on(EV.CARD_FLIP, ({ index, faceUp }) => cards.flip(index, faceUp));
  bus.on(EV.CARD_PICK, ({ index }) => cards.press(index));
  bus.on(EV.PAIR_MATCH, ({ indices }) => cards.match(indices));
  bus.on(EV.PAIR_MISS, ({ indices }) => cards.miss(indices));
  bus.on(EV.HINT_USED, ({ duration }) => cards.hint(duration ?? 1200));
  bus.on(EV.GAME_WIN, () => { cards.celebrate(); rain.setIntensity(1.7, 4000); });
  bus.on(EV.GAME_LOSE, () => cards.dim());

  // --- bucle ---
  let lastT = performance.now();
  let elapsed = 0;
  const frameTimes = [];
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    elapsed += dt;
    updateTweens(dt);
    cards.update(dt, elapsed);
    rain.update(dt);
    env.update(dt, elapsed);
    input.update();
    renderer.render(scene, camera);
    frameTimes.push(dt); if (frameTimes.length > 120) frameTimes.shift();
  });

  applyLayout(true);

  // Depuración / medición (no forma parte del contrato).
  globalThis.__memoriceScene = {
    renderer, scene, camera, view, cards, rain, env, themes,
    fps() { const s = frameTimes.reduce((a, b) => a + b, 0); return frameTimes.length ? frameTimes.length / s : 0; },
    drawCalls() { return renderer.info.render.calls; },
  };

  return globalThis.__memoriceScene;
}
