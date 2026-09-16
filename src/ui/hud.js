// HUD: marcadores en vivo + acciones. Vive en #hud (móvil: barra inferior; tablet/escritorio: barra
// superior) y se traslada a #hud-left en ultrawide. Emite game:new / game:pause / game:resume /
// hint:request (propuesta de adición al contrato §7.1).
import { h, icon, fmtTime, tweenNumber, prefersReducedMotion, clear } from './dom.js';
import { t, onLangChange } from '../i18n/index.js';
import { session, onSession, newGame, comboMultiplier } from './session.js';

export const EV_HINT_REQUEST = 'hint:request';

export function initHud(ui) {
  const { bus, EV, settings, toast, layout } = ui;
  const hud = document.getElementById('hud');
  if (!hud) return null;
  // El header trae aria-live en index.html; el tiempo cambia cada segundo y saturaría al lector.
  // Se anuncia solo lo relevante (pares, racha, puntaje) con aria-live puntual.
  hud.setAttribute('aria-live', 'off');
  hud.setAttribute('role', 'region');

  // ---- marcadores -------------------------------------------------------------------------
  const mkStat = (id, live) => {
    const label = h('span', { class: 'stat-label' });
    const value = h('span', { class: 'stat-value', aria: live ? { live: 'polite', atomic: 'true' } : undefined }, '—');
    const el = h('div', { class: `stat stat-${id}`, data: { stat: id } }, label, value);
    return { el, label, value };
  };
  const stTime = mkStat('time');
  const stMoves = mkStat('moves');
  const stPairs = mkStat('pairs', true);
  const stStreak = mkStat('streak', true);
  const combo = h('span', { class: 'combo-badge', hidden: true });
  stStreak.el.append(combo);
  const stScore = mkStat('score', true);
  const stats = h('div', { class: 'hud-stats', role: 'group' }, stTime.el, stMoves.el, stPairs.el, stStreak.el, stScore.el);
  const pausedTag = h('div', { class: 'hud-paused', hidden: true, role: 'status' });

  // ---- acciones ---------------------------------------------------------------------------
  const mkBtn = (id, name, onclick, extra = {}) => h('button', { type: 'button', class: `icon-btn act-${id}`, data: { act: id }, onclick, ...extra }, icon(name));
  const hintBadge = h('span', { class: 'badge', aria: { hidden: 'true' } }, '1');
  const bHint = mkBtn('hint', 'hint', () => {
    if (session.hints <= 0 || session.over || !session.dealt) { toast(t('toast.hintNone')); return; }
    bus.emit(EV_HINT_REQUEST, {});
  });
  bHint.append(hintBadge);
  const bPause = mkBtn('pause', 'pause', () => {
    if (!session.dealt || session.over) return;
    bus.emit(session.paused ? EV.GAME_RESUME : EV.GAME_PAUSE, { reason: 'user' });
  }, { aria: { pressed: 'false' } });
  const bSound = mkBtn('sound', 'soundOn', () => settings.set('ambientOn', !settings.get('ambientOn')), { aria: { pressed: 'true' } });
  const bSettings = mkBtn('settings', 'settings', () => ui.openSettings?.());
  const bNew = mkBtn('new', 'new', () => { newGame(ui); toast(t('toast.newGame')); });
  const actions = h('div', { class: 'hud-actions', role: 'group' }, bHint, bPause, bSound, bSettings, bNew);

  hud.append(stats, pausedTag, actions);

  // Botón flotante de ajustes (tablet, §5). Creado por JS para no tocar index.html.
  const fab = h('button', { type: 'button', id: 'settings-fab', class: 'glass icon-btn', hidden: true, onclick: () => ui.openSettings?.() }, icon('settings', { size: 26 }));
  document.getElementById('ui-root')?.append(fab);

  // ---- render -----------------------------------------------------------------------------
  let shownScore = 0, cancelTween = () => {};
  const reduced = () => prefersReducedMotion(settings);

  function renderLabels() {
    stTime.label.textContent = session.mode === 'timed' ? t('hud.timeLeft') : t('hud.time');
    stMoves.label.textContent = t('hud.moves');
    stPairs.label.textContent = t('hud.pairs');
    stStreak.label.textContent = t('hud.streak');
    stScore.label.textContent = t('hud.score');
    stats.setAttribute('aria-label', t('a11y.scoreboard'));
    actions.setAttribute('aria-label', t('a11y.actions'));
    pausedTag.textContent = t('hud.paused');
    bSettings.setAttribute('aria-label', t('hud.settings'));
    bSettings.title = t('hud.settings');
    fab.setAttribute('aria-label', t('hud.settings'));
    bNew.setAttribute('aria-label', t('hud.new'));
    bNew.title = t('hud.new');
    renderHint(); renderPause(); renderSound();
  }

  function renderTime() {
    const timed = session.mode === 'timed';
    const val = timed && session.remaining != null ? session.remaining : session.elapsed;
    stTime.value.textContent = fmtTime(val);
    stTime.el.classList.toggle('warn', timed && session.remaining != null && session.remaining < 10 && !session.over);
    stTime.el.setAttribute('aria-label', `${timed ? t('hud.timeLeft') : t('hud.time')} ${fmtTime(val)}`);
  }

  function renderCounters() {
    stMoves.value.textContent = String(session.moves);
    stPairs.value.textContent = `${session.pairs}/${session.totalPairs || Math.floor(session.cols * session.rows / 2)}`;
    stStreak.value.textContent = String(session.streak);
    const x = comboMultiplier(session.streak);
    combo.hidden = x <= 1;
    combo.textContent = x > 1 ? `×${x}` : '';
    combo.setAttribute('aria-label', t('hud.combo', { x }));
    if (x > 1) { combo.classList.remove('pop'); void combo.offsetWidth; combo.classList.add('pop'); }
  }

  function renderScore() {
    cancelTween();
    cancelTween = tweenNumber(stScore.value, shownScore, session.score, { ms: 300, reduced: reduced() });
    shownScore = session.score;
  }

  function renderHint() {
    const n = session.hints;
    hintBadge.textContent = String(n);
    hintBadge.hidden = n <= 0;
    bHint.disabled = n <= 0 || session.over || !session.dealt;
    const label = n > 0 ? t('hud.hintLeft', { n }) : t('hud.hintNone');
    bHint.setAttribute('aria-label', label); bHint.title = label;
  }

  function renderPause() {
    const p = session.paused;
    clear(bPause); bPause.append(icon(p ? 'play' : 'pause'));
    bPause.setAttribute('aria-pressed', String(p));
    bPause.setAttribute('aria-label', p ? t('hud.resume') : t('hud.pause'));
    bPause.title = p ? t('hud.resume') : t('hud.pause');
    bPause.disabled = !session.dealt || session.over;
    pausedTag.hidden = !p;
    hud.classList.toggle('is-paused', p);
  }

  function renderSound() {
    const on = !!settings.get('ambientOn');
    clear(bSound); bSound.append(icon(on ? 'soundOn' : 'soundOff'));
    bSound.setAttribute('aria-pressed', String(on));
    bSound.setAttribute('aria-label', on ? t('hud.soundOn') : t('hud.soundOff'));
    bSound.title = on ? t('hud.soundOn') : t('hud.soundOff');
  }

  function renderMode() {
    hud.dataset.mode = session.mode;
    const zen = session.mode === 'zen';
    stScore.el.hidden = zen; stStreak.el.hidden = zen; stTime.el.hidden = zen;
    renderTime();
  }

  function renderAll() { renderLabels(); renderMode(); renderCounters(); shownScore = session.score; stScore.value.textContent = String(session.score); }
  renderAll();

  // ---- eventos ----------------------------------------------------------------------------
  onSession((evt, p) => {
    switch (evt) {
      case 'new': case 'dealt': renderAll(); renderHint(); renderPause(); break;
      case 'tick': renderTime(); break;
      case 'match': renderCounters(); renderScore(); break;
      case 'miss': renderCounters(); break;
      case 'hint': renderHint(); break;
      case 'pause': renderPause(); toast(t('toast.paused'), { ms: 1400 }); break;
      case 'resume': renderPause(); break;
      case 'win': case 'lose': renderTime(); renderCounters(); renderScore(); renderHint(); renderPause(); break;
    }
  });
  bus.on(EV.SETTINGS_CHANGED, ({ key }) => { if (key === 'ambientOn' || key === '*') renderSound(); });
  onLangChange(renderLabels);

  // ---- colocación por layout ---------------------------------------------------------------
  const left = document.getElementById('hud-left');
  layout.onChange((kind) => {
    const ultra = kind === 'ultrawide';
    if (ultra && left) {
      let slot = left.querySelector('.island-hud-slot');
      if (!slot) { slot = h('div', { class: 'island-hud-slot' }); left.prepend(slot); }
      slot.append(stats, pausedTag, actions);
    } else {
      hud.append(stats, pausedTag, actions);
    }
    fab.hidden = kind !== 'tablet';
  });

  return { el: hud, renderAll };
}
