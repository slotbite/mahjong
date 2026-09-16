# Fix: Encuadre de texturas de cartas en temas con paleta

## Causa raíz
En `src/pixel/pixelator.js` línea 123-124, la función `pixelate()` calculaba el tamaño del canvas de trabajo como:
```javascript
const k = Math.max(1, Math.round(size / N));
const W = N * k;
```

Cuando `size / N` no es exacto (ej: 256 / 13 ≈ 19.69), el redondeo resulta en `W ≠ size`. Ejemplo:
- `N = 13` (para pixelScale bajo)
- `k = round(256 / 13) = 20`
- `W = 260` (mismatch: 260 vs 256)

## Impacto
Con `W > size`, el flujo era:
1. Dibujar imagen escalada a 260×260 con **smoothing habilitado**
2. Downsampled de 260×260 a 13×13
3. Upscalea de 13×13 a 256×256

El smoothing en paso 1 introduce píxeles con alpha intermedio en bordes. Al downsample:
- Píxeles de borde con alpha ∈ [0, 127] promediados → alpha intermedio
- `binarizeAlpha()` convierte estos a alpha = 0 (transparentes), causando "bordes carcomidos"

Especialmente visible en temas con paleta personalizada (selva/cozy/geek) donde cuantización + dithering amplifican artefactos.

## Solución
Cambiar `W = N * k` a `W = size`. Esto asegura:
- Canvas de trabajo = tamaño de salida exacto
- Sin mismatch downsampling → upsampling
- Smooth dibuja a 256×256 (no 260×260)
- Downsampling/upsampling alineados correctamente

## Cambio
**Archivo**: `src/pixel/pixelator.js` líneas 119-125

Antes:
```javascript
const N = cellsFor(pixelScale);
const k = Math.max(1, Math.round(size / N));
const W = N * k;
```

Después:
```javascript
const N = cellsFor(pixelScale);
const W = size;  // fix center-10: usar size exacto para evitar mismatch downsampling→upsampling
```

También actualizado comentario del algoritmo (líneas 107-111) para reflejar el nuevo enfoque.

## Verificación
- Hojas, arbustos, teteras en selva/cozy/geek: **centradas, completas, bordes nítidos**
- Tema plantas (original): **sin cambios, sigue bien**
- Cambios de pixelScale a 40 y 94: **ambos funcionan correctamente**

## Sin verificar
- Comportamiento con tamaños de canvas NO 256×256 (si los hay en futuro)
- Interacción con diferentes ratios de aspecto de imagen fuente (todas 256×256 en tests)
