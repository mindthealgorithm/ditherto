/**
 * Atkinson dithering algorithm
 * 
 * Error diffusion pattern:
 *     X  1/8 1/8
 *  1/8 1/8 1/8
 *     1/8
 */

import type { DitherAlgorithm, ColorRGB } from '../types.js';
import { createImageDataCrossPlatform } from '../imageIO.js';

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

/**
 * Apply error to a pixel with bounds checking
 */
function applyError(
  pixels: Uint8ClampedArray,
  index: number,
  errorR: number,
  errorG: number,
  errorB: number,
  factor: number
): void {
  pixels[index] = Math.max(0, Math.min(255, (pixels[index] ?? 0) + errorR * factor));
  pixels[index + 1] = Math.max(0, Math.min(255, (pixels[index + 1] ?? 0) + errorG * factor));
  pixels[index + 2] = Math.max(0, Math.min(255, (pixels[index + 2] ?? 0) + errorB * factor));
}

/**
 * Distribute error using Atkinson pattern
 */
function distributeAtkinsonError(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  errorR: number,
  errorG: number,
  errorB: number,
  step: number
): void {
  const errorFactor = 1/8;
  
  // Right pixel
  if (x + step < width) {
    const rightI = (y * width + (x + step)) * 4;
    applyError(pixels, rightI, errorR, errorG, errorB, errorFactor);
  }
  
  // Right+step pixel  
  if (x + step * 2 < width) {
    const right2I = (y * width + (x + step * 2)) * 4;
    applyError(pixels, right2I, errorR, errorG, errorB, errorFactor);
  }
  
  // Below-left pixel
  if (y + step < height && x - step >= 0) {
    const belowLeftI = ((y + step) * width + (x - step)) * 4;
    applyError(pixels, belowLeftI, errorR, errorG, errorB, errorFactor);
  }
  
  // Below pixel
  if (y + step < height) {
    const belowI = ((y + step) * width + x) * 4;
    applyError(pixels, belowI, errorR, errorG, errorB, errorFactor);
  }
  
  // Below-right pixel
  if (y + step < height && x + step < width) {
    const belowRightI = ((y + step) * width + (x + step)) * 4;
    applyError(pixels, belowRightI, errorR, errorG, errorB, errorFactor);
  }
  
  // Below+step+step pixel  
  if (y + step * 2 < height) {
    const below2I = ((y + step * 2) * width + x) * 4;
    applyError(pixels, below2I, errorR, errorG, errorB, errorFactor);
  }
}

/**
 * Process a single pixel with Atkinson dithering
 */
function processPixel(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  palette: ColorRGB[],
  step: number
): void {
  const i = (y * width + x) * 4;
  
  // Get current pixel - use non-null assertion since we know indices are valid
  const oldPixel: ColorRGB = [
    pixels[i]!,
    pixels[i + 1]!, 
    pixels[i + 2]!
  ];
  
  // Find closest palette color
  const newPixel = findClosestColor(oldPixel, palette);
  
  // Set new pixel value
  pixels[i] = newPixel[0];
  pixels[i + 1] = newPixel[1];
  pixels[i + 2] = newPixel[2];
  pixels[i + 3] = 255; // Alpha
  
  // Calculate quantization error
  const errorR = oldPixel[0] - newPixel[0];
  const errorG = oldPixel[1] - newPixel[1];
  const errorB = oldPixel[2] - newPixel[2];
  
  // Distribute error using Atkinson pattern
  distributeAtkinsonError(pixels, x, y, width, height, errorR, errorG, errorB, step);
}

export const atkinsonAlgorithm: DitherAlgorithm = {
  name: 'atkinson',
  
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
    
    // Process each pixel with step size
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        processPixel(pixels, x, y, width, height, palette, step);
      }
    }
    
    return result;
  }
};