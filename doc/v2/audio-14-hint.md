# audio-14: Pista de Hint — Cuenco Grave de Meditación

## Contexto
Feedback del dueño: "El sonido del hint es muy invasivo, podría ser un bowl más amable, un bajo de meditación/concentración". Le encanta el `match` (kalimba/cuenco tibetano) y el `combo`.

## Implementación

### Fuente y procesamiento
- **Fuente base:** `kalimba` (PanPiper5, CC0-1.0, mismo crudo que `match`)
- **Cadena de filtros ffmpeg:**
  ```
  asetrate=${SR*0.5},aresample=${SR},lowpass=f=900,afade=t=in:d=0.08,afade=t=out:st=1.6:d=1.2
  ```
  - `asetrate=${SR*0.5}` (24000 Hz): Transpone una octava hacia abajo
  - `aresample=${SR}` (48000 Hz): Remuestrea a SR original
  - `lowpass=f=900`: Suaviza frecuencias altas, enfatiza rango grave
  - `afade=t=in:d=0.08`: Ataque suavizado (80 ms fade-in)
  - `afade=t=out:st=1.6:d=1.2`: Cola de desvanecimiento larga (1.2 s desde 1.6 s)

### Parámetros en pipeline
- **src:** `kalimba` (igual que `match` y `win`)
- **lufs:** `-21` (3 dB más bajo que `match` a -18)
- **gain:** `0.45` (vs. `match` 0.7; reduce invasividad)
- **maxDur:** `3.0` s (permite cola larga)
- **Nota:** Cuenco grave de meditación con ataque suavizado y resonancia meditativa

## Medidas (Después del Procesamiento)

| Métrica | Hint (anterior) | Hint (nuevo) | Notas |
|---------|-----------|----------|-------|
| LUFS | -18.4 | -21.0 | ✓ Target alcanzado |
| Pico (dBFS) | -7.7 | -7.8 | ✓ Safe (< -6) |
| Duración | 2.305 s | 2.766 s | ✓ Extendida por cola meditativa |
| Hash | 3efb3c3d40 | 7bfeccb08e | ✓ Regenerado |

## Archivo modificado
- `tools/build-audio.mjs`: Línea 131-133, definición del SFX `hint`

## Licencia y Atribución
**Fuente:** Kalimba.wav — PanPiper5 (https://freesound.org/people/PanPiper5/sounds/659909/)  
**Licencia:** CC0-1.0 (dominio público, sin atribución requerida)

## Verificación Pendiente
- [ ] Sonido en audio-bench.html con autoplay
- [ ] RMS del hint < RMS de match
- [ ] Pico no supera -6 dBFS
- [ ] Feedback perceptual del dueño (solo él puede juzgar la sensación meditativa)

## Archivos Generados
- `assets/audio/hint.ogg` (56 kbps, mono)
- `assets/audio/hint.m4a` (ALAC)
- `assets/audio/report.json` (metadatos)

## Cambios pendientes
- [ ] Actualizar `src/audio/manifest.audio.json` (hint: gain, attribution, duration)
- [ ] Actualizar `assets/manifest.json` (hint: gain, attribution, duration)
- [ ] Commit: `feat(audio-14): pista con cuenco grave de meditación`
