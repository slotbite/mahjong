# audio-16: Ambiente en el juego + cache-busting + hint v1/v2

## Causa raíz

El ambiente no se escuchaba en el juego (pero sí en el banco). En `src/audio/engine.js`:
- **L11**: `currentAmbientIds = []` inicia vacío, nunca se llena con IDs por defecto
- **L256**: `settings:changed` listener llama `ambient.start(currentAmbientIds)` pero está vacío
- **L110-111**: `ambient.start(ids)` retorna sin hacer nada si `ids.length === 0`
- **L30-37**: `resume()` no arranca ambiente tras desbloquear

Efecto: En el juego, sin click manual para seleccionar ambiente, los loops nunca se iniciaban.

## Fix implementado

1. **Arranque automático tras unlock** (L11-12, L37-45):
   - `defaultAmbientIds[]` guarda IDs de ambiente con `loop: true` al precargar
   - `resume()` ahora arranca `ambient.start(defaultAmbientIds)` si `ambientOn=true`
   - Maneja dos casos: contexto suspended (l37) y ya running (l41)

2. **Fallback en settings** (L291-296):
   - Si `ambientOn=true` y `currentAmbientIds` vacío, usa `defaultAmbientIds`
   - Permite que el usuario active/desactive mediante settings

3. **Precarga de hashes** (L79-91, L54-61):
   - Carga `assets/audio/report.json` para obtener hash de cada archivo
   - `loadBuffer(path, fileId)` agrega `?v=<hash>` a URL
   - Cache-busting: navegador recarga si hash cambia, no sirve caché viejo

## Hint v1 y v2

- **hint-v1**: chime, −19 LUFS, gain 0.55, 2.305 s
  - Fuente: wind chimes - single 04 (Anthousai)
  - Archivo: `assets/audio/hint-v{1}.{ogg,m4a}` + manifiesto + report.json
- **hint-v2**: kalimba bajada octava, −21 LUFS, gain 0.45, 2.766 s
  - Fuente: Kalimba (PanPiper5)
  - Filtros: asetrate ×0.5, lowpass 900 Hz, afade in 80ms/out 1.2s

Banco (L120-127): Botones separados "hint v2 (cuenco)" y "hint v1 (chime)" + indicador hash.

## Archivos modificados

- `src/audio/engine.js`: arranque automático, cache-busting (13 líneas)
- `tools/build-audio.mjs`: hint-v1 en SOUNDS array (1 entrada)
- `src/audio/manifest.audio.json`: hint-v1 auto-generado
- `assets/manifest.json`: hint-v1 agregado manualmente
- `tests/audio-bench.html`: botones hint v1/v2 + display de hashes (30 líneas)
- `assets/audio/hint-v1.{ogg,m4a}`: nuevos archivos (~37 KB total)
- `assets/audio/report.json`, `CREDITS-audio.md`: actualizados por build script

## Prueba manual

1. Abre `http://127.0.0.1:9998/` en 1280×800
2. Haz click en botón/tecla (pointerdown/keydown) para desbloquear
3. Espera 5 s: ambiente (lluvia/selva) debe sonar con fade-in 3 s
4. Consola: busca `"ambiente iniciado: rain-tropical, jungle-birds"` o similar
5. Mide RMS en banco: con AnalyserNode en bus, debería RMS > 0.01 cuando activo
6. Recarga página: `?v=<hash>` debe cambiar en Network si hash cambió (cache-busting)

## Pendiente

- iOS real: verificar que AudioContext se reanuda correctamente con gesto
