/**
 * Ordered (Bayer) dithering algorithm
 * 
 * Uses a threshold matrix to determine dithering pattern
 */

import type { DitherAlgorithm, ColorRGB } from '../types.js';

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

/**
 * Apply threshold to pixel channel using Bayer matrix
 */
function applyThreshold(value: number, threshold: number): number {
  return value > threshold ? 255 : 0;
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
    const result = new ImageData(new Uint8ClampedArray(data.data), width, height);
    
    // For simple ordered dithering, we'll use a different approach
    // than error diffusion - apply threshold based on position
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        
        // Get current pixel
        const oldPixel: ColorRGB = [
          result.data[i],
          result.data[i + 1], 
          result.data[i + 2]
        ];
        
        // Get threshold from Bayer matrix based on position
        const bayerX = Math.floor(x / step) % 4;
        const bayerY = Math.floor(y / step) % 4;
        const threshold = BAYER_4X4[bayerY][bayerX];
        
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
        const newPixel = findClosestColor(noisyPixel, palette);
        
        // Set new pixel value
        result.data[i] = newPixel[0];
        result.data[i + 1] = newPixel[1];
        result.data[i + 2] = newPixel[2];
        result.data[i + 3] = 255; // Alpha
      }
    }
    
    return result;
  }
};