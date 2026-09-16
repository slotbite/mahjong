# GEM-19: Loseta tipo Gema con Biseles Facetados

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
  
### Material (MeshPhysicalMaterial)
- **transmission:** 1.0 (máxima refracción)
- **ior:** 2.2 (índice refracción, diamante sintético)
- **thickness:** 0.6 (grosor simulado para distorsión)
- **roughness:** 0.05 (muy pulido, reflejos nítidos)
- **clearcoat:** 1.0 (barniz exterior brillante)
- **clearcoatRoughness:** 0.1 (reflejos especulares)
- **metalness:** 0.1 (facetas reflectivas)
- **attenuationColor:** #9fd3c7 (verde azulado)
- **attenuationDistance:** 1.2 (absorción suave)
- **envMapIntensity:** 1.5 (reflejos bokeh)

### Tone Mapping
- **ACESFilmicToneMapping** con exposición 1.2
- Materiales de pixel art (front) y voxels (`toneMapped: false`) para colores exactos

### Entorno
- **Procedural bokeh jungle:** CanvasTexture equirectangular con 200 círculos gradientes (hojas + luciérnagas)
- **PMREMGenerator:** Convierte entorno a reflejos para gema
- **environmentIntensity:** 1.0 (reflejos visibles en biseles)

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

## Diferencias con Boceto de Referencia

| Aspecto | Boceto | Gem-19 | Razón |
|---------|--------|--------|-------|
| **IOR** | 2.4 | 2.2 | Loseta más delgada (0.18 vs 0.4); 2.2 es suficiente sin oscurecer pixel art |
| **Thickness** | 1.5 | 0.6 | Grosor actual de loseta; boceto era mayor |
| **Bevel Size** | 0.3 | 0.12 | Proporción respecto a 1.0 de lado (vs 1.3 del boceto) |
| **Exposición** | 1.2 | 1.2 | ACESFilmic en lugar de boceto sin tone mapping |
| **Entorno** | Procedural bokeh | Procedural bokeh | Ambos crean reflejos verdes/cálidos |
| **? Dorso** | Cubos 0.15 | Cubos 0.055 | Escalado a voxels proporcionales de loseta |
| **Pixel art dorso** | No incluido | ✓ Reemplazado por voxels | Decisión del dueño |

## FPS y Rendimiento

- **4×4 (16 cartas):** ~55 fps (Chrome, MacBook Pro 16 2.6GHz)
  - transmission 1.0 + clearcoat 1.0 cuesta reflejos complejos
  - ACES tone mapping es eficiente
  - bokeh environment renderiza rápido (procedural, sin texturas pesadas)

- **Nota:** Medición aproximada sin herramienta de profiling exacta. El ior 2.2 y biseles 2 segmentos mantienen rendimiento.

## Capturas Generadas

- **doc/v2/gem-19/1-reposo.png** (559 KB) — Loseta en reposo, dorso con `?` de voxels verdes
- **doc/v2/gem-19/3-volteadas-inside.png** (556 KB) — Variante `?art=inside` (pixel art dentro del cristal)
- **doc/v2/gem-19/4-match.png** (559 KB) — Estado de emparejamiento (referencia)
- **doc/v2/gem-19/5-closeup.png** (559 KB) — Recorte cercano (referencia)

**Nota:** Capturas en 1920×1080. Tamaño > 500 KB por compresión PNG de entorno bokeh complejo.

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
// ...
front.position.z = artInside ? -0.03 : 0.091;
```

El cambio es inmediato y se aplica a todas las losetas nuevas de esa sesión.

## Pendientes

- [ ] Comparar visualmente in situ con el dueño en múltiples ángulos (girar las losetas para verificar biseles)
- [ ] Medir FPS en 6×6 con herramienta de profiling exacta (DevTools FPS counter)
- [ ] Ajustar `transmissionResolutionScale` si FPS < 45 en dispositivos móviles
- [ ] Iterar ior (1.9 ↔ 2.4) según percepción de "gema real" vs "opacidad"
- [ ] Verificar colores de voxels con temas diferentes (Selva Tropical, Cozy Corner, etc.)

## Archivos Modificados

- `src/scene/cards.js` — Geometría ExtrudeGeometry, material gema, voxels `?`, art inside/outside
- `src/scene/renderer.js` — ACESFilmicToneMapping, exposición 1.2
- `src/scene/environment.js` — Entorno procedural bokeh jungle

---

**Última actualización:** 2026-09-16  
**Estado:** Implementación completada, pendiente validación visual del dueño
