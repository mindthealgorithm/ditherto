import { validateImageDimensions } from './imageData.js';
import type { ColorRGB } from './types.js';

export function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0 and a finite integer`);
  }
}

export function validatePalette(palette: readonly ColorRGB[]): void {
  if (!Array.isArray(palette) || palette.length === 0) throw new Error('Palette cannot be empty');
  for (const color of palette) {
    if (
      !Array.isArray(color) ||
      color.length !== 3 ||
      [0, 1, 2].some(
        (index) => !Number.isInteger(color[index]) || color[index]! < 0 || color[index]! > 255
      )
    ) {
      throw new Error('Palette colors must be RGB triples of integers between 0 and 255');
    }
  }
}

export function validatePixels(image: ImageData): void {
  validateImageDimensions(image.width, image.height);
  if (
    !(image.data instanceof Uint8ClampedArray) ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new Error('Image data must contain exactly width × height × 4 RGBA bytes');
  }
}
