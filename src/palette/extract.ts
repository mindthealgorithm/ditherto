// ABOUTME: Palette extraction from PNG images
// ABOUTME: Extracts unique colors from reference images for dithering

import type { InputImageSource, ColorRGB } from '../types.js';
import { loadImageData } from '../imageIO.js';

/**
 * Extract unique colors from a PNG image to create a palette
 */
export async function generatePalette(input: InputImageSource): Promise<ColorRGB[]> {
  const imageData = await loadImageData(input);
  return extractColorsFromImageData(imageData);
}


/**
 * Extract unique colors from ImageData
 */
export function extractColorsFromImageData(imageData: ImageData): ColorRGB[] {
  const data = imageData.data;
  const colorSet = new Set<string>();
  
  // Extract unique colors, skipping fully transparent pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip fully transparent pixels
    if (a === 0) continue;
    
    // Create a unique string for the color
    const colorKey = `${r},${g},${b}`;
    colorSet.add(colorKey);
  }
  
  // Convert Set to array of RGB tuples
  const palette: ColorRGB[] = Array.from(colorSet).map(colorKey => {
    const parts = colorKey.split(',').map(Number);
    if (parts.length !== 3) {
      throw new Error(`Invalid color key format: ${colorKey}`);
    }
    const [r, g, b] = parts;
    if (r === undefined || g === undefined || b === undefined) {
      throw new Error(`Invalid color values in key: ${colorKey}`);
    }
    return [r, g, b] as const;
  });
  
  // Sort colors for consistent output (by luminance)
  return palette.sort((a, b) => {
    const luminanceA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
    const luminanceB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
    return luminanceA - luminanceB;
  });
}