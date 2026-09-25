import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ditherImage, ditherToImageData, algorithms, PALETTES, generatePalette } from '../index.js';
import { loadImageData, resizeImageData, calculateResizeDimensions } from '../imageIO.js';
import { encodePng } from '../node.js';
import { createImageData, createGradient } from './testUtils.js';

const inputPath = 'tests/fixtures/input/gradient-4x4.png';

describe('real cross-runtime input/output contract', () => {
  it('loads paths, byte arrays, ArrayBuffers, offset views and Blobs identically in Node', async () => {
    const bytes = await readFile(inputPath);
    const padded = new Uint8Array(bytes.length + 20);
    padded.set(bytes, 7);
    const expected = await loadImageData(inputPath);
    for (const input of [
      bytes,
      new Uint8Array(bytes),
      new Uint8Array(bytes).buffer,
      padded.subarray(7, 7 + bytes.length),
      new Blob([bytes]),
    ]) {
      expect((await loadImageData(input)).data).toEqual(expected.data);
    }
  });

  it('round trips PNG dimensions and alpha without a browser ImageData global', async () => {
    const input = createImageData([
      [
        [12, 34, 56],
        [200, 220, 240],
      ],
    ]);
    input.data[3] = 0;
    input.data[7] = 128;
    const result = await ditherToImageData(input, { palette: PALETTES.BW, width: 4 });
    expect([result.width, result.height]).toEqual([4, 2]);
    const png = encodePng(result);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const decoded = await loadImageData(png);
    expect([decoded.width, decoded.height]).toEqual([4, 2]);
    expect(Array.from(decoded.data.filter((_, i) => i % 4 === 3))).toEqual([
      0, 0, 128, 128, 0, 0, 128, 128,
    ]);
    expect(await ditherImage(input)).toBeInstanceOf(Uint8Array);
  });

  it('rerenders resizing from unchanged original pixels', async () => {
    const input = createGradient();
    const before = input.data.slice();
    const small = await ditherToImageData(input, { width: 2 });
    await ditherToImageData(input, { width: 7 });
    expect((await ditherToImageData(input, { width: 2 })).data).toEqual(small.data);
    expect(input.data).toEqual(before);
  });

  it('allows registered algorithms and shields original pixels from plugin mutations', async () => {
    const original = createGradient();
    const before = original.data.slice();
    algorithms.register({
      name: 'test-custom',
      apply(data) {
        data.data[0] = 99;
        return data;
      },
    });
    const result = await ditherToImageData(original, {
      algorithm: 'test-custom',
      palette: PALETTES.BW,
    });
    expect(result.data[0]).toBe(99);
    expect(original.data).toEqual(before);
  });

  it.each([NaN, Infinity, 1.2, 0, -1])(
    'rejects invalid dimensions %s before allocating',
    async (width) => {
      await expect(ditherToImageData(createGradient(), { width })).rejects.toThrow();
    }
  );

  it('rejects malformed pixels, palette channels and oversized results', async () => {
    await expect(
      ditherToImageData({ ...createGradient(), data: new Uint8ClampedArray(3) })
    ).rejects.toThrow('RGBA');
    await expect(ditherToImageData(createGradient(), { palette: [[NaN, 0, 0]] })).rejects.toThrow(
      'RGB'
    );
    await expect(ditherToImageData(createGradient(), { width: 8192 })).rejects.toThrow('too large');
    await expect(ditherToImageData(createGradient(), { quality: NaN })).rejects.toThrow('Quality');
  });

  it('samples nearest pixel centers and keeps thin images at least one pixel tall', async () => {
    const image = createImageData([
      [
        [0, 0, 0],
        [100, 100, 100],
        [200, 200, 200],
        [255, 255, 255],
      ],
    ]);
    const resized = await resizeImageData(image, { width: 2 });
    expect(Array.from(resized.data)).toEqual([100, 100, 100, 255, 255, 255, 255, 255]);
    expect(calculateResizeDimensions(1000, 1, { width: 1 })).toEqual({ width: 1, height: 1 });
  });

  it.each(['atkinson', 'floyd-steinberg', 'ordered'])(
    'quantizes visible pixels in a block with a transparent origin: %s',
    async (algorithm) => {
      const image = createImageData([
        [
          [200, 40, 100],
          [90, 80, 70],
        ],
      ]);
      image.data[3] = 0;
      const result = await ditherToImageData(image, { algorithm, step: 2, palette: PALETTES.BW });
      expect(result.data[3]).toBe(0);
      expect(PALETTES.BW).toContainEqual(Array.from(result.data.slice(4, 7)));
    }
  );
});

describe('golden fixtures and palette extraction', () => {
  it.each(['atkinson', 'floyd-steinberg', 'ordered'])(
    'matches the saved BW checkerboard PNG for %s',
    async (algorithm) => {
      const actual = await ditherToImageData('tests/fixtures/input/checkerboard-4x4.png', {
        algorithm,
      });
      const golden = await loadImageData(`tests/fixtures/golden/checkerboard-${algorithm}-bw.png`);
      expect(actual.data).toEqual(golden.data);
    }
  );
  it('extracts real palette colors and bounds unintentional photo extraction', async () => {
    expect(await generatePalette('tests/fixtures/palettes/gameboy-palette.png')).toEqual(
      PALETTES.GAMEBOY
    );
    await expect(generatePalette(createGradient(), { maxColors: 2 })).rejects.toThrow(
      'palette swatch'
    );
    expect(await generatePalette(createGradient(), { maxColors: 32 })).toHaveLength(11);
  });
});
