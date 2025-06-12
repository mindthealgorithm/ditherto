// ABOUTME: Tests for palette utility functions
// ABOUTME: Validates color distance calculations, closest color matching, and predefined palettes

import { describe, it, expect } from 'vitest';
import { 
  colorDistance, 
  findClosestColor, 
  PALETTES, 
  getPalette, 
  createGrayscalePalette 
} from '../palette/utils.js';
import type { ColorRGB } from '../types.js';

describe('colorDistance', () => {
  it('should calculate distance between identical colors as 0', () => {
    const color: ColorRGB = [255, 128, 64];
    expect(colorDistance(color, color)).toBe(0);
  });

  it('should calculate distance between black and white correctly', () => {
    const black: ColorRGB = [0, 0, 0];
    const white: ColorRGB = [255, 255, 255];
    
    // Distance should be sqrt(255^2 + 255^2 + 255^2) = sqrt(3 * 255^2) ≈ 441.67
    const distance = colorDistance(black, white);
    expect(distance).toBeCloseTo(441.6729559300637, 5);
  });

  it('should calculate distance between primary colors correctly', () => {
    const red: ColorRGB = [255, 0, 0];
    const green: ColorRGB = [0, 255, 0];
    const blue: ColorRGB = [0, 0, 255];
    
    // Distance between red and green: sqrt(255^2 + 255^2) = sqrt(130050) ≈ 360.624
    const expectedDistance = Math.sqrt(255 * 255 + 255 * 255);
    expect(colorDistance(red, green)).toBeCloseTo(expectedDistance, 5);
    expect(colorDistance(red, blue)).toBeCloseTo(expectedDistance, 5);
    expect(colorDistance(green, blue)).toBeCloseTo(expectedDistance, 5);
  });

  it('should be symmetric', () => {
    const color1: ColorRGB = [100, 150, 200];
    const color2: ColorRGB = [50, 75, 125];
    
    expect(colorDistance(color1, color2)).toBe(colorDistance(color2, color1));
  });

  it('should handle edge case colors correctly', () => {
    const min: ColorRGB = [0, 0, 0];
    const max: ColorRGB = [255, 255, 255];
    const mid: ColorRGB = [128, 128, 128];
    
    // Distance from black to mid-gray: sqrt(128^2 + 128^2 + 128^2)
    expect(colorDistance(min, mid)).toBeCloseTo(Math.sqrt(128 * 128 * 3), 5);
    // Distance from mid-gray to white: sqrt(127^2 + 127^2 + 127^2)
    expect(colorDistance(mid, max)).toBeCloseTo(Math.sqrt(127 * 127 * 3), 5);
  });
});

describe('findClosestColor', () => {
  it('should throw error for empty palette', () => {
    const color: ColorRGB = [128, 128, 128];
    expect(() => findClosestColor(color, [])).toThrow('Palette cannot be empty');
  });

  it('should return the only color in single-color palette', () => {
    const color: ColorRGB = [128, 128, 128];
    const palette: ColorRGB[] = [[255, 0, 0]];
    
    expect(findClosestColor(color, palette)).toEqual([255, 0, 0]);
  });

  it('should find closest color in black and white palette', () => {
    const palette: ColorRGB[] = [[0, 0, 0], [255, 255, 255]];
    
    // Dark gray should be closer to black
    expect(findClosestColor([64, 64, 64], palette)).toEqual([0, 0, 0]);
    
    // Light gray should be closer to white
    expect(findClosestColor([192, 192, 192], palette)).toEqual([255, 255, 255]);
    
    // Exactly in the middle (127.5) should be closer to black due to rounding
    expect(findClosestColor([127, 127, 127], palette)).toEqual([0, 0, 0]);
    expect(findClosestColor([128, 128, 128], palette)).toEqual([255, 255, 255]);
  });

  it('should find closest color in RGB palette', () => {
    const rgbPalette: ColorRGB[] = [
      [255, 0, 0],   // Red
      [0, 255, 0],   // Green
      [0, 0, 255],   // Blue
    ];
    
    // Reddish color should match red
    expect(findClosestColor([200, 50, 50], rgbPalette)).toEqual([255, 0, 0]);
    
    // Greenish color should match green
    expect(findClosestColor([50, 200, 50], rgbPalette)).toEqual([0, 255, 0]);
    
    // Bluish color should match blue
    expect(findClosestColor([50, 50, 200], rgbPalette)).toEqual([0, 0, 255]);
  });

  it('should handle exact matches correctly', () => {
    const palette: ColorRGB[] = [[128, 64, 192], [255, 255, 0], [0, 128, 255]];
    
    // Exact match should return the same color
    expect(findClosestColor([128, 64, 192], palette)).toEqual([128, 64, 192]);
    expect(findClosestColor([255, 255, 0], palette)).toEqual([255, 255, 0]);
  });

  it('should consistently choose the first color when distances are equal', () => {
    const palette: ColorRGB[] = [[0, 0, 0], [255, 255, 255]];
    const midpoint: ColorRGB = [127, 127, 127];
    
    // Should return black (first color) when equidistant
    expect(findClosestColor(midpoint, palette)).toEqual([0, 0, 0]);
  });
});

describe('PALETTES', () => {
  it('should have correct BW palette', () => {
    expect(PALETTES.BW).toEqual([
      [0, 0, 0],
      [255, 255, 255]
    ]);
    expect(PALETTES.BW.length).toBe(2);
  });

  it('should have correct GameBoy palette', () => {
    expect(PALETTES.GAMEBOY).toEqual([
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15]
    ]);
    expect(PALETTES.GAMEBOY.length).toBe(4);
    
    // Should be sorted by luminance (darkest to lightest)
    for (let i = 1; i < PALETTES.GAMEBOY.length; i++) {
      const prevLuminance = 0.299 * PALETTES.GAMEBOY[i-1][0] + 0.587 * PALETTES.GAMEBOY[i-1][1] + 0.114 * PALETTES.GAMEBOY[i-1][2];
      const currLuminance = 0.299 * PALETTES.GAMEBOY[i][0] + 0.587 * PALETTES.GAMEBOY[i][1] + 0.114 * PALETTES.GAMEBOY[i][2];
      expect(currLuminance).toBeGreaterThan(prevLuminance);
    }
  });

  it('should have correct RGB palette', () => {
    expect(PALETTES.RGB).toEqual([
      [0, 0, 0],       // Black
      [255, 0, 0],     // Red
      [0, 255, 0],     // Green
      [0, 0, 255],     // Blue
      [255, 255, 0],   // Yellow
      [255, 0, 255],   // Magenta
      [0, 255, 255],   // Cyan
      [255, 255, 255], // White
    ]);
    expect(PALETTES.RGB.length).toBe(8);
  });

  it('should have correct GRAYSCALE_16 palette', () => {
    expect(PALETTES.GRAYSCALE_16.length).toBe(16);
    
    // Should start with black and end with white
    expect(PALETTES.GRAYSCALE_16[0]).toEqual([0, 0, 0]);
    expect(PALETTES.GRAYSCALE_16[15]).toEqual([255, 255, 255]);
    
    // All colors should be grayscale (R=G=B)
    for (const color of PALETTES.GRAYSCALE_16) {
      expect(color[0]).toBe(color[1]);
      expect(color[1]).toBe(color[2]);
    }
    
    // Should be in ascending order
    for (let i = 1; i < PALETTES.GRAYSCALE_16.length; i++) {
      expect(PALETTES.GRAYSCALE_16[i][0]).toBeGreaterThan(PALETTES.GRAYSCALE_16[i-1][0]);
    }
  });

  it('should have correct CGA_4 palette', () => {
    expect(PALETTES.CGA_4).toEqual([
      [0, 0, 0],       // Black
      [255, 0, 255],   // Magenta
      [0, 255, 255],   // Cyan
      [255, 255, 255], // White
    ]);
    expect(PALETTES.CGA_4.length).toBe(4);
  });
});

describe('getPalette', () => {
  it('should return the correct palette for each name', () => {
    expect(getPalette('BW')).toBe(PALETTES.BW);
    expect(getPalette('GAMEBOY')).toBe(PALETTES.GAMEBOY);
    expect(getPalette('RGB')).toBe(PALETTES.RGB);
    expect(getPalette('GRAYSCALE_16')).toBe(PALETTES.GRAYSCALE_16);
    expect(getPalette('CGA_4')).toBe(PALETTES.CGA_4);
  });

  it('should return read-only palettes', () => {
    const bwPalette = getPalette('BW');
    // Should be read-only (TypeScript will catch this at compile time)
    expect(Array.isArray(bwPalette)).toBe(true);
  });
});

describe('createGrayscalePalette', () => {
  it('should throw error for less than 2 levels', () => {
    expect(() => createGrayscalePalette(0)).toThrow('Grayscale palette must have at least 2 levels');
    expect(() => createGrayscalePalette(1)).toThrow('Grayscale palette must have at least 2 levels');
  });

  it('should create correct 2-level grayscale palette', () => {
    const palette = createGrayscalePalette(2);
    expect(palette).toEqual([
      [0, 0, 0],
      [255, 255, 255]
    ]);
  });

  it('should create correct 4-level grayscale palette', () => {
    const palette = createGrayscalePalette(4);
    expect(palette).toEqual([
      [0, 0, 0],
      [85, 85, 85],
      [170, 170, 170],
      [255, 255, 255]
    ]);
  });

  it('should create correct 3-level grayscale palette', () => {
    const palette = createGrayscalePalette(3);
    expect(palette).toEqual([
      [0, 0, 0],
      [128, 128, 128],
      [255, 255, 255]
    ]);
  });

  it('should create palettes with correct properties', () => {
    const palette = createGrayscalePalette(8);
    
    // Should have correct length
    expect(palette.length).toBe(8);
    
    // Should start with black and end with white
    expect(palette[0]).toEqual([0, 0, 0]);
    expect(palette[7]).toEqual([255, 255, 255]);
    
    // All colors should be grayscale
    for (const color of palette) {
      expect(color[0]).toBe(color[1]);
      expect(color[1]).toBe(color[2]);
    }
    
    // Should be in ascending order
    for (let i = 1; i < palette.length; i++) {
      expect(palette[i][0]).toBeGreaterThan(palette[i-1][0]);
    }
  });

  it('should handle larger palettes correctly', () => {
    const palette = createGrayscalePalette(256);
    expect(palette.length).toBe(256);
    expect(palette[0]).toEqual([0, 0, 0]);
    expect(palette[255]).toEqual([255, 255, 255]);
    
    // Each step should be 1
    for (let i = 0; i < palette.length; i++) {
      expect(palette[i]).toEqual([i, i, i]);
    }
  });
});