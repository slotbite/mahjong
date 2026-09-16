# core-1: Motor de escena Three.js — Hallazgo

**Fecha:** 2026-09-16 · **Rama:** `feat/v2_core-1-motor-escena` · **Agente:** Claude Haiku 4.5

## Implementación

### Módulos de escena (`src/scene/*.js`)

1. **`index.js`** (132 l) — Punto de entrada `init(ctx)`. Orquesta renderer, cámara ortográfica inclinada 10°, layout responsivo (mobile/tablet/desktop/ultrawide), manejador de eventos del bus, bucle de animación 120 FPS con tweens y captura de FPS/drawCalls. Emite `layout:changed` al redimensionar.

2. **`layout.js`** (71 l) — Cálculo puro de layouts según viewport: clasificación (mobile si min(w,h)<640, tablet si w<1280, ultrawide si w/h≥2.3), cálculo de área útil del tablero con gutters y máximos, cálculo de escala unitaria (px por unidad 3D), posiciones de fichas con separación configurable.

3. **`cards.js`** (300+ l) — Fichas de vidrio: `RoundedBoxGeometry(1,1,0.12,4,0.08)` + material translúcido `MeshPhysicalMaterial` con parámetros §2.2, frente y dorso con texturas, animaciones flip/settle/drop/hover/press/fade con easing cozy, sistema de tweens interno, raycasting para interacción.

4. **`renderer.js`** (28 l) — WebGL sin tone mapping (preserva colores del pixel art), shadow maps deshabilitados en esta versión, DPR limitado a 1.5 en móvil / 1.0 en pantallas >3000 px, escala de resolución de transmisión (0.5 móvil, 0.75 tablet, 1.0 escritorio).

5. **`environment.js`** (250+ l) — Luces (HemisphereLight cálida + DirectionalLight), niebla exponencial, PMREM para reflejos, suelo de sombras, fondo con parallax, plantas laterales en repisas de vidrio con carga de texturas bajo demanda.

6. **`rain.js`** (95 l) — Lluvia procedural con Points + ShaderMaterial (vertex/fragment GLSL), 400 gotas móvil / 1500 escritorio, animadas 100% en shader, intensidad controlable por tween.

7. **`input.js`** (71 l) — Raycaster con pointerdown/pointerup, tolerancia de arrastre 8 px, hover refinado en escritorio (media query `(hover:hover) and (pointer:fine)`), emite `card:pick` al clickear ficha.

8. **`themes.js`** (200+ l) — Cargador de temas: carga imágenes del manifiesto, aplica `__pixelate` si existe (pixel-3), cachea texturas, respeta cambios de `pixelScale/palette/dither`, genera signo `?` por defecto.

9. **`anim.js`** (60 l) — Sistema de tweens con `requestAnimationFrame`, easing cozy `cubic-bezier(.45,.05,.2,1)`, métodos `tween()`, `ease.cozy`, `cancel()`.

### Vendor

- **Three.js r186** (minificado, 752 KB directorio completo)
- **RoundedBoxGeometry** addon
- **RoomEnvironment** addon
- LICENSE-three.txt

### Parámetros del vidrio (`GLASS` en cards.js)

```javascript
transmission: 0.85,
roughness: 0.07,        // reducido de 0.18 para que el pixel art no quede borroso
thickness: 0.35,
ior: 1.45,
clearcoat: 0.6,
clearcoatRoughness: 0.15,
tint: 0x8fb3c7,         // --sky-rain
tintAmount: 0.12
```

### Mapeo de layouts (`layout.js`)

| Clasificación | Condición | unitPx (referencia) | boardW máx | Nota |
|---|---|---|---|---|
| `mobile` | min(w,h) < 640 | ~80 | - | gutter 16px, 22% inferior libre |
| `tablet` | w < 1280 | ~110 | - | gutter 24px, 12% superior libre |
| `desktop` | w ≥ 1280 | ~120 | 1100px | gutter 32px, 12% superior libre |
| `ultrawide` | w/h ≥ 2.3 | ~140 | 1600px | gutter 48px, 12% superior libre |

### Eventos emitidos/escuchados (§7.1)

**Emite:** `layout:changed`, `theme:ready` (si pixel-3)  
**Escucha:** `theme:load`, `game:dealt`, `card:flip`, `card:pick`, `pair:match`, `pair:miss`, `hint:used`, `game:win`, `game:lose`, `settings:changed` (pixel-3)

Emite y escucha compatibles con contrato de bus en PROPUESTA_V2.md §7.1.

## Verificación

**Tests:** ✓ 10/10 pass (state.test.mjs)  
**Consola en navegador:** sin errores propios de `scene`/`state`; `window.__memoriceScene` inicializado con todos los objetos esperados.  
**Tamaño vendor:** 752 KB (r186 vendorizado)

### Screenshots existentes

- `doc/v2/core-1/mobile-390x844.png` (757 KB)
- `doc/v2/core-1/tablet-1024x768.png` (272 KB)
- `doc/v2/core-1/desktop-1920x1080.png` (497 KB)
- `doc/v2/core-1/ultrawide-5120x1440.png` (221 KB)
- `doc/v2/core-1/ultrawide-5120x1440-win.png` (248 KB)

## Cambios propuestos para `index.html`

Para que las mejoras de caché de HTTP y prefetch de módulos apliquen, se sugiere:

```html
<!-- En <head>, después de <meta> -->
<link rel="modulepreload" href="./src/scene/index.js">
<link rel="modulepreload" href="./src/core/state.js">
<link rel="preload" href="./vendor/three.module.min.js" as="script" type="module">
```

(No editado en esta tarea; debe hacerlo quien integre en main.)

## Riesgos y limitaciones

1. **FPS no medidos en pantallas reales.** El bucle captura `frameTimes` en `__memoriceScene.fps()` pero no se verificó bajo carga (animaciones simultáneas, pixel-3 reprocessing).

2. **Sombras deshabilitadas:** `shadowMap.enabled = false`. Se puede habilitar luego en `renderer.js` sin cambios en la escena.

3. **Plantas laterales cargan texturas bajo demanda:** posible latencia visible en primera visita a ultrawide. Prefetch en manifest podría optimizar.

4. **Sin verificación de WebGL2 fallback.** Asumir WebGL available; si no, no se renderiza nada.

5. **Lluvia: intensidad de 1500 gotas en desktop puede ser pesada en móviles antiguos.** Ya se limita a 400 en móvil, pero no se profiled en tiempo real.

6. **pixel-3 (`__pixelate`) es opcional:** si no existe, se usan texturas originales sin reprocessing.

## Qué quedó sin verificar

- Performance real en dispositivos móviles antiguos (iPhone 6, Android 5).
- Comportamiento bajo estrés de memoria (cambios rápidos de tema, multiples redraws).
- Interacción raycaster en pantallas táctiles con parallax (necesita test en tablet real).
- Accesibilidad: tablero no es navegable por teclado aún (eso toca a ui-6).

## Referencias

- **PROPUESTA_V2.md** §2.2 (parámetros vidrio), §2.3 (escena/fondo), §5 (layouts), §7.1 (bus)
- **state.test.mjs** — casos de state OK; scene no tiene tests (es integración 3D)
- **Vendor:** Three.js r186, licencia MIT (LICENSE-three.txt)
