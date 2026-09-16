// Punto de entrada de la UI (ui-6). main.js llama init({ bus, EV, settings, manifest }).
// Monta: layout, toast, sesión, ajustes, HUD, récords, victoria/derrota, teclado, i18n y audio unlock.
import { initI18n, setLang, t } from '../i18n/index.js';
import { assetUrl } from './dom.js';
import { initLayout } from './layout.js';
import { initToast } from './toast.js';
import { trackSession } from './session.js';
import { initSettingsPanel } from './settings-panel.js';
import { initHud, EV_HINT_REQUEST } from './hud.js';
import { initRecords } from './records.js';
import { initWinDialog } from './win-dialog.js';
import { initKeyboard } from './keyboard.js';

export { EV_HINT_REQUEST };

export async function init(ctx) {
  const { bus, EV, settings } = ctx;
  await initI18n(settings.get('lang'));

  const ui = { ...ctx, t, assetUrl, toast: () => {}, layout: null, openSettings: null };
  ui.toast = initToast();
  ui.layout = initLayout(ui);
  trackSession(ui);
  applyMotion(settings);

  const panel = initSettingsPanel(ui);
  ui.openSettings = panel.open;
  const hud = initHud(ui);
  const records = initRecords(ui);
  const win = initWinDialog(ui);
  const keyboard = initKeyboard(ui);

  // Islas ultrawide: izquierda = marcadores (los mueve hud.js) + récords; derecha = ajustes rápidos.
  const left = document.getElementById('hud-left');
  const right = document.getElementById('hud-right');
  if (left && records) left.append(records.el);
  if (right) panel.mountQuick(right);
  ui.layout.onChange((kind) => {
    const ultra = kind === 'ultrawide';
    if (left) left.hidden = !ultra;
    if (right) right.hidden = !ultra;
  });

  bus.on(EV.SETTINGS_CHANGED, ({ key, all }) => {
    if (key === 'lang' || key === '*') setLang(all.lang).then(() => { if (key === 'lang') ui.toast(t('toast.langChanged')); });
    if (key === 'reducedMotion' || key === '*') applyMotion(settings);
  });

  initAudioUnlock(bus, EV);

  return { ui, hud, panel, records, win, keyboard };
}

function applyMotion(settings) {
  const v = settings.get('reducedMotion');
  const html = document.documentElement;
  if (v === 'on') html.dataset.motion = 'reduce';
  else if (v === 'off') html.dataset.motion = 'full';
  else delete html.dataset.motion;
}

// Primer gesto del usuario: desbloquea el audio (política de autoplay). Tolerante a que audio-4
// aún no exista: prueba window.__audio.unlock y luego el módulo ../audio/engine.js.
function initAudioUnlock(bus, EV) {
  let done = false;
  const unlock = async () => {
    if (done) return; done = true;
    removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true);
    try {
      if (typeof window.__audio?.unlock === 'function') { await window.__audio.unlock(); return; }
      const mod = await import('../audio/engine.js');
      const a = mod.audio ?? mod.default;
      if (typeof a?.unlock === 'function') await a.unlock();
    } catch { /* audio-4 no integrado todavía */ }
  };
  addEventListener('pointerdown', unlock, { capture: true, passive: true });
  addEventListener('keydown', unlock, { capture: true, passive: true });
  bus.on(EV.AUDIO_UNLOCKED, () => { done = true; });
}
