// Input: raycaster con pointerdown/pointerup (tolerancia de arrastre 8 px), hover en escritorio.
import * as THREE from 'three';

const DRAG_TOLERANCE = 8;

export function createInput({ canvas, camera, bus, EV, getPickables, onHover, onPointer }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  let down = null;
  let last = null;      // última posición del puntero (px)
  let moved = false;
  let hovered = -1;

  function toNdc(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    return ndc;
  }

  function hitIndex(x, y) {
    const list = getPickables();
    if (!list.length) return -1;
    raycaster.setFromCamera(toNdc(x, y), camera);
    const hits = raycaster.intersectObjects(list, false);
    return hits.length ? hits[0].object.userData.index : -1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now() };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    down = null;
    if (Math.hypot(dx, dy) > DRAG_TOLERANCE) return;
    const index = hitIndex(e.clientX, e.clientY);
    if (index >= 0) bus.emit(EV.CARD_PICK, { index, source: 'scene' });
  });

  canvas.addEventListener('pointercancel', () => { down = null; });

  canvas.addEventListener('pointermove', (e) => {
    last = { x: e.clientX, y: e.clientY };
    moved = true;
    const r = canvas.getBoundingClientRect();
    onPointer?.(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  }, { passive: true });

  canvas.addEventListener('pointerleave', () => {
    last = null; moved = true;
  });

  return {
    /** Llamar una vez por frame: resuelve hover solo si el puntero se movió. */
    update() {
      if (!fine || !moved) return;
      moved = false;
      const index = last ? hitIndex(last.x, last.y) : -1;
      if (index !== hovered) {
        hovered = index;
        canvas.style.cursor = index >= 0 ? 'pointer' : '';
        onHover?.(index);
      }
    },
    refreshHover() { moved = true; },
  };
}
