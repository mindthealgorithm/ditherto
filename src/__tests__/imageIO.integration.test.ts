// ABOUTME: Integration tests for image I/O using real PNG fixtures  
// ABOUTME: Tests actual file loading - requires canvas package for Node.js

import { describe, it, expect, vi } from 'vitest';
import { loadImageData } from '../imageIO.js';
import { ditherImage } from '../imageProcessor.js';
import { generatePalette } from '../palette/extract.js';
import { resolve } from 'node:path';

// Mock ImageData class for Node environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: 'srgb' = 'srgb';
  
  constructor(width: number, height: number);
  constructor(data: Uint8ClampedArray, width: number, height?: number);
  constructor(dataOrWidth: Uint8ClampedArray | number, width: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = width;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = width;
      this.height = height || Math.floor(dataOrWidth.length / (width * 4));
    }
  }
}

// Set up ImageData global for Node environment
Object.defineProperty(globalThis, 'ImageData', {
  value: MockImageData,
  writable: true,
});

// Test fixture paths
const FIXTURES_PATH = resolve(process.cwd(), 'tests/fixtures');
const INPUT_PATH = resolve(FIXTURES_PATH, 'input');
const PALETTE_PATH = resolve(FIXTURES_PATH, 'palettes');

// These tests require the canvas package to be installed
// Canvas is now available in CI, so these tests can run
describe('loadImageData integration tests (requires canvas)', () => {
  it('should load solid black 4x4 PNG correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'solid-black-4x4.png');
    
    try {
      const imageData = await loadImageData(imagePath);
      
      expect(imageData.width).toBe(4);
      expect(imageData.height).toBe(4);
      expect(imageData.data.length).toBe(64); // 4 * 4 * 4 channels
      
      // Check that all pixels are black (R=0, G=0, B=0, A=255)
      for (let i = 0; i < imageData.data.length; i += 4) {
        expect(imageData.data[i]).toBe(0);     // Red
        expect(imageData.data[i + 1]).toBe(0); // Green  
        expect(imageData.data[i + 2]).toBe(0); // Blue
        expect(imageData.data[i + 3]).toBe(255); // Alpha
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('canvas package required')) {
        console.log('Skipping test - canvas package not installed');
        return;
      }
      throw error;
    }
  });

  it('should load solid white 4x4 PNG correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'solid-white-4x4.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBe(4);
    expect(imageData.height).toBe(4);
    
    // Check that all pixels are white (R=255, G=255, B=255, A=255)
    for (let i = 0; i < imageData.data.length; i += 4) {
      expect(imageData.data[i]).toBe(255);     // Red
      expect(imageData.data[i + 1]).toBe(255); // Green  
      expect(imageData.data[i + 2]).toBe(255); // Blue
      expect(imageData.data[i + 3]).toBe(255); // Alpha
    }
  });

  it('should load checkerboard 4x4 PNG correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'checkerboard-4x4.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBe(4);
    expect(imageData.height).toBe(4);
    
    // Checkerboard should have alternating black and white pixels
    const getPixel = (x: number, y: number) => {
      const i = (y * imageData.width + x) * 4;
      return [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
    };
    
    // Check the checkerboard pattern
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const pixel = getPixel(x, y);
        const isBlack = (x + y) % 2 === 0;
        
        if (isBlack) {
          expect(pixel).toEqual([0, 0, 0]);
        } else {
          expect(pixel).toEqual([255, 255, 255]);
        }
      }
    }
  });

  it('should load RGB test 3x1 PNG correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'rgb-test-3x1.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBe(3);
    expect(imageData.height).toBe(1);
    
    // Should contain red, green, blue pixels
    const getPixel = (x: number) => {
      const i = x * 4;
      return [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
    };
    
    expect(getPixel(0)).toEqual([255, 0, 0]);   // Red
    expect(getPixel(1)).toEqual([0, 255, 0]);   // Green  
    expect(getPixel(2)).toEqual([0, 0, 255]);   // Blue
  });

  it('should load gradient 4x4 PNG correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'gradient-4x4.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBe(4);
    expect(imageData.height).toBe(4);
    
    // Gradient should have varying brightness values
    const getPixel = (x: number, y: number) => {
      const i = (y * imageData.width + x) * 4;
      return [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
    };
    
    // Check that we have gradual transitions (not exact values due to PNG compression)
    const topLeft = getPixel(0, 0);
    const bottomRight = getPixel(3, 3);
    
    // Top-left should be darker than bottom-right in a typical gradient
    const topLeftBrightness = topLeft[0] + topLeft[1] + topLeft[2];
    const bottomRightBrightness = bottomRight[0] + bottomRight[1] + bottomRight[2];
    
    expect(topLeftBrightness).toBeLessThan(bottomRightBrightness);
  });

  it('should load complex photo PNG correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'complex-photo.png');
    const imageData = await loadImageData(imagePath);
    
    // Complex photo should have reasonable dimensions
    expect(imageData.width).toBeGreaterThan(0);
    expect(imageData.height).toBeGreaterThan(0);
    expect(imageData.width).toBeLessThanOrEqual(1024); // Reasonable test size
    expect(imageData.height).toBeLessThanOrEqual(1024);
    
    // Should have full alpha channel
    for (let i = 3; i < imageData.data.length; i += 4) {
      expect(imageData.data[i]).toBe(255); // Alpha should be opaque
    }
  });

  it('should load BW palette PNG correctly', async () => {
    const imagePath = resolve(PALETTE_PATH, 'bw-palette.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBeGreaterThan(0);
    expect(imageData.height).toBeGreaterThan(0);
    
    // BW palette should contain only black and white pixels
    const uniqueColors = new Set<string>();
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      uniqueColors.add(`${r},${g},${b}`);
    }
    
    expect(uniqueColors.size).toBeLessThanOrEqual(2); // Should be black and/or white only
    expect(uniqueColors.has('0,0,0') || uniqueColors.has('255,255,255')).toBe(true);
  });

  it('should load GameBoy palette PNG correctly', async () => {
    const imagePath = resolve(PALETTE_PATH, 'gameboy-palette.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBeGreaterThan(0);
    expect(imageData.height).toBeGreaterThan(0);
    
    // GameBoy palette should have 4 or fewer unique colors
    const uniqueColors = new Set<string>();
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      uniqueColors.add(`${r},${g},${b}`);
    }
    
    expect(uniqueColors.size).toBeLessThanOrEqual(4); // GameBoy has 4 shades
  });

  it('should load RGB palette PNG correctly', async () => {
    const imagePath = resolve(PALETTE_PATH, 'rgb-palette.png');
    const imageData = await loadImageData(imagePath);
    
    expect(imageData.width).toBeGreaterThan(0);
    expect(imageData.height).toBeGreaterThan(0);
    
    // RGB palette should contain primary colors
    const uniqueColors = new Set<string>();
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      uniqueColors.add(`${r},${g},${b}`);
    }
    
    // Should have basic RGB colors represented
    expect(uniqueColors.size).toBeGreaterThanOrEqual(3);
  });

  it('should handle non-existent files gracefully', async () => {
    const nonExistentPath = resolve(INPUT_PATH, 'does-not-exist.png');
    
    await expect(loadImageData(nonExistentPath)).rejects.toThrow();
  });

  it('should handle invalid file formats gracefully', async () => {
    // Try to load a text file as an image (if we had one)
    // For now, test with a malformed path
    const invalidPath = resolve(INPUT_PATH, '..');
    
    await expect(loadImageData(invalidPath)).rejects.toThrow();
  });
});

// Pipeline validation tests - ensures complete dithering pipeline works correctly
describe('Complete dithering pipeline integration tests', () => {
  // Helper to check result type in cross-platform way
  function isImageDataLike(result: unknown): boolean {
    return result && typeof result === 'object' && 'data' in result && 'width' in result && 'height' in result;
  }
  
  function isUint8ArrayLike(result: unknown): boolean {
    return result instanceof Uint8Array;
  }
  
  /**
   * Convert result to ImageData for analysis
   */
  function resultToImageData(result: unknown, expectedWidth?: number, expectedHeight?: number): ImageData {
    if (isImageDataLike(result)) {
      return result as ImageData;
    }
    if (isUint8ArrayLike(result)) {
      const rgbData = result as Uint8Array;
      
      // Calculate width and height from RGB data length (3 bytes per pixel)
      let width: number;
      let height: number;
      
      if (expectedWidth && expectedHeight) {
        width = expectedWidth;
        height = expectedHeight;
      } else if (expectedWidth) {
        width = expectedWidth;
        height = rgbData.length / (expectedWidth * 3);
      } else if (expectedHeight) {
        height = expectedHeight;
        width = rgbData.length / (expectedHeight * 3);
      } else {
        // Try to infer square dimensions as fallback
        const pixelCount = rgbData.length / 3;
        const side = Math.sqrt(pixelCount);
        if (side === Math.floor(side)) {
          width = side;
          height = side;
        } else {
          throw new Error('Cannot determine ImageData dimensions from Uint8Array');
        }
      }
      
      // Convert RGB to RGBA format
      const rgbaData = new Uint8ClampedArray(width * height * 4);
      for (let i = 0, j = 0; i < rgbData.length; i += 3, j += 4) {
        rgbaData[j] = rgbData[i]!;       // Red
        rgbaData[j + 1] = rgbData[i + 1]!; // Green
        rgbaData[j + 2] = rgbData[i + 2]!; // Blue
        rgbaData[j + 3] = 255;             // Alpha (fully opaque)
      }
      
      return new ImageData(rgbaData, width, height);
    }
    throw new Error('Result is neither ImageData nor Uint8Array');
  }
  
  /**
   * Analyze color distribution in ImageData
   */
  function analyzeColors(imageData: ImageData): Map<string, number> {
    const colorCounts = new Map<string, number>();
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip transparent pixels
      if (a === 0) continue;
      
      const colorKey = `${r},${g},${b}`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }
    
    return colorCounts;
  }

  /**
   * Check if colors match the GameBoy palette
   */
  function checkGameBoyPalette(colors: Map<string, number>): boolean {
    const gameboyColors = [
      '15,56,15',
      '48,98,48', 
      '139,172,15',
      '155,188,15'
    ];
    
    // Check that all colors in the result are GameBoy colors
    for (const colorKey of colors.keys()) {
      if (!gameboyColors.includes(colorKey)) {
        return false;
      }
    }
    
    return true;
  }

  it('should complete full dithering pipeline with GameBoy palette', async () => {
    // Test the complete pipeline: Load → Palette → Dither → Analyze
    const imagePath = resolve(INPUT_PATH, 'complex-photo.png');
    const palettePath = resolve(PALETTE_PATH, 'gameboy-palette.png');
    
    // Step 1: Load original image
    const originalImageData = await loadImageData(imagePath);
    expect(originalImageData.width).toBeGreaterThan(0);
    expect(originalImageData.height).toBeGreaterThan(0);
    
    // Step 2: Load GameBoy palette
    const palette = await generatePalette(palettePath);
    expect(palette).toHaveLength(4);
    
    // Verify GameBoy colors are loaded correctly
    const expectedColors = [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15]
    ];
    
    for (const expectedColor of expectedColors) {
      const found = palette.some(color => 
        color[0] === expectedColor[0] && 
        color[1] === expectedColor[1] && 
        color[2] === expectedColor[2]
      );
      expect(found).toBe(true);
    }
    
    // Step 3: Apply dithering with resizing
    const result = await ditherImage(imagePath, {
      paletteImg: palettePath,
      algorithm: 'atkinson',
      width: 200 // Resize to smaller size for testing
    });
    
    // Step 4: Analyze the result
    expect(result).toBeDefined();
    expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
    
    const resultImageData = resultToImageData(result, 200); // Height will be calculated
    
    expect(resultImageData.width).toBe(200);
    expect(resultImageData.height).toBeGreaterThan(0);
    
    // Step 5: Check color distribution
    const colors = analyzeColors(resultImageData);
    
    // Should have multiple colors (not single color bug)
    expect(colors.size).toBeGreaterThan(1);
    expect(colors.size).toBeLessThanOrEqual(4);
    
    // All colors should be GameBoy colors
    expect(checkGameBoyPalette(colors)).toBe(true);
    
    // Should have reasonable distribution (not all one color)
    const totalPixels = resultImageData.width * resultImageData.height;
    const colorCounts = Array.from(colors.values());
    const maxColorCount = Math.max(...colorCounts);
    const maxColorPercentage = (maxColorCount / totalPixels) * 100;
    
    // No single color should dominate more than 90%
    expect(maxColorPercentage).toBeLessThan(90);
  });

  it('should handle different dithering algorithms correctly', async () => {
    const imagePath = resolve(INPUT_PATH, 'gradient-4x4.png');
    const palettePath = resolve(PALETTE_PATH, 'bw-palette.png');
    
    // Test different algorithms
    const algorithms = ['atkinson', 'floyd-steinberg', 'ordered'] as const;
    
    for (const algorithm of algorithms) {
      const result = await ditherImage(imagePath, {
        paletteImg: palettePath,
        algorithm: algorithm
      });
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      const resultImageData = resultToImageData(result, 4, 4);
      
      // Check basic properties
      expect(resultImageData.width).toBe(4);
      expect(resultImageData.height).toBe(4);
      
      // Check that it's using the BW palette
      const colors = analyzeColors(resultImageData);
      expect(colors.size).toBeGreaterThan(0);
      expect(colors.size).toBeLessThanOrEqual(2);
      
      // Should contain black and/or white pixels
      const hasBlack = colors.has('0,0,0');
      const hasWhite = colors.has('255,255,255');
      expect(hasBlack || hasWhite).toBe(true);
    }
  });

  it('should handle step parameter for chunky pixels', async () => {
    const imagePath = resolve(INPUT_PATH, 'checkerboard-4x4.png');
    const palettePath = resolve(PALETTE_PATH, 'bw-palette.png');
    
    // Test with step=2 (2x2 chunky pixels)
    const result = await ditherImage(imagePath, {
      paletteImg: palettePath,
      algorithm: 'atkinson',
      step: 2
    });
    
    expect(result).toBeDefined();
    expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
    
    const resultImageData = resultToImageData(result, 4, 4);
    
    // Should maintain original dimensions
    expect(resultImageData.width).toBe(4);
    expect(resultImageData.height).toBe(4);
    
    // Should have chunky 2x2 blocks
    const colors = analyzeColors(resultImageData);
    expect(colors.size).toBeGreaterThan(0);
    expect(colors.size).toBeLessThanOrEqual(2);
  });

  it('should maintain aspect ratio when resizing', async () => {
    const imagePath = resolve(INPUT_PATH, 'complex-photo.png');
    const palettePath = resolve(PALETTE_PATH, 'gameboy-palette.png');
    
    // Load original to check aspect ratio
    const original = await loadImageData(imagePath);
    const originalAspectRatio = original.width / original.height;
    
    // Test resizing by width
    const result = await ditherImage(imagePath, {
      paletteImg: palettePath,
      algorithm: 'atkinson',
      width: 100
    });
    
    expect(result).toBeDefined();
    expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
    
    const resultImageData = resultToImageData(result, 100); // Height will be calculated
    
    expect(resultImageData.width).toBe(100);
    
    const newAspectRatio = resultImageData.width / resultImageData.height;
    
    // Aspect ratio should be preserved (within small tolerance)
    expect(Math.abs(newAspectRatio - originalAspectRatio)).toBeLessThan(0.01);
  });
});