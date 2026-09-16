// Pantalla de victoria (game:win) y derrota (game:lose, contrarreloj) en dialog#win-dialog.
import { h, icon, clear, fmtTime, prefersReducedMotion } from './dom.js';
import { t, themeName, onLangChange } from '../i18n/index.js';
import { session, newGame } from './session.js';
import { recordKey, getRecord, renderRecords } from './records.js';

export function initWinDialog(ui) {
  const { bus, EV, settings, manifest, toast } = ui;
  const dlg = document.getElementById('win-dialog');
  if (!dlg) return null;
  dlg.setAttribute('aria-labelledby', 'win-title');
  let current = null;     // { kind: 'win'|'lose', payload }

  const themeLabel = () => themeName(manifest?.themes?.find((th) => th.id === session.themeId)) || session.themeId;
  const gridLabel = () => `${session.cols}×${session.rows}`;

  function shareText(p) {
    const stars = '⭐'.repeat(Math.max(0, Math.min(3, p.stars ?? 0)));
    const daily = session.mode === 'daily' && session.seed ? ` · #${session.seed}` : '';
    return `🌿 ${t('app.title')} · ${themeLabel()} ${gridLabel()} · ⏱ ${fmtTime(p.elapsed ?? session.elapsed)} · 🔁 ${p.moves ?? session.moves} · ${stars}${daily}`.trim();
  }

  async function share(p) {
    const text = shareText(p);
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e?.name === 'AbortError') return; }
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = h('textarea', { class: 'sr-only', readonly: true }, text);
        document.body.append(ta); ta.select(); document.execCommand?.('copy'); ta.remove();
      }
      toast(t('win.shared'));
    } catch { toast(t('win.shareFail')); }
  }

  function starsEl(n) {
    const reduced = prefersReducedMotion(settings);
    const wrap = h('div', { class: `stars ${reduced ? 'no-anim' : ''}`, role: 'img', aria: { label: t('win.stars', { n }) } });
    for (let i = 0; i < 3; i++) wrap.append(h('span', { class: `star ${i < n ? 'on' : ''}`, style: { '--i': i } }, icon('star', { size: 40, filled: true })));
    return wrap;
  }

  function statEl(label, value, cls = '') {
    return h('div', { class: `win-stat ${cls}` }, h('span', { class: 'win-stat-label' }, label), h('span', { class: 'win-stat-value' }, String(value)));
  }

  function renderWin(p) {
    const key = recordKey(session);
    const rec = getRecord(key, p.records);
    const hl = [];
    if (p.isRecord) {
      if (typeof p.isRecord === 'object') { if (p.isRecord.time) hl.push('time'); if (p.isRecord.moves) hl.push('moves'); if (p.isRecord.score) hl.push('score'); }
      else if (rec) { if (rec.bestTime === p.elapsed) hl.push('time'); if (rec.bestMoves === p.moves) hl.push('moves'); if (rec.bestScore === p.score) hl.push('score'); }
    }
    const zen = session.mode === 'zen';
    const stars = Math.max(0, Math.min(3, Number(p.stars) || 0));
    const body = h('div', { class: 'dlg win' },
      h('header', { class: 'dlg-head center' },
        h('h2', { id: 'win-title', class: 'dlg-title display' }, t('win.title')),
        h('p', { class: 'dlg-sub' }, t('win.subtitle', { theme: themeLabel(), grid: gridLabel(), mode: t(`mode.${session.mode}`) }))),
      starsEl(stars),
      p.isRecord ? h('p', { class: 'new-record' }, icon('star', { size: 16, filled: true }), t('win.newRecord')) : null,
      h('div', { class: 'win-stats' },
        statEl(t('win.time'), fmtTime(p.elapsed ?? session.elapsed)),
        statEl(t('win.moves'), p.moves ?? session.moves),
        zen ? null : statEl(t('win.score'), p.score ?? session.score, 'score')),
      h('section', { class: 'win-records', aria: { label: t('records.title') } },
        h('h3', { class: 'sec-title' }, t('records.title')),
        renderRecords(key, { record: rec, highlight: hl, compact: true })),
      h('footer', { class: 'dlg-actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => { dlg.close(); newGame(ui); } }, icon('new', { size: 18 }), h('span', {}, t('win.again'))),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { dlg.close(); ui.openSettings?.('theme'); } }, icon('theme', { size: 18 }), h('span', {}, t('win.changeTheme'))),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => share(p) }, icon('share', { size: 18 }), h('span', {}, t('win.share')))),
      h('button', { type: 'button', class: 'icon-btn dlg-close', aria: { label: t('win.close') }, onclick: () => dlg.close() }, icon('close')));
    return body;
  }

  function renderLose(p) {
    const seed = session.seed;
    return h('div', { class: 'dlg lose' },
      h('header', { class: 'dlg-head center' },
        h('h2', { id: 'win-title', class: 'dlg-title display' }, t('lose.title')),
        h('p', { class: 'dlg-sub' }, t('lose.body'))),
      h('div', { class: 'win-stats' },
        statEl(t('win.moves'), session.moves),
        statEl(t('hud.pairs'), `${session.pairs}/${session.totalPairs}`)),
      h('footer', { class: 'dlg-actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => { dlg.close(); newGame(ui, { seed }); } }, icon('new', { size: 18 }), h('span', {}, t('lose.retry'))),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { dlg.close(); newGame(ui); } }, h('span', {}, t('lose.new')))),
      h('button', { type: 'button', class: 'icon-btn dlg-close', aria: { label: t('win.close') }, onclick: () => dlg.close() }, icon('close')));
  }

  function show(kind, payload) {
    current = { kind, payload };
    clear(dlg);
    dlg.dataset.kind = kind;
    dlg.append(kind === 'win' ? renderWin(payload) : renderLose(payload));
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); } }
  }

  // Ligero retraso para dejar terminar la animación de la última ficha (§2.2, 900 ms).
  // Espera a que termine la salida del último match (giro + zoom-out ≈ 1150 ms) antes de abrir.
  const delay = () => (prefersReducedMotion(settings) ? 350 : 1600);
  bus.on(EV.GAME_WIN, (p) => setTimeout(() => show('win', p), delay()));
  bus.on(EV.GAME_LOSE, (p) => setTimeout(() => show('lose', p), 200));
  bus.on(EV.GAME_NEW, () => { if (dlg.open) dlg.close(); current = null; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  onLangChange(() => { if (dlg.open && current) show(current.kind, current.payload); });

  return { el: dlg, show };
}
