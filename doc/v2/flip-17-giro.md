# flip-17: Giro de Loseta con Dirección y Ritmo de v1

## Sentido de Giro v1 (CSS)

**Análisis de transformaciones capturadas:**
- `.back-view` interpola de `rotateY(-180°)` a `rotateY(0°)` durante 250ms (transición linear)
- `.front-view` interpola de `rotateY(0°)` a `rotateY(180°)` durante 250ms
- En ambos casos: **borde derecho se acerca al espectador** durante el giro
- Duración: 250ms linear (se percibe como suave por la easing natural de la perspectiva 3D)

**Evidencia visual:** Fotogramas capturados en `/doc/v2/flip-17/v1-00.png` a `v1-04.png`
- 0ms: dorso visible (`.back-view` en -180°)
- 60ms: cara frontal comienza a aparecer (ángulo ~138°)
- 120ms: mitad de la animación (ángulo ~90°)
- 180ms: cara frontal casi completamente visible (ángulo ~42°)
- 250ms: frente completamente visible (ángulo 0°)

---

## Sentido de Giro v2 ANTES (600ms, dirección inconsistente)

**Problema:**
- Giro face-down (dorso): 0° → 180° → **borde derecho hacia espectador** ✓
- Giro face-up (frente): 180° → 0° → **borde izquierdo hacia espectador** ✗
- Las direcciones eran opuestas según la dirección del flip

**Fotogramas:** `/doc/v2/flip-17/v2-antes-*.png` (600ms con ease.cozy)

---

## Solución Implementada

### Cambios en `src/scene/cards.js`

**1. Duración (línea ~24):**
```javascript
// Antes:
const DUR = { flip: 600, ... };

// Después:
const DUR = { flip: 320, ... };
// flip: 320ms with ease.cozy matches v1's 250ms linear.
```

**2. Dirección consistente (función `rotateTo`, líneas ~160-177):**

Se añadió lógica para invertir la dirección de interpolación cuando se gira de ~180° a ~0°:

```javascript
// Ensure consistent flip direction: right edge always toward viewer
if (Math.abs(fromY - Math.PI) < 0.5 && targetY < Math.PI / 2) {
  // Going from ~π to ~0: use 2π as intermediate for consistent direction
  adjustedTargetY = 2 * Math.PI;
}
```

**Efecto:** Cuando el flip va de π a 0, en lugar de interpolar directamente (que haría girar el borde izquierdo), interpola de π a 2π (equivalente visualmente pero girando hacia el lado correcto). El resultado final sigue siendo 0 (modulo 2π).

### Resultado

- **Dirección:** Ahora ambos flips (face-up y face-down) tienen el borde derecho acercándose al espectador, **igual a v1**
- **Duración:** 320ms con `ease.cozy`, comparado con 250ms linear en v1
- **Sentimiento:** 320ms × ease.cozy ≈ 250ms linear en términos de duración percibida, pero con una curva de aceleración más suave

---

## Sentido de Giro v2 DESPUÉS (320ms, dirección consistente)

**Fotogramas:** `/doc/v2/flip-17/v2-despues-*.png` (320ms con ease.cozy)
- 0ms (0%): dorso visible
- 80ms (25%): cara frontal comienza a aparecer
- 160ms (50%): mitad de la animación
- 240ms (75%): cara frontal casi completamente visible
- 320ms (100%): frente completamente visible

**Confirmación:** Visual match con v1 en términos de dirección. Borde derecho se acerca consistentemente.

---

## Verificación de Animaciones Relacionadas

- **Hint (reveal):** Usa `rotateTo(card, 0, DUR.flip)` → mismo giro mejorado ✓
- **Hint (hide back):** Usa `rotateTo(card, FACE_DOWN, DUR.flip)` → mismo giro mejorado ✓
- **Match (fade):** No afectado, usa `setOpacity()` independientemente ✓
- **Miss (tilt + return):** Usa `rotateTo` para retornar a dorso, con inclinación previa (`tiltTarget`) ✓

---

## Cambios Exactos (diff)

**Archivo:** `src/scene/cards.js`

- Línea ~24: `DUR.flip` de 600 a 320
- Línea ~160-177: Función `rotateTo()` con lógica de dirección consistente
- Línea ~24-25: Comentarios de documentación para referencia v1

---

## Notas

- V1 usa 250ms linear (CSS `transition`), v2 usa 320ms con `ease.cozy` (Three.js)
- 320ms fue elegido como 1.28× de 250ms para compensar la suavidad de `ease.cozy` vs lineal
- Si el dueño lo requiere, `DUR.flip` puede ajustarse fácilmente (exportado en línea 24)
- No se modificaron materiales, texturas, brillo (glass-9) ni ninguna otra animación
- La duración de retorno al fallar (`pair:miss`) sigue siendo 1100ms + tilt + rotateBack (sin cambios)

