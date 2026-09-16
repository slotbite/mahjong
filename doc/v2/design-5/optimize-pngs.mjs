// Optimize PNG files to be <= 500 KB
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const pngDir = join(here, 'png');

const files = [
  { name: 'Main.png', maxSize: 500, scale: 1 },
  { name: 'MovilAjustes.png', maxSize: 500, scale: 1 },
  { name: 'Tablet.png', maxSize: 500, scale: 0.8 },
  { name: 'Escritorio.png', maxSize: 500, scale: 0.6 },
  { name: 'UltraWide.png', maxSize: 500, scale: 0.6 },
  { name: 'Guia.png', maxSize: 500, scale: 0.8 },
];

// Try to use ImageMagick or pngquant if available
for (const file of files) {
  const path = join(pngDir, file.name);
  const stats = statSync(path);
  const sizeKB = stats.size / 1024;

  if (sizeKB > file.maxSize) {
    console.log(`${file.name}: ${sizeKB.toFixed(1)} KB - needs optimization`);

    // Try pngquant first (most effective)
    try {
      execSync(`pngquant --quality=70-85 --skip-if-larger --force "${path}"`, { stdio: 'ignore' });
      const newStats = statSync(path);
      const newSizeKB = newStats.size / 1024;
      console.log(`  → optimized to ${newSizeKB.toFixed(1)} KB`);
    } catch (e) {
      console.log(`  ! pngquant not available, size remains ${sizeKB.toFixed(1)} KB`);
    }
  } else {
    console.log(`${file.name}: ${sizeKB.toFixed(1)} KB (OK)`);
  }
}

console.log('Optimization complete.');
