import { describe, expect, it } from 'vitest';
import { loadImageData, resizeImageData } from '../imageIO.js';
import { ditherToImageData } from '../imageProcessor.js';
import { createImageData } from './testUtils.js';

const rgba = (width: number, height: number, values: number[]) =>
  ({ width, height, data: new Uint8ClampedArray(values), colorSpace: 'srgb' }) as ImageData;

describe('area downsampling', () => {
  it('integrates a checkerboard instead of aliasing it to black', async () => {
    const input = createImageData([
      [
        [0, 0, 0],
        [255, 255, 255],
      ],
      [
        [255, 255, 255],
        [0, 0, 0],
      ],
    ]);
    expect(Array.from((await resizeImageData(input, { width: 1, resample: 'area' })).data)).toEqual(
      [128, 128, 128, 255]
    );
    expect(Array.from((await resizeImageData(input, { width: 1 })).data)).toEqual([0, 0, 0, 255]);
  });

  it('weights fractional source coverage exactly at 3-to-2', async () => {
    const input = createImageData([
      [
        [0, 0, 0],
        [90, 90, 90],
        [240, 240, 240],
      ],
    ]);
    const result = await resizeImageData(input, { width: 2, resample: 'area' });
    expect(Array.from(result.data)).toEqual([30, 30, 30, 255, 190, 190, 190, 255]);
  });

  it('ignores hidden RGB and averages alpha before unpremultiplying', async () => {
    const input = rgba(2, 1, [255, 0, 0, 255, 0, 0, 255, 0]);
    expect(Array.from((await resizeImageData(input, { width: 1, resample: 'area' })).data)).toEqual(
      [255, 0, 0, 128]
    );
    const partial = rgba(2, 1, [255, 0, 0, 128, 0, 0, 255, 255]);
    expect(
      Array.from((await resizeImageData(partial, { width: 1, resample: 'area' })).data)
    ).toEqual([85, 0, 170, 192]);
    const invisible = rgba(2, 1, [255, 0, 0, 0, 0, 0, 255, 0]);
    expect(
      Array.from((await resizeImageData(invisible, { width: 1, resample: 'area' })).data)
    ).toEqual([0, 0, 0, 0]);
  });

  it('keeps no-op identity and nearest-neighbor enlargement', async () => {
    const input = createImageData([
      [
        [0, 0, 0],
        [255, 255, 255],
      ],
    ]);
    expect(await resizeImageData(input, { resample: 'area' })).toBe(input);
    expect((await resizeImageData(input, { width: 5, resample: 'area' })).data).toEqual(
      (await resizeImageData(input, { width: 5, resample: 'nearest' })).data
    );
  });

  it('rejects unknown methods even for a no-op resize or pipeline', async () => {
    const input = createImageData([[[0, 0, 0]]]);
    await expect(resizeImageData(input, { resample: 'invalid' as 'area' })).rejects.toThrow(
      'Resample'
    );
    await expect(ditherToImageData(input, { resample: 'invalid' as 'area' })).rejects.toThrow(
      'Resample'
    );
  });

  it('area integration commutes with transpose, including odd dimensions and alpha', async () => {
    const data = new Uint8ClampedArray(7 * 5 * 4);
    for (let i = 0; i < data.length; i++) data[i] = (i * 73 + 31) % 256;
    const input = { width: 7, height: 5, data, colorSpace: 'srgb' } as ImageData;
    const transpose = (image: ImageData) => {
      const out = new Uint8ClampedArray(image.data.length);
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++)
          for (let c = 0; c < 4; c++)
            out[(x * image.height + y) * 4 + c] = image.data[(y * image.width + x) * 4 + c]!;
      return {
        width: image.height,
        height: image.width,
        data: out,
        colorSpace: 'srgb',
      } as ImageData;
    };
    const a = await resizeImageData(input, { width: 3, resample: 'area' });
    const b = await resizeImageData(transpose(input), { height: 3, resample: 'area' });
    expect(a.data).toEqual(transpose(b).data);
  });
});

for (const [name, width] of [
  ['astronaut', 64],
  ['coffee', 120],
  ['chelsea', 90],
] as const) {
  it(`matches independent Pillow BOX reference for ${name}`, async () => {
    const input = await loadImageData(
      `tests/fixtures/photos/${name === 'chelsea' ? 'chelsea-integral' : name}.png`
    );
    const expected = await loadImageData(`tests/fixtures/photos/${name}-box.png`);
    const result = await resizeImageData(input, { width, resample: 'area' });
    expect([result.width, result.height]).toEqual([expected.width, expected.height]);
    let maxError = 0;
    for (let i = 0; i < result.data.length; i++)
      maxError = Math.max(maxError, Math.abs(result.data[i]! - expected.data[i]!));
    // Pillow rounds during separable filtering; our single rounding may differ by one byte.
    expect(maxError).toBeLessThanOrEqual(1);
  });
  it(`preserves average photo color at fractional ratios for ${name}`, async () => {
    const input = await loadImageData(`tests/fixtures/photos/${name}.png`);
    const before = input.data.slice();
    const result = await resizeImageData(input, { width: 37, resample: 'area' });
    const mean = (image: ImageData, channel: number) => {
      let sum = 0;
      for (let i = channel; i < image.data.length; i += 4) sum += image.data[i]!;
      return sum / (image.width * image.height);
    };
    for (const c of [0, 1, 2])
      expect(Math.abs(mean(input, c) - mean(result, c))).toBeLessThanOrEqual(0.5);
    expect(input.data).toEqual(before);
  });
}
