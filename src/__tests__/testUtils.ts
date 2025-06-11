/**
 * Test utilities for creating ImageData and test fixtures
 */

import type { ColorRGB } from '../types.js';

/**
 * Create ImageData from a 2D array of RGB colors
 * Useful for creating predictable test images
 */
export function createImageData(colors: ColorRGB[][], width?: number, height?: number): ImageData {
  const h = height ?? colors.length;
  const w = width ?? colors[0]?.length ?? 0;
  
  if (colors.length !== h || colors.some(row => row.length !== w)) {
    throw new Error('Color array dimensions must match width/height');
  }

  const data = new Uint8ClampedArray(w * h * 4);
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = colors[y][x];
      data[i] = r;     // Red
      data[i + 1] = g; // Green  
      data[i + 2] = b; // Blue
      data[i + 3] = 255; // Alpha (fully opaque)
    }
  }

  return new ImageData(data, w, h);
}

/**
 * Create a solid color ImageData
 */
export function createSolidImageData(color: ColorRGB, width: number, height: number): ImageData {
  const colors = Array(height).fill(null).map(() => Array(width).fill(color));
  return createImageData(colors);
}

/**
 * Create a simple 2x2 checkerboard pattern for testing
 */
export function createCheckerboard(): ImageData {
  const black: ColorRGB = [0, 0, 0];
  const white: ColorRGB = [255, 255, 255];
  
  return createImageData([
    [black, white],
    [white, black]
  ]);
}

/**
 * Create a 4x4 gradient for testing dithering algorithms
 */
export function createGradient(): ImageData {
  return createImageData([
    [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]],
    [[64, 64, 64], [128, 128, 128], [192, 192, 192], [255, 255, 255]],
    [[128, 128, 128], [160, 160, 160], [200, 200, 200], [255, 255, 255]],
    [[192, 192, 192], [210, 210, 210], [230, 230, 230], [255, 255, 255]]
  ]);
}

/**
 * Common test palettes
 */
export const TEST_PALETTES = {
  /** Simple black and white */
  BW: [[0, 0, 0], [255, 255, 255]] as ColorRGB[],
  
  /** Game Boy green palette */
  GAMEBOY: [
    [15, 56, 15],   // Dark green
    [48, 98, 48],   // Medium green
    [139, 172, 15], // Light green  
    [155, 188, 15]  // Lightest green
  ] as ColorRGB[],
  
  /** Simple RGB primaries */
  RGB: [
    [255, 0, 0],   // Red
    [0, 255, 0],   // Green
    [0, 0, 255]    // Blue
  ] as ColorRGB[]
};

/**
 * Compare two ImageData objects pixel by pixel
 */
export function compareImageData(a: ImageData, b: ImageData): boolean {
  if (a.width !== b.width || a.height !== b.height) {
    return false;
  }
  
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get pixel color at specific coordinates
 */
export function getPixel(imageData: ImageData, x: number, y: number): ColorRGB {
  const i = (y * imageData.width + x) * 4;
  return [
    imageData.data[i],
    imageData.data[i + 1], 
    imageData.data[i + 2]
  ];
}