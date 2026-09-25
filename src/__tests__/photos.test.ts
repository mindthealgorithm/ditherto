import { describe, expect, it } from 'vitest';
import { loadImageData } from '../imageIO.js';
import { orientationError, pixelError } from '../../tests/helpers/photo-checks.js';

const path = 'tests/fixtures/photos/';
describe('real photographic decoding', () => {
  it('decodes lossless WebP without changing opaque PNG pixels', async () => {
    expect(
      pixelError(
        await loadImageData(`${path}coffee.png`),
        await loadImageData(`${path}coffee.webp`)
      )
    ).toBe(0);
  });
  it('handles a tagged sRGB ICC profile without a visible color shift', async () => {
    expect(
      pixelError(
        await loadImageData(`${path}coffee.jpg`),
        await loadImageData(`${path}coffee-srgb.jpg`)
      )
    ).toBeLessThanOrEqual(1);
  });
  for (let orientation = 2; orientation <= 8; orientation++) {
    it(`applies EXIF orientation ${orientation} exactly once`, async () => {
      const source = await loadImageData(`${path}coffee.jpg`);
      const result = await loadImageData(`${path}coffee-orientation-${orientation}.jpg`);
      expect([result.width, result.height]).toEqual(orientation >= 5 ? [400, 600] : [600, 400]);
      expect(orientationError(source, result, orientation)).toBe(0);
    });
  }
});
