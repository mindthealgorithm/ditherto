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
 * Load or convert input to ImageData
 */
async function loadInputImageData(input: InputImageSource): Promise<ImageData> {
  if (input && typeof input === 'object' && 'data' in input && 'width' in input && 'height' in input && 'colorSpace' in input) {
    // Already ImageData
    return input as ImageData;
  }
  return loadImageData(input);
}

/**
 * Apply resize if requested in options
 */
function applyResize(imageData: ImageData, options: DitherOptions): ImageData {
  if (!options.width && !options.height) {
    return imageData;
  }
  
  const resizeOptions: { width?: number; height?: number } = {};
  if (options.width) resizeOptions.width = options.width;
  if (options.height) resizeOptions.height = options.height;
  return resizeImageData(imageData, resizeOptions);
}

/**
 * Determine palette from options
 */
async function determinePalette(options: DitherOptions): Promise<ColorRGB[]> {
  if (options.palette) {
    // Explicit palette has highest priority
    return options.palette;
  }
  
  if (options.paletteImg) {
    // Extract palette from provided image
    return generatePalette(options.paletteImg);
  }
  
  // Default to black/white palette
  return [...PALETTES.BW];
}

/**
 * Get dithering algorithm by name
 */
function getAlgorithm(algorithmName: string) {
  const algorithm = algorithms.get(algorithmName);
  if (!algorithm) {
    throw new Error(`Unknown algorithm: ${algorithmName}`);
  }
  return algorithm;
}

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
  const imageData = await loadInputImageData(input);
  
  // Step 2: Resize if requested
  const resizedData = applyResize(imageData, options);
  
  // Step 3: Determine palette
  const palette = await determinePalette(options);
  
  // Step 4: Get algorithm (default to atkinson)
  const algorithmName = options.algorithm || 'atkinson';
  const algorithm = getAlgorithm(algorithmName);
  
  // Step 5: Apply dithering
  const step = options.step || 1;
  const ditheredData = algorithm.apply(resizedData, palette, step);
  
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