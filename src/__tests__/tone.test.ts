import { describe, expect, it } from 'vitest';
import { adjustTones } from '../tone.js';
import { ditherToImageData, loadImageData, resizeImageData, PALETTES } from '../index.js';
const pixel = (gray: number, alpha = 255) =>
  ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([gray, gray, gray, alpha]),
    colorSpace: 'srgb',
  }) as ImageData;

describe('exposure and contrast', () => {
  it('neutral controls preserve every input byte exactly', () => {
    for (let i = 0; i < 256; i++) expect(adjustTones(pixel(i)).data[0]).toBe(i);
  });
  it('one stop doubles linear light, not the encoded byte', () => {
    expect(adjustTones(pixel(128), 1).data[0]).toBe(176);
    expect(adjustTones(pixel(128), -1).data[0]).toBe(92);
    expect(adjustTones(pixel(5), 1).data[0]).toBe(10);
  });
  it('contrast expands around the midpoint and clamps endpoints', () => {
    expect(adjustTones(pixel(64), 0, 2).data[0]).toBe(1);
    expect(adjustTones(pixel(192), 0, 2).data[0]).toBe(255);
    expect(adjustTones(pixel(0), 0, 0).data[0]).toBe(128);
    expect(adjustTones(pixel(255), 0, 0).data[0]).toBe(128);
  });
  it('preserves alpha, hidden RGB and the original buffer', () => {
    const a = pixel(100, 123);
    const b = adjustTones(a, 1, 1.5);
    expect(a.data).toEqual(new Uint8ClampedArray([100, 100, 100, 123]));
    expect(b.data[3]).toBe(123);
    expect(adjustTones(pixel(100, 0), 1, 1.5).data).toEqual(pixel(100, 0).data);
  });
  it('is monotonic and bounded across the full input range', () => {
    for (const exposure of [-4, 0, 4])
      for (const contrast of [0, 0.5, 1, 2]) {
        let previous = 0;
        for (let i = 0; i < 256; i++) {
          const next = adjustTones(pixel(i), exposure, contrast).data[0]!;
          expect(next).toBeGreaterThanOrEqual(previous);
          previous = next;
        }
      }
  });
  it('rejects non-finite and out-of-range controls through the pipeline', async () => {
    for (const exposure of [-4.1, 4.1, NaN, Infinity])
      await expect(ditherToImageData(pixel(128), { exposure })).rejects.toThrow('Exposure');
    for (const contrast of [-0.1, 2.1, NaN, Infinity])
      await expect(ditherToImageData(pixel(128), { contrast })).rejects.toThrow('Contrast');
  });
  it('applies resize → exposure → contrast → dither, without changing palette colors', async () => {
    const photo = await loadImageData('tests/fixtures/photos/coffee.png');
    const adjusted = adjustTones(
      await resizeImageData(photo, { width: 37, resample: 'area' }),
      1,
      1.4
    );
    const expected = await ditherToImageData(adjusted, { palette: PALETTES.GAMEBOY });
    const actual = await ditherToImageData(photo, {
      width: 37,
      resample: 'area',
      exposure: 1,
      contrast: 1.4,
      palette: PALETTES.GAMEBOY,
    });
    expect(actual.data).toEqual(expected.data);
  });
});
