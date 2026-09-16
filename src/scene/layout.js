// Layouts §5: clasificación de viewport y área útil del tablero. Puro, sin DOM ni Three.

export const CARD_PITCH = 1.14;        // 1 unidad de ficha + 0.14 de separación
export const ULTRAWIDE_MAX_PX = 1600;  // ancho máximo del tablero en 32:9
export const CAMERA_TILT = (10 * Math.PI) / 180;

/** mobile | tablet | desktop | ultrawide. Ultrawide si w/h ≥ 2.3. */
export function classify(w, h) {
  if (w / h >= 2.3) return 'ultrawide';
  if (Math.min(w, h) < 640) return 'mobile';
  if (w < 1280) return 'tablet';
  return 'desktop';
}

/** DPR: min(devicePixelRatio, 1.5); 1.0 si el ancho CSS supera 3000 px. */
export function pixelRatioFor(w, dpr = 1) {
  if (w > 3000) return 1;
  return Math.min(dpr || 1, 1.5);
}

/**
 * Área útil del tablero en px CSS según el tipo de layout (deja espacio al HUD):
 *  - mobile: 22 % inferior libre (bottom sheet), gutter 16.
 *  - tablet/desktop: 12 % superior libre (barra), gutter 24/32.
 *  - ultrawide: 12 % superior, ancho ≤ 1600 px centrado; laterales para islas/plantas.
 */
export function boardArea(w, h, kind) {
  let top, bottom, gutter, maxW = Infinity;
  switch (kind) {
    case 'mobile':    top = 0.06 * h; bottom = 0.22 * h; gutter = 16; break;
    case 'tablet':    top = 0.12 * h; bottom = 0.05 * h; gutter = 24; break;
    case 'desktop':   top = 0.12 * h; bottom = 0.05 * h; gutter = 32; maxW = 1100; break;
    case 'ultrawide': top = 0.12 * h; bottom = 0.06 * h; gutter = 48; maxW = ULTRAWIDE_MAX_PX; break;
    default:          top = 0.12 * h; bottom = 0.05 * h; gutter = 24;
  }
  const width = Math.min(w - gutter * 2, maxW);
  const height = h - top - bottom;
  return { x: (w - width) / 2, y: top, width, height };
}

/**
 * Calcula la escala del mundo (px CSS por unidad) y la posición del tablero.
 * Devuelve { kind, area, unitPx, cardPx, cols, rows, boardW, boardH, offsetPx:{dx,dy} }.
 */
export function computeLayout(w, h, cols, rows) {
  const kind = classify(w, h);
  const area = boardArea(w, h, kind);
  const c = Math.max(1, cols | 0), r = Math.max(1, rows | 0);
  const unitPx = Math.max(8, Math.min(area.width / (c * CARD_PITCH), area.height / (r * CARD_PITCH)));
  const boardW = c * CARD_PITCH * unitPx;
  const boardH = r * CARD_PITCH * unitPx;
  const cx = area.x + area.width / 2;
  const cy = area.y + area.height / 2;
  return {
    kind, area, unitPx, cardPx: unitPx, cols: c, rows: r, boardW, boardH,
    // Desplazamiento del centro del tablero respecto al centro de la pantalla, en px CSS.
    offsetPx: { dx: cx - w / 2, dy: cy - h / 2 },
    // Rectángulo final del tablero en px CSS (útil para la capa a11y de la UI).
    rect: { x: cx - boardW / 2, y: cy - boardH / 2, width: boardW, height: boardH },
  };
}

/** Posición de la ficha `index` en unidades de mundo, centrada en el origen del tablero. */
export function slotPosition(index, cols, rows) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = (col - (cols - 1) / 2) * CARD_PITCH;
  const y = -(row - (rows - 1) / 2) * CARD_PITCH;
  return { x, y };
}
