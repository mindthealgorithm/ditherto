// ABOUTME: Palette utility functions for color matching and distance calculations
// ABOUTME: Core utilities for finding closest colors and working with predefined palettes

import type { ColorRGB } from '../types.js';

/**
 * Calculate Euclidean distance between two RGB colors
 */
export function colorDistance(color1: ColorRGB, color2: ColorRGB): number {
  const dr = color1[0] - color2[0];
  const dg = color1[1] - color2[1];
  const db = color1[2] - color2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Find the closest color in a palette to the given color
 */
export function findClosestColor(color: ColorRGB, palette: ColorRGB[]): ColorRGB {
  if (palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }
  
  let minDistance = Infinity;
  let closest = palette[0]!; // Non-null assertion since we checked length > 0
  
  for (const paletteColor of palette) {
    const distance = colorDistance(color, paletteColor);
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = paletteColor;
    }
  }
  
  return closest;
}

/**
 * Predefined color palettes
 */
export const PALETTES = {
  /** Black and white palette */
  BW: [
    [0, 0, 0],       // Black
    [255, 255, 255], // White
  ] as const satisfies readonly ColorRGB[],
  
  /** Classic GameBoy green palette */
  GAMEBOY: [
    [15, 56, 15],    // Darkest green
    [48, 98, 48],    // Dark green
    [139, 172, 15],  // Light green
    [155, 188, 15],  // Lightest green
  ] as const satisfies readonly ColorRGB[],
  
  /** Basic RGB primary colors */
  RGB: [
    [0, 0, 0],       // Black
    [255, 0, 0],     // Red
    [0, 255, 0],     // Green
    [0, 0, 255],     // Blue
    [255, 255, 0],   // Yellow
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [255, 255, 255], // White
  ] as const satisfies readonly ColorRGB[],
  
  /** Grayscale palette with 16 levels */
  GRAYSCALE_16: Array.from({ length: 16 }, (_, i) => {
    const value = Math.round((i / 15) * 255);
    return [value, value, value] as const;
  }) as readonly ColorRGB[],
  
  /** CGA 4-color palette (magenta, cyan, white, black) */
  CGA_4: [
    [0, 0, 0],       // Black
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [255, 255, 255], // White
  ] as const satisfies readonly ColorRGB[],
} as const;

/**
 * Get a predefined palette by name
 */
export function getPalette(name: keyof typeof PALETTES): readonly ColorRGB[] {
  return PALETTES[name];
}

/**
 * Create a grayscale palette with the specified number of levels
 */
export function createGrayscalePalette(levels: number): ColorRGB[] {
  if (levels < 2) {
    throw new Error('Grayscale palette must have at least 2 levels');
  }
  
  return Array.from({ length: levels }, (_, i) => {
    const value = Math.round((i / (levels - 1)) * 255);
    return [value, value, value] as const;
  });
}