/**
 * Ordered (Bayer) dithering algorithm
 * 
 * Uses a threshold matrix to determine dithering pattern
 */

import type { DitherAlgorithm, ColorRGB } from '../types.js';
import { createImageDataCrossPlatform } from '../imageIO.js';

/**
 * 4x4 Bayer threshold matrix
 * Values normalized to 0-255 range
 */
const BAYER_4X4 = [
  [  0, 128,  32, 160],
  [192,  64, 224,  96], 
  [ 48, 176,  16, 144],
  [240, 112, 208,  80]
];

/**
 * Find closest color in palette using Euclidean distance
 */
function findClosestColor(pixel: ColorRGB, palette: ColorRGB[]): ColorRGB {
  if (palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }
  
  let minDistance = Number.POSITIVE_INFINITY;
  let closest = palette[0]!; // Non-null assertion since we checked length > 0
  
  for (const color of palette) {
    const distance = Math.sqrt(
      (pixel[0] - color[0]) ** 2 +
      (pixel[1] - color[1]) ** 2 +
      (pixel[2] - color[2]) ** 2
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }
  
  return closest;
}

export const orderedAlgorithm: DitherAlgorithm = {
  name: 'ordered',
  
  apply(data: ImageData, palette: ColorRGB[], step: number): ImageData {
    if (palette.length === 0) {
      throw new Error('Palette cannot be empty');
    }
    if (step < 1) {
      throw new Error('Step must be >= 1');
    }
    
    const { width, height } = data;
    const result = createImageDataCrossPlatform(new Uint8ClampedArray(data.data), width, height);
    const pixels = result.data;
    
    // For simple ordered dithering, we'll use a different approach
    // than error diffusion - apply threshold based on position
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        
        // Get current pixel - use non-null assertion since we know indices are valid
        const oldPixel: ColorRGB = [
          pixels[i]!,
          pixels[i + 1]!, 
          pixels[i + 2]!
        ];
        
        // Apply ordered dithering with Bayer matrix
        const newPixel = applyOrderedDithering(oldPixel, x, y, step, palette);
        
        // Set new pixel value
        pixels[i] = newPixel[0];
        pixels[i + 1] = newPixel[1];
        pixels[i + 2] = newPixel[2];
        pixels[i + 3] = 255; // Alpha
        
        // If step > 1, fill the entire step x step block with the same color
        if (step > 1) {
          fillPixelBlock(pixels, x, y, width, height, step, newPixel);
        }
      }
    }
    
    return result;
  }
};

/**
 * Apply ordered dithering with Bayer matrix
 */
function applyOrderedDithering(oldPixel: ColorRGB, x: number, y: number, step: number, palette: ColorRGB[]): ColorRGB {
  // Get threshold from Bayer matrix based on position
  const bayerX = Math.floor(x / step) % 4;
  const bayerY = Math.floor(y / step) % 4;
  const bayerRow = BAYER_4X4[bayerY];
  const threshold = bayerRow ? bayerRow[bayerX] ?? 128 : 128;
  
  // For ordered dithering with multi-color palettes,
  // we'll use a simpler approach: add noise based on threshold
  // then find closest color
  const noiseR = (Math.random() * 2 - 1) * (threshold / 255) * 32;
  const noiseG = (Math.random() * 2 - 1) * (threshold / 255) * 32;
  const noiseB = (Math.random() * 2 - 1) * (threshold / 255) * 32;
  
  const noisyPixel: ColorRGB = [
    Math.max(0, Math.min(255, oldPixel[0] + noiseR)),
    Math.max(0, Math.min(255, oldPixel[1] + noiseG)),
    Math.max(0, Math.min(255, oldPixel[2] + noiseB))
  ];
  
  // Find closest palette color
  return findClosestColor(noisyPixel, palette);
}

/**
 * Fill a pixel block with the same color for step > 1
 */
function fillPixelBlock(pixels: Uint8ClampedArray, x: number, y: number, width: number, height: number, step: number, blockColor: ColorRGB): void {
  // Fill the block
  for (let by = y; by < Math.min(y + step, height); by++) {
    for (let bx = x; bx < Math.min(x + step, width); bx++) {
      if (by !== y || bx !== x) { // Don't overwrite the original pixel
        const blockI = (by * width + bx) * 4;
        pixels[blockI] = blockColor[0];
        pixels[blockI + 1] = blockColor[1];
        pixels[blockI + 2] = blockColor[2];
        pixels[blockI + 3] = 255;
      }
    }
  }
}