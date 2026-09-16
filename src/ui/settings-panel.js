// Panel de ajustes (dialog#settings-dialog, showModal) + ajustes rápidos para la isla ultrawide.
// Cada control persiste al instante con settings.set(k, v) (→ settings:changed). Tema/rejilla/modo
// se aplican con "Aplicar y nueva partida" (theme:load si cambió el tema, luego game:new).
import { h, icon, clear, assetUrl, debounce, esc } from './dom.js';
import { t, onLangChange, themeName, LANGS } from '../i18n/index.js';
import { session, onSession, newGame, GRIDS, MODES } from './session.js';

const TABS = ['theme', 'game', 'sound', 'look', 'more'];
const DITHERS = ['none', 'bayer', 'floyd'];
const RMS = ['auto', 'on', 'off'];

export function initSettingsPanel(ui) {
  const { bus, EV, settings, manifest, toast } = ui;
  const dlg = document.getElementById('settings-dialog');
  const themes = Array.isArray(manifest?.themes) ? manifest.themes : [];
  const controls = new Set();          // instancias { sync(), relabel() }
  let pixelMod = null;                 // ../pixel/pixelator.js si existe
  let palettes = null;                 // [{ id, name, colors[] }]

  const themeById = (id) => themes.find((th) => th.id === id);
  const cardsOf = (id) => themeById(id)?.cards?.length ?? 0;
  const gridFits = (cols, rows, themeId = settings.get('themeId')) => cols * rows <= cardsOf(themeId) * 2;
  const register = (c) => { controls.add(c); c.sync?.(); return c.el; };
  const syncAll = () => controls.forEach((c) => c.sync?.());
  const relabelAll = () => controls.forEach((c) => { c.relabel?.(); c.sync?.(); });

  function pendingGameChange() {
    const s = settings.all;
    return s.themeId !== session.themeId || s.cols !== session.cols || s.rows !== session.rows || s.mode !== session.mode;
  }
  function applyGame() {
    const themeChanged = settings.get('themeId') !== session.themeId;
    newGame(ui, { themeChanged });
    toast(t('toast.newGame'));
    if (dlg.open) dlg.close();
  }

  // ---------- constructores de controles ----------------------------------------------------
  function radioChips({ cls, options, get, set, render, isDisabled = () => false, ariaLabel }) {
    const el = h('div', { class: `chips ${cls}`, role: 'radiogroup' });
    const build = () => {
      clear(el);
      for (const opt of options()) {
        const btn = h('button', { type: 'button', class: 'chip', role: 'radio', data: { value: opt.value }, aria: { checked: 'false' }, onclick: () => set(opt.value) });
        render(btn, opt);
        el.append(btn);
      }
    };
    build();
    return {
      el,
      relabel() { el.setAttribute('aria-label', ariaLabel()); build(); },
      sync() {
        const cur = String(get());
        for (const btn of el.children) {
          const v = btn.dataset.value;
          btn.setAttribute('aria-checked', String(v === cur));
          btn.classList.toggle('is-active', v === cur);
          const dis = isDisabled(v);
          btn.disabled = dis;
          btn.classList.toggle('is-disabled', dis);
        }
      },
    };
  }

  function themeGroup({ compact = false } = {}) {
    return radioChips({
      cls: `theme-chips ${compact ? 'compact' : ''}`,
      ariaLabel: () => t('settings.theme'),
      options: () => themes.map((th) => ({ value: th.id, theme: th })),
      get: () => settings.get('themeId'),
      set: (id) => {
        if (cardsOf(id) === 0) { toast(t('toast.themeSoon')); return; }
        settings.set('themeId', id);
        // Si la rejilla actual no cabe en el tema, baja a la mayor que quepa.
        const { cols, rows } = settings.all;
        if (!gridFits(cols, rows, id)) {
          const fit = [...GRIDS].reverse().find(([c, r]) => gridFits(c, r, id)) ?? GRIDS[0];
          settings.set('cols', fit[0]); settings.set('rows', fit[1]);
        }
      },
      isDisabled: (id) => cardsOf(id) === 0,
      render(btn, { theme }) {
        const first = theme.cards?.[0];
        btn.classList.add('theme-chip');
        const thumb = first?.src
          ? h('img', { class: 'theme-thumb', src: assetUrl(first.src), alt: '', decoding: 'async', width: 48, height: 48 })
          : h('span', { class: 'theme-thumb placeholder', aria: { hidden: 'true' } }, icon('theme', { size: 20 }));
        const soon = (theme.cards?.length ?? 0) === 0;
        btn.append(thumb, h('span', { class: 'chip-text' },
          h('span', { class: 'chip-name' }, themeName(theme)),
          h('small', { class: 'chip-sub' }, soon ? t('settings.soon') : t('settings.cards', { n: theme.cards.length }))));
        if (soon) btn.title = t('settings.soon');
      },
    });
  }

  function gridGroup() {
    return radioChips({
      cls: 'grid-chips',
      ariaLabel: () => t('settings.grid'),
      options: () => GRIDS.map(([c, r]) => ({ value: `${c}x${r}`, cols: c, rows: r })),
      get: () => `${settings.get('cols')}x${settings.get('rows')}`,
      set: (v) => { const [c, r] = v.split('x').map(Number); settings.set('cols', c); settings.set('rows', r); },
      isDisabled: (v) => { const [c, r] = v.split('x').map(Number); return !gridFits(c, r); },
      render(btn, { cols, rows }) {
        btn.classList.add('grid-chip');
        btn.append(h('span', { class: 'chip-name' }, `${cols}×${rows}`), h('small', { class: 'chip-sub' }, t('settings.gridPairs', { n: (cols * rows) / 2 })));
        if (!gridFits(cols, rows)) btn.title = t('settings.gridTooBig');
      },
    });
  }

  function modeGroup({ compact = false } = {}) {
    return radioChips({
      cls: `mode-chips ${compact ? 'compact' : ''}`,
      ariaLabel: () => t('settings.mode'),
      options: () => MODES.map((m) => ({ value: m })),
      get: () => settings.get('mode'),
      set: (m) => settings.set('mode', m),
      render(btn, { value }) {
        btn.classList.add('mode-chip');
        btn.append(h('span', { class: 'chip-name' }, t(`mode.${value}`)));
        if (!compact) btn.append(h('small', { class: 'chip-sub' }, t(`mode.${value}.desc`)));
      },
    });
  }

  function segmented(key, values, labelFn, { onSet } = {}) {
    return radioChips({
      cls: `segmented seg-${key}`,
      ariaLabel: () => t(`settings.${key}`),
      options: () => values.map((v) => ({ value: v })),
      get: () => settings.get(key),
      set: (v) => { settings.set(key, v); onSet?.(v); },
      render(btn, { value }) { btn.append(h('span', { class: 'chip-name' }, labelFn(value))); },
    });
  }

  function sliderRow(key, labelKey, { min = 0, max = 1, step = 0.05, fmt = (v) => `${Math.round(v * 100)}%`, onInput } = {}) {
    const id = `set-${key}`;
    const label = h('label', { for: id, class: 'row-label' });
    const out = h('output', { for: id, class: 'row-value' });
    const input = h('input', { type: 'range', id, min, max, step, class: 'slider' });
    input.addEventListener('input', () => { const v = Number(input.value); out.value = fmt(v); settings.set(key, step >= 1 ? Math.round(v) : Math.round(v * 100) / 100); onInput?.(v); });
    const el = h('div', { class: 'row row-slider' }, h('div', { class: 'row-head' }, label, out), input);
    return { el, relabel() { label.textContent = t(labelKey); }, sync() { const v = Number(settings.get(key)); input.value = v; out.value = fmt(v); } };
  }

  function toggleRow(key, labelKey) {
    const id = `set-${key}`;
    const label = h('span', { id: `${id}-label`, class: 'row-label' });
    const state = h('span', { class: 'switch-state', aria: { hidden: 'true' } });
    const btn = h('button', { type: 'button', id, class: 'switch', role: 'switch', aria: { checked: 'false', labelledby: `${id}-label` }, onclick: () => settings.set(key, !settings.get(key)) }, h('span', { class: 'switch-knob' }));
    const el = h('div', { class: 'row row-toggle' }, label, h('div', { class: 'row-end' }, state, btn));
    return {
      el, relabel() { label.textContent = t(labelKey); },
      sync() { const on = !!settings.get(key); btn.setAttribute('aria-checked', String(on)); btn.classList.toggle('is-on', on); state.textContent = on ? t('common.on') : t('common.off'); },
    };
  }

  function applyBar() {
    const hint = h('p', { class: 'apply-hint' });
    const btn = h('button', { type: 'button', class: 'btn primary', onclick: applyGame }, icon('new', { size: 18 }), h('span'));
    const el = h('div', { class: 'apply-bar', hidden: true }, hint, btn);
    return { el, relabel() { hint.textContent = t('settings.applyHint'); btn.lastChild.textContent = t('settings.apply'); }, sync() { el.hidden = !pendingGameChange(); } };
  }

  // ---------- sección imagen: pixelado, paleta, dithering -----------------------------------
  function pixelSection() {
    const canvas = h('canvas', { class: 'pixel-preview', width: 160, height: 160, aria: { hidden: 'true' } });
    const previewLabel = h('span', { class: 'preview-label' });
    const preview = h('figure', { class: 'preview' }, canvas, h('figcaption', {}, previewLabel));
    const slider = sliderRow('pixelScale', 'settings.pixelScale', { min: 0, max: 100, step: 1, fmt: (v) => String(Math.round(v)), onInput: () => renderPreview() });
    const paletteLabel = h('h4', { class: 'row-label' });
    const paletteChips = radioChips({
      cls: 'palette-chips',
      ariaLabel: () => t('settings.palette'),
      options: () => (palettes ?? [{ id: 'original', colors: [] }]).map((p) => ({ value: p.id, palette: p })),
      get: () => settings.get('palette'),
      set: (v) => { settings.set('palette', v); renderPreview(); },
      render(btn, { palette }) {
        btn.classList.add('palette-chip');
        const sw = h('span', { class: 'swatches', aria: { hidden: 'true' } });
        if (palette.id === 'original' || !palette.colors?.length) sw.classList.add('original');
        else for (const c of palette.colors.slice(0, 8)) sw.append(h('i', { style: { background: c } }));
        btn.append(sw, h('span', { class: 'chip-name' }, palette.id === 'original' ? t('settings.paletteOriginal') : (palette.name ?? palette.id)));
      },
    });
    const ditherLabel = h('h4', { class: 'row-label' });
    const dither = segmented('dither', DITHERS, (v) => t(`settings.dither.${v}`), { onSet: () => renderPreview() });

    const el = h('div', { class: 'pixel-section' },
      h('div', { class: 'pixel-top' }, preview, slider.el),
      paletteLabel, register(paletteChips), ditherLabel, register(dither));

    let img = null, imgSrc = '';
    const g = canvas.getContext('2d');
    const renderPreview = debounce(async () => {
      try {
        const th = themeById(settings.get('themeId')) ?? themes.find((x) => x.cards?.length);
        const src = th?.cards?.[0]?.src ? assetUrl(th.cards[0].src) : '';
        if (!src) return;
        if (src !== imgSrc) { img = await loadImage(src); imgSrc = src; }
        const opts = { pixelScale: Number(settings.get('pixelScale')), palette: settings.get('palette'), dither: settings.get('dither'), size: 256 };
        let out = null;
        const fn = pixelMod?.pixelate ?? window.__pixelate;
        if (typeof fn === 'function') { try { out = fn(img, opts); } catch (e) { console.warn('[ui/settings] pixelate', e); } }
        if (!out) out = fallbackPixelate(img, opts.pixelScale);
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.drawImage(out, 0, 0, canvas.width, canvas.height);
      } catch (e) { console.warn('[ui/settings] preview', e?.message ?? e); }
    }, 60);

    return {
      el, renderPreview,
      relabel() { previewLabel.textContent = t('settings.preview'); paletteLabel.textContent = t('settings.palette'); ditherLabel.textContent = t('settings.dither'); slider.relabel(); },
      sync() { slider.sync(); },
      setPalettes() { paletteChips.relabel(); paletteChips.sync(); },
    };
  }

  // Previsualización sin pixelator: reducción a bloques + ampliación con NearestFilter.
  function fallbackPixelate(image, scale) {
    const size = 256;
    const cells = Math.max(6, Math.round(size - (Math.min(100, Math.max(0, scale)) / 100) * (size - 12)));
    const small = document.createElement('canvas'); small.width = small.height = cells;
    const sg = small.getContext('2d'); sg.imageSmoothingEnabled = true;
    const s = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const sx = ((image.naturalWidth || image.width) - s) / 2, sy = ((image.naturalHeight || image.height) - s) / 2;
    sg.drawImage(image, sx, sy, s, s, 0, 0, cells, cells);
    return small;
  }
  const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error(`img ${src}`)); im.src = src; });

  async function loadPalettes() {
    const norm = (list) => {
      const out = [{ id: 'original', name: t('settings.paletteOriginal'), colors: [] }];
      if (Array.isArray(list)) for (const p of list) { if (p && p.id && p.id !== 'original') out.push({ id: String(p.id), name: p.name ?? p.id, colors: p.colors ?? p.palette ?? [] }); }
      else if (list && typeof list === 'object') for (const [id, v] of Object.entries(list)) { if (id !== 'original') out.push({ id, name: v?.name ?? id, colors: Array.isArray(v) ? v : (v?.colors ?? []) }); }
      return out;
    };
    try {
      pixelMod = await import('../pixel/pixelator.js');
      const list = typeof pixelMod.listPalettes === 'function' ? await pixelMod.listPalettes() : (pixelMod.PALETTES ?? null);
      if (list) { palettes = norm(list); return; }
    } catch { /* pixel-3 aún no está integrado: se usa el manifiesto */ }
    palettes = norm(manifest?.palettes ?? {});
  }

  // ---------- diálogo ----------------------------------------------------------------------
  const title = h('h2', { id: 'settings-title', class: 'dlg-title' });
  const closeBtn = h('button', { type: 'button', class: 'icon-btn dlg-close', onclick: () => dlg.close() }, icon('close'));
  const tablist = h('div', { class: 'tabs', role: 'tablist' });
  const panels = h('div', { class: 'tabpanels' });
  const tabBtns = {}, tabPanels = {};
  for (const id of TABS) {
    tabBtns[id] = h('button', { type: 'button', role: 'tab', id: `tab-${id}`, class: 'tab', aria: { selected: 'false', controls: `panel-${id}` }, tabindex: -1, onclick: () => selectTab(id) });
    tabPanels[id] = h('section', { role: 'tabpanel', id: `panel-${id}`, class: 'tabpanel', aria: { labelledby: `tab-${id}` }, hidden: true, tabindex: 0 });
    tablist.append(tabBtns[id]); panels.append(tabPanels[id]);
  }
  tablist.addEventListener('keydown', (e) => {
    const i = TABS.indexOf(activeTab);
    if (e.key === 'ArrowRight') selectTab(TABS[(i + 1) % TABS.length], true);
    else if (e.key === 'ArrowLeft') selectTab(TABS[(i - 1 + TABS.length) % TABS.length], true);
    else return;
    e.preventDefault();
  });
  let activeTab = 'theme';
  function selectTab(id, focus = false) {
    activeTab = TABS.includes(id) ? id : 'theme';
    for (const k of TABS) {
      const on = k === activeTab;
      tabBtns[k].setAttribute('aria-selected', String(on)); tabBtns[k].tabIndex = on ? 0 : -1; tabBtns[k].classList.toggle('is-active', on);
      tabPanels[k].hidden = !on;
    }
    if (focus) tabBtns[activeTab].focus();
    if (activeTab === 'look') pixel.renderPreview();
  }

  const secTitle = (key) => { const el = h('h3', { class: 'sec-title' }); controls.add({ relabel: () => { el.textContent = t(key); } }); return el; };

  // Tema
  tabPanels.theme.append(secTitle('settings.theme'), register(themeGroup()), register(applyBar()));
  // Partida
  tabPanels.game.append(secTitle('settings.grid'), register(gridGroup()), secTitle('settings.mode'), register(modeGroup()), register(applyBar()));
  // Sonido
  tabPanels.sound.append(register(toggleRow('ambientOn', 'settings.ambientOn')), register(sliderRow('ambientVolume', 'settings.ambientVolume')), register(sliderRow('sfxVolume', 'settings.sfxVolume')));
  // Imagen
  const pixel = pixelSection(); controls.add(pixel); tabPanels.look.append(pixel.el);
  // Más
  const langSeg = segmented('lang', LANGS, (v) => ({ es: 'Español', en: 'English' }[v] ?? v));
  const rmSeg = segmented('reducedMotion', RMS, (v) => t(`settings.rm.${v}`));
  const resetBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { settings.reset(); toast(t('settings.resetDone')); } });
  controls.add({ relabel: () => { resetBtn.textContent = t('settings.reset'); } });
  tabPanels.more.append(secTitle('settings.lang'), register(langSeg), secTitle('settings.reducedMotion'), register(rmSeg), h('div', { class: 'row row-actions' }, resetBtn));

  const form = h('form', { method: 'dialog', class: 'dlg settings' },
    h('header', { class: 'dlg-head' }, title, closeBtn),
    tablist, panels);
  clear(dlg); dlg.append(form);
  dlg.setAttribute('aria-labelledby', 'settings-title');
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // backdrop
  controls.add({ relabel: () => { title.textContent = t('settings.title'); closeBtn.setAttribute('aria-label', t('settings.close')); for (const id of TABS) tabBtns[id].textContent = t(`settings.tab.${id}`); } });

  function open(tab = activeTab) {
    selectTab(tab);
    if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); } }
    if (tab === 'look') pixel.renderPreview();
  }

  // ---------- ajustes rápidos (isla derecha, ultrawide) --------------------------------------
  function mountQuick(container) {
    if (!container) return;
    const qTitle = h('h3', { class: 'island-title' });
    const allBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => open('theme') }, icon('settings', { size: 18 }), h('span'));
    controls.add({ relabel: () => { qTitle.textContent = t('settings.quick'); allBtn.lastChild.textContent = t('settings.title'); } });
    container.append(h('section', { class: 'island-block quick-settings' },
      qTitle, register(themeGroup({ compact: true })), register(gridGroup()), register(modeGroup({ compact: true })),
      register(applyBar()), allBtn));
    relabelAll();
  }

  // ---------- sincronía ---------------------------------------------------------------------
  bus.on(EV.SETTINGS_CHANGED, ({ key }) => { syncAll(); if (['pixelScale', 'palette', 'dither', 'themeId', '*'].includes(key) && dlg.open) pixel.renderPreview(); });
  onSession((evt) => { if (evt === 'new' || evt === 'dealt') syncAll(); });
  onLangChange(relabelAll);
  relabelAll();
  selectTab('theme');
  loadPalettes().then(() => { pixel.setPalettes(); });

  return { el: dlg, open, mountQuick, close: () => dlg.close() };
}
