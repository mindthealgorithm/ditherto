/**
 * Atkinson dithering algorithm
 * 
 * Error diffusion pattern:
 *     X  1/8 1/8
 *  1/8 1/8 1/8
 *     1/8
 */

import type { DitherAlgorithm, ColorRGB } from '../types.js';

/**
 * Find closest color in palette using Euclidean distance
 */
function findClosestColor(pixel: ColorRGB, palette: ColorRGB[]): ColorRGB {
  let minDistance = Number.POSITIVE_INFINITY;
  let closest = palette[0];
  
  for (const color of palette) {
    const distance = Math.sqrt(
      Math.pow(pixel[0] - color[0], 2) +
      Math.pow(pixel[1] - color[1], 2) +
      Math.pow(pixel[2] - color[2], 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }
  
  return closest;
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
    const result = new ImageData(new Uint8ClampedArray(data.data), width, height);
    
    // Process each pixel with step size
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        
        // Get current pixel
        const oldPixel: ColorRGB = [
          result.data[i],
          result.data[i + 1], 
          result.data[i + 2]
        ];
        
        // Find closest palette color
        const newPixel = findClosestColor(oldPixel, palette);
        
        // Set new pixel value
        result.data[i] = newPixel[0];
        result.data[i + 1] = newPixel[1];
        result.data[i + 2] = newPixel[2];
        result.data[i + 3] = 255; // Alpha
        
        // Calculate quantization error
        const errorR = oldPixel[0] - newPixel[0];
        const errorG = oldPixel[1] - newPixel[1];
        const errorB = oldPixel[2] - newPixel[2];
        
        // Distribute error using Atkinson pattern (1/8 each)
        const errorFactor = 1/8;
        
        // Right pixel
        if (x + step < width) {
          const rightI = (y * width + (x + step)) * 4;
          result.data[rightI] = Math.max(0, Math.min(255, result.data[rightI] + errorR * errorFactor));
          result.data[rightI + 1] = Math.max(0, Math.min(255, result.data[rightI + 1] + errorG * errorFactor)); 
          result.data[rightI + 2] = Math.max(0, Math.min(255, result.data[rightI + 2] + errorB * errorFactor));
        }
        
        // Right+step pixel  
        if (x + step * 2 < width) {
          const right2I = (y * width + (x + step * 2)) * 4;
          result.data[right2I] = Math.max(0, Math.min(255, result.data[right2I] + errorR * errorFactor));
          result.data[right2I + 1] = Math.max(0, Math.min(255, result.data[right2I + 1] + errorG * errorFactor));
          result.data[right2I + 2] = Math.max(0, Math.min(255, result.data[right2I + 2] + errorB * errorFactor));
        }
        
        // Below-left pixel
        if (y + step < height && x - step >= 0) {
          const belowLeftI = ((y + step) * width + (x - step)) * 4;
          result.data[belowLeftI] = Math.max(0, Math.min(255, result.data[belowLeftI] + errorR * errorFactor));
          result.data[belowLeftI + 1] = Math.max(0, Math.min(255, result.data[belowLeftI + 1] + errorG * errorFactor));
          result.data[belowLeftI + 2] = Math.max(0, Math.min(255, result.data[belowLeftI + 2] + errorB * errorFactor));
        }
        
        // Below pixel
        if (y + step < height) {
          const belowI = ((y + step) * width + x) * 4;
          result.data[belowI] = Math.max(0, Math.min(255, result.data[belowI] + errorR * errorFactor));
          result.data[belowI + 1] = Math.max(0, Math.min(255, result.data[belowI + 1] + errorG * errorFactor));
          result.data[belowI + 2] = Math.max(0, Math.min(255, result.data[belowI + 2] + errorB * errorFactor));
        }
        
        // Below-right pixel
        if (y + step < height && x + step < width) {
          const belowRightI = ((y + step) * width + (x + step)) * 4;
          result.data[belowRightI] = Math.max(0, Math.min(255, result.data[belowRightI] + errorR * errorFactor));
          result.data[belowRightI + 1] = Math.max(0, Math.min(255, result.data[belowRightI + 1] + errorG * errorFactor));
          result.data[belowRightI + 2] = Math.max(0, Math.min(255, result.data[belowRightI + 2] + errorB * errorFactor));
        }
        
        // Below+step+step pixel  
        if (y + step * 2 < height) {
          const below2I = ((y + step * 2) * width + x) * 4;
          result.data[below2I] = Math.max(0, Math.min(255, result.data[below2I] + errorR * errorFactor));
          result.data[below2I + 1] = Math.max(0, Math.min(255, result.data[below2I + 1] + errorG * errorFactor));
          result.data[below2I + 2] = Math.max(0, Math.min(255, result.data[below2I + 2] + errorB * errorFactor));
        }
      }
    }
    
    return result;
  }
};