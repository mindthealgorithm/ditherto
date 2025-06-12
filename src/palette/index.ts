// ABOUTME: Palette module exports
// ABOUTME: Central export point for all palette-related functionality

export { generatePalette, extractColorsFromImageData } from './extract.js';
export { 
  colorDistance, 
  findClosestColor, 
  PALETTES, 
  getPalette, 
  createGrayscalePalette 
} from './utils.js';
export type { ColorRGB } from '../types.js';