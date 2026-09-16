# audio-12: Banco de Pruebas de Audio — Bug de Rutas

## Causa raíz
**Archivo:** `src/audio/engine.js`, línea 46 (función `loadBuffer`)

El motor de audio resolvía rutas de recursos relativos sin considerar la ubicación del documento. Cuando `tests/audio-bench.html` está en `/tests/`, una ruta como `assets/audio/flip.ogg` se resolvía como `/tests/assets/audio/flip.ogg` (404) en lugar de `/assets/audio/flip.ogg` (200 OK).

**Problema específico:** Sin `<base>` tag en HTML, las rutas relativas se resuelven contra la carpeta del documento actual, no la raíz del sitio.

## Solución implementada

### 1. Motor de Audio (`src/audio/engine.js`)
Cambio en función `loadBuffer()` (línea 44-55):
- **Antes:** `const resp = await fetch(path);`
- **Después:** `const url = new URL(path, document.baseURI).href; const resp = await fetch(url);`

Esto resuelve cualquier ruta relativa contra `document.baseURI`, que es configurable mediante `<base>` tag.

### 2. Banco de Audio (`tests/audio-bench.html`)
Agregado `<base href="/">` en `<head>` (línea 6):
```html
<base href="/">
```

Con esto, todas las rutas relativas en el documento se resuelven contra la raíz (`/`), independientemente de dónde esté ubicado el HTML.

### 3. Mejoras visuales en banco
- **Indicador de estado:** Muestra si AudioContext está `suspended` (rojo) o `running` (verde)
- **Log en pantalla:** Cada playSfx registra éxito/error con timestamp
- **Monitoreo RMS:** Visualiza nivel de audio en tiempo real (0–100%)
- **Información contextual:** Muestra estado del contexto y número de buffers precargados

## Verificación realizada

### Diagnóstico de rutas (script `tests/diagnose.mjs`)
Verifica resolución de rutas con y sin `<base>`:
- **Con `<base href="/">`:** ✓ 200 OK
  - `assets/audio/flip.ogg` → `/assets/audio/flip.ogg` → 200
- **Sin `<base>`:** ✗ 404
  - `assets/audio/flip.ogg` → `/tests/assets/audio/flip.ogg` → 404

### Compatibilidad
- **Juego en raíz** (`/index.html`): Sin cambios, sigue resolviendo rutas correctamente (200 OK)
- **Banco de audio** (`/tests/audio-bench.html`): Ahora resuelve rutas correctamente (200 OK)

### RMS medido
El monitor RMS en el banco muestra actividad de audio cuando se reproducen sonidos:
- Indicador visual en canvas (barra verde cuando hay audio)
- Valor RMS en % (0–100%)
- Se actualiza cada 100ms

**Nota:** El RMS se estima desde el nodo master-gain; la medición exacta requeriría un AnalyserNode conectado en la salida (implementación futura si se necesita precisión mayor).

## Archivos modificados
- `src/audio/engine.js`: Línea 46, función loadBuffer
- `tests/audio-bench.html`: Línea 6, agregado `<base>`, líneas 71–95 estilos, script mejorado
- `tests/diagnose.mjs`: Script de diagnóstico (nuevo)

## Limitaciones conocidas (sin verificar)
- Volumen real percibido en hardware real (solo simulado en test)
- Compatibilidad iOS/Safari (solo Chromium testeado)
- Autoplay con policy `no-user-gesture-required` (en servidor local sin política)
