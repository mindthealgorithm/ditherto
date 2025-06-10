/**
 * Core image processing orchestrator
 * 
 * Coordinates the resize → dither pipeline
 */

import type { InputImageSource, DitherOptions } from './types.js';

/**
 * Main dithering function - processes an image through resize → dither pipeline
 */
export async function ditherImage(
  input: InputImageSource,
  options: DitherOptions = {}
): Promise<Uint8Array | ImageData> {
  // Implementation will be added when we build the core functionality
  throw new Error('ditherImage not yet implemented');
}