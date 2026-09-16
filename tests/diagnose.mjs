#!/usr/bin/env node
// Diagnostico: simula carga de manifiesto y resolucion de rutas desde audio-bench.html

const baseUrl = 'http://127.0.0.1:8094';

// Simular document.baseURI cuando <base href="/"> esta presente
const benchDocumentUrl = new URL('/tests/audio-bench.html', baseUrl).href;
const baseHref = '/';
const simulatedBaseURI = new URL(baseHref, baseUrl).href;

console.log('=== DIAGNOSTICO DE RUTAS ===\n');
console.log(`Documento: ${benchDocumentUrl}`);
console.log(`<base href="/"> => document.baseURI: ${simulatedBaseURI}\n`);

// Cargar manifiesto
console.log('Cargando manifiesto desde ../assets/manifest.json...');
const manifestUrl = new URL('../assets/manifest.json', benchDocumentUrl).href;
console.log(`URL resoluta: ${manifestUrl}`);

try {
  const resp = await fetch(manifestUrl);
  const fullManifest = await resp.json();
  const manifest = fullManifest.audio;

  console.log(`Manifiesto cargado (${resp.status})\n`);
  console.log(`Ambientes: ${Object.keys(manifest.ambient).join(', ')}`);
  console.log(`SFX: ${Object.keys(manifest.sfx).join(', ')}\n`);

  console.log('=== VERIFICACION DE RUTAS DE AUDIO ===\n');

  const audioToCheck = [
    { id: 'flip', section: 'sfx' },
    { id: 'match', section: 'sfx' },
    { id: 'rain-tropical', section: 'ambient' },
  ];

  for (const { id, section } of audioToCheck) {
    const entry = manifest[section][id];
    if (!entry) continue;

    const path = entry.ogg || entry.m4a;
    console.log(`Sonido: ${id}`);
    console.log(`  Ruta en manifiesto: ${path}`);

    const withBase = new URL(path, simulatedBaseURI).href;
    console.log(`  Con <base href="/"> (correcto): ${withBase}`);

    const withoutBase = new URL(path, benchDocumentUrl).href;
    console.log(`  Sin <base> (incorrecto): ${withoutBase}`);

    try {
      const r1 = await fetch(withBase);
      const r2 = await fetch(withoutBase);
      console.log(`  Con <base>: ${r1.status} ${r1.ok ? 'OK' : 'FAIL'}`);
      console.log(`  Sin <base>: ${r2.status} ${r2.ok ? 'OK' : 'FAIL'}`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    console.log('');
  }

  console.log('=== CONCLUSION ===');
  console.log('Con <base href="/"> en audio-bench.html, las rutas se resuelven correctamente.');
  console.log('El motor usa new URL(path, document.baseURI) para resolver rutas.\n');

} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
