/**
 * Core image processing orchestrator
 * 
 * Coordinates the resize → dither pipeline
 */

import type { InputImageSource, DitherOptions, ColorRGB } from './types.js';
import { loadImageData, resizeImageData } from './imageIO.js';
import { algorithms } from './algorithmRegistry.js';
import { generatePalette } from './palette/extract.js';
import { PALETTES } from './palette/utils.js';
import { formatForEnvironment, encodeWithQuality } from './outputFormat.js';

/**
 * Main dithering function - processes an image through resize → dither pipeline
 */
export async function ditherImage(
  input: InputImageSource,
  options: DitherOptions = {}
): Promise<Uint8Array | ImageData> {
  // Validate options
  validateOptions(options);
  
  // Step 1: Load image data from input source
  let imageData: ImageData;
  if (input && typeof input === 'object' && 'data' in input) {
    // Already ImageData
    imageData = input as ImageData;
  } else {
    imageData = await loadImageData(input);
  }
  
  // Step 2: Resize if requested
  const resizeOptions = {
    width: options.width,
    height: options.height
  };
  
  if (resizeOptions.width || resizeOptions.height) {
    imageData = resizeImageData(imageData, resizeOptions);
  }
  
  // Step 3: Determine palette
  let palette: ColorRGB[];
  if (options.palette) {
    // Explicit palette has highest priority
    palette = options.palette;
  } else if (options.paletteImg) {
    // Extract palette from provided image
    palette = await generatePalette(options.paletteImg);
  } else {
    // Default to black/white palette
    palette = PALETTES.BW;
  }
  
  // Step 4: Get algorithm (default to atkinson)
  const algorithmName = options.algorithm || 'atkinson';
  const algorithm = algorithms.get(algorithmName);
  if (!algorithm) {
    throw new Error(`Unknown algorithm: ${algorithmName}`);
  }
  
  // Step 5: Apply dithering
  const step = options.step || 1;
  const ditheredData = algorithm.apply(imageData, palette, step);
  
  // Step 6: Apply quality encoding if specified
  const qualityProcessedData = options.quality !== undefined 
    ? encodeWithQuality(ditheredData, options.quality)
    : ditheredData;
  
  // Step 7: Format output for environment
  return formatForEnvironment(qualityProcessedData);
}

/**
 * Validate dithering options
 */
function validateOptions(options: DitherOptions): void {
  if (options.step !== undefined && options.step <= 0) {
    throw new Error('Step must be greater than 0');
  }
  
  if (options.quality !== undefined && (options.quality < 0 || options.quality > 1)) {
    throw new Error('Quality must be between 0 and 1');
  }
  
  if (options.width !== undefined && options.width <= 0) {
    throw new Error('Width must be greater than 0');
  }
  
  if (options.height !== undefined && options.height <= 0) {
    throw new Error('Height must be greater than 0');
  }
  
  if (options.palette !== undefined && options.palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }
  
  if (options.algorithm !== undefined) {
    const validAlgorithms = ['atkinson', 'floyd-steinberg', 'ordered'];
    if (!validAlgorithms.includes(options.algorithm)) {
      throw new Error(`Invalid algorithm: ${options.algorithm}. Must be one of: ${validAlgorithms.join(', ')}`);
    }
  }
}