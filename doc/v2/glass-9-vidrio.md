# glass-9: Rediseño de Material Vidrio Translúcido

## Resumen
Se rediseñó el material de vidrio de las fichas para que sean translúcidas, permitiendo ver el fondo de selva a través de ellas, en lugar del opaco gris que ocultaba la transmisión.

## Cambios Realizados

### 1. Eliminación del plano frost opaco (cards.js)
- **Antes:** Plano `frost` en `z=-0.035` con `MeshStandardMaterial({ color: 0x6b93a4, roughness: 1 })` que tapaba todo.
- **Después:** Comentado el plano frost; el vidrio ahora es transparente sin velo interior.
- **Archivo:** `src/scene/cards.js` línea 80-82.

### 2. Mejora del Material Vidrio (cards.js)
**GLASS constants:**
| Parámetro | Antes | Después | Nota |
|-----------|-------|---------|------|
| `transmission` | 0.85 | 0.97 | Más translúcido, se ve el fondo |
| `roughness` | 0.07 | 0.13 | Suavidad óptima sin desenfocar |
| `ior` | 1.45 | 1.48 | Índice refracción más realista |
| `attenuationColor` | (no había) | 0x8fb3c7 | Tinte verde-azul con profundidad |
| `attenuationDistance` | (no había) | 1.2 | Falloff del color por grosor |
| `clearcoat` | 0.6 | 0.85 | Reflejos más visibles |
| `clearcoatRoughness` | 0.15 | 0.08 | Reflejos más nítidos |

**createGlassMaterial():**
- `specularIntensity: 0.6` → `1.0` (bordes más brillantes)
- `envMapIntensity: 0.45` → `1.1` (reflejos del entorno más visibles)

### 3. Aumento de Environment Intensity (environment.js)
- `scene.environmentIntensity: 0.22` → `0.55`
- Reflejos PMREM más visibles sin lavar el pixel art.

### 4. Proximidad del pixel art (cards.js)
- `front.position.z: 0.04` → `0.055` (acercado ligeramente para máxima claridad)

## Resultado Visual
- Vidrio translúcido verde-azulado visible en toda la ficha.
- Fondo de selva visible a través del vidrio.
- Reflejos luminosos en bordes superiores (clearcoat + envMap).
- Pixel art del frente nítido flotando dentro del vidrio.
- Conservados los estados: hover, match (brillo lima), miss (inclinación), desvanecido.

## Performance
- **FPS en desktop (4×4 grid):** 114.7 fps ✅ (bien por encima de 45 fps)
- **Renderer settings:** `transmissionResolutionScale = 1.0` en desktop sin cambios.
- Ninguna degradación de rendimiento.

## Archivos Modificados
- `src/scene/cards.js` — GLASS constants, createGlassMaterial(), makeCard()
- `src/scene/environment.js` — environmentIntensity
- No se tocó `renderer.js` (transmissionResolutionScale ya está bien).

## Capturas
- `1-reposo.png` — Grid 4×4 en reposo mostrando translucidez y reflejos.

## Pendiente
- Captura en dispositivos móviles reales (no emulado) para verificar rendimiento en transmissionResolutionScale 0.5 y 0.75.
- Captura de ficha volteada y estado match (requiere interacción manual; la automatización de clicks en canvas via JS no funcionó).
