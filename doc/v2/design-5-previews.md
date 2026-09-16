# design-5 — Vistas previas y guía de estilo de Memorice Cozy v2

## Cómo ver las previews (local)

**Rama:** `feat/v2_design-5-previews` · **Fuente:** `doc/v2/design-5/` · **Propuesta base:** `doc/v2/PROPUESTA_V2.md` §1, §2, §4, §5

Para ver los artboards en tamaño real en tu navegador:

```bash
# En la raíz del worktree (mahjong/cowfish/.claude/worktrees/design-5)
python -m http.server 8085 --bind 127.0.0.1

# Luego abre en el navegador:
http://127.0.0.1:8085/doc/v2/design-5/
```

El archivo `index.html` proporciona una navegación interactiva con lista de artboards, visor de tamaño real, e iframes embebidos para cada diseño.

**Nota:** El canvas publicado por error en Claude Artifacts queda pendiente de eliminación por el dueño (desde `/artifacts` en Claude Code, tecla d). La entrega válida es solo local.

Los PNG de cada artboard están en `doc/v2/design-5/png/` (todos ≤ 500 KB).

## 1. Artboards entregados

| # | Artboard (archivo) | Tamaño | Qué muestra |
|---|---|---|---|
| 1 | Móvil · partida (`Main.dc.html`) | 390 × 844 | Tablero 4×4 con cartas de 82 px, gutter 16 px, pareja *snake plant* emparejada (elevada, brillo lima), *michi* en miss inclinado 8°, bottom sheet de vidrio con tiempo / movs / puntaje / racha + Pista · Pausa · Ajustes |
| 2 | Móvil · ajustes (`MovilAjustes.dc.html`) | 390 × 844 | Cajón inferior de 776 px: tema (chips con miniatura), rejilla, modo, idioma es/en, ambiente y efectos (sliders en línea), grado de pixelado en **94**, paleta con muestras de color, dithering, movimiento reducido. Todo cabe sin scroll |
| 3 | Tablet (`Tablet.dc.html`) | 1024 × 768 | Tablero 6×4 (cartas 104 px) centrado, HUD superior de vidrio de 68 px, botones flotantes de ajustes y sonido (56 px), plantas reales en repisas de vidrio a los lados, dos huecos con luz |
| 4 | Escritorio · victoria (`Escritorio.dc.html`) | 1920 × 1080 | Tablero 6×6 (cartas 118 px) ya resuelto en huecos, pantalla de victoria (3 estrellas, tiempo, movimientos, puntaje, chip "¡Nuevo récord!", Otra / Cambiar tema / Compartir), tabla de récords al lado |
| 5 | Ultra-wide 32:9 (`UltraWide.dc.html`) | 2048 × 576 (**escala 0,4** de 5120 × 1440) | Tablero 6×6 de 1286 px centrado, isla izquierda (marca, marcadores, pista/pausa, récords) e isla derecha (tema, modo, rejilla, ambiente, pixelado), repisas de plantas en dos profundidades, helechos colgantes, lluvia densa |
| 6 | Guía de estilo (`Guia.dc.html`) | 1600 × 2760 | Paleta con tokens y usos, vidrio y radios, tipografía, anatomía de la ficha (frente, dorso, volumen al girar, perfil acotado 1 × 0.12 u, r 0.08, plano de arte a 0.02), 6 estados, 12 iconos pixel 16×16, 4 temas con 3–5 ejemplos |

Notas adhesivas junto a cada artboard resumen las transiciones (flip 600 ms, settle 900 ms, miss 1 100 ms, reparto 40 ms/ficha, UI 260 ms, `--ease-cozy`) y las decisiones de cada viewport.

Arte real usado en las fichas: `snake_plant`, helecho colgante (`82ba…-pixelicious` → `fern.png`, con el fondo crema recortado), `mostera`, `michi`, `helecho`, `dragon_plant`, `frog_green`, dorso `question`. Los temas selva / cozy / geek usan placeholders pixel 16×16 dibujados en SVG (rana, tucán, mariposa, taza, vela, libro, mando, d20, disquete) hasta que `assets-2` entregue los CC0 a 256 × 256.

## 2. Decisiones de diseño

- **Contraste pixel / vidrio.** La ficha es un bloque de vidrio con especular diagonal, brillo superior, canto inferior tintado en `--sky-rain` y sombra profunda; el arte va al 76 % del lado con sombra propia hacia abajo, lo que lo hace "flotar" dentro. El dorso es más esmerilado (blur 12 frente a 7) para que el `?` se lea como grabado.
- **Jerarquía del HUD.** Etiquetas Nunito 700 · 11 px en mayúsculas con tracking .10em al 68 % de opacidad; valores Pixelify Sans 26 px; el **puntaje** siempre en `--lime` como único acento. Orden: Tiempo · Movs · (Pares) · Racha · Puntaje.
- **El HUD sigue al pulgar.** En móvil el HUD es un bottom sheet (marcadores arriba, acciones abajo: Pista con contador, Pausa, Ajustes). En tablet y escritorio pasa arriba; en 32:9 se convierte en dos islas pegadas al tablero.
- **Ajustes en cajón** con tres secciones en este orden: Partida (tema, rejilla, modo, idioma) → Sonido → Imagen (pixelado, paleta, dithering, movimiento reducido). Controles segmentados para valores discretos, sliders para continuos, select con muestras de color para la paleta.
- **Victoria como panel de vidrio** de 620 px centrado sobre el tablero ya vacío (los huecos con luz quedan como fondo), con el primario terracotta solo en *Otra*; récords en un panel hermano a la derecha, mismo eje superior.
- **Fondo estilizado en el mockup**: capas CSS/SVG (cielo degradado, hojas grandes desenfocadas, niebla, gotas SVG, viñeta). En producción se reemplaza por el webp de `assets-2` + partículas Three.js; las proporciones de luz y oscuridad son las que hay que respetar.
- **Iconografía pixel art 16×16** monocolor `--cream` con acento `--lime` (pista), escalada nearest a 22 / 26 px dentro de botones de 44 / 56 px. No se usan emoji ni glifos.

## 3. Desvíos respecto a la propuesta (el director decide si actualiza `styles/tokens.css`)

| # | Propuesta | Mockup | Por qué |
|---|---|---|---|
| D1 | `--radius-card: 14px` (UI) | Radio de ficha **8 % del lado** (= 0.08 u del 3D): 82 px → 6.5 px, 118 px → 9.5 px, 196 px → 16 px | A 14 px fijos la ficha de 82 px se ve redonda y la de 196 px casi cuadrada; el porcentaje mantiene la misma silueta que la geometría 3D en todos los viewports. Propuesta: `--radius-tile: 8%` y dejar `--radius-card` para tarjetas de UI |
| D2 | Botón primario terracotta (texto implícito cream) | Texto **`--bg-deep`** sobre terracotta | cream/terracotta da 2.8:1 (falla AA); bg-deep/terracotta da 4.6:1 |
| D3 | Un solo `--glass-fill` | Paneles que se apoyan sobre el tablero (cajón, islas, récords, victoria) usan `--glass-fill` sobre **rgba(15,42,34,.45)** (o rgba(31,77,58,.42) en victoria) | Con el tablero detrás, el vidrio al 14 % no da contraste AA para el texto. Propuesta: token `--glass-fill-dark` |
| D4 | `--radius-panel: 20px` | 20 px base · 24 px bottom sheet móvil · 28 px cajón · 34 px islas 32:9 | Los radios escalan con el tamaño del panel para no verse "de teléfono" en 49" |
| D5 | Ultra-wide: tablero máx. 1600 px de ancho | Tablero 6×6 de **1286 px** (cartas 196 px, gap 22) | En 6×6 manda el alto (1440 − márgenes); el tope de 1600 solo se alcanzaría en 6×4. Islas de 560 px a 70 px del tablero: el HUD queda a < 1 000 px del centro |
| D6 | Tablet: botón flotante de ajustes | Ajustes **y sonido** flotantes (56 px) abajo a la derecha | Silenciar es la acción más frecuente en tablet sobre la mesa; no justifica abrir el cajón |
| D7 | Tablet: 2 plantas laterales | 2 repisas grandes + 1 helecho pequeño en repisa alta izquierda | Equilibra el peso del HUD; el helecho colgante junto al HUD tapaba los marcadores y se quitó |
| D8 | Tinte del vidrio 12 % `--sky-rain` (3D) | En el mockup 2D el tinte visible es ~18 % en el canto inferior y 0–10 % en la cara | Es una aproximación 2D; §2.2 sigue mandando para `core-1`, ver §5 |
| D9 | Marcadores: tiempo, movimientos, pares, racha, puntaje | En móvil se muestran 4 (sin *Pares*); los pares van como texto "2 / 8 pares" bajo el título | 5 marcadores no caben en 358 px con Pixelify 26 sin romper la jerarquía |
| D10 | — | Sliders de sonido en móvil en línea con su etiqueta (36 px de alto visual, pista de 150 px) | Para que el cajón completo quepa en 844 px sin scroll; el área táctil del knob debe seguir siendo 44 px (padding invisible) |

## 4. Checklist de aprobación para el dueño (sí / no)

1. [ ] Las fichas se ven como **vidrio translúcido, cuadradas, con volumen** y el pixel art flotando nítido dentro.
2. [ ] El dorso con `?` pixel art se reconoce a 82 px en móvil.
3. [ ] Los estados **match** (lima, elevada) y **miss** (inclinada, terracotta) se distinguen de un vistazo.
4. [ ] El **hueco con luz** que deja una pareja se lee como "ya resuelto" y no como error.
5. [ ] La paleta (verde profundo, musgo, lima, crema, terracotta, azul lluvia) transmite "selva lluviosa al anochecer, rincón cozy".
6. [ ] Pixelify Sans para marcadores + Nunito para el resto es la combinación deseada.
7. [ ] En **móvil** el HUD inferior con pulgar es cómodo y el cajón de ajustes tiene todo lo necesario en el orden correcto.
8. [ ] En **32:9** el centro no se siente vacío y las islas dejan los marcadores a la vista sin girar la cabeza.
9. [ ] La **pantalla de victoria** (estrellas, récord, Otra / Cambiar tema / Compartir) y la tabla de récords son lo que se espera al ganar.
10. [ ] Los placeholders de selva / cozy / geek indican bien la dirección de cada tema (el arte final lo trae `assets-2`).

## 5. Recomendaciones para los vecinos

### `ui-6` (HUD, ajustes, victoria, récords)

- **Jerarquía del HUD:** `.stat` = etiqueta `Nunito 700 11px/1, letter-spacing .10em, uppercase, rgba(244,234,216,.68)` + valor `Pixelify Sans 26px/1` (54 px en islas 32:9, 30 px en victoria). Puntaje en `--lime`; nada más en lima dentro del HUD. `white-space: nowrap` en valores y botones; miles con espacio fino (`1 240`).
- **Layouts por `layout:changed`:** `mobile` → bottom sheet (`left/right/bottom: 16px`, radio 24, padding 14/16/16, dos filas: marcadores y acciones); `tablet`/`desktop` → barra superior de 68–72 px (`max-width 1100px` en escritorio) con marca + subtítulo "Tema · Modo · Rejilla" a la izquierda, marcadores al centro (gap 26–40), Pista/Pausa/Ajustes a la derecha; `ultrawide` → dos islas de 560 px (padding 34/36, radio 34) a 70 px del tablero, izquierda marcadores+récords, derecha ajustes rápidos+tema.
- **Tamaños táctiles:** botones 44 px (icono 22 px), flotantes 56 px (icono 26 px), botones de victoria 52 px; controles segmentados de 36 px de alto dentro de un contenedor con padding 4 y radio 14; knob de slider 22 px visibles con área táctil 44 px; chips de tema 44 px de miniatura + etiqueta.
- **Orden del cajón de ajustes:** Partida (Tema → Rejilla → Modo → Idioma) · Sonido (Ambiente → Efectos) · Imagen (Grado de pixelado → Paleta → Dithering → Movimiento reducido). Encabezados de sección `Nunito 700 11px uppercase --lime`. El cajón sube 776 px en 844 y todo cabe sin scroll; con fuentes del sistema más grandes debe hacer scroll interno, nunca crecer fuera de pantalla.
- **Paleta:** select con nombre + 6 muestras de 12 px (radio 3) tomadas de `manifest.palettes`; Dithering como segmentado Ninguno / Bayer / F-S.
- **Victoria:** panel de 620 px (padding 32/36, radio 28, fondo `rgba(31,77,58,.42)` + blur 26), estrellas pixel 44 px en `#f4d35e`, título Pixelify 44, chip de récord en lima, tres tarjetas de vidrio (tiempo / movimientos / puntaje, esta última con borde lima), fila de botones `Otra` (primario) · `Cambiar tema` · `Compartir` con iconos pixel. Récords: panel de 300 px, filas con separador `rgba(255,255,255,.1)`, valor destacado en lima.
- **Iconos:** usar los sprites 16×16 de `build.mjs` (`SPRITES`) como SVG inline con `shape-rendering: crispEdges`; un color `currentColor` salvo el acento de la pista.

### `core-1` (fichas 3D y escena)

- Mantener §2.2 (`transmission .85`, `roughness .18`, `thickness .35`, `ior 1.45`, `clearcoat .6`, tinte `--sky-rain` 12 %). Del mockup, tres matices que conviene reproducir: (a) el **dorso más esmerilado** que el frente (roughness ~.35 o un plano interior con textura de grano); (b) un **especular diagonal** fijo (luz direccional desde arriba-izquierda) que recorra la cara al girar; (c) el **canto** con más tinte que la cara (el vidrio acumula color en el espesor).
- **Radio de ficha 0.08 u** con 4 segmentos, en todos los tamaños (D1).
- **Estados:** hover eleva 0.04 u y sube emissive del borde (260 ms); seleccionada emissive `--sky-rain`; match eleva 0.3 u, emissive `--lime`, desvanece 900 ms; miss inclina 8° con tinte `--terracotta` en el borde y vuelve a los 1 100 ms; **hueco** = plano con luz radial `--lime` al 20 % que decae a 0 en 900 ms y queda como un brillo residual del 6 %.
- **Escena:** plantas laterales como sprites con `NearestFilter` sobre repisas de vidrio (12 px de alto en tablet, 18 px en 32:9); en 32:9 dos profundidades de repisas (la lejana al 55 % de opacidad y desenfoque leve) y helechos colgantes desde el borde superior; lluvia 160 gotas móvil / 420 tablet / 900 escritorio / 2 400 ultra-wide en el mockup, ajustable a los presupuestos de §2.3.
- **Layout del tablero:** móvil `S = (ancho − 32 − 3·gap) / 4` con gap 10; tablet cartas 104 gap 12; escritorio 118 gap 14; ultra-wide 196 gap 22 (limitado por alto). El tablero empieza 40 px bajo el HUD en tablet/escritorio y a 190 px en móvil.

## 6. Archivos

```
doc/v2/design-5-previews.md      este documento
doc/v2/design-5/index.html       navegador local de artboards (abre en http://127.0.0.1:8085/doc/v2/design-5/)
doc/v2/design-5/support.js       soporte para web component <x-dc>
doc/v2/design-5/build.mjs        genera los *.dc.html y canvas.json (node build.mjs)
doc/v2/design-5/render-pngs.mjs  renderiza PNG de cada artboard a doc/v2/design-5/png/
doc/v2/design-5/*.dc.html        6 artboards interactivos (Main, MovilAjustes, Tablet, Escritorio, UltraWide, Guia)
doc/v2/design-5/canvas.json      posiciones, títulos y notas del lienzo
doc/v2/design-5/png/*.png        6 screenshots PNG, uno por artboard (≤ 500 KB cada uno)
doc/v2/design-5/*.png (arte)     8 assets de plantas y personajes (snake_plant, michi, etc.)
```
