import type { InputImageSource, ColorRGB, GeneratePaletteOptions } from '../types.js';
import { loadImageData } from '../imageIO.js';
import { validatePixels, validatePositiveInteger } from '../validation.js';

import { quantizePalette, validateColorCount } from './quantize.js';

/** Exact swatch extraction by default; { colors } selects bounded photo quantization. */
export async function generatePalette(
  input: InputImageSource,
  options: GeneratePaletteOptions = {}
): Promise<ColorRGB[]> {
  if (options.colors !== undefined) {
    validateColorCount(options.colors);
    if (options.maxColors !== undefined)
      throw new Error('Use colors for photos or maxColors for exact swatches, not both');
    return quantizePalette(await loadImageData(input), options.colors);
  }
  return extractColorsFromImageData(await loadImageData(input), options.maxColors ?? 256);
}

export function extractColorsFromImageData(imageData: ImageData, maxColors = 256): ColorRGB[] {
  validatePixels(imageData);
  validatePositiveInteger(maxColors, 'Maximum palette colors');
  if (maxColors > 4096) throw new Error('Maximum palette colors cannot exceed 4096');
  const colors = new Set<number>();
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] === 0) continue;
    colors.add((imageData.data[i]! << 16) | (imageData.data[i + 1]! << 8) | imageData.data[i + 2]!);
    if (colors.size > maxColors)
      throw new Error(
        `Palette image has more than ${maxColors} colors. Use { colors: 8 } to generate a photo palette, or provide a palette swatch.`
      );
  }
  const palette: ColorRGB[] = Array.from(colors, (color) => [
    (color >> 16) & 255,
    (color >> 8) & 255,
    color & 255,
  ]);
  const luminance = (color: ColorRGB) => 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2];
  return palette.sort((a, b) => luminance(a) - luminance(b));
}
