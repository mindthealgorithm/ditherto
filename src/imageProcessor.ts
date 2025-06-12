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
  // TODO: Implement the full resize → dither pipeline
  // This stub ensures the function can be imported without errors
  console.log(`Processing image with options:`, { input: typeof input, options });
  throw new Error('ditherImage not yet implemented');
}