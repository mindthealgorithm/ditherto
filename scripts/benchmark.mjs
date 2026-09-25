import { performance } from 'node:perf_hooks';
import { ditherToImageData, PALETTES } from '../dist/index.js';
const rows = [];
for (const size of [256, 512, 1024]) {
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    pixels[i] = Math.round(x / (size - 1) * 255);
    pixels[i + 1] = Math.round(y / (size - 1) * 255);
    pixels[i + 2] = (x * 7 + y * 11) % 256;
    pixels[i + 3] = 255;
  }
  const input = { width: size, height: size, data: pixels, colorSpace: 'srgb' };
  for (const algorithm of ['atkinson', 'floyd-steinberg', 'ordered']) {
    await ditherToImageData(input, { algorithm, palette: PALETTES.GAMEBOY });
    const start = performance.now();
    for (let i = 0; i < 3; i++) await ditherToImageData(input, { algorithm, palette: PALETTES.GAMEBOY });
    rows.push({ size: `${size}×${size}`, algorithm, meanMs: Number(((performance.now() - start) / 3).toFixed(1)) });
  }
}
console.log(`Node ${process.version}; ${process.platform}/${process.arch}; four-color palette; one warmup + three timed runs; excludes decode/encode.`);
console.table(rows);
