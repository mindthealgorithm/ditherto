import { createImageDataCrossPlatform } from './imageData.js';
import type { DitherOptions } from './types.js';

export function validateTones(options: Pick<DitherOptions, 'exposure' | 'contrast'>): void {
  for (const [name, value, min, max] of [
    ['Exposure', options.exposure ?? 0, -4, 4],
    ['Contrast', options.contrast ?? 1, 0, 2],
  ] as const) {
    if (!Number.isFinite(value) || value < min || value > max)
      throw new Error(`${name} must be between ${min} and ${max}`);
  }
}

/** Exposure in linear sRGB, followed by contrast around encoded sRGB 0.5. */
export function adjustTones(image: ImageData, exposure = 0, contrast = 1): ImageData {
  validateTones({ exposure, contrast });
  if (exposure === 0 && contrast === 1) return image;
  const table = new Uint8ClampedArray(256);
  const gain = 2 ** exposure;
  for (let i = 0; i < 256; i++) {
    const encoded = i / 255;
    const linear = encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
    const lit = linear * gain;
    const exposed = lit <= 0.0031308 ? lit * 12.92 : 1.055 * lit ** (1 / 2.4) - 0.055;
    // Keep neutral exposure exact, including half-byte contrast rounding boundaries.
    const exposedByte = exposure === 0 ? i : exposed * 255;
    table[i] = Math.round((exposedByte - 127.5) * contrast + 127.5);
  }
  const data = new Uint8ClampedArray(image.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = table[data[i]!]!;
    data[i + 1] = table[data[i + 1]!]!;
    data[i + 2] = table[data[i + 2]!]!;
  }
  return createImageDataCrossPlatform(data, image.width, image.height);
}
