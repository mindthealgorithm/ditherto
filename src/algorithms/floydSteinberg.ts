/**
 * Floyd-Steinberg dithering algorithm
 * 
 * Error diffusion pattern:
 *     X  7/16
 *  3/16 5/16 1/16
 */

import type { DitherAlgorithm, ColorRGB } from '../types.js';

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

export const floydSteinbergAlgorithm: DitherAlgorithm = {
  name: 'floyd-steinberg',
  
  apply(data: ImageData, palette: ColorRGB[], step: number): ImageData {
    if (palette.length === 0) {
      throw new Error('Palette cannot be empty');
    }
    if (step < 1) {
      throw new Error('Step must be >= 1');
    }
    
    const { width, height } = data;
    const result = new ImageData(new Uint8ClampedArray(data.data), width, height);
    const pixels = result.data;
    
    // Process each pixel with step size
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
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
        
        // Helper function to safely apply error
        const applyError = (index: number, rError: number, gError: number, bError: number, factor: number) => {
          pixels[index] = Math.max(0, Math.min(255, (pixels[index] ?? 0) + rError * factor));
          pixels[index + 1] = Math.max(0, Math.min(255, (pixels[index + 1] ?? 0) + gError * factor));
          pixels[index + 2] = Math.max(0, Math.min(255, (pixels[index + 2] ?? 0) + bError * factor));
        };
        
        // Distribute error using Floyd-Steinberg pattern
        
        // Right pixel (7/16)
        if (x + step < width) {
          const rightI = (y * width + (x + step)) * 4;
          applyError(rightI, errorR, errorG, errorB, 7/16);
        }
        
        // Below-left pixel (3/16)
        if (y + step < height && x - step >= 0) {
          const belowLeftI = ((y + step) * width + (x - step)) * 4;
          applyError(belowLeftI, errorR, errorG, errorB, 3/16);
        }
        
        // Below pixel (5/16)
        if (y + step < height) {
          const belowI = ((y + step) * width + x) * 4;
          applyError(belowI, errorR, errorG, errorB, 5/16);
        }
        
        // Below-right pixel (1/16)
        if (y + step < height && x + step < width) {
          const belowRightI = ((y + step) * width + (x + step)) * 4;
          applyError(belowRightI, errorR, errorG, errorB, 1/16);
        }
      }
    }
    
    return result;
  }
};