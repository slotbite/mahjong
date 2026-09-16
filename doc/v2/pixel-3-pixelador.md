# pixel-3 · Pixelador: hallazgos

**Tarea:** `pixel-3` · **Rama:** `feat/v2_pixel-3-pixelador` · **Propuesta:** `doc/v2/PROPUESTA_V2.md` §2.5, §7.2, §7.4, §8.
**Entregables:** `src/pixel/pixelator.js`, `src/pixel/quantize.js`, `tools/pixelator.html`, `tests/pixelator.test.mjs`, `doc/v2/pixel-3/comparativa-{1,2,3}.png`.

## 1. Qué hace pixelater.net (ingeniería inversa del comportamiento)

Inspeccionado con `agent-browser` el 2026-09-16 en `https://www.pixelater.net/es/pixel-art-maker` (app Next.js; la lógica vive en el chunk `_next/static/chunks/6e02efaa235b1140.js`, leído solo para entender el flujo, no copiado).

| Control | Rango / valores | Cómo actúa |
|---|---|---|
| **Resolution → "Pixel Width"** | slider `8..512`, paso `8`, default **128 px** | Es el **ancho de la rejilla en celdas**, no un porcentaje. `width = n`, `height = round(n · h/w)`. |
| Dithering | `None`, `Floyd-Steinberg`, `Atkinson`, `Ordered` (Bayer 8×8), `2x2 Bayer`, `4x4 Bayer`, `Clustered 4x4` | Se aplica sobre la rejilla ya reducida, mezclado con la cuantización (error-diffusion) o sumando umbral (ordenado). |
| Strength | slider `0..100`, paso `5`, default **80 %** | Escala el error difundido / la amplitud del umbral. |
| Enable Custom Palette | switch | Sin paleta = colores libres (no cuantiza). |
| Paleta | 20 presets: Retro 64, Beach Paradise, Pixel Perfect 32, Neon Dreams 14, Minimal 8, Mystical Forest, Acid Green, Cosmic Dust, Vintage 64, Space Odyssey, Modern 42, Pastel 29, Sunset 8, **PICO-8**, **Sweetie 16**, Retrowave 24, Fantasy 24, Oil Paint 6, Epic Journey; más `+ Add Color` | Mapeo al color más cercano por **distancia euclídea RGB plana** (`dr²+dg²+db²`). |
| Export | PNG a resolución original; "HD" = ×4 | Upscale nearest (`imageSmoothingEnabled = false`). |

Flujo interno observado: `pixelate({ image, width, dither, strength, palette, resolution:'original' })` → `drawImage` a `n × round(n·h/w)` **con `imageSmoothingEnabled=false`** (o sea, submuestreo por vecino más cercano, no promedio) → dithering/cuantización en `ImageData` → `drawImage` de vuelta al tamaño original sin suavizado. No hay "grado 0..100": el único parámetro de resolución es el ancho en celdas.

**Pixelicious** (los archivos v1 se llaman `*-pixelicious.png`): `pixelicious.xyz` hoy redirige a `scenario.com/features/pixelate` (herramienta absorbida por Scenario); no queda UI pública que inspeccionar y Wayback devolvió 429 durante la sesión. Lo que sí se pudo **medir** en los propios assets v1 (30 PNG en `img/`):

- Todos son de **512 px de ancho** (alto libre: 495..1024) y sus celdas miden **exactamente 4 px** (pico 100 % en el histograma de transiciones módulo 4, 0 % en módulo 8) → **128 celdas de ancho**.
- Cada imagen tiene 10..44 colores, casi todos de una misma paleta compartida (ver `plantas-v1` en §4); `82ba85…` usa otra de 12 colores (5 verdes/crema).
- Conclusión (inferida, no verificable en el sitio original): la herramienta trabajaba en **px de celda sobre la imagen de 512** y el "94" del autor equivale a una celda de 4 px.

## 2. `cellsFor(pixelScale)` y por qué 94 ≡ lo que usaba el dueño

`src/pixel/quantize.js`:

```
cellPxFor(s) = max(1, (100 − s) · 2/3)          // px de celda sobre una imagen de referencia de 512 px
cellsFor(s)  = clamp(round(512 / cellPxFor(s)), 8, 128)
```

| grado | 0 | 25 | 50 | 75 | 88 | 91 | 94 | 100 |
|---|---|---|---|---|---|---|---|---|
| celda @512 (px) | 66.7 | 50 | 33.3 | 16.7 | 8 | 6 | **4** | 1 (tope) |
| celdas N×N | **8** | 10 | 15 | 31 | 64 | 85 | **128** | 128 |

- Monótona no decreciente, `0 → 8×8` (imagen casi lisa), `100 → 128×128`, y **94 → 128 celdas = celda de 4 px sobre 512**, exactamente lo medido en las cartas v1. La constante 2/3 sale de `(100 − 94) · k = 4`.
- De 94 a 100 la función está en el tope (128): se documenta como comportamiento esperado; la textura de juego es de 256 px, así que 128 celdas ya es celda de 2 px y más fino deja de leerse como pixel art.
- Verificación: `snake_plant.png` re-pixelada con grado 94 / `original` 16 es visualmente idéntica a la carta v1 (idempotencia, comparativa 1). Una foto cruda CC0 con grado 94 y `original` 6 colores da el mismo carácter (~5 tonos, celda de 2 px @256) que `82ba85…-pixelicious.png` (comparativa 2).

## 3. Algoritmo implementado (`pixelate`)

1. **Contain** en un lienzo de trabajo `W×W`, `W = N·k`, `k = round(size/N)`, para que cada celda cubra `k×k` px exactos (suavizado `high` del navegador para bajar de la resolución fuente).
2. **Promedio por celda respetando alfa** (`downsampleAverage`, premultiplicado: los bordes transparentes no arrastran negro). A diferencia de pixelater.net (vecino más cercano), el promedio evita aliasing en fotos y en las cartas ya pixeladas es neutro.
3. **Alfa binario** (umbral 128) para bordes limpios en la textura del vidrio.
4. **Dithering** opcional: `bayer` (4×4, amplitud 32 niveles, **antes** de cuantizar) o `floyd` (difusión 7/16 3/16 5/16 1/16 durante la cuantización, no se difunde hacia transparentes).
5. **Cuantización**: `original` = median-cut sobre histograma 5-5-5 + 3 iteraciones k-means (RGB ponderado por luminancia) a `colors` (default 16); paleta nombrada = color más cercano en **CIE Lab** (ΔE76²) con caché por RGB de 24 bits.
6. **Upscale nearest** a `size×size` y `putImageData`. Devuelve `OffscreenCanvas` si la fuente lo es.

API (`src/pixel/pixelator.js`): `pixelate(source, { pixelScale=94, palette='original', dither='none', size=256, colors=16, ditherStrength=1 })`, `PALETTES`, `registerPalettes(obj)`, `listPalettes()` → `[{id,name,colors}]` (para `ui-6`), `cellsFor`, `cellPxFor`, `pixelateCached(img, settings, extra)`, `clearCache()`, `init(ctx)`.
`init(ctx)` registra `ctx.manifest.palettes`, expone `window.__pixelate(img, { srcId?, size?, colors? })` (para `core-1`) con caché `Map` LRU de 200 entradas por `(srcId, pixelScale, palette, dither, size, colors)`, y vacía la caché al recibir `settings:changed` de `pixelScale|palette|dither`.

## 4. Paletas

| id | colores | fuente |
|---|---|---|
| `original` | 4..32 derivados de la imagen | median-cut + k-means propio |
| `gameboy` | 4 | DMG-01 clásica (`#0f380f #306230 #8bac0f #9bbc0f`), igual al manifiesto |
| `pico8` | 16 | paleta oficial PICO-8 (Lexaloffle), igual al manifiesto |
| `nes` | 54 | 2C02 estándar (64 entradas sin negros/`$0D` duplicados; se omite `#f8f8f8` casi idéntico a `#fcfcfc`) |
| `sweetie16` | 16 | GrafxKid, Lospec |
| `endesga32` | 32 | Endesga, Lospec |
| `cga` | 16 | IBM CGA RGBI |
| `cozy-pastel` | 12 | manifiesto (`assets/manifest.json`), tokens del director |
| `jungle-dusk` | 12 | manifiesto, derivada de `styles/tokens.css` |
| `plantas-v1` | 16 | **medida**: los 16 colores más frecuentes de las 30 cartas v1 (`img/*.png`) |

`registerPalettes` tolera duplicados (el manifiesto de `assets-2` reemplaza a la interna del mismo id), acepta `{id: [hex]}` o `{id: {name, colors}}` y descarta entradas inválidas.

## 5. Rendimiento (medido en Chromium headless, escritorio, `tools/pixelator.html` → "Medir rendimiento ×36")

| caso (36 imágenes 512 → 256, pico8, grado 94) | total | por imagen |
|---|---|---|
| dither `none` | **142 ms** | 3.9 ms |
| dither `floyd` | 175 ms | 4.9 ms |

Objetivo §8 (< 500 ms para 36) cumplido con margen ~3.5×. Foto de 1280×1707 → 256 con `original` 16: 28 ms (dominado por `drawImage` del contain). Sin `getImageData` por píxel: una sola lectura del lienzo de trabajo y aritmética sobre `Uint8ClampedArray`.

## 6. Tests

`node --test tests/pixelator.test.mjs`: **19/19** pasan (Node 25). Cubren `cellsFor` (extremos, 94→128, monotonía en 0..100, entradas basura), hex/Lab/distancia, `nearestIndex`, promedio con alfa, upscale nearest, alfa binario, median-cut (recupera colores exactos, degradado a k, transparentes ignorados), Bayer (determinista, media conservada), Floyd-Steinberg (50 % gris → ~50 % blancos; strength 0 ≡ snap), `quantizeBuffer`, tamaños canónicos de `PALETTES`, `registerPalettes`/`listPalettes`.

## 7. Verificación visual (`doc/v2/pixel-3/`)

- `comparativa-1.png`: `snake_plant.png` v1 → grado 94 `original` 16 (idéntica), `plantas-v1`, grado 88 (64 celdas), grado 75 `gameboy`.
- `comparativa-2.png`: foto cruda CC0 ("Fern plant in a pot", Wikimedia Commons, CC0) → grado 94 `original` 6, `plantas-v1`, `jungle-dusk`+Floyd, junto a la referencia `82ba85…-pixelicious.png`.
- `comparativa-3.png`: barrido del grado 0/25/50/75/88/94 y Bayer 4×4.

## 8. Cambios propuestos para `index.html` (no editado)

```diff
   <link rel="modulepreload" href="./src/core/settings.js">
+  <link rel="modulepreload" href="./src/pixel/pixelator.js">
+  <link rel="modulepreload" href="./src/pixel/quantize.js">
```

Nada más: `src/main.js` ya hace `tryInit('./pixel/pixelator.js')` y el módulo no necesita DOM propio.

## 9. Notas para vecinos

- **core-1**: `const canvas = window.__pixelate(img, { srcId: card.id })` al crear la textura (`THREE.CanvasTexture`, `NearestFilter`, sin mipmaps). Al recibir `settings:changed` con `pixelScale|palette|dither`, volver a llamar: la caché ya se vació. Si se pasa `ImageBitmap`, indicar `srcId` (no tiene `src`).
- **ui-6**: `import { listPalettes, cellsFor } from '../pixel/pixelator.js'` para poblar el select y mostrar "N×N celdas" junto al slider; `settings.set('pixelScale', n)`.
- **assets-2**: puede añadir `nes`, `sweetie16`, `endesga32`, `cga` al manifiesto; `registerPalettes` los sobreescribe sin conflicto. Sugerencia: incluir también `plantas-v1` (§4) en `manifest.palettes` para que el tema `plantas` conserve su look si el jugador elige una paleta fija.

## 10. Bloqueos / pendientes

- Pixelicious ya no existe como sitio público: el mapeo 94 → 4 px es una inferencia coherente con los assets, no una lectura del código original.
- `canvas.toBlob('image/webp')` depende del navegador (Chromium/Firefox sí; Safari según versión). La herramienta ofrece PNG como alternativa.
- "Exportar todo" es descarga secuencial (sin zip): Chrome pide permiso de descargas múltiples la primera vez.
- No se tocaron `index.html`, `src/main.js`, `src/core/**`, `styles/**`, `assets/**`.
