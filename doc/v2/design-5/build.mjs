// Memorice Cozy v2 — generador de artboards (design-5).
// Genera los *.dc.html y canvas.json a partir de un sistema visual compartido
// (tokens §2.1, ficha de vidrio §2.2, escena §2.3). Ejecutar: node build.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// ---------- tokens (styles/tokens.css) ----------
const T = {
  bgDeep: '#0f2a22', bgMid: '#1f4d3a', moss: '#6a9a5b', lime: '#b8d96a',
  cream: '#f4ead8', terracotta: '#c8744a', sky: '#8fb3c7',
  glassFill: 'rgba(255,255,255,0.14)', glassBorder: 'rgba(255,255,255,0.35)',
};

// ---------- sprites pixel art (16×16) ----------
const PAL = {
  '.': null,
  k: '#1b1b26', w: '#f4ead8', c: '#f4ead8', y: '#f4d35e', o: '#e69a4a',
  g: '#4f8a3c', G: '#3a6b2e', l: '#a8d275', L: '#b8d96a', m: '#7a4a2e', t: '#c8744a',
  p: '#5b3a6e', v: '#c96a8e', s: '#8fb3c7', S: '#5f88a1', d: '#2b2b3a', a: '#8a8fa3',
  r: '#e05a5a', b: '#3b4c8a', B: '#4a90e2', e: '#c9d1e0', n: '#d9d0c0', f: '#f9e27a',
};
const SPRITES = {
  frog: [
    '................',
    '................',
    '....gg....gg....',
    '...gkkg..gkkg...',
    '...gkkg..gkkg...',
    '..gggggggggggg..',
    '.gggggggggggggg.',
    '.gggggggggggggg.',
    '.ggllllllllllgg.',
    '..gllllllllllgg.',
    '..gggggggggggg..',
    '.gg.gggggggg.gg.',
    'gg..gg....gg..gg',
    'g...gg....gg...g',
    '....g......g....',
    '................',
  ],
  toucan: [
    '................',
    '....kkkk........',
    '...kkkkkkk......',
    '..kkskkkkkoooooo',
    '..kkkkkkkkoooooo',
    '..kkkkkkkkkooooo',
    '..kkkkwwwkk.oooo',
    '..kkkwwwwwkk....',
    '..kkkwwwwwkk....',
    '...kkkwwwkkk....',
    '...kkkkkkkk.....',
    '....kkkkkk......',
    '.....kkkk.......',
    '.....k..k.......',
    '....oo..oo......',
    '................',
  ],
  butterfly: [
    '................',
    '..p..........p..',
    '...p........p...',
    '..pppp....pppp..',
    '.pvvvvp..pvvvvp.',
    '.pvwvvpkkpvvwvp.',
    '.pvvvvpkkpvvvvp.',
    '..pvvvpkkpvvvp..',
    '...pvvpkkpvvp...',
    '..pooopkkpooop..',
    '.poooopkkpoooop.',
    '.pooowpkkpwooop.',
    '..poopkkkkpoop..',
    '...pp..kk..pp...',
    '.......kk.......',
    '................',
  ],
  mug: [
    '................',
    '.....n..n.......',
    '....n..n........',
    '.....n..n.......',
    '................',
    '..mmmmmmmmmm....',
    '..mccccccccm.mm.',
    '..mccccccccm.m.m',
    '..mttttttttm.m.m',
    '..mttttttttm.m.m',
    '..mccccccccm.mm.',
    '..mccccccccm....',
    '..mccccccccm....',
    '...mmmmmmmm.....',
    '....mmmmmm......',
    '................',
  ],
  candle: [
    '................',
    '.......ff.......',
    '......fooff.....',
    '......fooff.....',
    '.......oo.......',
    '.......kk.......',
    '.....cccccc.....',
    '.....cccccc.....',
    '.....cccccc.....',
    '.....cccccc.....',
    '.....cccccc.....',
    '.....cccccc.....',
    '....tttttttt....',
    '...tttttttttt...',
    '....tttttttt....',
    '................',
  ],
  book: [
    '................',
    '................',
    '...GGGGGGGGGG...',
    '..GGGGGGGGGGGG..',
    '..GGLLLLLLLLGG..',
    '..GGLLLLLLLLGG..',
    '..GGLGGGGGGLGG..',
    '..GGLLLLLLLLGG..',
    '..GGGGGGGGGGGG..',
    '..GGGGGGGGGGGG..',
    '..GGGGGGGGGGGG..',
    '..GGwwwwwwwwGG..',
    '..GwwwwwwwwwwG..',
    '..GGGGGGGGGGGG..',
    '................',
    '................',
  ],
  gamepad: [
    '................',
    '................',
    '................',
    '...dddddddddd...',
    '..daaaaaaaaaad..',
    '.daaakaaaaaaaad.',
    '.daakkkaaaaraad.',
    '.daaakaaaBaayad.',
    '.daaaaaaaaaraad.',
    '.daaaaaaaaaaaad.',
    '.daaaaddddaaaad.',
    '.ddddd....ddddd.',
    '..ddd......ddd..',
    '................',
    '................',
    '................',
  ],
  d20: [
    '................',
    '.......SS.......',
    '.....SSssSS.....',
    '...SSssssssSS...',
    '..SssssssssssS..',
    '..SsssSSSSsssS..',
    '..SssSwwwwSssS..',
    '..SssSwSSwSssS..',
    '..SssSwwwwSssS..',
    '..SssSSSSSSssS..',
    '..SSssssssssSS..',
    '...SSsssssssS...',
    '.....SSsssSS....',
    '.......SSS......',
    '................',
    '................',
  ],
  floppy: [
    '..bbbbbbbbbbbb..',
    '..bbeeeeeeeebb..',
    '..bbekkkkkkebb..',
    '..bbeeeeeeeebb..',
    '..bbbbbbbbbbbb..',
    '..bbbbbbbbbbbb..',
    '..bbccccccccbb..',
    '..bbccccccccbb..',
    '..bbccccccccbb..',
    '..bbccccccccbb..',
    '..bbbbbbbbbbbb..',
    '..bbbkkkkkkbbb..',
    '..bbbkkbbkkbbb..',
    '..bbbkkkkkkbbb..',
    '..bbbbbbbbbbbb..',
    '................',
  ],
  // iconografía UI (monocolor '#', acento 'o')
  eye: [
    '................',
    '................',
    '................',
    '.....######.....',
    '...##......##...',
    '..#....##....#..',
    '.#....####....#.',
    '#....##oo##....#',
    '#....##oo##....#',
    '.#....####....#.',
    '..#....##....#..',
    '...##......##...',
    '.....######.....',
    '................',
    '................',
    '................',
  ],
  pause: [
    '................',
    '................',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '...####..####...',
    '................',
    '................',
  ],
  sound: [
    '................',
    '................',
    '......##........',
    '.....###....#...',
    '....####.#...#..',
    '.#######..#..#..',
    '.#######.#.#.#..',
    '.#######.#.#.#..',
    '.#######.#.#.#..',
    '.#######.#.#.#..',
    '.#######..#..#..',
    '....####.#...#..',
    '.....###....#...',
    '......##........',
    '................',
    '................',
  ],
  gear: [
    '................',
    '......####......',
    '..##..####..##..',
    '..############..',
    '..############..',
    '.####......####.',
    '.###........###.',
    '.###........###.',
    '.###........###.',
    '.###........###.',
    '.####......####.',
    '..############..',
    '..############..',
    '..##..####..##..',
    '......####......',
    '................',
  ],
  leaf: [
    '................',
    '..........####..',
    '........######..',
    '......########..',
    '.....#########..',
    '....##########..',
    '...####.######..',
    '...###.#.#####..',
    '..####.#.####...',
    '..###.##.###....',
    '..###.#.###.....',
    '..##.##.##......',
    '..#..#.##.......',
    '....#.##........',
    '...#.##.........',
    '..#..#..........',
  ],
  star: [
    '.......##.......',
    '.......##.......',
    '......####......',
    '......####......',
    '.....######.....',
    '##############..',
    '.############...',
    '..##########....',
    '...########.....',
    '...########.....',
    '..##########....',
    '..####..####....',
    '.####....####...',
    '.##........##...',
    '................',
    '................',
  ],
  share: [
    '................',
    '..........###...',
    '..........###...',
    '..........###...',
    '........##......',
    '.......#........',
    '..###.#.........',
    '..####..........',
    '..###.#.........',
    '.......#........',
    '........##......',
    '..........###...',
    '..........###...',
    '..........###...',
    '................',
    '................',
  ],
  refresh: [
    '................',
    '.....######.....',
    '...##......##...',
    '..#..........#..',
    '..#...........#.',
    '.#.........#..#.',
    '.#.........##.#.',
    '.#.........###..',
    '.#..............',
    '.#............#.',
    '..#..........#..',
    '..#..........#..',
    '...##......##...',
    '.....######.....',
    '................',
    '................',
  ],
  close: [
    '................',
    '................',
    '..##........##..',
    '..###......###..',
    '...###....###...',
    '....###..###....',
    '.....######.....',
    '......####......',
    '......####......',
    '.....######.....',
    '....###..###....',
    '...###....###...',
    '..###......###..',
    '..##........##..',
    '................',
    '................',
  ],
  grid: [
    '................',
    '.######.######..',
    '.#....#.#....#..',
    '.#....#.#....#..',
    '.#....#.#....#..',
    '.#....#.#....#..',
    '.######.######..',
    '................',
    '.######.######..',
    '.#....#.#....#..',
    '.#....#.#....#..',
    '.#....#.#....#..',
    '.#....#.#....#..',
    '.######.######..',
    '................',
    '................',
  ],
  chevron: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '..##........##..',
    '...##......##...',
    '....##....##....',
    '.....##..##.....',
    '......####......',
    '.......##.......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  clock: [
    '................',
    '.....######.....',
    '...##......##...',
    '..#..........#..',
    '.#.....#......#.',
    '.#.....#......#.',
    '#......#.......#',
    '#......#.......#',
    '#......####....#',
    '#..............#',
    '.#............#.',
    '.#............#.',
    '..#..........#..',
    '...##......##...',
    '.....######.....',
    '................',
  ],
};
for (const [n, rows] of Object.entries(SPRITES)) {
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) throw new Error(`sprite ${n} no es 16×16`);
}

function sprite(name, size, opts = {}) {
  const rows = SPRITES[name];
  const color = opts.color ?? T.cream;
  const accent = opts.accent ?? T.lime;
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let x2 = x;
      while (x2 < 16 && row[x2] === ch) x2++;
      const fill = ch === '#' ? color : ch === 'o' ? accent : PAL[ch];
      if (!fill) throw new Error(`sprite ${name}: char ${ch}`);
      rects += `<rect x="${x}" y="${y}" width="${x2 - x}" height="1" fill="${fill}"></rect>`;
      x = x2;
    }
  });
  const cls = opts.class ? ` class="${opts.class}"` : '';
  const st = opts.style ? ` style="${opts.style}"` : '';
  return `<svg${cls}${st} viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// ---------- fondo selva + lluvia ----------
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function rain(w, h, n, seed = 7, opacity = 1) {
  const rnd = seeded(seed);
  let lines = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, len = 14 + rnd() * 26, o = 0.10 + rnd() * 0.28;
    lines += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - len * 0.18).toFixed(0)}" y2="${(y + len).toFixed(0)}" stroke="${T.sky}" stroke-opacity="${o.toFixed(2)}" stroke-width="1.2"></line>`;
  }
  return `<svg class="rain" style="opacity:${opacity}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${lines}</svg>`;
}
function leaves(w, h, seed = 3, count = 9) {
  const rnd = seeded(seed);
  let g = '';
  for (let i = 0; i < count; i++) {
    const cx = rnd() * w, cy = h * (0.45 + rnd() * 0.65), s = 0.6 + rnd() * 1.4, rot = -60 + rnd() * 120;
    const dark = rnd() > 0.5 ? '#123529' : '#17402f';
    g += `<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})"><path d="M0 0 C 40 -110, 120 -160, 210 -150 C 170 -80, 150 -10, 160 70 C 110 40, 60 60, 0 0 Z" fill="${dark}"/><path d="M0 0 C -50 -90, -130 -130, -200 -120 C -170 -60, -160 10, -150 80 C -100 40, -50 50, 0 0 Z" fill="${dark}"/></g>`;
  }
  return `<svg class="leaves" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><filter id="blur"><feGaussianBlur stdDeviation="6"></feGaussianBlur></filter></defs><g filter="url(#blur)" opacity="0.9">${g}</g></svg>`;
}
function scene(w, h, opts = {}) {
  const drops = opts.drops ?? 400;
  return `<div class="scene" aria-hidden="true">
  <div class="sky"></div>
  ${leaves(w, h, opts.seed ?? 3, opts.leafCount ?? 9)}
  <div class="fog"></div>
  <div class="warm"></div>
  ${rain(w, h, drops, (opts.seed ?? 3) + 11)}
  <div class="vignette"></div>
</div>`;
}

// ---------- CSS compartido ----------
function css(extra = '') {
  return `
    :root { --bg-deep:${T.bgDeep}; --bg-mid:${T.bgMid}; --moss:${T.moss}; --lime:${T.lime}; --cream:${T.cream}; --terracotta:${T.terracotta}; --sky-rain:${T.sky};
      --glass-fill:${T.glassFill}; --glass-border:${T.glassBorder}; --glass-blur:18px; --radius-panel:20px; --ease-cozy:cubic-bezier(.45,.05,.2,1); }
    *, *::before, *::after { box-sizing:border-box; }
    body { margin:0; background:var(--bg-deep); color:var(--cream); font-family:'Nunito', system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
    a { color:var(--lime); } a:hover { color:var(--cream); }
    .root { position:relative; overflow:hidden; background:var(--bg-deep); }
    .scene { position:absolute; inset:0; overflow:hidden; }
    .sky { position:absolute; inset:0; background:linear-gradient(180deg, #16382d 0%, var(--bg-deep) 45%, #0a1f19 100%); }
    .leaves, .rain { position:absolute; inset:0; display:block; }
    .fog { position:absolute; left:-10%; right:-10%; top:38%; height:34%; background:linear-gradient(180deg, transparent, rgba(31,77,58,.55) 50%, transparent); filter:blur(14px); }
    .warm { position:absolute; right:-10%; top:-20%; width:60%; height:60%; background:radial-gradient(closest-side, rgba(244,234,216,.10), transparent); }
    .vignette { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(6,18,14,.55) 100%); }
    .pix { image-rendering:pixelated; image-rendering:crisp-edges; }
    .display { font-family:'Pixelify Sans', 'Nunito', system-ui, sans-serif; letter-spacing:.01em; }
    .glass { background:var(--glass-fill); border:1px solid var(--glass-border); border-radius:var(--radius-panel);
      backdrop-filter:blur(var(--glass-blur)) saturate(1.2); -webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.2);
      box-shadow:0 10px 30px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.25); }
    /* ficha de vidrio */
    .tile { position:relative; width:var(--s); height:var(--s); border-radius:calc(var(--s) * .08); flex:none;
      background:linear-gradient(160deg, rgba(255,255,255,.24) 0%, rgba(255,255,255,.10) 42%, rgba(143,179,199,.18) 100%);
      border:1px solid rgba(255,255,255,.38);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 0 rgba(15,42,34,.28), inset 2px 0 0 rgba(255,255,255,.10),
        0 calc(var(--s) * .07) 0 -1px rgba(143,179,199,.22), 0 calc(var(--s) * .16) calc(var(--s) * .26) rgba(0,0,0,.42);
      backdrop-filter:blur(7px) saturate(1.25); -webkit-backdrop-filter:blur(7px) saturate(1.25);
      display:grid; place-items:center; transition:transform .6s var(--ease-cozy), box-shadow .6s var(--ease-cozy), border-color .6s var(--ease-cozy); }
    .tile::before { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
      background:linear-gradient(118deg, transparent 28%, rgba(255,255,255,.28) 44%, rgba(255,255,255,.06) 52%, transparent 62%); }
    .tile::after { content:""; position:absolute; left:14%; right:14%; top:6%; height:8%; border-radius:999px; background:linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); opacity:.8; pointer-events:none; }
    .tile > img.art { width:76%; height:76%; object-fit:contain; filter:drop-shadow(0 calc(var(--s) * .06) calc(var(--s) * .07) rgba(0,0,0,.5)); transform:translateY(calc(var(--s) * -.02)); }
    .tile.back { background:linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,.07) 50%, rgba(143,179,199,.14));
      backdrop-filter:blur(12px) saturate(1.1); -webkit-backdrop-filter:blur(12px) saturate(1.1); }
    .tile.back > img.art { width:52%; height:52%; opacity:.92; filter:drop-shadow(0 calc(var(--s) * .04) calc(var(--s) * .05) rgba(0,0,0,.45)); }
    .tile.hover { transform:translateY(calc(var(--s) * -.04)); border-color:rgba(255,255,255,.65); }
    .tile.sel { border-color:rgba(143,179,199,.95); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 0 rgba(15,42,34,.28),
      0 calc(var(--s) * .07) 0 -1px rgba(143,179,199,.3), 0 calc(var(--s) * .16) calc(var(--s) * .26) rgba(0,0,0,.42), 0 0 calc(var(--s) * .3) rgba(143,179,199,.6); }
    .tile.match { transform:translateY(calc(var(--s) * -.10)) scale(1.04); border-color:rgba(184,217,106,.95);
      background:linear-gradient(160deg, rgba(184,217,106,.30), rgba(255,255,255,.12) 45%, rgba(184,217,106,.20));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -3px 0 rgba(15,42,34,.2), 0 calc(var(--s) * .10) 0 -1px rgba(184,217,106,.3),
        0 calc(var(--s) * .26) calc(var(--s) * .34) rgba(0,0,0,.45), 0 0 calc(var(--s) * .38) rgba(184,217,106,.65), 0 0 0 2px rgba(184,217,106,.35); }
    .tile.miss { transform:rotate(8deg); border-color:rgba(200,116,74,.8);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 0 rgba(15,42,34,.28), 0 calc(var(--s) * .07) 0 -1px rgba(200,116,74,.25),
        0 calc(var(--s) * .16) calc(var(--s) * .26) rgba(0,0,0,.42), 0 0 calc(var(--s) * .26) rgba(200,116,74,.45); }
    .hole { width:var(--s); height:var(--s); border-radius:calc(var(--s) * .08); flex:none;
      background:radial-gradient(circle at 50% 58%, rgba(184,217,106,.20), rgba(184,217,106,.06) 50%, transparent 74%);
      box-shadow: inset 0 0 calc(var(--s) * .3) rgba(184,217,106,.08); }
    .board { display:grid; gap:var(--g); }
    /* HUD */
    .stat { display:flex; flex-direction:column; gap:2px; align-items:flex-start; min-width:0; }
    .stat .lbl { font-size:11px; font-weight:700; letter-spacing:.10em; text-transform:uppercase; color:rgba(244,234,216,.68); }
    .stat .val { font-family:'Pixelify Sans','Nunito',sans-serif; font-size:26px; line-height:1; color:var(--cream); white-space:nowrap; }
    .stat .lbl { white-space:nowrap; }
    .stat.lime .val { color:var(--lime); }
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:44px; min-width:44px; padding:0 14px; border-radius:14px;
      background:var(--glass-fill); border:1px solid var(--glass-border); color:var(--cream); font:700 14px/1 'Nunito', sans-serif; white-space:nowrap;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.28), 0 6px 16px rgba(0,0,0,.25); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
    .btn.icon { padding:0; width:44px; }
    .btn.primary { background:linear-gradient(160deg, #d98356, var(--terracotta)); border-color:rgba(255,255,255,.45); color:var(--bg-deep); }
    .btn.lg { height:52px; padding:0 22px; font-size:16px; border-radius:16px; }
    .brand { font-family:'Pixelify Sans','Nunito',sans-serif; font-size:22px; color:var(--cream); line-height:1; display:flex; align-items:center; gap:8px; }
    .brand small { font:600 12px/1 'Nunito', sans-serif; color:rgba(244,234,216,.62); letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
    .chip { display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; border-radius:999px; background:rgba(15,42,34,.55); border:1px solid rgba(255,255,255,.22); font:600 12px/1 'Nunito', sans-serif; color:rgba(244,234,216,.85); }
    /* controles de ajustes */
    .seg { display:flex; gap:4px; padding:4px; border-radius:14px; background:rgba(15,42,34,.55); border:1px solid rgba(255,255,255,.18); }
    .seg > div { flex:1; display:flex; align-items:center; justify-content:center; height:36px; border-radius:10px; font:700 13px/1 'Nunito', sans-serif; color:rgba(244,234,216,.72); }
    .seg > div.on { background:rgba(184,217,106,.22); color:var(--cream); border:1px solid rgba(184,217,106,.6); box-shadow:inset 0 1px 0 rgba(255,255,255,.25); }
    .row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .lbl2 { font:700 13px/1 'Nunito', sans-serif; color:var(--cream); }
    .sub { font:600 12px/1.3 'Nunito', sans-serif; color:rgba(244,234,216,.62); }
    .sec { font:700 11px/1 'Nunito', sans-serif; letter-spacing:.12em; text-transform:uppercase; color:var(--lime); }
    .slider { position:relative; height:44px; display:flex; align-items:center; }
    .slider .track { position:absolute; left:0; right:0; top:calc(50% - 3px); height:6px; border-radius:999px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.2); }
    .slider .fill { position:absolute; left:0; top:calc(50% - 3px); height:6px; border-radius:999px; background:linear-gradient(90deg, var(--moss), var(--lime)); }
    .drawer > * { flex:none; }
    .slider .knob { position:absolute; top:calc(50% - 11px); width:22px; height:22px; border-radius:8px; background:linear-gradient(160deg, rgba(255,255,255,.55), rgba(255,255,255,.2)); border:1px solid rgba(255,255,255,.7); box-shadow:0 4px 10px rgba(0,0,0,.35); backdrop-filter:blur(6px); transform:translateX(-11px); }
    .toggle { width:48px; height:28px; border-radius:999px; background:rgba(15,42,34,.6); border:1px solid rgba(255,255,255,.25); position:relative; flex:none; }
    .toggle::after { content:""; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:rgba(244,234,216,.6); }
    .toggle.on { background:rgba(184,217,106,.3); border-color:rgba(184,217,106,.7); }
    .toggle.on::after { left:23px; background:var(--lime); }
    .select { display:flex; align-items:center; gap:10px; height:44px; padding:0 12px; border-radius:12px; background:rgba(15,42,34,.55); border:1px solid rgba(255,255,255,.22); }
    .swatches { display:flex; gap:3px; }
    .swatches i { width:12px; height:12px; border-radius:3px; display:block; border:1px solid rgba(0,0,0,.25); }
    .theme-chip { display:flex; flex-direction:column; align-items:center; gap:6px; padding:8px 6px 6px; border-radius:14px; background:rgba(15,42,34,.5); border:1px solid rgba(255,255,255,.18); font:700 12px/1 'Nunito', sans-serif; color:rgba(244,234,216,.78); }
    .theme-chip.on { border-color:rgba(184,217,106,.7); background:rgba(184,217,106,.16); color:var(--cream); }
    .theme-chip .mini { width:44px; height:44px; border-radius:8px; display:grid; place-items:center; background:linear-gradient(160deg, rgba(255,255,255,.22), rgba(143,179,199,.14)); border:1px solid rgba(255,255,255,.3); }
    .theme-chip .mini img { width:34px; height:34px; object-fit:contain; }
    .shelf { position:absolute; height:12px; border-radius:6px; background:linear-gradient(180deg, rgba(255,255,255,.34), rgba(143,179,199,.18)); border:1px solid rgba(255,255,255,.4); box-shadow:0 8px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.5); backdrop-filter:blur(6px); }
    .plant { position:absolute; object-fit:contain; filter:drop-shadow(0 10px 14px rgba(0,0,0,.5)); }
    .note { font:600 12px/1.35 'Nunito', sans-serif; color:rgba(244,234,216,.62); }
    ${extra}
  `;
}

function doc(title, w, h, body, extraCss = '') {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <title>${title}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Nunito:wght@400;600;700;800&display=swap">
  <style>${css(extraCss)}</style>
</helmet>
${body}
</x-dc>
</body>
</html>`;
}

// ---------- piezas ----------
const ART = { snake: 'snake_plant.png', fern: 'fern.png', mostera: 'mostera.png', michi: 'michi.png', helecho: 'helecho.png', dragon: 'dragon_plant.png', frog: 'frog_green.png', q: 'question.png' };

function tile(state, art, size, extra = '') {
  // state: back | front | match | miss | sel | hover | hole
  if (state === 'hole') return `<div class="hole" style="--s:${size}px"></div>`;
  const isBack = state === 'back' || state === 'hover' || state === 'sel';
  const cls = ['tile', isBack ? 'back' : '', state !== 'front' && state !== 'back' ? state : ''].filter(Boolean).join(' ');
  const inner = isBack ? `<img class="art pix" src="${ART.q}" alt="">` : typeof art === 'string' && art.endsWith('.png') ? `<img class="art pix" src="${art}" alt="">` : art;
  return `<div class="${cls}" style="--s:${size}px;${extra}">${inner}</div>`;
}
function spriteArt(name, size) { return sprite(name, Math.round(size * 0.72), { style: 'filter:drop-shadow(0 4px 5px rgba(0,0,0,.5))' }); }

function board(cols, rows, size, gap, cells, style = '') {
  return `<div class="board" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr));--g:${gap}px;width:${cols * size + (cols - 1) * gap}px;${style}">${cells.join('')}</div>`;
}
// tablero con estados: mapa de strings 'b' dorso, 'h' hueco, 'M' match, 'X' miss, 'F' frente, 'S' sel, 'H' hover
function cellsFrom(map, size, arts) {
  let ai = 0;
  return map.join('').split('').map((c) => {
    switch (c) {
      case 'b': return tile('back', null, size);
      case 'h': return tile('hole', null, size);
      case 'S': return tile('sel', null, size);
      case 'H': return tile('hover', null, size);
      case 'M': return tile('match', arts[ai++ % arts.length], size);
      case 'X': return tile('miss', arts[ai++ % arts.length], size);
      case 'F': return tile('front', arts[ai++ % arts.length], size);
      default: throw new Error('celda ' + c);
    }
  });
}

function stat(lbl, val, cls = '') { return `<div class="stat ${cls}"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`; }
function iconBtn(name, label, extra = '') { return `<div class="btn icon" role="button" aria-label="${label}" style="${extra}">${sprite(name, 22)}</div>`; }
function textBtn(name, text, cls = '', extra = '') { return `<div class="btn ${cls}" role="button" style="${extra}">${name ? sprite(name, 18, { color: cls.includes('primary') ? T.bgDeep : T.cream, accent: cls.includes('primary') ? T.bgDeep : T.lime }) : ''}<span>${text}</span></div>`; }

// ---------- 1. Móvil ----------
function movil() {
  const W = 390, H = 844, S = 82, G = 10;
  const map = ['bMbb', 'bbMb', 'Xbbb', 'bbbb'];
  const cells = cellsFrom(map, S, [ART.snake, ART.snake, ART.michi]);
  const body = `<div class="root" style="width:${W}px;height:${H}px">
  ${scene(W, H, { drops: 160, seed: 5, leafCount: 6 })}
  <div style="position:absolute;left:16px;right:16px;top:20px;display:flex;align-items:center;justify-content:space-between">
    <div class="brand">Memorice <span style="color:var(--lime)">Cozy</span></div>
    <div style="display:flex;gap:6px">
      <div class="chip">${sprite('clock', 12)} Clásico</div>
      <div class="chip">${sprite('grid', 12)} 4×4</div>
    </div>
  </div>
  <div style="position:absolute;left:16px;right:16px;top:78px;display:flex;justify-content:space-between;align-items:center">
    <div class="sub">Plantas de interior · 8 pares</div>
    <div class="sub" style="color:var(--lime)">2 / 8 pares</div>
  </div>
  <div style="position:absolute;left:16px;top:190px">${board(4, 4, S, G, cells)}</div>
  <!-- barra inferior de vidrio (bottom sheet) -->
  <div class="glass" style="position:absolute;left:16px;right:16px;bottom:16px;padding:14px 16px 16px;border-radius:24px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px">
      ${stat('Tiempo', '00:42')}${stat('Movs', '07')}${stat('Puntaje', '1 240', 'lime')}${stat('Racha', '×2')}
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${textBtn('eye', 'Pista · 1', '', 'flex:1')}
      ${iconBtn('pause', 'Pausa')}
      ${iconBtn('gear', 'Ajustes')}
    </div>
  </div>
</div>`;
  return doc('Memorice Cozy — Móvil 390×844', W, H, body);
}

// ---------- 2. Móvil: ajustes ----------
function movilAjustes() {
  const W = 390, H = 844, S = 82, G = 10;
  const cells = cellsFrom(['bMbb', 'bbMb', 'Xbbb', 'bbbb'], S, [ART.snake, ART.snake, ART.michi]);
  const pal = (cols) => `<div class="swatches">${cols.map((c) => `<i style="background:${c}"></i>`).join('')}</div>`;
  const themeChip = (label, inner, on = false) => `<div class="theme-chip ${on ? 'on' : ''}" style="flex:1"><div class="mini">${inner}</div><span>${label}</span></div>`;
  const body = `<div class="root" style="width:${W}px;height:${H}px">
  ${scene(W, H, { drops: 160, seed: 5, leafCount: 6 })}
  <div style="position:absolute;left:16px;top:150px;filter:blur(3px) brightness(.6)">${board(4, 4, S, G, cells)}</div>
  <div style="position:absolute;left:16px;right:16px;top:20px;display:flex;align-items:center;justify-content:space-between;opacity:.5">
    <div class="brand">Memorice <span style="color:var(--lime)">Cozy</span></div>
  </div>
  <div style="position:absolute;inset:0;background:rgba(8,22,17,.45)"></div>
  <!-- cajón inferior -->
  <div class="glass drawer" style="position:absolute;left:0;right:0;bottom:0;height:776px;border-radius:28px 28px 0 0;padding:10px 16px 16px;display:flex;flex-direction:column;gap:9px;background:rgba(15,42,34,.55);backdrop-filter:blur(22px) saturate(1.2)">
    <div style="width:44px;height:5px;border-radius:999px;background:rgba(244,234,216,.4);align-self:center"></div>
    <div class="row">
      <div class="display" style="font-size:26px">Ajustes</div>
      ${iconBtn('close', 'Cerrar', 'width:40px;height:40px')}
    </div>
    <div class="sec">Partida</div>
    <div style="display:flex;gap:8px">
      ${themeChip('Plantas', `<img class="pix" src="${ART.snake}" alt="">`, true)}
      ${themeChip('Selva', sprite('frog', 32))}
      ${themeChip('Cozy', sprite('mug', 32))}
      ${themeChip('Geek', sprite('gamepad', 32))}
    </div>
    <div class="row"><span class="lbl2">Rejilla</span><span class="sub">8 pares</span></div>
    <div class="seg"><div>3×2</div><div>4×3</div><div class="on">4×4</div><div>6×4</div><div>6×5</div><div>6×6</div></div>
    <div class="row"><span class="lbl2">Modo</span></div>
    <div class="seg"><div>Zen</div><div class="on">Clásico</div><div>Contrarreloj</div><div>Diario</div></div>
    <div class="row"><span class="lbl2">Idioma</span>
      <div class="seg" style="width:120px"><div class="on">es</div><div>en</div></div>
    </div>
    <div class="sec" style="margin-top:4px">Sonido</div>
    <div class="row"><span class="lbl2">Ambiente</span>
      <div style="display:flex;align-items:center;gap:10px"><div class="slider" style="width:150px;height:36px"><div class="track"></div><div class="fill" style="width:60%"></div><div class="knob" style="left:60%"></div></div><span class="sub" style="width:36px;text-align:right">60 %</span></div>
    </div>
    <div class="row"><span class="lbl2">Efectos</span>
      <div style="display:flex;align-items:center;gap:10px"><div class="slider" style="width:150px;height:36px"><div class="track"></div><div class="fill" style="width:80%"></div><div class="knob" style="left:80%"></div></div><span class="sub" style="width:36px;text-align:right">80 %</span></div>
    </div>
    <div class="sec" style="margin-top:4px">Imagen</div>
    <div class="row"><span class="lbl2">Grado de pixelado</span><span class="display" style="font-size:20px;color:var(--lime)">94</span></div>
    <div class="slider" style="height:32px"><div class="track"></div><div class="fill" style="width:94%"></div><div class="knob" style="left:94%"></div></div>
    <div class="row"><span class="lbl2">Paleta</span>
      <div class="select" style="width:210px;justify-content:space-between"><div style="display:flex;align-items:center;gap:8px"><span class="lbl2" style="font-weight:600">Original</span>${pal(['#4f8a3c', '#a8d275', '#c8744a', '#f4ead8', '#8fb3c7', '#1b1b26'])}</div>${sprite('chevron', 14)}</div>
    </div>
    <div class="row"><span class="lbl2">Dithering</span>
      <div class="seg" style="width:220px"><div class="on">Ninguno</div><div>Bayer</div><div>F-S</div></div>
    </div>
    <div class="row"><div><div class="lbl2">Movimiento reducido</div><div class="sub" style="margin-top:3px">Auto · sigue al sistema</div></div><div class="toggle"></div></div>
  </div>
</div>`;
  return doc('Memorice Cozy — Ajustes móvil', W, H, body);
}

// ---------- 3. Tablet ----------
function tablet() {
  const W = 1024, H = 768, S = 104, G = 12;
  const map = ['bbMbbb', 'bSbbMb', 'bbbFbb', 'hbbbhb'];
  const cells = cellsFrom(map, S, [ART.mostera, ART.mostera, ART.fern]);
  const bw = 6 * S + 5 * G, bh = 4 * S + 3 * G;
  const body = `<div class="root" style="width:${W}px;height:${H}px">
  ${scene(W, H, { drops: 420, seed: 9, leafCount: 10 })}
  <!-- plantas en repisas -->
  <div class="shelf" style="left:26px;top:560px;width:150px"></div>
  <img class="plant pix" src="${ART.mostera}" alt="" style="left:44px;top:392px;height:172px">
  <div class="shelf" style="left:846px;top:600px;width:150px"></div>
  <img class="plant pix" src="${ART.snake}" alt="" style="left:882px;top:452px;height:152px">
  <div class="shelf" style="left:44px;top:282px;width:120px"></div>
  <img class="plant pix" src="${ART.helecho}" alt="" style="left:56px;top:150px;height:136px;opacity:.9">
  <!-- HUD superior -->
  <div class="glass" style="position:absolute;left:24px;right:24px;top:20px;height:68px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px">
    <div class="brand">Memorice <span style="color:var(--lime)">Cozy</span><small style="margin-left:8px">Plantas · Clásico · 6×4</small></div>
    <div style="display:flex;gap:26px;align-items:flex-end">
      ${stat('Tiempo', '01:12')}${stat('Movs', '14')}${stat('Pares', '5 / 12')}${stat('Racha', '×3')}${stat('Puntaje', '2 860', 'lime')}
    </div>
    <div style="display:flex;gap:8px">${textBtn('eye', 'Pista · 2')}${iconBtn('pause', 'Pausa')}</div>
  </div>
  <div style="position:absolute;left:${(W - bw) / 2}px;top:${(H - bh) / 2 + 40}px">${board(6, 4, S, G, cells)}</div>
  <!-- ajustes flotante -->
  <div class="btn icon" role="button" aria-label="Ajustes" style="position:absolute;right:28px;bottom:28px;width:56px;height:56px;border-radius:18px">${sprite('gear', 26)}</div>
  <div class="btn icon" role="button" aria-label="Sonido" style="position:absolute;right:92px;bottom:28px;width:56px;height:56px;border-radius:18px">${sprite('sound', 26)}</div>
</div>`;
  return doc('Memorice Cozy — Tablet 1024×768', W, H, body);
}

// ---------- 4. Escritorio con victoria ----------
function escritorio() {
  const W = 1920, H = 1080, S = 118, G = 14;
  const map = ['hhhhhh', 'hhhhhh', 'hhMhhh', 'hhhMhh', 'hhhhhh', 'hhhhhh'];
  const cells = cellsFrom(map, S, [ART.michi, ART.michi]);
  const bw = 6 * S + 5 * G;
  const star = (on) => sprite('star', 44, { color: on ? '#f4d35e' : 'rgba(244,234,216,.22)' });
  const recRow = (k, v, hi = false) => `<div class="row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.1)"><span class="sub" style="color:rgba(244,234,216,.8)">${k}</span><span class="display" style="font-size:20px;color:${hi ? 'var(--lime)' : 'var(--cream)'}">${v}</span></div>`;
  const body = `<div class="root" style="width:${W}px;height:${H}px">
  ${scene(W, H, { drops: 900, seed: 21, leafCount: 14 })}
  <div class="shelf" style="left:120px;top:880px;width:220px"></div>
  <img class="plant pix" src="${ART.dragon}" alt="" style="left:150px;top:640px;height:244px">
  <div class="shelf" style="left:1580px;top:820px;width:220px"></div>
  <img class="plant pix" src="${ART.mostera}" alt="" style="left:1610px;top:590px;height:236px">
  <img class="plant pix" src="${ART.fern}" alt="" style="left:1660px;top:-10px;height:260px">
  <!-- HUD superior -->
  <div class="glass" style="position:absolute;left:${(W - 1100) / 2}px;width:1100px;top:24px;height:72px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:20px">
    <div class="brand">Memorice <span style="color:var(--lime)">Cozy</span><small style="margin-left:8px">Plantas · Clásico · 6×6</small></div>
    <div style="display:flex;gap:40px;align-items:flex-end">
      ${stat('Tiempo', '03:48')}${stat('Movs', '41')}${stat('Pares', '18 / 18')}${stat('Racha', '×3')}${stat('Puntaje', '9 420', 'lime')}
    </div>
    <div style="display:flex;gap:8px">${textBtn('eye', 'Pista · 0')}${iconBtn('pause', 'Pausa')}${iconBtn('gear', 'Ajustes')}</div>
  </div>
  <div style="position:absolute;left:${(W - bw) / 2}px;top:150px;opacity:.85">${board(6, 6, S, G, cells)}</div>
  <div style="position:absolute;inset:0;background:rgba(8,22,17,.35)"></div>
  <!-- pantalla de victoria -->
  <div class="glass" style="position:absolute;left:${(W - 620) / 2}px;top:250px;width:620px;padding:32px 36px 32px;border-radius:28px;display:flex;flex-direction:column;align-items:center;gap:18px;background:rgba(31,77,58,.42);backdrop-filter:blur(26px) saturate(1.3);box-shadow:0 30px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.35)">
    <div style="display:flex;gap:10px">${star(true)}${star(true)}${star(true)}</div>
    <div class="display" style="font-size:44px;line-height:1">¡Tablero completo!</div>
    <div class="chip" style="height:32px;padding:0 14px;background:rgba(184,217,106,.22);border-color:rgba(184,217,106,.7);color:var(--lime);font-size:13px">${sprite('star', 14, { color: T.lime })} ¡Nuevo récord de puntaje!</div>
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:12px;width:100%;margin-top:6px">
      <div class="glass" style="padding:14px 16px;border-radius:16px;display:flex;flex-direction:column;gap:4px"><span class="lbl" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(244,234,216,.68)">Tiempo</span><span class="display" style="font-size:30px">03:48</span></div>
      <div class="glass" style="padding:14px 16px;border-radius:16px;display:flex;flex-direction:column;gap:4px"><span class="lbl" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(244,234,216,.68)">Movimientos</span><span class="display" style="font-size:30px">41</span></div>
      <div class="glass" style="padding:14px 16px;border-radius:16px;display:flex;flex-direction:column;gap:4px;border-color:rgba(184,217,106,.6)"><span class="lbl" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(244,234,216,.68)">Puntaje</span><span class="display" style="font-size:30px;color:var(--lime)">9 420</span></div>
    </div>
    <div class="sub" style="text-align:center">Óptimo 36 movimientos · racha máxima ×3 · sin pistas</div>
    <div style="display:flex;gap:10px;width:100%;margin-top:6px">
      ${textBtn('refresh', 'Otra', 'primary lg', 'flex:1')}
      ${textBtn('leaf', 'Cambiar tema', 'lg', 'flex:1.3')}
      ${textBtn('share', 'Compartir', 'lg', 'flex:1.15')}
    </div>
  </div>
  <!-- tabla de récords -->
  <div class="glass" style="position:absolute;left:1300px;top:250px;width:300px;padding:22px 22px 18px;border-radius:24px;display:flex;flex-direction:column;gap:6px;background:rgba(15,42,34,.45)">
    <div class="sec">Récords locales</div>
    <div class="display" style="font-size:22px;margin-bottom:6px">Plantas · 6×6 · Clásico</div>
    ${recRow('Mejor tiempo', '03:21')}
    ${recRow('Menos movimientos', '38')}
    ${recRow('Mayor puntaje', '9 420', true)}
    ${recRow('Partidas', '12')}
    <div class="sub" style="margin-top:10px">Guardado en este dispositivo</div>
  </div>
</div>`;
  return doc('Memorice Cozy — Escritorio 1920×1080', W, H, body);
}

// ---------- 5. Ultra-wide 32:9 (5120×1440 a escala 0,4) ----------
function ultrawide() {
  const FW = 5120, FH = 1440, SC = 0.4, W = FW * SC, H = FH * SC;
  const S = 196, G = 22; // 6×196 + 5×22 = 1286 px ≤ 1600 (alto manda: 1440)
  const map = ['bbMbbb', 'bbbbMb', 'hbbSbb', 'bbhbbb', 'bbbbFb', 'hbbbbh'];
  const cells = cellsFrom(map, S, [ART.snake, ART.snake, ART.mostera]);
  const bw = 6 * S + 5 * G;
  const bx = (FW - bw) / 2, by = 76;
  const isleW = 560, gapIsle = 70;
  const recRow = (k, v, hi = false) => `<div class="row" style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.1)"><span style="font:600 20px/1 'Nunito',sans-serif;color:rgba(244,234,216,.8)">${k}</span><span class="display" style="font-size:30px;color:${hi ? 'var(--lime)' : 'var(--cream)'}">${v}</span></div>`;
  const bigStat = (l, v, cls = '') => `<div class="stat ${cls}" style="gap:6px"><span class="lbl" style="font-size:16px">${l}</span><span class="val" style="font-size:54px">${v}</span></div>`;
  const themeMini = (label, inner, on = false) => `<div class="theme-chip ${on ? 'on' : ''}" style="flex:1;padding:12px 8px 10px;font-size:18px;gap:10px;border-radius:18px"><div class="mini" style="width:74px;height:74px;border-radius:12px">${inner}</div><span>${label}</span></div>`;
  const shelfSet = (x, top, imgs) => imgs.map(([img, dx, h]) => `<img class="plant pix" src="${img}" alt="" style="left:${x + dx}px;top:${top - h}px;height:${h}px">`).join('') + `<div class="shelf" style="left:${x}px;top:${top}px;width:420px;height:18px;border-radius:9px"></div>`;
  const body = `<div class="root" style="width:${W}px;height:${H}px">
  <div style="width:${FW}px;height:${FH}px;transform:scale(${SC});transform-origin:0 0;position:relative;overflow:hidden;background:var(--bg-deep)">
  ${scene(FW, FH, { drops: 2400, seed: 33, leafCount: 26 })}
  <!-- laterales: repisas de plantas en parallax (3 profundidades) -->
  <div style="position:absolute;inset:0;opacity:.55;filter:blur(1.5px)">${shelfSet(120, 1180, [[ART.helecho, 20, 300], [ART.dragon, 240, 340]])}${shelfSet(4560, 1120, [[ART.mostera, 40, 330], [ART.snake, 260, 260]])}</div>
  <div style="position:absolute;inset:0;opacity:.85">${shelfSet(560, 1300, [[ART.snake, 30, 380], [ART.mostera, 240, 420]])}${shelfSet(4120, 1320, [[ART.dragon, 20, 400], [ART.helecho, 220, 330]])}</div>
  <img class="plant pix" src="${ART.fern}" alt="" style="left:380px;top:-20px;height:520px">
  <img class="plant pix" src="${ART.fern}" alt="" style="left:4400px;top:-40px;height:560px;opacity:.9">
  <img class="plant pix" src="${ART.michi}" alt="" style="left:${bx - isleW - gapIsle - 20}px;top:${FH - 400}px;height:360px;opacity:.95">
  <!-- tablero centrado, limitado a 1600 -->
  <div style="position:absolute;left:${bx}px;top:${by}px">${board(6, 6, S, G, cells)}</div>
  <!-- isla izquierda: marcadores + récords -->
  <div class="glass" style="position:absolute;left:${bx - isleW - gapIsle}px;top:${by}px;width:${isleW}px;padding:34px 36px;border-radius:34px;display:flex;flex-direction:column;gap:26px;background:rgba(15,42,34,.42)">
    <div class="brand" style="font-size:38px">Memorice <span style="color:var(--lime)">Cozy</span></div>
    <div class="chip" style="height:40px;padding:0 16px;font-size:18px;align-self:flex-start">${sprite('clock', 18)} Clásico · Plantas · 6×6</div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:22px 16px">
      ${bigStat('Tiempo', '02:07')}${bigStat('Movs', '23')}${bigStat('Pares', '9 / 18')}${bigStat('Racha', '×2')}
    </div>
    ${bigStat('Puntaje', '5 180', 'lime')}
    <div style="display:flex;gap:12px">
      <div class="btn" style="height:64px;flex:1;font-size:20px;border-radius:20px;gap:12px">${sprite('eye', 26)}<span>Pista · 2</span></div>
      <div class="btn icon" style="width:64px;height:64px;border-radius:20px">${sprite('pause', 26)}</div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.14);padding-top:18px">
      <div class="sec" style="font-size:15px">Récords · Plantas · 6×6</div>
      ${recRow('Mejor tiempo', '03:21')}${recRow('Menos movimientos', '38')}${recRow('Mayor puntaje', '9 420', true)}
    </div>
  </div>
  <!-- isla derecha: ajustes rápidos + tema -->
  <div class="glass" style="position:absolute;left:${bx + bw + gapIsle}px;top:${by}px;width:${isleW}px;padding:34px 36px;border-radius:34px;display:flex;flex-direction:column;gap:22px;background:rgba(15,42,34,.42)">
    <div class="row"><div class="display" style="font-size:34px">Ajustes rápidos</div><div class="btn icon" style="width:56px;height:56px;border-radius:18px">${sprite('gear', 24)}</div></div>
    <div class="sec" style="font-size:15px">Tema de cartas</div>
    <div style="display:flex;gap:12px">
      ${themeMini('Plantas', `<img class="pix" src="${ART.snake}" alt="" style="width:58px;height:58px;object-fit:contain">`, true)}
      ${themeMini('Selva', sprite('frog', 52))}
      ${themeMini('Cozy', sprite('mug', 52))}
      ${themeMini('Geek', sprite('gamepad', 52))}
    </div>
    <div class="row"><span class="lbl2" style="font-size:20px">Modo</span></div>
    <div class="seg" style="border-radius:18px"><div style="height:52px;font-size:18px">Zen</div><div class="on" style="height:52px;font-size:18px">Clásico</div><div style="height:52px;font-size:18px">Contrarreloj</div><div style="height:52px;font-size:18px">Diario</div></div>
    <div class="row"><span class="lbl2" style="font-size:20px">Rejilla</span><span class="sub" style="font-size:16px">18 pares</span></div>
    <div class="seg" style="border-radius:18px"><div style="height:52px;font-size:18px">4×4</div><div style="height:52px;font-size:18px">6×4</div><div style="height:52px;font-size:18px">6×5</div><div class="on" style="height:52px;font-size:18px">6×6</div></div>
    <div class="row"><span class="lbl2" style="font-size:20px">${sprite('sound', 20)} Ambiente</span><span class="sub" style="font-size:16px">60 %</span></div>
    <div class="slider" style="height:52px"><div class="track" style="height:10px;top:calc(50% - 5px)"></div><div class="fill" style="width:60%;height:10px;top:calc(50% - 5px)"></div><div class="knob" style="left:60%;width:30px;height:30px;top:calc(50% - 15px);transform:translateX(-15px)"></div></div>
    <div class="row"><span class="lbl2" style="font-size:20px">Grado de pixelado</span><span class="display" style="font-size:30px;color:var(--lime)">94</span></div>
    <div class="slider" style="height:52px"><div class="track" style="height:10px;top:calc(50% - 5px)"></div><div class="fill" style="width:94%;height:10px;top:calc(50% - 5px)"></div><div class="knob" style="left:94%;width:30px;height:30px;top:calc(50% - 15px);transform:translateX(-15px)"></div></div>
  </div>
  </div>
</div>`;
  return doc('Memorice Cozy — Ultra-wide 32:9 (0,4×)', W, H, body);
}

// ---------- 6. Guía de estilo ----------
function guia() {
  const W = 1600, H = 2760;
  const swatch = (name, hex, use, dark = false) => `<div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0">
    <div style="height:74px;border-radius:14px;background:${hex};border:1px solid rgba(255,255,255,.25);box-shadow:inset 0 1px 0 rgba(255,255,255,.25)"></div>
    <div class="display" style="font-size:16px">${name}</div>
    <div class="sub" style="font-family:ui-monospace, Consolas, monospace;color:var(--cream)">${hex}</div>
    <div class="sub">${use}</div></div>`;
  const h2 = (t, sub = '') => `<div style="display:flex;flex-direction:column;gap:4px"><div class="display" style="font-size:30px">${t}</div>${sub ? `<div class="sub" style="font-size:14px">${sub}</div>` : ''}</div>`;
  const stateCard = (label, html, note) => `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;flex:1"><div style="height:130px;display:grid;place-items:center">${html}</div><div class="lbl2">${label}</div><div class="note" style="text-align:center;max-width:170px">${note}</div></div>`;
  const icon = (name, label, accent = false) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:96px"><div class="btn icon" style="width:56px;height:56px;border-radius:16px">${sprite(name, 26, accent ? {} : { accent: T.cream })}</div><div class="sub" style="text-align:center">${label}</div></div>`;
  const themeRow = (name, meta, tiles) => `<div style="display:flex;align-items:center;gap:26px;padding:16px 0;border-top:1px solid rgba(255,255,255,.1)">
    <div style="width:250px;display:flex;flex-direction:column;gap:6px"><div class="display" style="font-size:22px">${name}</div><div class="sub">${meta}</div></div>
    <div style="display:flex;gap:18px">${tiles.join('')}</div></div>`;
  const S = 104;
  // perfil de la ficha (SVG): 1 × 0.12 u, radio 0.08, plano de arte a 0.02
  const profile = `<svg width="490" height="150" viewBox="0 0 490 150" aria-hidden="true" style="font-family:'Nunito',sans-serif">
    <defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="${T.sky}" stop-opacity=".16"/></linearGradient></defs>
    <rect x="40" y="52" width="300" height="36" rx="12" fill="url(#gl)" stroke="rgba(255,255,255,.55)"/>
    <line x1="40" y1="58" x2="340" y2="58" stroke="${T.lime}" stroke-width="2" stroke-dasharray="3 3"/>
    <rect x="70" y="59" width="240" height="1.5" fill="${T.lime}" opacity=".9"/>
    <text x="352" y="58" fill="${T.lime}" font-size="12" font-weight="700">plano arte</text>
    <text x="352" y="72" fill="${T.lime}" font-size="12">0.02 u bajo la cara</text>
    <line x1="24" y1="52" x2="24" y2="88" stroke="${T.cream}" stroke-width="1"/><line x1="20" y1="52" x2="28" y2="52" stroke="${T.cream}"/><line x1="20" y1="88" x2="28" y2="88" stroke="${T.cream}"/>
    <text x="4" y="46" fill="${T.cream}" font-size="12" font-weight="700">0.12 u</text>
    <line x1="40" y1="108" x2="340" y2="108" stroke="${T.cream}" stroke-width="1"/><line x1="40" y1="104" x2="40" y2="112" stroke="${T.cream}"/><line x1="340" y1="104" x2="340" y2="112" stroke="${T.cream}"/>
    <text x="176" y="126" fill="${T.cream}" font-size="12" font-weight="700">1.00 u</text>
    <path d="M40 64 a12 12 0 0 1 12 -12" fill="none" stroke="${T.sky}" stroke-width="2"/><text x="42" y="40" fill="${T.sky}" font-size="12" font-weight="700">r 0.08 · 4 seg.</text>
    <text x="40" y="146" fill="rgba(244,234,216,.6)" font-size="11">transmission .85 · roughness .18 · thickness .35 · ior 1.45 · clearcoat .6 · tinte sky-rain 12 %</text>
  </svg>`;
  const body = `<div class="root" style="width:${W}px;height:${H}px;padding:56px 64px;display:flex;flex-direction:column;gap:44px;background:linear-gradient(180deg,#143329,var(--bg-deep) 30%)">
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="brand" style="font-size:52px">Memorice <span style="color:var(--lime)">Cozy</span></div>
      <div class="sub" style="font-size:16px">Guía de estilo v2 · design-5 · tokens de <span style="font-family:ui-monospace,Consolas,monospace">styles/tokens.css</span></div>
    </div>
    <div style="display:flex;gap:10px">${tile('back', null, 72)}${tile('front', ART.snake, 72)}${tile('match', ART.mostera, 72)}</div>
  </div>

  ${h2('1 · Paleta', 'Modo oscuro único · contraste AA sobre --bg-deep · botón primario con texto --bg-deep (cream sobre terracotta no alcanza AA)')}
  <div style="display:flex;gap:18px">
    ${swatch('--bg-deep', T.bgDeep, 'fondo base, cielo al anochecer')}
    ${swatch('--bg-mid', T.bgMid, 'niebla, paneles oscuros')}
    ${swatch('--moss', T.moss, 'acentos vegetales, progreso')}
    ${swatch('--lime', T.lime, 'match, resaltado, récord')}
    ${swatch('--cream', T.cream, 'texto, luz cálida')}
    ${swatch('--terracotta', T.terracotta, 'macetas, primario, miss suave')}
    ${swatch('--sky-rain', T.sky, 'gotas, brillo del vidrio')}
  </div>
  <div style="display:flex;gap:18px;align-items:stretch">
    <div class="glass" style="flex:1;padding:18px 20px;display:flex;flex-direction:column;gap:6px"><div class="display" style="font-size:16px">--glass-fill · --glass-border</div><div class="sub">rgba(255,255,255,.14) · rgba(255,255,255,.35) 1 px · blur 18 px · saturate 1.2 · sombra 0 10 30 / .25 · brillo interior 1 px</div></div>
    <div class="glass" style="flex:1;padding:18px 20px;display:flex;flex-direction:column;gap:6px;background:rgba(15,42,34,.45)"><div class="display" style="font-size:16px">Panel oscuro (cajón, islas)</div><div class="sub">--glass-fill sobre rgba(15,42,34,.45) para legibilidad con tablero detrás · radio 20 px (28 px cajón, 34 px islas 32:9)</div></div>
    <div class="glass" style="flex:1;padding:18px 20px;display:flex;flex-direction:column;gap:6px"><div class="display" style="font-size:16px">Radios</div><div class="sub">UI 14 px · panel 20 px · ficha 8 % del lado (= 0.08 u en 3D): 82 px → 6.5 px · 118 px → 9.5 px · 196 px → 16 px</div></div>
  </div>

  ${h2('2 · Tipografía', 'Pixelify Sans para título y marcadores · Nunito 400/600/700 para cuerpo y controles · números en marcador con espacio fino de miles')}
  <div style="display:flex;gap:40px;align-items:flex-start">
    <div style="display:flex;flex-direction:column;gap:14px;flex:1">
      <div class="display" style="font-size:44px;line-height:1">¡Tablero completo!</div>
      <div class="sub">Pixelify Sans 44 · título de victoria</div>
      <div class="display" style="font-size:26px;line-height:1">00:42 · 07 · 1 240 · ×2</div>
      <div class="sub">Pixelify Sans 26 · marcadores móvil (54 en islas 32:9, 30 en victoria)</div>
      <div class="display" style="font-size:22px;line-height:1">Memorice Cozy</div>
      <div class="sub">Pixelify Sans 22 · marca en HUD</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;flex:1">
      <div style="font:400 16px/1.5 'Nunito',sans-serif">Nunito 400 · 16 px · texto de ayuda y descripciones largas. Lluvia en la ventana, plantas, luz cálida difusa.</div>
      <div style="font:600 14px/1.4 'Nunito',sans-serif">Nunito 600 · 14 px · subtítulos y valores secundarios (60 %, 8 pares)</div>
      <div style="font:700 13px/1 'Nunito',sans-serif">Nunito 700 · 13 px · etiquetas de control, botones 14 px</div>
      <div class="lbl" style="font:700 11px/1 'Nunito',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(244,234,216,.68)">Nunito 700 · 11 px · etiqueta de marcador, mayúsculas, tracking .10em</div>
      <div class="sec">Nunito 700 · 11 px · encabezado de sección en --lime</div>
    </div>
  </div>

  ${h2('3 · Anatomía de la ficha', 'Cuadrada, vidrio translúcido con volumen; el pixel art flota 0.02 u bajo la cara y se muestra con NearestFilter (sin mipmaps), 256 × 256')}
  <div style="display:flex;gap:48px;align-items:center">
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">${tile('front', ART.mostera, 150)}<div class="lbl2">Frente</div><div class="note" style="text-align:center;max-width:170px">arte a 76 % del lado, sombra propia hacia abajo = flota dentro</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">${tile('back', null, 150)}<div class="lbl2">Dorso</div><div class="note" style="text-align:center;max-width:170px">? pixel art recoloreado por tema sobre vidrio esmerilado (blur 12)</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;perspective:700px"><div style="transform:rotateY(38deg) rotateX(8deg);transform-style:preserve-3d">${tile('front', ART.snake, 150, 'box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 2px 0 0 rgba(143,179,199,.35), 4px 1px 0 rgba(143,179,199,.3), 6px 2px 0 rgba(143,179,199,.26), 8px 3px 0 rgba(143,179,199,.22), 10px 4px 0 rgba(143,179,199,.18), 12px 5px 0 rgba(143,179,199,.14), 14px 6px 0 rgba(143,179,199,.10), 18px 22px 30px rgba(0,0,0,.45);')}</div><div class="lbl2">Volumen al girar</div><div class="note" style="text-align:center;max-width:170px">canto visible 0.12 u, tinte --sky-rain, borde iluminado</div></div>
    <div style="display:flex;flex-direction:column;gap:6px">${profile}<div class="lbl2" style="text-align:center">Perfil (corte)</div></div>
  </div>

  ${h2('4 · Estados', 'Toda transición con --ease-cozy cubic-bezier(.45,.05,.2,1)')}
  <div style="display:flex;gap:16px;align-items:flex-start">
    ${stateCard('Reposo', tile('back', null, S), 'dorso, blur 12, sin elevación')}
    ${stateCard('Hover', tile('hover', null, S), 'sube 4 %, borde 65 % · 260 ms')}
    ${stateCard('Seleccionada', tile('sel', null, S), 'borde --sky-rain, emissive suave; gira 600 ms')}
    ${stateCard('Match', tile('match', ART.fern, S), 'sube 0.3 u, brilla --lime, se desvanece en 900 ms')}
    ${stateCard('Miss', tile('miss', ART.michi, S), 'inclina 8°, tinte terracotta; vuelve a dorso a 1 100 ms')}
    ${stateCard('Hueco', tile('hole', null, S), 'luz suave --lime 20 % → 0; nunca visibility:hidden')}
  </div>

  ${h2('5 · Iconografía pixel art', 'Rejilla 16 × 16, un solo color --cream, acento --lime; escalado nearest a 22 / 26 px dentro de botones de 44 / 56 px')}
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    ${icon('eye', 'Pista', true)}${icon('pause', 'Pausa')}${icon('sound', 'Sonido')}${icon('gear', 'Ajustes')}${icon('leaf', 'Tema')}${icon('star', 'Estrella')}${icon('share', 'Compartir')}${icon('refresh', 'Otra')}${icon('close', 'Cerrar')}${icon('grid', 'Rejilla')}${icon('clock', 'Modo')}${icon('chevron', 'Desplegar')}
  </div>

  ${h2('6 · Temas de cartas', 'Plantas con arte propio; selva, cozy y geek con placeholders 16 × 16 de design-5 hasta que assets-2 entregue los CC0 a 256 × 256')}
  <div style="display:flex;flex-direction:column">
    ${themeRow('Plantas de interior', 'listo · 30 cartas propias · paleta original · easter egg michi', [tile('front', ART.snake, S), tile('front', ART.mostera, S), tile('front', ART.fern, S), tile('front', ART.dragon, S), tile('front', ART.michi, S)])}
    ${themeRow('Selva tropical', 'nuevo · CC0 · rana, tucán, mariposa, hojas, orquídea', [tile('front', spriteArt('frog', S), S), tile('front', spriteArt('toucan', S), S), tile('front', spriteArt('butterfly', S), S), tile('front', ART.frog, S)])}
    ${themeRow('Rincón cozy', 'nuevo · CC0 · taza, vela, libro, manta, gato, lámpara', [tile('front', spriteArt('mug', S), S), tile('front', spriteArt('candle', S), S), tile('front', spriteArt('book', S), S)])}
    ${themeRow('Pasatiempos geek', 'nuevo · CC0 · consola, d20, disquete, cartucho, teclado, cassette', [tile('front', spriteArt('gamepad', S), S), tile('front', spriteArt('d20', S), S), tile('front', spriteArt('floppy', S), S)])}
  </div>
</div>`;
  return doc('Memorice Cozy — Guía de estilo', W, H, body);
}

// ---------- escribir ----------
const files = {
  'Main.dc.html': movil(),
  'MovilAjustes.dc.html': movilAjustes(),
  'Tablet.dc.html': tablet(),
  'Escritorio.dc.html': escritorio(),
  'UltraWide.dc.html': ultrawide(),
  'Guia.dc.html': guia(),
};
for (const [n, s] of Object.entries(files)) writeFileSync(join(here, n), s);

const canvas = {
  artboards: [
    { file: 'Main.dc.html', title: 'Móvil 390×844 · partida', x: 0, y: 0, w: 390, h: 844 },
    { file: 'MovilAjustes.dc.html', title: 'Móvil · ajustes (cajón)', x: 480, y: 0, w: 390, h: 844 },
    { file: 'Tablet.dc.html', title: 'Tablet 1024×768', x: 960, y: 0, w: 1024, h: 768 },
    { file: 'Escritorio.dc.html', title: 'Escritorio 1920×1080 · victoria', x: 0, y: 1000, w: 1920, h: 1080 },
    { file: 'UltraWide.dc.html', title: 'Ultra-wide 5120×1440 · escala 0,4', x: 0, y: 2240, w: 2048, h: 576 },
    { file: 'Guia.dc.html', title: 'Guía de estilo', x: 2100, y: 0, w: 1600, h: 2760 },
  ],
  annotations: [
    { id: 'transiciones', x: 0, y: -210, w: 440, text: 'Transiciones (todas con --ease-cozy):\n• Flip 600 ms · rotación Y con canto visible\n• Match: sube 0.3 u + brillo lime, se desvanece 900 ms y deja hueco con luz\n• Miss: inclina 8° y vuelve a dorso a 1 100 ms, sin sacudida\n• Reparto: caída escalonada 40 ms/ficha desde 2 u, rebote mínimo\n• UI (cajón, chips, botones): 260 ms\n• prefers-reduced-motion: flips instantáneos con fade, sin caída' },
    { id: 'movil-nota', x: 480, y: -130, w: 380, text: 'Móvil: gutter 16 px, cartas 82 px, HUD como bottom sheet (pulgar). El cajón de ajustes sube 760 px y hace scroll interno; orden: Partida → Sonido → Imagen.' },
    { id: 'tablet-nota', x: 960, y: -130, w: 420, text: 'Tablet: HUD superior de 68 px con marca · marcadores · pista/pausa. Ajustes y sonido flotantes 56 px abajo a la derecha. Repisas de vidrio con plantas reales a los lados.' },
    { id: 'desktop-nota', x: 1960, y: 1000, w: 300, text: 'Escritorio: al ganar, el tablero queda en huecos con luz; la victoria es un panel de vidrio 560 px centrado. Récords a la derecha sobre el mismo eje. Botón primario terracotta con texto --bg-deep (AA).' },
    { id: 'uw-nota', x: 0, y: 2130, w: 640, text: 'Ultra-wide 32:9 dibujado a escala 0,4 (2048×576 = 5120×1440). Tablero 6×6 de 1286 px (cartas 196 px), islas de vidrio de 560 px a 70 px del tablero: el HUD queda a menos de 1 000 px del centro de la vista. Laterales: repisas en 2 profundidades (parallax) + helechos colgantes, lluvia 2 400 gotas, DPR 1.0.' },
    { id: 'guia-nota', x: 2100, y: -130, w: 520, text: 'Guía de estilo: paleta, glass, tipografía, anatomía y estados de la ficha, iconografía pixel 16×16 y los 4 temas. Placeholders de selva/cozy/geek son de design-5, se reemplazan por los CC0 de assets-2.' },
  ],
  launch: { view: 'canvas' },
};
writeFileSync(join(here, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('ok', Object.keys(files).join(', '));
