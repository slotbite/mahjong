# glass-9: Vidrio Translúcido Luminoso con Símbolo en Superficie

## Resumen
**Iteración 2 (Final):** Se refinó el material de vidrio para ser más luminoso con símbolo nítido en la superficie y brillo especular diagonal. El resultado es un vidrio verde-azulado que muestra claramente el fondo de selva con reflejos luminosos, borde claro por sheen, y el símbolo "?" absolutamente nítido visible como calcomanía sobre el vidrio.

## Cambios Realizados (Iteraciones 1-2)

### Iter 1: Transmisión Base
1. Eliminado plano `frost` opaco que tapaba transmisión
2. `transmission: 0.97`, `roughness: 0.13`, atenuación verde-azul, `clearcoat: 0.85`
3. `envMapIntensity: 1.1`, `scene.environmentIntensity: 0.55`
4. Símbolo acercado a `z = 0.055`

### Iter 2: Refinamiento Final
**A. Símbolo en Superficie (cards.js)**
- `front.position.z: 0.055` → `0.062` (frontal, justamente afuera)
- `back.position.z: -0.05` → `-0.062` (trasera, justamente afuera)
- Ambos con `renderOrder: 1` para evitar z-fighting con vidrio
- Pixel art ahora aparece como calcomanía nítida sobre el vidrio translúcido

**B. Brillo Especular Diagonal (cards.js)**
- Nueva función `diagonalShineTexture(opacity)` genera gradiente blanco en canvas
- Plano `shine` (frente): z = 0.063, opacity = 0.35, `blending: AdditiveBlending`
- Plano `shineBack` (dorso): z = -0.063, opacity = 0.2 (más tenue)
- Geometría `PlaneGeometry(0.9, 0.9)`, `depthWrite: false`
- Simula brillo especular diagonal sin interferir con pixel art

**C. Material Vidrio Luminoso (cards.js)**

| Parámetro | Iter 1 | Iter 2 | Cambio |
|-----------|--------|--------|--------|
| `transmission` | 0.97 | 0.88 | Menos transparente, ficha con cuerpo |
| `roughness` | 0.13 | 0.08 | Más suave para reflejos |
| `attenuationColor` | 0x8fb3c7 | 0xa9c9d6 | Verde-azul más claro |
| `attenuationDistance` | 1.2 | 2.0 | Falloff más gradual |
| `clearcoat` | 0.85 | 0.7 | Reflejos equilibrados |
| `sheen` | — | 0.5 | Borde luminoso (fresnel) |
| `sheenRoughness` | — | 0.4 | Borde suave |
| `sheenColor` | — | 0xf4ead8 | Crema cálida |
| `tint` (color) | 0x8fb3c7 | 0xdfeaf0 | Más claro |
| `tintAmount` | 0.12 | 0.08 | Tinte más sutil |
| `envMapIntensity` | 1.1 | 1.4 | Reflejos más visibles |
| `scene.environmentIntensity` | 0.55 | 0.55 | Sin cambios |

## Resultado Visual Final
- **Símbolo nítido:** "?" del dorso y pixel art del frente absolutamente legibles como calcomanía
- **Color luminoso:** Verde-azulado claro (#dfeaf0 tint) que comunica vidrio de alta calidad
- **Brillo diagonal:** Especular visible en esquina superior izquierda (0.35 opacidad frente, 0.2 dorso)
- **Borde claro:** Sheen de 0.5 crea borde crema (fresnel effect) visible en ángulos rasantes
- **Fondo visible:** Selva se ve a través pero ficha tiene cuerpo (transmission 0.88)
- **Estados preservados:** Hover, match (brillo lima), miss (tilt), desvanecido funcionan correctamente

## Performance
- **FPS estimado desktop (4×4):** ~110+ fps ✅ (sin degradación)
- **Texture canvas:** Generada una sola vez al inicio
- **Render order:** Evita z-fighting sin overhead significativo

## Archivos Modificados
- `src/scene/cards.js` — GLASS constants, createGlassMaterial(), diagonalShineTexture(), makeCard()
- `src/scene/environment.js` — Sin cambios en iter 2

## Capturas (1920×1080)
1. `1-reposo.png` (564 KB) — Grid 4×4 reposo, símbolo nítido, brillo diagonal visible
2. `2-dorso-close.png` (565 KB) — Vista cercana dorso, reflejos en el "?"
3. `3-match.png` (574 KB) — Efecto match con fichas desaparecidas, hueco verde luminoso

## Pendiente
- Validación en móvil real (transmissionResolutionScale 0.5/0.75)
