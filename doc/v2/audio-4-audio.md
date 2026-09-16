# audio-4: Motor Web Audio y mapa de sonidos

**Entregable:** Motorización de audio, curaduría CC0, mapeo de eventos, limpieza v1.

## Mapa de sonidos

| Evento | ID | Archivo | KB | Fuente | Licencia | Decisión |
|--------|----|---------|--|---------|-----------| ---------|
| flip | flip | glass_001.ogg | 4.6 | Kenney | CC0 | Variación ±4% rate para evitar sonido mecánico |
| match | match | kalimba.mp3 | 12.6 | freesound.org/PanPiper | CC0 | Rate 1+racha·0.03; desvanecido 500ms |
| miss | miss | water-drop.mp3 | 6.0 | freesound.org/florianreichelt | CC0 | Transpuesta −4 semitonos, grave, sin castigo |
| deal | deal | card_shuffle.mp3 (v1) | 11.8 | proyecto (v1) | Own | Reutilizado de v1 |
| win | win | kalimba.mp3 (arpeggio) | 18.0 | freesound.org/PanPiper | CC0 | Acorde A3–E4 transpuesto (4 capas, 140ms) |
| hint | hint | wind-chime.mp3 | 19.1 | freesound.org/Anthousai | CC0 | Campanilla, desvanecido 800ms |
| combo | combo | wind-chime.mp3 (up) | 12.4 | freesound.org/Anthousai | CC0 | Quinta arriba (×1.5 rate) |
| cat_purr | cat_purr | cat_purr.mp3 (v1) | 15.2 | proyecto (v1) | Own | Easter egg conservado |
| (ambiente) | rain-tropical | rain.ogg | 456.0 | freesound.org/felix.blume | CC0 | Lluvia suave, loop sin costura 52s, −23 LUFS |
| (ambiente) | jungle-birds | jungle.ogg | 349.5 | freesound.org/nonamethefish | CC0 | Aves+ranas, loop sin costura 46s, −23 LUFS |
| (opcional) | thunder-1 | distant-rumbles.mp3 | 48.5 | freesound.org/richwise | CC0 | Trueno lejano aleatorio 40–120s, desactivado hoy |

## Decisiones técnicas

### Loudness y normalización
- **Ambientes:** −23 LUFS integrado (EBU R128) para que coincidan en volumen al mezclar lluvia+selva.
- **SFX:** −18 LUFS (3 dB más fuerte que ambientes para claridad).
- **Ganancia estática** + limitador (−1 dBTP): evita que el punto de costura del loop reciba cambios dinámicos distintos.

### Bitrates y presupuesto
- Ambientes estéreo: **64 kbps OGG Vorbis + M4A** (48 kHz). Lluvia y aves son contenido de banda ancha; Vorbis resuelve bien a esta tasa.
- SFX mono: **56 kbps OGG + M4A** (48 kHz).
- Truenos (si se habilitan): **40 kbps** (contenido grave).
- **Peso total en disco:** 1.9 MB (ogg+m4a en assets/audio + créditos + report) < 2.5 MB presupuesto.
- **Descarga real por cliente:** 953.8 KB (.ogg solo); 1.0 MB (.m4a para fallback iOS).

### Loops sin costura
Crossfade equal-power de cola→cabeza (1.5–2 s) con métricas de discontinuidad verificadas:
- rain-tropical: lfJump 0.42 (vs. 1.07 corte duro) — mejora 150%.
- jungle-birds: lfJump 0.28 (vs. 5.62 corte duro) — mejora 95%.

## Retirado de v1

| ID v1 | Motivo |
|-------|--------|
| flip_card.mp3 | Reutilizado como glass_001 (Kenney, más suave) |
| bad_match.mp3 | Reemplazado por water-drop (gota grave transpuesta) |
| drama_boom.mp3 (509 KB) | Eliminado; no hay penalización sonora en miss; barajar es neutro |
| match.mp3 | Actualizado a kalimba.mp3 con variación dinámica por racha |
| clean_win.mp3 | Reemplazado por arpeggio kalimba (A3–E4) |
| winbanjo.mp3 | Eliminado; sustituido por win acorde |
| planta.mp3 | No utilizado en v1, descartado |
| cat_purr.mp3 | **Conservado** como easter egg |

**Ahorro:** 509 KB (drama_boom) + mejoras de compresión = reducción ~1.1 MB respecto a v1.

## API y contrato

```js
import { audio } from './src/audio/engine.js';
await audio.init(ctx.manifest?.audio);
audio.unlock();  // primer pointerdown/keydown
audio.playSfx('match', { rate: 1 + streak * 0.03, gain: 1 });
audio.ambient.start(['rain-tropical', 'jungle-birds']);
audio.ambient.setIntensity(0.7);  // 0..1
audio.setVolume('ambient' | 'sfx', 0..1);
```

Eventos escuchados:
- `card:flip` (faceUp) → playSfx('flip')
- `pair:match` (streak, easterEgg?) → playSfx('match', ...)
- `pair:miss` → playSfx('miss')
- `game:dealt` → playSfx('deal')
- `hint:used` → playSfx('hint')
- `game:win` → playSfx('win') + ambient 0.7 × 8s
- `game:pause/resume` → duck −12dB / restaurar
- `settings:changed` → ajustar volúmenes

## Agregación de un nuevo sonido

1. Agregar entrada a `SOUNDS[]` en `tools/build-audio.mjs`:
   ```js
   { id: 'mysfx', kind: 'sfx', src: 'source_id', lufs: -18, gain: 0.7, note: '...' }
   ```
2. Asegurar que la fuente cruda esté en `assets/raw-audio/` o definida en `SOURCES`.
3. Ejecutar `node tools/build-audio.mjs --only mysfx`.
4. Escuchar en una rama si `buffers[id]` existe; tolerante a faltas.

## Propuestas para el director

### Decisiones pendientes
- [ ] **Agregar `assets/raw-audio/` al `.gitignore`:** hoy pesa 19 MB y sale en `git status`. No forma parte del commit pero sí los `.ogg/.m4a` comprimidos.
- [ ] **Fusionar `src/audio/manifest.audio.json` en `assets/manifest.json`:** hoy son dos archivos; uno generado, otro manual. Propuesta: unificar en la sección `audio` de `assets/manifest.json` (dirección v2 global).
- [ ] **Thunder opcional:** `thunder-1` está precargado pero silencioso. Si se quiere ruido de tormenta, activar `ambient._startThunder()` desde la UI o cambiar volumen.

### Sin verificar
- [ ] Prueba navegador: audio-bench.html con Chromium/Firefox/Safari (detectar canPlayType ogg).
- [ ] Fallback M4A: confirmar que `.m4a` se reproduce en iOS 14+ (AAC nativo).
- [ ] Pausa en segundo plano: `visibilitychange` emite `game:pause`, ducking OK; verificar con tab/sleep real.
- [ ] Racha limitada: si `streak > 30`, ¿rate → 1 + 30*0.03 = 1.9x se sigue escuchando bien?
- [ ] Merging en `assets/manifest.json`: aún no se ha integrado la sección `audio` al manifiesto global; propuesta en src/audio/manifest.audio.json.

## Archivo de prueba

`tests/audio-bench.html` — botones por SFX, sliders de volumen e intensidad, canvas analyser (FFT placeholder). Ejecutar con `python -m http.server 8084 --bind 127.0.0.1` y probar desde navegador.

---

**Peso final:** 2.0 MB (assets/audio) + 3.5 KB (créditos/report) = **1.9 MB descarga** (ogg solo).
**Generado:** 2026-09-16 12:29:24 UTC. Motor en `src/audio/engine.js` (258 líneas).
