/**
 * Browser-specific helpers for ditherto
 * 
 * Provides DOM utilities like autoDitherDOM for automatic image processing
 */

import type { DitherOptions } from './types.js';
// import { ditherImage } from './imageProcessor.js'; // TODO: Use when implementing autoDitherDOM

/** Configuration for autoDitherDOM */
export interface AutoDitherOptions extends DitherOptions {
  /** CSS selector for target images */
  selector?: string;
}

/**
 * Automatically dither images in the DOM
 * Replaces <img> elements with <canvas> elements after processing
 */
export async function autoDitherDOM(options: AutoDitherOptions = {}): Promise<void> {
  const { selector = 'img.ditherto' } = options;
  // const ditherOpts = { ...options }; // TODO: Use when implementing autoDitherDOM
  
  // Find all images matching the selector
  const images = document.querySelectorAll(selector);
  console.log(`Found ${images.length} images to dither`);
  
  // Implementation will be added when we build the core functionality
  throw new Error('autoDitherDOM not yet implemented');
}