// Local visual QA artifact; run after npm run build. No network or Python required.
import { createCanvas, ImageData } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadImageData, resizeImageData, ditherToImageData, PALETTES } from '../dist/index.js';
const names = ['astronaut', 'coffee', 'chelsea'];
const columns = ['Original', 'Nearest / 64px', 'Area / 64px', 'Area + Atkinson', 'Area + Floyd–Steinberg', 'Area + Bayer'];
const canvas = createCanvas(1608, 1020);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#f7f4ec'; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#292537'; ctx.font = 'bold 24px sans-serif';
ctx.fillText('ditherto / photographic downsampling review', 24, 36);
ctx.font = '14px sans-serif'; ctx.fillText('64px outputs enlarged without smoothing • grayscale palette • unchanged source files', 24, 64);
for (let row = 0; row < names.length; row++) {
  const name = names[row];
  const input = await loadImageData(`tests/fixtures/photos/${name}.png`);
  const outputs = [input, await resizeImageData(input, { width:64, resample:'nearest' }), await resizeImageData(input, { width:64, resample:'area' })];
  for (const algorithm of ['atkinson', 'floyd-steinberg', 'ordered']) outputs.push(await ditherToImageData(input, { algorithm, width:64, resample:'area', palette:PALETTES.GRAYSCALE_16 }));
  for (let col = 0; col < outputs.length; col++) {
    const image = outputs[col];
    const tile = createCanvas(image.width, image.height);
    tile.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
    const x = 24 + col * 264, y = 110 + row * 300;
    ctx.fillStyle = '#292537'; ctx.font = '13px sans-serif'; ctx.fillText(columns[col], x, y - 12);
    const scale = Math.min(248 / image.width, 256 / image.height);
    ctx.imageSmoothingEnabled = col === 0;
    ctx.drawImage(tile, x, y, image.width * scale, image.height * scale);
  }
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/photo-review.png', canvas.toBuffer('image/png'));
console.log('Wrote test-results/photo-review.png');
