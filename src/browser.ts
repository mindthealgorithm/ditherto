/**
 * Browser-specific utilities for dithering images
 * 
 * Provides DOM helpers and automatic dithering functionality
 */

import type { DitherOptions, ColorRGB } from './types.js';
import { ditherImage } from './imageProcessor.js';

/**
 * Parse algorithm from dataset
 */
function parseAlgorithm(dataset: DOMStringMap): DitherOptions['algorithm'] | undefined {
  if (!dataset.algorithm) return undefined;
  
  const algorithm = dataset.algorithm as DitherOptions['algorithm'];
  if (['atkinson', 'floyd-steinberg', 'ordered'].includes(algorithm!)) {
    return algorithm!;
  }
  return undefined;
}

/**
 * Parse numeric value with validation
 */
function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number.parseInt(value);
  return !Number.isNaN(num) && num > 0 ? num : undefined;
}

/**
 * Parse quality value (0-1 range)
 */
function parseQuality(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= 0 && num <= 1 ? num : undefined;
}

/**
 * Parse palette from JSON string
 */
function parsePalette(value: string | undefined): ColorRGB[] | undefined {
  if (!value) return undefined;
  
  try {
    const palette = JSON.parse(value) as ColorRGB[];
    return Array.isArray(palette) ? palette : undefined;
  } catch {
    console.warn('Invalid palette JSON in data-palette attribute');
    return undefined;
  }
}

/**
 * Parse data attributes from an image element into DitherOptions
 */
export function parseDataAttributes(img: HTMLImageElement): DitherOptions {
  const { dataset } = img;
  const options: DitherOptions = {};
  
  // Parse each attribute using helper functions
  options.algorithm = parseAlgorithm(dataset);
  options.width = parsePositiveInteger(dataset.width);
  options.height = parsePositiveInteger(dataset.height);
  options.step = parsePositiveInteger(dataset.step);
  options.quality = parseQuality(dataset.quality);
  options.palette = parsePalette(dataset.palette);
  
  // Handle palette image reference
  if (dataset.paletteImg) {
    options.paletteImg = dataset.paletteImg;
  }
  
  return options;
}

/**
 * Apply dithering to a single image element
 */
export async function ditherImageElement(img: HTMLImageElement, customOptions?: DitherOptions): Promise<void> {
  const dataOptions = parseDataAttributes(img);
  const options = { ...dataOptions, ...customOptions };
  
  try {
    console.log(`Dithering image: ${img.src}`);
    
    // Process the image
    const result = await ditherImage(img, options);
    
    // Create new canvas to display result
    const canvas = document.createElement('canvas');
    
    if (result instanceof ImageData) {
      canvas.width = result.width;
      canvas.height = result.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(result, 0, 0);
      }
    } else {
      // Handle Uint8Array result (shouldn't happen in browser, but for safety)
      console.warn('Received Uint8Array in browser environment');
      return;
    }
    
    // Copy attributes from original image
    copyImageAttributes(img, canvas);
    
    // Replace the image with the canvas
    img.parentNode?.replaceChild(canvas, img);
    
  } catch (error) {
    console.error('Failed to dither image:', error);
  }
}

/**
 * Copy relevant attributes from image to canvas
 */
function copyImageAttributes(img: HTMLImageElement, canvas: HTMLCanvasElement): void {
  // Copy standard attributes
  if (img.alt) canvas.setAttribute('alt', img.alt);
  if (img.title) canvas.title = img.title;
  if (img.className) canvas.className = img.className;
  if (img.id) canvas.id = img.id;
  
  // Copy style
  if (img.style.cssText) {
    canvas.style.cssText = img.style.cssText;
  }
}

/**
 * Auto-dither all images in the DOM matching the selector
 * 
 * Looks for images with data-dither attributes and processes them automatically
 */
export function autoDitherDOM(selector = 'img[data-algorithm]', options?: DitherOptions): void {
  const images = document.querySelectorAll<HTMLImageElement>(selector);
  console.log(`Found ${images.length} images to dither`);
  
  for (const img of images) {
    // Process each image independently
    ditherImageElement(img, options).catch(error => {
      console.error(`Failed to process image ${img.src}:`, error);
    });
  }
}