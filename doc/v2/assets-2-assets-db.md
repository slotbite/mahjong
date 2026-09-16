# assets-2 — BD de assets, pipeline sharp, temas CC0, fondo selva

**ID:** `assets-2` · **Rama:** `feat/v2_assets-2-assets-db` · **Worktree:** `.claude/worktrees/assets-2` · **Estado:** listo para PR (sin push)

## Qué se entregó

| Path | Qué es |
|---|---|
| `tools/build-assets.mjs` | Pipeline Node idempotente (única dependencia: `sharp`). Lee `assets/src-config.json` + `assets/raw/**`, genera cartas, dorsos, fondos, `assets/manifest.json` y `CREDITS.md`. Modos `--check`, `--fetch`, `--verbose`. Incluye lector ZIP mínimo (sin dependencias) para descargar y extraer los packs de Kenney de forma reproducible. |
| `tools/package.json` (+ lock) | `sharp ^0.34`. `tools/node_modules` y `tools/.cache` ignorados por git. |
| `assets/src-config.json` | Fuente de verdad: fuentes (nombre, autor, licencia, URL de página y URL exacta del zip), 8 temas con nombres es/en, paleta, rampa del dorso, easter egg, y por carta el archivo dentro del zip, modo, tinte, `keyBg`. Paletas: las 4 del andamiaje + `nes` (55), `sweetie16`, `endesga32`, `cga`. |
| `assets/themes/<id>/*.webp` | 120 cartas 256×256 (4 temas × 30) + 8 dorsos `_back.webp` (uno por tema, incluidos los 4 slots vacíos). |
| `assets/bg/jungle-rain-{1280,1920,2560}.webp` | Fondo selva lluviosa, 16:9, q78, todos ≤ 250 KB. |
| `assets/manifest.json` | Definitivo según §7.3. Claves en el orden del andamiaje (`version, themes, backgrounds, audio, palettes`). La sección `audio` se copia **tal cual** del manifiesto previo (sfx v1 en `sound/`) para que `audio-4` la reemplace sin conflicto. |
| `CREDITS.md` | Generado: tabla de fuentes + tabla por carta (tema, id, fuente, archivo origen, autor, licencia, URL) + dorsos + fondos. |
| `legacy/v1/img-raw.zip` | Respaldo (564 KB) de los 31 crudos únicos de `img/` + `frog_green.png`, con los nombres nuevos. |
| `img/` | **Retirada** (`git rm -r img/`, 38 archivos, 1.66 MB). Incluye `plants_wallpaper.jpg` (1 MB, acuarela sobre blanco, licencia desconocida: no sirve para el mood nocturno) y los iconos v1 `cards*.png` / `frog_green_back.png` sin uso. |

## Fuentes y licencias por tema

Todo asset externo lleva `license` y `attribution` en el manifiesto y fila en `CREDITS.md`. **OpenGameArt no respondió desde esta red** (ECONNREFUSED en todos los intentos, también con curl), así que los 3 temas nuevos se armaron 100 % con packs de **Kenney (CC0 1.0, verificado en `License.txt` de cada zip)** más arte propio v1.

| Tema | Cartas | Peso (con dorso) | Fuentes |
|---|---|---|---|
| `plantas` | 30 | **101.3 KB** (3.4 KB/carta, todas lossless) | arte propio v1 (`own`). Antes: ~640 KB en PNG 512×512/512×768. |
| `selva` | 30 | **99.7 KB** | Kenney Animal Pack (loro, mono, serpiente, hipopótamo, elefante, jirafa) · Platformer Art Deluxe (caracol, mosca, pez, 2 hongos, plantas, arbusto) · Tiny Town (árbol, brote, colmena) · Foliage Sprites (12 hojas/plantas, siluetas blancas **tintadas** a `jungle-dusk`) · `tree_frog` = `frog_green.png` propio de v1 (rana de ojos rojos, reciclada como carta). |
| `cozy` | 30 | **28.4 KB** | Kenney Pixel Platformer Food Expansion (taza, 2 velas, copa, vaso, dulces, pasteles…) · Emotes Pack pixel (corazón, Z de sueño, nota musical, bombilla, estrella, gota) · Generic Items (libros, tetera, cafetera, bol, jarro) · `cat` = `michi.png` propio (gato v1 reutilizado; easter egg `match: "cat"` → `cat_purr`). |
| `geek` | 30 | **82.7 KB** | Kenney Generic Items (laptop, PC retro, monitor, torre, celular retro, mp3, tablet, USB, placa madre, RAM, GPU, joystick, arcade, 2 gamepads, micrófono, audífonos, CD, cámara, microscopio) · Board Game Icons (d20, dado, caballo de ajedrez, puzzle, cartas; tintados a `pico8`) · Input Prompts (Xbox, PlayStation, Switch Pro, Steam Deck, teclado; tintados). |
| `cafe`, `manualidades`, `noche`, `acuario` | 0 | 0.3 KB c/u (solo dorso) | slots con `cards: []` y `backSymbol` ya generado. |
| Fondo `jungle-rain` | 3 tamaños | 67.8 / 130.6 / 201.5 KB | Pexels 25306350, Firman Fatthul, Tasikmalaya (Indonesia). **Pexels License** (uso libre, sin atribución obligatoria, no revender sin modificar). No se encontró CC0 estricto ≥ 2560 px con el mood correcto; se anota como aceptable según la decisión del dueño. |

**Total `assets/`: 713 KB** (cartas 312 KB + fondos 400 KB + manifiesto 40 KB). Presupuesto §8: tema < 350 KB ✓ (el mayor es 101 KB), fondo ≤ 250 KB por tamaño ✓.

Antes/después: `img/` 1 661 KB (38 archivos, 3 duplicados exactos, wallpaper 1 007 KB) → `assets/` 713 KB con 4× más cartas y fondo en 3 tamaños.

## Decisiones de encuadre y codificación

- **Cuadrado 256×256, `contain`, fondo transparente.** Las plantas verticales 512×768 quedan a 170×256 centradas; el vidrio de la ficha (core-1) rellena el resto. No se recorta nada.
- **Pixel art propio (`mode: pixel`)**: `kernel: nearest` para no emborronar. Sprites ≤ 128 px (Kenney 16/18 px) se escalan por **factor entero** (16 px → ×16 = 256; 18 px → ×14 = 252 + 2 px de margen) para que las celdas queden parejas.
- **Vectores Kenney (`mode: vector`)**: se bajan a 64×64 con lanczos y se suben ×4 con nearest → pixel art de celda 4 px, coherente con el resto del tema. Configurable por fuente/carta (`pixelate`).
- **Tinte (`tint`)**: multiplicación por canal sobre RGBA (blanco → color, grises → color oscuro). `sharp.tint()` no sirve porque preserva luminancia y deja el blanco intacto (primer intento).
- **Fondo crema (`keyBg`)**: `asparagus_fern` y `rose_climbing` venían sobre `#f5eab9`; flood-fill desde el borde con tolerancia 48 (no toca cremas interiores de las flores).
- **WebP lossless si ≤ 256 colores opacos, si no lossy q80 con alpha 100.** Las 30 plantas pixelicious tienen 10–44 colores → todas lossless y aun así 3.4 KB de promedio. Los vectores pixelados superan 256 por el antialias de bordes → q80.
- **Dorso**: `img/question.png` (ahora `assets/raw/plantas/_back_source.png`, 256×265, 11 colores) se recolorea mapeando cada color por **rango de luminancia** a la rampa de 4 tonos del tema (`back` en el config: contorno → sombra → relleno → brillo), se recorta y se centra al 70 % de la carta. Un dorso por tema, ~0.3 KB.
- **Fondo**: la foto elegida es vertical (3456×5184); se recorta `cover` 16:9 centrado → 3456 px de ancho útil (≥ 2560). Se aplica `brightness 0.82, saturation 0.92` para acercarla a `--bg-deep`/`--bg-mid`. Calidad adaptativa: baja de 4 en 4 desde q78 si supera 250 KB (no hizo falta).
- **Dedupe** por SHA-1 del crudo dentro de cada tema (los 2 duplicados `(1).png` de `img/` se descartaron antes; `…afesc006` **no** era copia de `…afec006`, son agave y calathea distintas: se conservaron ambas → 30 cartas exactas).
- **Idempotencia**: solo escribe si los bytes cambian; segunda corrida reporta `sin cambios (idempotente)`. Salidas huérfanas dentro de `assets/themes/<id>/` se borran.
- **Easter egg `match` es prefijo de `cardId`**: `michi` dispara con `michi` y `michi2`; en `cozy`, `cat`. El `--check` verifica que exista al menos una carta que coincida. core-1: usar `card.id.startsWith(theme.easterEgg.match)`.

## Cómo agregar un tema nuevo en 5 pasos

1. En `assets/src-config.json` → `sources`, declara la fuente si es nueva: `name, author, license, url, download (zip exacto), mode (pixel|vector), pixelate`.
2. En `themes`, rellena el slot (p. ej. `cafe`): `name` es/en, `palette`, `back` (4 hex oscuro→claro) y `cards: [{ id, from: { source, path: "ruta/dentro/del.zip" } }]`; opcionales `tint`, `keyBg`, `mode`, `pixelate`, `copyOf: "tema/carta"`. Para arte propio, deja el PNG en `assets/raw/<tema>/<id>.png` y usa `"source": "own"`.
3. `cd tools && npm install` (una vez) y `node tools/build-assets.mjs --verbose`: descarga el zip a `tools/.cache/`, extrae a `assets/raw/<tema>/`, genera `assets/themes/<tema>/*.webp`, `_back.webp`, actualiza manifiesto y `CREDITS.md`.
4. Revisa el resumen (colores, lossless/q80, KB por carta; objetivo < 350 KB por tema) y las cartas a ojo (`tools/pixelator.html` de pixel-3 sirve para previsualizar con paletas).
5. Corre otra vez (`sin cambios`) y `node tools/build-assets.mjs --check`; commitea `assets/themes/<tema>/`, `assets/manifest.json`, `assets/src-config.json`, `CREDITS.md`. Nunca `assets/raw/` ni `tools/.cache/`.

## Verificación hecha

- `node tools/build-assets.mjs` ×2: la segunda imprime `Total assets: 713.4 KB · sin cambios (idempotente) · manifiesto igual · CREDITS.md igual`.
- `node tools/build-assets.mjs --check`: 8 temas, 120 cartas, 1 fondo; valida existencia de rutas (relativas sin `./`), 256×256 y formato webp de cada carta y dorso, ancho real de cada fondo y ≤ 250 KB, licencia no vacía, atribución no vacía si no es `own`, ids únicos, paletas con hex válidos, `audio` presente, easter egg con al menos una carta.
- Hojas de contacto de los 4 temas y de los 8 dorsos revisadas visualmente (fondos crema eliminados, tintes correctos, pixelado parejo).
- `git check-ignore`: `assets/raw/`, `tools/.cache/`, `tools/node_modules/` ignorados.

## Para los vecinos

- **core-1**: rutas `assets/...` relativas a la raíz (sin `./`, se resuelven contra `index.html`; si prefieres `./` explícito dime y lo agrego en `rel()`). `cards[].src`, `backSymbol`, `backgrounds[0].srcset["1280"|"1920"|"2560"]`, `palettes`. Cargar texturas con `NearestFilter` y sin mipmaps: los 256×256 son celda 4 px o mayor.
- **pixel-3**: `palettes` tiene ahora `nes` (55 colores, 2C02 canónica), `sweetie16` (GrafxKid), `endesga32`, `cga` (16). Los ids de paleta por tema son los del andamiaje.
- **audio-4**: reemplaza `manifest.audio` completo; el script lo preserva byte a byte en cada corrida (lee el manifiesto existente antes de escribir). Los easter eggs referencian `sfx: "cat_purr"`.
- **ui-6**: `themes[].name.{es,en}`; los 4 slots vacíos vienen con `cards: []` para mostrarlos deshabilitados.

## Propuestas fuera de mis paths (no aplicadas)

- `index.html` / `src/main.js`: si hay precarga de imágenes, usar `manifest.backgrounds[0].srcset` con `<img srcset>` o elegir por `window.innerWidth * devicePixelRatio` (1280 / 1920 / 2560).
- `.gitignore`: ya cubre lo necesario; nada que cambiar.

## Qué quedó sin resolver / Bloqueos

- **OpenGameArt inaccesible** desde esta red (ECONNREFUSED). Los 3 temas quedaron con Kenney; si el dueño quiere más variedad de estilo (p. ej. un tucán, una mariposa, un gato pixel para cozy), hay que buscar CC0 en OGA desde otra red y agregar la fuente en el config.
- **Mezcla de estilos** en `selva`/`geek`/`cozy` (vector Kenney pixelado a 64 px + pixel 16/18 px + arte propio). El pixelado a celda 4 px la disimula; el pixelador en vuelo de pixel-3 con paleta del tema la unifica más. Evaluar con `design-5`.
- **Fondo**: Pexels License, no CC0 estricto. Si se exige CC0, la alternativa es un fondo generado (gradiente `--bg-deep`→`--bg-mid` + partículas), que core-1 puede hacer sin imagen.
- **Autor de `own`**: puse "Cristián Andrés Vargas" y el repo `slotbite/mahjong` como URL; confirmar cómo quiere aparecer el dueño en `CREDITS.md` (basta editar `sources.own` en el config y recorrer).
- No hay `tucan`, `mariposa` ni `orquídea` real en selva (no existen en los packs CC0 disponibles); se usaron loro, mosca y `plantPurple` como orquídea.
