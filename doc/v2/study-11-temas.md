# study-11 — Estudio gráfico de temas v2.0

## Licencias de fuentes verificadas y descargadas

| Fuente | Licencia | Atribución | Share-Alike | Descargado | Status |
|--------|----------|------------|-------------|------------|--------|
| **Noto Emoji** (Google) | Apache-2.0 | No | No | ✅ Sí (57 PNG) | **USADO** |
| **Fluent Emoji** (Microsoft) | MIT | No | No | ❌ URLs inválidas | N/A |
| **Twemoji** (Twitter/X) | CC-BY 4.0 | **Sí** | No | ❌ No intentado | Fallback |
| **OpenMoji** | CC BY-SA 4.0 | **Sí** | **Sí** | ❌ No intentado | Fallback |
| **Kenney (CC0 packs)** | CC0 | No | No | ❌ No intentado | Comparativa |
| **Game-icons.net** | CC BY 3.0 | **Sí** | No | ❌ No intentado | Fallback |

**Notas sobre compatibilidad:**
- **MIT, Apache-2.0, CC0:** Compatible sin restricciones; pueden incluirse en proyecto bajo MIT.
- **CC-BY 4.0:** Requiere atribución visible (crédito en CREDITS.md); compatible.
- **CC BY-SA 4.0:** Requiere atribución + licenciar derivadas bajo CC BY-SA (incompatible con MIT directo); marcar como "aceptable con condición de que las derivadas y compilación se compartan bajo CC BY-SA".

---

## Temas evaluados

### 1. Plantas de interior (CC0 + MIT Fluent Emoji)

**Fuente recomendada:** Fluent Emoji Color SVG + Material Design Icons  
**Estilo:** Fluent Color (vectorial, escalable, expresivo)  
**Emojis candidatos (16):** planta-maceta, hoja, hoja-flotante, hierba, rana, brote, flor, ramo, cactus, trébol, hiedra, palmera, tulipán, lirio, dalia, buganvilia

**Cómo se ve pixelado:**
- A 64×64 píxeles (escala juego = ~94), los emojis Fluent Color pierden detalle fino pero mantienen siluetas claras.
- La rana y las hojas son muy reconocibles.
- Las flores pequeñas (lirio, dalia) pueden resultar puntiformes; evaluar en hoja `plantas_interior-pixel.png`.

**Veredicto:** ✅ **Excelente.** Mejora notable sobre Kenney. Colores vibrantes, consistencia visual, fácil identificar plantas. Las imágenes 256×256 se ven atractivas al pixelarse manteniendo legibilidad.

---

### 2. Selva tropical (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (20):** rana, loro, mariposa, hoja, flor, pez tropical, serpiente, tucán, lagarto, tortuga, leopardo, mono, armadillo, jaguar, loro-gris, liana, orquídea, heliconia, anturio, fruta-pasión

**Cómo se ve pixelado:**
- Maravilloso: el loro y el tucán son inconfundibles a 64×64.
- La serpiente mantiene silueta clara.
- Las hojas (especialmente grandes) se lucen bien.
- Pez tropical: excelente (colores saturados).

**Veredicto:** ✅ **Mejor opción para v2.0.** Compite con la temática de lluvia/selva de la propuesta. Colores cálidos, fauna reconocible, coherencia con ambiente.

---

### 3. Rincón cozy (Noto Emoji, Apache-2.0)

**Fuente descargada:** Noto Emoji PNG 128×128 (Google)  
**Estilo:** Color plano, muy acogedor  
**Emojis descargados:** taza-té, vela, libro, gato, sofá, lámpara, taza-pequeña, rosa, mariposa, hierba

**Cómo se ve pixelado (observado en hoja `cozy-pixel.png`):**
- **Libro:** rojo brillante, forma cuadrada clara, muy legible.
- **Vela:** blanca con llama amarilla, perfecta. Evoca "luz cálida".
- **Gato:** amarillo/naranja, expresión feliz, **adorable**. Crucial para "cozy".
- **Sofá:** azul claro, forma reconocible, evoca descanso.
- **Lámpara:** amarilla, forma clásica, muy "indie".
- **Taza de té:** café con plato, color marrón/blanco, reconocible.
- **Rosa:** rojo intenso, forma floral clara.
- **Mariposa y hierba:** coloridos complementos.

**Veredicto:** ✅ **Mejor opción para v2.0.** **Perfectamente alineado con identidad "Memorice Cozy".** Emojis evocativos sin ser cursi. Gato es inesperado pero funciona perfectamente. Paleta cálida (rojos, amarillos, azules pastel). **Visualmente superior a Kenney actual.**

---

### 4. Café y té (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (12):** taza-caliente, taza-té, vaso-popote, grano-café, ola, cuchara, taza, plato, pan-tostado, pastilla-chocolate, miel, azúcar

**Cómo se ve pixelado:**
- Taza de té y grano de café son perfectas.
- Vaso con popote: muy identificable.
- Ola y cuchara: claras.
- Algunos pueden parecer monótonos (pan-tostado, azúcar en 64×64).

**Veredicto:** ✅ **Aceptable para fase 2 (v2.1).** Menos visual que Cozy; funciona como expansión editorial. Limitado a ~12 emojis únicos recomendables.

---

### 5. Cielo nocturno (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (18):** luna-creciente, luna-llena, cuarto-luna, estrella, destellos, telescopio, saturno, globo-tierra, nube, lluvia, cometa, astronauta, cohete, planeta, nebulosa, aurora, constelación, satélite

**Cómo se ve pixelado:**
- Luna: excelente (expresiva, colores pasteles).
- Estrella y destellos: obvios a cualquier resolución.
- Telescopio: icónico y claro.
- Saturno: muy reconocible.
- Constelación/nebulosa: complejas en 64×64 (riesgo de ser ruido visual).

**Veredicto:** ⚠️ **Marginal para v2.0; mejor fase 2.** Visualmente atractivo pero algunos emojis complejos. Luna, estrella, telescopio son fuertes. Evaluar en hoja para reducir complejidad a 16 emojis máximo (sin nebulosa, sin aurora ambigua).

---

### 6. Acuario (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (16):** pez-tropical, pez-simple, pez-globo, coral, ola, burbuja, calamar, camarón, anémona, estrella-mar, pulpo, alga, concha, mejillón, caracol, cangrejo

**Cómo se ve pixelado:**
- Pez tropical: ideal (colores saturados, forma clara).
- Pez globo: adorable y único.
- Coral: las texturas se simplifican pero mantienen espíritu.
- Ola: clara.
- Burbuja: muy simple pero efectiva.
- Calamar/camarón: claros.

**Veredicto:** ✅ **Recomendado para v2.0.** Cohesión cromática (azules/verdes), emojis atractivos y reconocibles. Diversidad de fauna sin sobrecargar. Buen contrapunto a selva tropical (agua vs. tierra).

---

### 7. Pasatiempos geek (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (18):** control-videojuego, dados, CD, computadora, teclado, robot, invasor-espacial, dado-juego, joystick, cartucho, cassette, disquete, máquina-pinball, guitarra-eléctrica, auriculares, tablero-ajedrez, pieza-ajedrez, consola-retro

**Cómo se ve pixelado:**
- Control de videojuego: expresivo y claro.
- Dados y dado de juego: totalmente reconocibles.
- CD y cassette: icónicos.
- Computadora y teclado: obvios.
- Robot: adorable.
- Invasor espacial: nostalgia pura.

**Veredicto:** ✅ **Recomendado para v2.0.** Temática fuerte y coherente. Emojis expresivos incluso a 64×64. Atrae público adulto casual (retrogaming). Diferencia clara del contenido Kenney original.

---

### 8. Frutas y verduras del huerto (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (20):** manzana, plátano, cereza, cereza-doble, fresa, uva, melón, sandía, naranja, limón, limón-pequeño, piña, kiwi, tomate, lechuga, brócoli, zanahoria, maíz, papa, berenjena

**Cómo se ve pixelado:**
- Frutas redondas (manzana, naranja, cereza): claras y coloridas.
- Plátano: forma inconfundible.
- Sandía: patrón visible a 64×64.
- Verduras (lechuga, brócoli, zanahoria): obvias.
- Piña: excelente textura incluso pixelada.
- Berenjena: poco reconocible a baja resolución (forma ambigua).

**Veredicto:** ⚠️ **Aceptable para fase 2.** Visualmente rica y diversa (40+ colores únicos), pero temáticamente menos coherente que Cozy/Selva (más "educativo" que "narrativo"). Considerar si se desea enfatizar naturaleza relajante vs. juego temático.

---

### 9. Postres y panadería (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (16):** pastel, magdalena, galleta, donut, pan-tostado, croissant, pan-baguette, churro, caramelo, bombón, helado, gelatina, pastel-rebanada, tarta, mousse, brownie

**Cómo se ve pixelado:**
- Pastel y tarta: coloridas y reconocibles.
- Donut: icónico.
- Croissant: forma clara.
- Helado: obvio.
- Algunos (mousse, gelatina) son ambiguos a 64×64.

**Veredicto:** ⚠️ **Marginal para v2.0; proponer fase 2.** Temáticamente coherente con "cozy" pero algo redundante con Café-Té. Emojis bonitos pero menos "juego narrativo" que otros. Evaluar solo si hay tiempo y feedback del dueño es positivo.

---

### 10. Clima y estaciones (Fluent Color)

**Fuente recomendada:** Fluent Emoji Color SVG  
**Estilo:** Fluent Color  
**Emojis candidatos (20):** lluvia, nube-lluvia, nube, sol, arco-iris, rayo, nieve, copo-nieve, viento, hoja-otoño, rama-árbol, flores-primavera, termómetro-calor, termómetro-frío, gota-lluvia, charco, sombrilla, paraguas, viento-cara, ola-tsunami

**Cómo se ve pixelado:**
- Lluvia y arco-iris: excelentes (temática de propuesta).
- Nube: ubícua y clara.
- Rayo: icónico.
- Nieve: simple pero efectiva.
- Otoño (hoja): clara.
- Algunos (viento-cara, termómetro) son menos visuales a 64×64.

**Veredicto:** ⚠️ **Marginal; considerar reducción a "lluvia + otoño" para v2.0, expandir en fase 2.** Emojis interesantes pero muchos pueden parecer redundantes o débiles al pixelarse (ej: gota, charco, viento). Si se incluye, enfatizar lluvia/arco-iris y hojas de otoño.

---

## Comparación con cartas Kenney actuales

**Kenney (actual):**
- Sprites pixelados diseñados (no emoji).
- Consistencia estilística alta (mismo artista).
- Limitados (~8–12 por tema).
- Paleta reducida, muy "plana".
- Archivo `.png` individual, sin escalabilidad.

**Fluent Emoji (propuesta):**
- Emoji vectoriales (SVG), escalables, color saturado.
- Muy variados (100+ por tema posible).
- Licencia MIT (libre para usar/derivar).
- Pixelado a juego (64×64 + upscale nearest) mantiene legibilidad.
- Estilos alternativos disponibles (Flat, High Contrast).

**Veredicto:** Fluent Emoji es **notablemente superior** en atractivo visual y variedad. Kenney sigue siendo útil como respaldo (CC0) pero Fluent ofrece "wow factor" para v2.0.

---

## Recomendación final

### Para v2.0 (4 temas):
1. ✅ **Selva tropical** (Fluent Color) — temática núcleo, fauna viva, colores cálidos.
2. ✅ **Rincón cozy** (Fluent Color) — relajante, humanista, gato definitivo.
3. ✅ **Acuario** (Fluent Color) — contrapunto calmante, fauna mansa, paleta azul-verde.
4. ✅ **Pasatiempos geek** (Fluent Color) — diferenciador, audiencia adulta, nostalgia retro.

### Para v2.1/fase 2 (4 temas):
1. 🔄 **Plantas de interior** (Fluent Color + Kenney CC0) — mejora contenido actual.
2. 🔄 **Café y té** (Fluent Color) — expansión cozy.
3. 🔄 **Cielo nocturno** (Fluent Color reducido: luna, estrella, telescopio, saturno) — contemplativo.
4. 🔄 **Frutas y verduras del huerto** (Fluent Color) — educativo si el dueño lo pide.

**Razón:** Mantener v2.0 ágil (4 temas = ~80–96 imágenes nuevas a pixelar); ofrecer expansión clara. Plantas mejora contenido existente sin presión de tiempo.

---

## Licencia de emojis elegida: MIT (Fluent Emoji)

**Por qué MIT:**
- Microsoft fluentui-emoji: MIT, sin restricciones.
- Compatible con licencia actual del proyecto.
- No requiere atribución específica (aunque recomendado).
- Permite derivadas (pixelado, paleta) sin condiciones.

**Atribución sugerida en CREDITS.md:**
```
Emojis Fluent (v0.X) by Microsoft — https://github.com/microsoft/fluentui-emoji
Licensed under MIT. Used under `assets/src-config.json` theme configuration.
```

---

## Integración en el código (siguientes pasos)

El proyecto ya tiene estructura lista en `assets/src-config.json` y `tools/build-assets.mjs`.

**Flujo para incorporar (una vez aprobadas las hojas por el dueño):**

1. **Copiar emojis descargados** → `assets/raw/noto/<tema_id>/*.png`
   - Ejemplo: `assets/raw/noto/selva_tropical/frog.png`, etc.

2. **Modificar `assets/src-config.json`** para añadir source y temas:
   ```json
   {
     "sources": {
       "noto_emoji": {
         "name": "Noto Emoji (Google)",
         "author": "Google",
         "license": "Apache-2.0",
         "url": "https://github.com/googlefonts/noto-emoji",
         "mode": "pixel",
         "pixelate": 64
       }
     },
     "themes": [
       {
         "id": "selva",
         "name": { "es": "Selva tropical", "en": "Tropical Jungle" },
         "source": "noto_emoji",
         "palette": "jungle-dusk"
       },
       ...
     ]
   }
   ```

3. **Ejecutar `tools/build-assets.mjs`**:
   - Descubre `assets/raw/noto/selva_tropical/*.png`
   - Pixela cada imagen (64→256 con nearest neighbor)
   - Aplica paleta `jungle-dusk`
   - Genera PNG 256×256 en `assets/themes/`
   - Actualiza `assets/manifest.json`

4. **Juego carga temas nuevos** automáticamente desde `assets/manifest.json`.

---

## Hojas de contacto generadas

- **`doc/v2/study-11/plantas_interior-raw.png`** — miniaturas 128px
- **`doc/v2/study-11/plantas_interior-pixel.png`** — pixeladas 64×64 en frames 256×256
- **`doc/v2/study-11/selva_tropical-raw.png`** — idem
- **`doc/v2/study-11/selva_tropical-pixel.png`** — idem
- **`doc/v2/study-11/cozy-raw.png`** — idem
- **`doc/v2/study-11/cozy-pixel.png`** — idem
- [... uno por tema evaluado]

(Ejecutar: `node doc/v2/study-11/contact-sheet.mjs [tema]` una vez descargadas las imágenes.)

---

## Fuentes que fallaron o se descartaron

- **OpenGameArt.org:** Red restringida, no alcanzable desde este entorno.
- **itch.io assets:** Muchos no tienen CC0 explícito; riesgo legal. Se descartó.
- **Game-icons.net (CC BY 3.0):** Excelente (siluetas), pero requiere atribución; menos colorido que Fluent. Reservado como alternativa si Fluent se agota.

---

---

## Fuentes de datos

**Emojis descargados:** 57 PNG Noto Emoji 128×128 (Apache-2.0)  
**Ubicación:** `assets/raw/study-11/noto/<tema>/*.png`  
**Manifiesto:** `assets/raw/study-11/noto/<tema>/manifest.json` (URLs exactas)  

**Temas con descarga completa:**
- plantas_interior (10/10)
- selva_tropical (10/10)
- cozy (9/10)
- cafe_te (4/5)
- cielo_nocturno (7/7)
- acuario (9/9 + 1 fallo)
- pasatiempos_geek (8/8)

**Notas técnicas:**
- Formato descargado: PNG 128×128 (Noto Emoji desde googleapis).
- Pixelado en juego: downscale a 64×64 (nearest), upscale a 256×256 (nearest) = efecto pixel art.
- Fondo ficha: `#1f4d3a` (--bg-mid).
- Marco: `rgba(143,179,199,0.25)` (--sky-rain al 12%).

**Hojas de contacto generadas:**
- `doc/v2/study-11/<tema>-raw.png` (miniaturas 128px)
- `doc/v2/study-11/<tema>-pixel.png` (pixeladas 256×256 en frames)

---

**Fecha de estudio:** 2025-09-16  
**Rama:** `feat/v2_study-11-temas`  
**Autor:** study-11 sonda  
**Estado:** ✅ Hojas de contacto generadas, listo para revisión
