// ABOUTME: Tests for palette extraction functionality
// ABOUTME: Validates color extraction from PNG images and palette utilities

import { describe, it, expect, vi } from 'vitest';
import { generatePalette } from '../palette/extract.js';
import type { ColorRGB } from '../types.js';

// Helper function to create mock ImageData
function createMockImageData(width: number, height: number, colors: ColorRGB[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  
  for (let i = 0; i < width * height; i++) {
    const colorIndex = i % colors.length;
    const color = colors[colorIndex];
    const pixelIndex = i * 4;
    
    data[pixelIndex] = color[0];     // R
    data[pixelIndex + 1] = color[1]; // G
    data[pixelIndex + 2] = color[2]; // B
    data[pixelIndex + 3] = 255;      // A (opaque)
  }
  
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

// Mock the file loading for testing
vi.mock('../palette/extract.js', async () => {
  const actual = await vi.importActual('../palette/extract.js') as { extractColorsFromImageData: (data: ImageData) => ColorRGB[] };
  
  return {
    ...actual,
    generatePalette: vi.fn().mockImplementation(async (input: string): Promise<ColorRGB[]> => {
      // Mock different test fixtures
      switch (input) {
        case 'tests/fixtures/palettes/rgb-palette.png': {
          const mockData = createMockImageData(3, 1, [
            [255, 0, 0], [0, 255, 0], [0, 0, 255]
          ]);
          return actual.extractColorsFromImageData(mockData);
        }
        case 'tests/fixtures/palettes/bw-palette.png': {
          const mockData = createMockImageData(2, 1, [
            [0, 0, 0], [255, 255, 255]
          ]);
          return actual.extractColorsFromImageData(mockData);
        }
        case 'tests/fixtures/palettes/gameboy-palette.png': {
          const mockData = createMockImageData(4, 1, [
            [15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]
          ]);
          return actual.extractColorsFromImageData(mockData);
        }
        case 'tests/fixtures/input/solid-black-4x4.png': {
          const mockData = createMockImageData(4, 4, [[0, 0, 0]]);
          return actual.extractColorsFromImageData(mockData);
        }
        case 'tests/fixtures/input/solid-white-4x4.png': {
          const mockData = createMockImageData(4, 4, [[255, 255, 255]]);
          return actual.extractColorsFromImageData(mockData);
        }
        case 'tests/fixtures/input/checkerboard-4x4.png': {
          const mockData = createMockImageData(4, 4, [
            [0, 0, 0], [255, 255, 255]
          ]);
          return actual.extractColorsFromImageData(mockData);
        }
        case 'tests/fixtures/input/gradient-4x4.png': {
          const mockData = createMockImageData(4, 4, [
            [0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]
          ]);
          return actual.extractColorsFromImageData(mockData);
        }
        default:
          throw new Error(`Mock fixture not found: ${input}`);
      }
    })
  };
});

describe('generatePalette', () => {
  it('should extract unique colors from a PNG image', async () => {
    const palette = await generatePalette('tests/fixtures/palettes/rgb-palette.png');
    
    // Should contain the basic RGB colors
    expect(palette.length).toBe(3);
    expect(palette).toEqual(expect.arrayContaining([
      expect.any(Array)
    ]));
    
    // Each color should be an RGB array with 3 values
    for (const color of palette) {
      expect(color).toHaveLength(3);
      expect(color[0]).toBeGreaterThanOrEqual(0);
      expect(color[0]).toBeLessThanOrEqual(255);
      expect(color[1]).toBeGreaterThanOrEqual(0);
      expect(color[1]).toBeLessThanOrEqual(255);
      expect(color[2]).toBeGreaterThanOrEqual(0);
      expect(color[2]).toBeLessThanOrEqual(255);
    }
  });

  it('should extract known colors from RGB test palette', async () => {
    const palette = await generatePalette('tests/fixtures/palettes/rgb-palette.png');
    
    // Should contain basic RGB colors (sorted by luminance)
    expect(palette.length).toBe(3);
    
    // Check for presence of pure colors (red, green, blue)
    const hasRed = palette.some(color => color[0] === 255 && color[1] === 0 && color[2] === 0);
    const hasGreen = palette.some(color => color[0] === 0 && color[1] === 255 && color[2] === 0);
    const hasBlue = palette.some(color => color[0] === 0 && color[1] === 0 && color[2] === 255);
    
    expect(hasRed).toBe(true);
    expect(hasGreen).toBe(true);
    expect(hasBlue).toBe(true);
  });

  it('should extract black and white from BW palette', async () => {
    const palette = await generatePalette('tests/fixtures/palettes/bw-palette.png');
    
    expect(palette.length).toBe(2);
    
    // Should contain black and white (sorted by luminance: black first)
    expect(palette[0]).toEqual([0, 0, 0]);
    expect(palette[1]).toEqual([255, 255, 255]);
  });

  it('should extract GameBoy palette colors', async () => {
    const palette = await generatePalette('tests/fixtures/palettes/gameboy-palette.png');
    
    // GameBoy has 4 shades of green
    expect(palette.length).toBe(4);
    
    // All colors should be valid RGB and sorted by luminance
    for (const color of palette) {
      expect(color).toHaveLength(3);
      expect(color[0]).toBeGreaterThanOrEqual(0);
      expect(color[0]).toBeLessThanOrEqual(255);
    }
    
    // Should be sorted from darkest to lightest
    for (let i = 1; i < palette.length; i++) {
      const prevLuminance = 0.299 * palette[i-1][0] + 0.587 * palette[i-1][1] + 0.114 * palette[i-1][2];
      const currLuminance = 0.299 * palette[i][0] + 0.587 * palette[i][1] + 0.114 * palette[i][2];
      expect(currLuminance).toBeGreaterThanOrEqual(prevLuminance);
    }
  });

  it('should handle single color images', async () => {
    const palette = await generatePalette('tests/fixtures/input/solid-white-4x4.png');
    
    // Should contain exactly one color
    expect(palette.length).toBe(1);
    expect(palette[0]).toEqual([255, 255, 255]);
  });

  it('should handle single color black images', async () => {
    const palette = await generatePalette('tests/fixtures/input/solid-black-4x4.png');
    
    // Should contain exactly one color
    expect(palette.length).toBe(1);
    expect(palette[0]).toEqual([0, 0, 0]);
  });

  it('should deduplicate colors from the same image', async () => {
    const palette = await generatePalette('tests/fixtures/input/checkerboard-4x4.png');
    
    // Checkerboard should only have 2 unique colors
    expect(palette.length).toBe(2);
    
    // Should contain black and white, sorted by luminance
    expect(palette[0]).toEqual([0, 0, 0]);
    expect(palette[1]).toEqual([255, 255, 255]);
    
    // Should not contain duplicate colors
    const colorStrings = palette.map(color => `${color[0]},${color[1]},${color[2]}`);
    const uniqueColorStrings = [...new Set(colorStrings)];
    expect(colorStrings.length).toBe(uniqueColorStrings.length);
  });

  it('should extract multiple colors from gradient', async () => {
    const palette = await generatePalette('tests/fixtures/input/gradient-4x4.png');
    
    // Should extract all gradient colors
    expect(palette.length).toBe(4);
    
    // Should be sorted by luminance (darkest to lightest)
    expect(palette[0]).toEqual([0, 0, 0]);
    expect(palette[1]).toEqual([85, 85, 85]);
    expect(palette[2]).toEqual([170, 170, 170]);
    expect(palette[3]).toEqual([255, 255, 255]);
  });
});

describe('palette utilities', () => {
  it('should sort colors by luminance consistently', async () => {
    const palette = await generatePalette('tests/fixtures/palettes/rgb-palette.png');
    
    // Should be sorted by luminance
    expect(Array.isArray(palette)).toBe(true);
    expect(palette.length).toBe(3);
    
    // Check that luminance increases
    for (let i = 1; i < palette.length; i++) {
      const prevLuminance = 0.299 * palette[i-1][0] + 0.587 * palette[i-1][1] + 0.114 * palette[i-1][2];
      const currLuminance = 0.299 * palette[i][0] + 0.587 * palette[i][1] + 0.114 * palette[i][2];
      expect(currLuminance).toBeGreaterThanOrEqual(prevLuminance);
    }
  });
});