import { writeFile } from 'node:fs/promises';
import { ditherToImageData, PALETTES } from '../dist/index.js';
import { encodePng } from '../dist/node.js';

const input = process.argv[2] ?? 'tests/fixtures/input/complex-photo.png';
const output = process.argv[3] ?? 'example-output.png';
const pixels = await ditherToImageData(input, {
  algorithm: 'floyd-steinberg',
  palette: PALETTES.GAMEBOY,
  width: 320,
});
await writeFile(output, encodePng(pixels));
console.log(`Saved ${pixels.width}×${pixels.height} PNG to ${output}`);
