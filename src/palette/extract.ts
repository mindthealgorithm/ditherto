// ABOUTME: Palette extraction from PNG images
// ABOUTME: Extracts unique colors from reference images for dithering

import type { InputImageSource, ColorRGB } from '../types.js';

/**
 * Extract unique colors from a PNG image to create a palette
 */
export async function generatePalette(input: InputImageSource): Promise<ColorRGB[]> {
  const imageData = await loadImageData(input);
  return extractColorsFromImageData(imageData);
}

/**
 * Load image data from various input sources
 */
async function loadImageData(input: InputImageSource): Promise<ImageData> {
  if (typeof input === 'string') {
    // File path - Node.js environment
    return loadImageDataFromPath(input);
  }
  if (input instanceof HTMLImageElement) {
    // Browser environment
    return loadImageDataFromHTMLImage(input);
  }
  if (input instanceof Blob || input instanceof File) {
    // Browser environment - convert to HTMLImageElement
    const url = URL.createObjectURL(input);
    try {
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      return loadImageDataFromHTMLImage(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    // Convert to Blob first
    const blob = new Blob([input]);
    return loadImageData(blob);
  }
  
  throw new Error('Unsupported input image source type');
}

/**
 * Load image data from file path (Node.js)
 */
async function loadImageDataFromPath(path: string): Promise<ImageData> {
  // For Node.js environment, we need to use canvas
  if (typeof window !== 'undefined') {
    throw new Error('File path loading not supported in browser environment');
  }
  
  try {
    // Dynamic import for Node.js-only dependency
    const { readFile } = await import('node:fs/promises');
    const canvasPackageName = 'canvas';
    const canvasModule = await import(canvasPackageName) as any;
    const { createCanvas, loadImage } = canvasModule;
    
    const imageBuffer = await readFile(path);
    const image = await loadImage(imageBuffer);
    
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot resolve module')) {
      throw new Error('canvas package required for Node.js image loading. Install with: npm install canvas');
    }
    throw new Error(`Failed to load image from path: ${error}`);
  }
}

/**
 * Load image data from HTMLImageElement (Browser)
 */
function loadImageDataFromHTMLImage(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get 2d context from canvas');
  }
  
  canvas.width = img.width;
  canvas.height = img.height;
  
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
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