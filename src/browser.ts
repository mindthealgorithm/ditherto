/**
 * Browser-specific helpers for ditherto
 * 
 * Provides DOM utilities like autoDitherDOM for automatic image processing
 */

import type { DitherOptions } from './types.js';
import { ditherImage } from './imageProcessor.js';

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
  const { selector = 'img.ditherto', ...ditherOpts } = options;
  
  // Implementation will be added when we build the core functionality
  throw new Error('autoDitherDOM not yet implemented');
}