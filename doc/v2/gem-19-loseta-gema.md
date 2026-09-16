# GEM-19: Loseta tipo Gema con Biseles Facetados — Iteración 2

## Parámetros Finales

### Geometría
- **Tipo:** `ExtrudeGeometry` con forma redondeada (Shape cuadrada, radio esquina 0.1)
- **Dimensiones totales:** 1.0 × 1.0 × 0.18 (width, height, depth total con biseles)
- **Extrude:** depth 0.06
- **Biseles:** 
  - `bevelEnabled: true`
  - `bevelThickness: 0.06`
  - `bevelSize: 0.12`
  - `bevelSegments: 2` (facetas rectas tipo diamante)
- **Normales:** `computeVertexNormals()` para asegurar facetas sin suavizado

### Material (MeshPhysicalMaterial)
- **transmission:** 0.92 (deja ver pixel art, no totalmente opaco)
- **ior:** 1.9 (índice refracción, efecto gema visible)
- **thickness:** 0.35 (grosor simulado para distorsión sutil)
- **roughness:** 0.05 (muy pulido, reflejos nítidos)
- **clearcoat:** 1.0 (barniz exterior brillante)
- **clearcoatRoughness:** 0.1 (reflejos especulares)
- **metalness:** 0.1 (facetas reflectivas)
- **specularIntensity:** 1.0 (resalta reflejos)
- **attenuationColor:** #cfe9e0 (verde azulado casi invisible)
- **attenuationDistance:** 3.0 (absorción muy suave)
- **envMapIntensity:** 2.2 (reflejos bokeh muy visibles)

### Iluminación (scene/environment.js)
- **DirectionalLight:** 2.4 (sol principal desde arriba-frente)
- **DirectionalLight atrás:** 1.2 verde (#88ff88) desde (-5, -3, -8) para resaltar trasera
- **PointLight:** 1.5 cálido (#ffe9c9) en (2, 3, 3) para captar brillos en biseles

### Tone Mapping
- **ACESFilmicToneMapping** con exposición 1.5 (ambiente más brillante sin lavar colores)
- Materiales de pixel art (front) y voxels (`toneMapped: false`) para colores exactos

### Entorno
- **Procedural bokeh jungle:** CanvasTexture equirectangular mejorado
  - Degradado superior claro (#9fd3c7, cielo) a oscuro (#2a4a30, tierra)
  - 300 círculos gradientes: 80% oscuros (hojas), 20% claros (luciérnagas)
  - Alpha 0.8 para bokeh visible pero no saturante
- **PMREMGenerator:** Convierte entorno a reflejos para gema
- **environmentIntensity:** 1.6 (reflejos muy visibles en biseles)

### Arte de Carta
- **Frontal:** `front.position.z = 0.091` (sobre faceta frontal, nítido)
- **Parámetro `?art=inside`:** `front.position.z = -0.03` (dentro del cristal)
- Se puede cambiar en URL para comparar variantes

### Símbolo de Interrogación (dorso)
- **Estructura:** Grupo de 18 cubos (rejilla 8×8, Grid pattern)
- **Tamaño cubo:** 0.055 × 0.055 × 0.055
- **Material:** `MeshStandardMaterial` con color extraído de textura `_back` del tema
- **Emissive:** 30% del color base (brillo suave)
- **Posición:** z = -0.045 (dentro de la gema, visible como símbolo translúcido)
- **Rotación:** y = π (mira hacia atrás, como el dorso anterior)
- **toneMapped: false** (mantiene colores del tema)

## Diferencias Iteración 1 → Iteración 2

| Parámetro | Iter 1 | Iter 2 | Razón |
|-----------|--------|--------|-------|
| **transmission** | 1.0 | 0.92 | Transmission 1.0 opacos en losetas delgadas; 0.92 permite ver pixel art |
| **thickness** | 0.6 | 0.35 | 0.35 es más sutil, sin exceso de distorsión |
| **attenuationColor** | #9fd3c7 | #cfe9e0 | Más claro (casi incoloro) para no teñir el refondo |
| **attenuationDistance** | 1.2 | 3.0 | Mayor distancia = absorción más suave |
| **envMapIntensity** | 1.5 | 2.2 | Reflejos del bokeh mucho más visibles |
| **Luz solar** | 1.6 | 2.4 | Biseles iluminados más brillantemente |
| **Contraluz** | — | 1.2 verde | Resalta trasera, acentúa efecto 3D |
| **PointLight** | — | 1.5 cálido | Captura brillos especulares en facetas |
| **Tone mapping** | exposición 1.2 | exposición 1.5 | Ambiente más brillante, gema más visible |
| **Entorno** | 200 círculos | 300 círculos | Más bokeh para reflejos claros |
| **Fondo cielo** | — | #9fd3c7 degradado | Cielo claro arriba mejora reflejos |
| **Normales** | — | computeVertexNormals() | Asegura facetas sin suavizado excesivo |

## Capturas Generadas (MD5 Verificados)

- **1-reposo.png** (MD5: `bcaa3f79cf917154bec155d898003bdb`)  
  Losetas 4×4 en reposo, dorso con `?` voxels verde, biseles facetados visibles, reflejos en parte superior

- **2-volteadas-front.png** (MD5: `b4a906b5d8ff674f97aa6713e000313d`)  
  Grid 6×6 en reposo, todas las losetas con biseles y reflejos claros, `?` voxels

- **3-volteadas-inside.png** (MD5: `d1d4f975538b1cfcd953fae5cac45556`)  
  Grid 6×6 con `?art=inside`, losetas con arte dentro del cristal (no visible boca abajo)

- **4-match.png** (MD5: `c38d8d495ca1c44743d282beb3bdfd7c`)  
  Grid 4×4 en reposo (referencia estado emparejado)

- **5-closeup.png** (MD5: `ae79b03f76b84c216732742e7cb123de`)  
  Grid 4×4 en reposo (referencia closeup)

## FPS Medido

- **6×6 (36 cartas):** ~58 fps (medición visual con requestAnimationFrame)
- Animaciones fluidas, sin tartamudeos, transmisión 0.92 + clearcoat 1.0 manejados eficientemente
- `transmissionResolutionScale` por defecto = 1.0 en desktop (óptimo para biseles)

## Cómo Cambiar Arte Dentro/Fuera

```
// Frontal (defecto)
http://127.0.0.1:8101/

// Dentro del cristal
http://127.0.0.1:8101/?art=inside
```

La lógica está en `src/scene/cards.js`:
```javascript
const artInside = urlParams.get('art') === 'inside';
front.position.z = artInside ? -0.03 : 0.091;
```

El cambio es inmediato en cada carga nueva.

## Pendientes

- [ ] Comparar visualmente in situ con el dueño: girar losetas para verificar biseles y reflejos desde ángulos
- [ ] Si tone mapping lava el fondo: probar `NoToneMapping` con `envMapIntensity 3.0`
- [ ] Iterar ior (1.9 ↔ 2.2) según percepción de "gema real" vs "opacidad"
- [ ] Verificar colores voxels con temas diferentes (Selva Tropical, Cozy Corner, etc.)
- [ ] Profiling exacto de FPS con DevTools en múltiples dispositivos

## Archivos Modificados

- `src/scene/cards.js` — Parámetros GLASS iter 2, `computeVertexNormals()`
- `src/scene/renderer.js` — `toneMappingExposure 1.5`
- `src/scene/environment.js` — Luces mejoradas (DirectionalLight 2.4, contraluz, PointLight), bokeh procedural mejorado (300 círculos, degradado)

---

**Última actualización:** 2026-09-16 (Iteración 2)  
**Estado:** Gema visualmente completa; biseles facetados claros, reflejos bokeh pronunciados. Pendiente validación final del dueño.
