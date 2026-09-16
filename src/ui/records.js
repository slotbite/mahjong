// Récords locales (§7.2): localStorage["memorice.v2.records"], clave "<themeId>:<cols>x<rows>:<mode>".
// core-1 escribe; la UI solo lee y muestra. `game:win.records` tiene prioridad si viene en el payload.
import { h, clear, fmtTime } from './dom.js';
import { t, onLangChange } from '../i18n/index.js';
import { session, onSession } from './session.js';

const KEY = 'memorice.v2.records';

export function recordKey({ themeId, cols, rows, mode } = session) { return `${themeId}:${cols}x${rows}:${mode}`; }

export function loadRecords() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function getRecord(key, fromPayload) {
  if (fromPayload && typeof fromPayload === 'object') {
    // Puede venir el mapa completo o solo la entrada de la clave actual.
    if (fromPayload[key]) return fromPayload[key];
    if ('bestTime' in fromPayload || 'bestMoves' in fromPayload || 'bestScore' in fromPayload) return fromPayload;
  }
  return loadRecords()[key] ?? null;
}

// Tabla compacta de récords para una clave. `highlight` marca qué fila es nueva ('time'|'moves'|'score').
export function renderRecords(key, { record = getRecord(key), highlight = [], compact = false } = {}) {
  const wrap = h('div', { class: `records ${compact ? 'compact' : ''}` });
  if (!record) {
    wrap.append(h('p', { class: 'records-empty' }, t('records.empty')));
    return wrap;
  }
  const rows = [
    ['time', t('records.bestTime'), record.bestTime != null ? fmtTime(record.bestTime) : '—'],
    ['moves', t('records.bestMoves'), record.bestMoves ?? '—'],
    ['score', t('records.bestScore'), record.bestScore ?? '—'],
    ['plays', t('records.plays'), record.plays ?? '—'],
  ];
  const table = h('table', { class: 'records-table' },
    h('tbody', {}, rows.map(([id, label, val]) =>
      h('tr', { class: highlight.includes(id) ? 'is-new' : '' },
        h('th', { scope: 'row' }, label),
        h('td', {}, String(val))))));
  wrap.append(table);
  return wrap;
}

// Isla de récords para ultrawide (#hud-left). Se refresca al repartir, ganar y cambiar idioma.
export function initRecords() {
  const box = h('section', { class: 'island-block records-block', aria: { labelledby: 'records-title' } });
  const title = h('h3', { id: 'records-title', class: 'island-title' }, t('records.title'));
  const body = h('div', { class: 'records-body' });
  box.append(title, body);

  function refresh() {
    title.textContent = t('records.title');
    const key = recordKey();
    clear(body);
    body.append(h('p', { class: 'records-key' }, `${session.cols}×${session.rows} · ${t(`mode.${session.mode}`)}`));
    body.append(renderRecords(key, { compact: true }));
  }
  refresh();
  onSession((evt) => { if (evt === 'new' || evt === 'dealt' || evt === 'win') refresh(); });
  onLangChange(refresh);
  return { el: box, refresh };
}
