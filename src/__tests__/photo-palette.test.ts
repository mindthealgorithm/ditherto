import { describe, expect, it } from 'vitest';
import { generatePalette, ditherToImageData, loadImageData, PALETTES } from '../index.js';
import type { ColorRGB } from '../types.js';

const pixels = (values: number[]) =>
  ({
    width: values.length / 4,
    height: 1,
    data: new Uint8ClampedArray(values),
    colorSpace: 'srgb',
  }) as ImageData;
const distance = (image: ImageData, palette: ColorRGB[]) => {
  let error = 0;
  for (let i = 0; i < image.data.length; i += 4)
    error += Math.min(
      ...palette.map(
        (c) =>
          (image.data[i]! - c[0]) ** 2 +
          (image.data[i + 1]! - c[1]) ** 2 +
          (image.data[i + 2]! - c[2]) ** 2
      )
    );
  return error / (image.width * image.height * 3);
};

describe('representative photo palettes', () => {
  it('preserves exact source colors when they fit, without padding or mutating', async () => {
    const image = pixels([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255]);
    const before = image.data.slice();
    expect(await generatePalette(image, { colors: 16 })).toEqual([
      [0, 0, 0],
      [255, 255, 255],
    ]);
    expect(image.data).toEqual(before);
  });
  it('one color is the population-weighted mean, not the mean of unique colors', async () => {
    expect(
      await generatePalette(
        pixels([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 200, 200, 200, 255]),
        { colors: 1 }
      )
    ).toEqual([[50, 50, 50]]);
  });
  it('ignores invisible RGB and weights partial alpha', async () => {
    expect(
      await generatePalette(pixels([255, 0, 0, 255, 0, 0, 255, 128, 0, 255, 0, 0]), { colors: 1 })
    ).toEqual([[170, 0, 85]]);
    await expect(generatePalette(pixels([255, 0, 0, 0]), { colors: 4 })).rejects.toThrow(
      'no visible colors'
    );
  });
  it('splits separated clusters into their weighted centers', async () => {
    expect(
      await generatePalette(
        pixels([0, 0, 0, 255, 16, 16, 16, 255, 224, 224, 224, 255, 240, 240, 240, 255]),
        { colors: 2 }
      )
    ).toEqual([
      [8, 8, 8],
      [232, 232, 232],
    ]);
  });
  it('does not depend on pixel traversal order', async () => {
    const data = Array.from({ length: 1024 }, (_, i) => (i % 4 === 3 ? 255 : (i * 53) % 256));
    const reversed = Array.from({ length: 256 }, (_, i) => data.slice(i * 4, i * 4 + 4))
      .reverse()
      .flat();
    expect(await generatePalette(pixels(data), { colors: 7 })).toEqual(
      await generatePalette(pixels(reversed), { colors: 7 })
    );
  });
  it('keeps exact extraction distinct from quantization', async () => {
    await expect(generatePalette('tests/fixtures/photos/coffee.png')).rejects.toThrow(
      'palette swatch'
    );
    await expect(
      generatePalette(pixels([1, 2, 3, 255]), { colors: 2, maxColors: 2 })
    ).rejects.toThrow('not both');
  });
  for (const colors of [0, -1, 1.5, 257, NaN, Infinity])
    it(`rejects invalid budget ${colors}`, async () => {
      await expect(generatePalette(pixels([1, 2, 3, 255]), { colors })).rejects.toThrow();
    });
  for (const name of ['coffee', 'astronaut', 'chelsea'])
    it(`reduces ${name} within the budget and improves reconstruction with more colors`, async () => {
      const image = await loadImageData(`tests/fixtures/photos/${name}.png`);
      const four = await generatePalette(image, { colors: 4 });
      const sixteen = await generatePalette(image, { colors: 16 });
      expect(four).toHaveLength(4);
      expect(sixteen).toHaveLength(16);
      expect(new Set(sixteen.map((c) => c.join(','))).size).toBe(16);
      expect(await generatePalette(image, { colors: 16 })).toEqual(sixteen);
      expect(distance(image, sixteen)).toBeLessThan(distance(image, four) * 0.6);
      for (const c of sixteen.flat()) expect(Number.isInteger(c) && c >= 0 && c <= 255).toBe(true);
    });
  it('applies another photo’s chosen palette through the full pipeline', async () => {
    const paletteImg = 'tests/fixtures/photos/coffee.png';
    const input = 'tests/fixtures/photos/chelsea.png';
    const palette = await generatePalette(paletteImg, { colors: 8 });
    const result = await ditherToImageData(input, {
      paletteImg,
      paletteColors: 8,
      width: 37,
      resample: 'area',
    });
    expect(result.data).toEqual(
      (await ditherToImageData(input, { palette, width: 37, resample: 'area' })).data
    );
    const members = new Set(palette.map((c) => c.join(',')));
    for (let i = 0; i < result.data.length; i += 4)
      expect(members.has(Array.from(result.data.slice(i, i + 3)).join(','))).toBe(true);
  });
  it('explicit palettes take precedence and a budget needs a source', async () => {
    const input = pixels([128, 128, 128, 255]);
    await expect(ditherToImageData(input, { paletteColors: 8 })).rejects.toThrow(
      'requires paletteImg'
    );
    expect(
      (
        await ditherToImageData(input, {
          palette: PALETTES.BW,
          paletteImg: 'missing.png',
          paletteColors: 8,
        })
      ).data
    ).toEqual((await ditherToImageData(input, { palette: PALETTES.BW })).data);
  });
});
