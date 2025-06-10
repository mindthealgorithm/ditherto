/**
 * ditherto - Pixelate your life by dithering your images to fixed colour palette
 * 
 * Main library entry point providing the core API
 */

// Core types
export type { 
  DitherOptions, 
  InputImageSource, 
  ColorRGB,
  DitherAlgorithm 
} from './types.js';

// Core functions  
export { ditherImage } from './imageProcessor.js';
export { generatePalette } from './palette/extract.js';

// Algorithm registry
export { algorithms } from './algorithmRegistry.js';

// Version info
export const version = '0.1.0';