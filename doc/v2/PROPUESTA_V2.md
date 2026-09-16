# Memorice v2 — Propuesta de diseño y plan de producción

**Rama integradora:** `feature/v2_integradora` · **Deploy:** GitHub Pages desde `main`, solo después del visto bueno al diseño gráfico.
**Dirección del proyecto:** director (coordinador) + 6 agentes ejecutores en paralelo (ver §9).

> El juego actual se llama "Mahjong Plant Game" pero es un memorice. v2 lo asume: **Memorice Cozy**, un memorice indie, relajado, pixel art, ambientado en un rincón de plantas de interior con selva tropical lluviosa al fondo.

---

## 1. Visión

- **Sensación**: lluvia en la ventana, plantas, luz cálida difusa, fichas de vidrio que giran despacio. Nada apura al jugador salvo que él elija el modo contrarreloj.
- **Estilo**: pixel art en las cartas (contenido) dentro de un mundo con volumen y vidrio (contenedor). El contraste pixel/vidrio es la identidad visual.
- **Público**: casual, móvil y escritorio, sesiones de 2 a 10 minutos.
- **Una sola página** `index.html` con Three.js vendorizado y módulos ES importados.

## 2. Dirección de arte

### 2.1 Tokens de diseño (fuente de verdad para todos los módulos)

| Token | Valor | Uso |
|---|---|---|
| `--bg-deep` | `#0f2a22` | fondo base, cielo de selva al anochecer |
| `--bg-mid` | `#1f4d3a` | niebla media, paneles oscuros |
| `--moss` | `#6a9a5b` | acentos vegetales, progreso |
| `--lime` | `#b8d96a` | resaltado, match correcto |
| `--cream` | `#f4ead8` | texto principal, luz cálida |
| `--terracotta` | `#c8744a` | macetas, botón primario, error suave |
| `--sky-rain` | `#8fb3c7` | gotas, brillo del vidrio |
| `--glass-fill` | `rgba(255,255,255,0.14)` | relleno de fichas y paneles |
| `--glass-border` | `rgba(255,255,255,0.35)` | borde 1px de vidrio |
| `--glass-blur` | `18px` | backdrop-filter de paneles HUD |
| `--radius-card` | `14px` (UI) / `0.08` unidades (3D) | esquinas suaves |
| `--ease-cozy` | `cubic-bezier(.45,.05,.2,1)` | toda transición |
| `--dur-flip` | `600ms` | giro de carta |
| `--dur-settle` | `900ms` | match que se desvanece / flota |

Tipografía: **Pixelify Sans** (títulos, marcadores, Google Fonts) + **Nunito** (cuerpo, 400/600/700). Modo oscuro es el único modo; contraste mínimo AA sobre `--bg-deep`.

### 2.2 Las fichas (cartas)

- Geometría 3D: `RoundedBoxGeometry` 1 × 1 × 0.12 unidades, radio 0.08, 4 segmentos. **Cuadradas**, con volumen visible al girar.
- Material: `MeshPhysicalMaterial` translúcido tipo vidrio: `transmission 0.85`, `roughness 0.18`, `thickness 0.35`, `ior 1.45`, `clearcoat 0.6`, tinte `--sky-rain` al 12 %. Borde iluminado con `emissive` sutil al hover/selección.
- Dorso: signo `?` pixel art (se rehace en la paleta del tema) sobre relieve de vidrio esmerilado.
- Frente: plano interior a 0.02 de la cara, textura pixel art con `NearestFilter`, sin mipmaps, tamaño 256 × 256. La imagen "flota" dentro del vidrio.
- Estado match: la ficha se eleva 0.3 u, brilla `--lime`, se desvanece en 900 ms y deja un **hueco con luz suave** (no `visibility:hidden` como hoy).
- Estado miss: inclinación 8° y vuelta a dorso a los 1100 ms con `--ease-cozy`. Sin sacudida agresiva.
- Reparto: caída escalonada 40 ms por ficha desde 2 u de altura con rebote mínimo; sonido de barajar.
- `prefers-reduced-motion`: giros instantáneos con fade, sin caída.

### 2.3 Escena y fondo

- Cámara ortográfica ligeramente inclinada (10°) para volumen sin distorsión.
- Fondo: selva tropical lluviosa. **Imagen** optimizada (webp, 3 tamaños) como plano de fondo + capa de lluvia de partículas Three.js (1500 gotas escritorio / 400 móvil) + niebla exponencial `--bg-mid`.
- Laterales en ultra-wide: plantas de interior en pixel art como sprites con parallax suave (monstera, helecho, sansevieria: reúsan los assets actuales), macetas sobre repisas de vidrio.
- Iluminación: `HemisphereLight` cálida + `DirectionalLight` suave con sombras solo en escritorio.
- DPR limitado a 1.5 en móvil y **1.0 en pantallas > 3000 px** de ancho (5120 × 1440 del monitor de 49").

### 2.4 Temáticas de cartas (BD de assets)

Cada tema tiene 24 a 32 imágenes de 256 × 256, pixeladas y con paleta propia. Se cargan bajo demanda.

| id | Nombre | Estado v2.0 | Fuente |
|---|---|---|---|
| `plantas` | Plantas de interior | listo (30 actuales, deduplicadas y optimizadas) | propias |
| `selva` | Selva tropical (rana, tucán, mariposa, hojas, orquídea) | nuevo | CC0 (Kenney, OpenGameArt CC0) |
| `cozy` | Rincón cozy (taza, vela, libro, manta, gato, lámpara) | nuevo | CC0 |
| `geek` | Pasatiempos geek (consola retro, d20, cartucho, teclado, cassette, disquete) | nuevo | CC0 |
| `cafe` | Café y té | slot definido, sin assets | pendiente |
| `manualidades` | Lana, acuarela, papelería | slot definido | pendiente |
| `noche` | Cielo nocturno, telescopio, constelaciones | slot definido | pendiente |
| `acuario` | Peces, coral, burbujas | slot definido | pendiente |

Toda imagen lleva `license` y `attribution` en el manifiesto; se genera `CREDITS.md` automáticamente.

### 2.5 Pixelador (grado + paleta), doble uso

Módulo `src/pixel/pixelator.js` sin dependencias, canvas 2D:

- **Grado de pixelado** `pixelScale` 0..100 (valor de referencia del autor: **94**). El agente `pixel-3` hace ingeniería inversa de https://www.pixelater.net/es/pixel-art-maker para que 94 dé un resultado equivalente al de los assets actuales, y documenta el mapeo a tamaño de celda.
- **Paletas**: `original` (cuantización k-means a N colores), `gameboy`, `pico8`, `nes`, `sweetie16`, `endesga32`, `cga`, `cozy-pastel` (propia), `jungle-dusk` (propia, derivada de los tokens).
- **Dithering** opcional: ninguno / ordenado Bayer 4×4 / Floyd-Steinberg.
- Uso 1, jugador: panel de ajustes aplica el pixelado **en vuelo** a la textura de las cartas (procesa una vez por tema y cachea en `OffscreenCanvas`).
- Uso 2, dev: `tools/pixelator.html` para arrastrar imágenes crudas, ajustar y exportar PNG/WebP 256 × 256 con nombre de tema listos para el manifiesto.

## 3. Diseño de sonido

Fuente: **archivos de audio CC0**, comprimidos a OGG Vorbis + M4A (fallback iOS), ≤ 96 kbps ambientes, ≤ 64 kbps SFX. Presupuesto total de audio inicial **≤ 2.5 MB**; los ambientes se cargan tras el primer gesto del usuario (política de autoplay) con fade-in de 3 s.

| Canal | Evento | v1 (hoy) | v2 |
|---|---|---|---|
| ambiente | siempre, loop | no existe | `rain-tropical` loop 60–90 s sin costura + `jungle-birds` loop, mezclados con crossfade; la lluvia sube de intensidad suave al ganar |
| sfx | repartir | `card_shuffle.mp3` sin uso | se reutiliza |
| sfx | voltear | `flip_card.mp3` en cada click incluso repetido (bug) | flip suave de vidrio, solo en giros válidos |
| sfx | match | `match.mp3` a los 300 ms | campanita de madera/agua, con el desvanecido de la ficha |
| sfx | miss | `bad_match.mp3` inmediato | gota grave, sin castigo |
| sfx | victoria | `clean_win.mp3` + `alert()` | acorde suave + pantalla de victoria; `winbanjo` se retira |
| sfx | reiniciar | `drama_boom.mp3` 509 KB | se elimina; barajar |
| sfx | easter egg | `cat_purr.mp3` al voltear `michi` | se conserva, y cada tema puede declarar su propio easter egg en el manifiesto |
| sfx | pista / combo | no existe | `chime-soft`, `combo-up` |

Motor: `src/audio/engine.js` con `AudioContext`, buses `ambient` y `sfx` con `GainNode` independientes, precarga con `fetch + decodeAudioData`, desbloqueo en el primer gesto, persistencia de volúmenes, respeto a `visibilitychange` (pausa ambiente en segundo plano).

## 4. Jugabilidad: qué se agrega respecto a v1

v1 solo tiene: elegir cantidad de pares, voltear, contar matches, `alert()` al ganar. v2 agrega lo típico de un memorice online:

- **Modos**: *Zen* (sin tiempo, sin puntaje, solo ambiente) · *Clásico* (tiempo y movimientos cuentan) · *Contrarreloj* (tiempo límite por dificultad) · *Diario* (semilla fija por fecha, mismo tablero para todos, compartible).
- **Dificultad por rejilla**: 3×2, 4×3, 4×4, 6×4, 6×5, 6×6 (36 cartas = 18 pares, tope por tema).
- **Marcadores en vivo**: tiempo, movimientos, pares, racha actual, puntaje.
- **Puntaje**: base por par + bonificación por racha (combo ×1.5, ×2, ×3) + bonificación por tiempo en clásico/contrarreloj. Estrellas 1–3 al final según movimientos vs. óptimo.
- **Récords locales**: mejor tiempo, menos movimientos y mayor puntaje por tema × rejilla × modo, en `localStorage`; tabla de récords en el panel.
- **Pista**: 1 por partida (2 en rejillas grandes): muestra todas las cartas 1.2 s con desenfoque de vidrio; penaliza puntaje.
- **Pausa** (también al perder foco), **rehacer tablero** con la misma semilla, **compartir** resultado como texto (emoji + tiempo).
- **Pantalla de victoria** con estrellas, récord nuevo, botones *Otra*, *Cambiar tema*, *Compartir*.
- **Ajustes**: tema, rejilla, modo, idioma es/en, volumen ambiente/sfx, grado de pixelado, paleta, dithering, movimiento reducido.
- **Accesibilidad**: navegación por teclado del tablero (flechas + Enter), `aria-live` para marcadores, tamaño mínimo táctil 44 px.

## 5. Layouts responsivos (vistas previas en `/design`, tarea `design-5`)

| Viewport | Ejemplo | Tablero | HUD | Escena |
|---|---|---|---|---|
| Móvil vertical | 390 × 844 | 4 columnas, cartas ≈ 80 px, ocupa 60 % alto | barra inferior tipo *bottom sheet* con tiempo/movs/puntaje; ajustes en cajón | fondo + lluvia ligera (400 gotas), sin laterales |
| Tablet | 1024 × 768 / 820 × 1180 | centrado, cartas ≈ 110 px | barra superior de vidrio + botón flotante de ajustes | fondo + lluvia + 2 plantas laterales |
| Escritorio 16:9 | 1920 × 1080 | centrado, máx 900 px | barra superior | completa |
| Ultra-wide 32:9 | 5120 × 1440 (49") | centrado, máx 1600 px de ancho | **islas de vidrio** a izquierda (marcadores, récords) y derecha (ajustes, tema) para no dejar el centro vacío ni el HUD a 2 m de distancia | laterales con repisas de plantas en parallax, lluvia densa, DPR 1.0 |

Reglas: sin scroll horizontal, gutter 16 px en móvil, orientación horizontal en móvil reacomoda a 6 columnas.

## 6. Arquitectura

```
index.html                     única página; importmap → vendor/three
vendor/three.module.min.js     Three.js r16x vendorizado (+ RoundedBoxGeometry addon)
src/main.js                    bootstrap y cableado por bus de eventos
src/core/bus.js                pub/sub mínimo (contrato §7)
src/core/state.js              máquina de estados del juego, puntaje, récords, semillas   [core-1]
src/scene/*.js                 renderer, cámara/layout, fichas, entorno, lluvia            [core-1]
src/ui/*.js  styles/*.css      HUD, ajustes, victoria, récords, i18n                        [ui-6]
src/audio/*.js                 motor de audio, mapa de sonidos                              [audio-4]
src/pixel/pixelator.js         pixelado + paletas                                           [pixel-3]
assets/manifest.json           BD de temas, cartas, fondos, audio, licencias                [assets-2]
assets/themes/<id>/*.webp      cartas 256×256 procesadas                                    [assets-2]
assets/bg/*.webp               fondos 1280/1920/2560                                        [assets-2]
assets/audio/*.ogg|.m4a        ambientes y sfx                                              [audio-4]
tools/pixelator.html           herramienta dev de pixelado y exportación                    [pixel-3]
tools/build-assets.mjs         optimiza, deduplica, genera manifiesto y CREDITS.md          [assets-2]
tools/serve.ps1                servidor de vista previa en la wifi                          [director]
doc/v2/*.md                    esta propuesta y hallazgos por ID
```

Sin bundler: módulos ES nativos, funciona con cualquier servidor estático (GitHub Pages incluido). Rutas relativas siempre (`./`), nunca absolutas, por el subpath de Pages.

## 7. Contratos entre módulos

### 7.1 Bus de eventos (`src/core/bus.js`)

`bus.on(evt, fn)`, `bus.off(evt, fn)`, `bus.emit(evt, payload)`. Eventos y quién los emite:

| Evento | Payload | Emite | Escuchan |
|---|---|---|---|
| `settings:changed` | `{ key, value, all }` | ui | scene, audio, state, pixel |
| `theme:load` | `{ themeId }` | ui / state | assets loader |
| `theme:ready` | `{ theme, textures }` | assets loader | scene, ui |
| `game:new` | `{ mode, cols, rows, themeId, seed }` | ui | state |
| `game:dealt` | `{ cards:[{id,pairKey,index}], seed }` | state | scene, audio, ui |
| `card:pick` | `{ index }` | scene (raycast) / ui (teclado) | state |
| `card:flip` | `{ index, faceUp }` | state | scene, audio |
| `pair:match` | `{ indices:[a,b], pairKey, streak, score }` | state | scene, audio, ui |
| `pair:miss` | `{ indices:[a,b] }` | state | scene, audio, ui |
| `hint:used` | `{ remaining }` | state | scene, audio, ui |
| `game:tick` | `{ elapsed, remaining }` | state (1 Hz) | ui |
| `game:pause` / `game:resume` | `{}` | ui / visibilidad | state, audio |
| `game:win` | `{ elapsed, moves, score, stars, isRecord, records }` | state | scene, audio, ui |
| `game:lose` | `{ reason:'timeout' }` | state | scene, audio, ui |
| `audio:unlocked` | `{}` | audio | ui |
| `layout:changed` | `{ kind:'mobile'|'tablet'|'desktop'|'ultrawide', w, h }` | scene | ui |

### 7.2 Ajustes (`localStorage["memorice.v2.settings"]`)

```json
{ "themeId":"plantas", "mode":"classic", "cols":4, "rows":4, "lang":"es",
  "ambientVolume":0.6, "sfxVolume":0.8, "ambientOn":true,
  "pixelScale":94, "palette":"original", "dither":"none", "reducedMotion":"auto" }
```

Récords en `localStorage["memorice.v2.records"]`: clave `"<themeId>:<cols>x<rows>:<mode>"` → `{ bestTime, bestMoves, bestScore, plays, updatedAt }`.

### 7.3 Manifiesto de assets (`assets/manifest.json`)

```json
{
  "version": 2,
  "themes": [{
    "id": "plantas",
    "name": { "es": "Plantas de interior", "en": "Houseplants" },
    "palette": "original",
    "backSymbol": "assets/themes/plantas/_back.webp",
    "easterEgg": { "match": "michi", "sfx": "cat_purr" },
    "cards": [{ "id": "snake_plant", "src": "assets/themes/plantas/snake_plant.webp",
                "w": 256, "h": 256, "license": "own", "attribution": "" }]
  }],
  "backgrounds": [{ "id": "jungle-rain", "srcset": { "1280": "assets/bg/jungle-rain-1280.webp",
                    "1920": "...", "2560": "..." }, "license": "...", "attribution": "..." }],
  "audio": {
    "ambient": { "rain-tropical": { "ogg": "assets/audio/rain-tropical.ogg", "m4a": "...", "loop": true, "gain": 0.7 } },
    "sfx": { "flip": {...}, "match": {...}, "miss": {...}, "deal": {...}, "win": {...}, "hint": {...}, "combo": {...}, "cat_purr": {...} }
  },
  "palettes": { "gameboy": ["#0f380f","#306230","#8bac0f","#9bbc0f"], "...": [] }
}
```

### 7.4 Pixelador

```js
import { pixelate, PALETTES } from './src/pixel/pixelator.js';
const canvas = pixelate(imageOrCanvas, { pixelScale: 94, palette: 'pico8', dither: 'none', size: 256 });
```

Pura, sincrónica, sin estado global; devuelve `HTMLCanvasElement` u `OffscreenCanvas`.

### 7.5 Audio

```js
import { audio } from './src/audio/engine.js';
await audio.init(manifest.audio);   // no reproduce nada hasta unlock()
audio.unlock();                      // en el primer pointerdown
audio.playSfx('match', { rate: 1 + streak*0.03 });
audio.ambient.start(['rain-tropical','jungle-birds']); audio.ambient.setIntensity(0.4);
audio.setVolume('ambient', 0.6);
```

## 8. Rendimiento y móvil

- Cartas 256 × 256 WebP (~6–12 KB c/u); un tema completo < 350 KB. Fondo ≤ 250 KB por tamaño. Audio inicial ≤ 2.5 MB, diferido.
- Sin bundler: ≤ 12 módulos, `<link rel=modulepreload>` para los críticos.
- Texturas compartidas por par; `KTX` no (complejidad), WebP + `NearestFilter` alcanza.
- Objetivo: 60 fps en móvil medio con 36 fichas; lluvia como `Points` con un solo `BufferGeometry`.
- Presupuesto de carga inicial (sin audio ambiente): **< 1.2 MB** incluido Three.js (~650 KB gz ≈ 170 KB).

## 9. Plan de producción: lote `v2-lote-1`

Cada tarea tiene ID, rama, worktree y archivo de hallazgos (custodia). Todas parten del andamiaje commiteado en la integradora (index.html, bus, main, manifiesto inicial). Paths disjuntos salvo `index.html`, que es del **director**: los agentes proponen cambios a `index.html` en su hallazgo, no lo editan.

| ID | Rol | Entregables | Paths propios |
|---|---|---|---|
| `core-1` | Ingeniero de motor/3D | estado del juego con modos, puntaje, récords, semilla, pista; escena Three.js con fichas de vidrio, lluvia, layouts | `src/core/state.js`, `src/scene/**`, `vendor/**` |
| `assets-2` | Técnico de arte / assets | pipeline `sharp`, dedupe y optimización de las 30 plantas, descarga CC0 de 3 temas nuevos, fondo selva optimizado, `manifest.json`, `CREDITS.md` | `assets/**`, `tools/build-assets.mjs` |
| `pixel-3` | Ingeniero gráfico | `pixelator.js`, paletas, ingeniería inversa de pixelater.net (grado 94), `tools/pixelator.html` | `src/pixel/**`, `tools/pixelator.html` |
| `audio-4` | Diseñador de sonido | motor de audio, curación CC0 lluvia/selva, compresión ogg/m4a, mapa de sonidos, retiro de v1 | `src/audio/**`, `assets/audio/**`, `sound/` (limpieza) |
| `design-5` | Diseñador UI/UX | canvas `/design` con 3 artboards (móvil, tablet, 32:9) + escritorio, guía de estilo, entrega de tokens verificados | `doc/v2/design-5-*.md` |
| `ui-6` | Ingeniero front UI | HUD, ajustes, victoria, récords, i18n es/en, CSS responsivo, accesibilidad | `src/ui/**`, `styles/**`, `src/i18n/**` |

Integración: el director mergea por PR en orden `assets-2` → `pixel-3` → `audio-4` → `core-1` → `ui-6`, con `design-5` como referencia de aceptación visual. Luego smoke test en los 4 viewports y servidor de vista previa en la wifi (`tools/serve.ps1`).

## 10. Criterios de aceptación del lote

- [ ] `index.html` abre desde servidor estático, sin bundler, sin errores en consola, en Chrome Android, Safari iOS, Chrome escritorio.
- [ ] Fichas de vidrio con volumen, transiciones suaves, sin `alert()`.
- [ ] 4 temas jugables; cambiar tema no recarga la página.
- [ ] Marcadores, récords, pista, pausa, 4 modos funcionan; récords persisten al recargar.
- [ ] Ambiente lluvia+selva loop sin costura audible; arranca tras el primer toque; volúmenes persistentes.
- [ ] Pixelado y paleta cambian las cartas en vuelo en < 500 ms para 18 pares.
- [ ] Layout correcto en 390 × 844, 1024 × 768, 1920 × 1080 y 5120 × 1440.
- [ ] Carga inicial < 1.2 MB sin audio; Lighthouse móvil rendimiento ≥ 85.
- [ ] `CREDITS.md` con licencia y atribución de cada asset externo.
- [ ] Visto bueno del diseño gráfico sobre el canvas de `design-5` antes de mergear a `main` y activar Pages.
