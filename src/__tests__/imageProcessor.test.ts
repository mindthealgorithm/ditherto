// ABOUTME: Tests for the main ditherImage pipeline function
// ABOUTME: Covers integration of resize → dither → output formatting

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ditherImage } from '../imageProcessor.js';
import { createImageData, createSolidImageData, createGradient, TEST_PALETTES, getPixel } from './testUtils.js';
import type { ColorRGB, DitherOptions } from '../types.js';

// Mock @napi-rs/canvas for tests
vi.mock('@napi-rs/canvas', () => ({
  createCanvas: (width: number, height: number) => {
    const canvas = {
      width,
      height,
      getContext: (type: string) => {
        if (type === '2d') {
          const data = new Uint8ClampedArray(width * height * 4);
          return {
            putImageData: (imageData: ImageData, x: number, y: number) => {
              // Copy imageData to internal storage
              data.set(imageData.data);
            },
            drawImage: (source: HTMLCanvasElement, dx: number, dy: number, dw?: number, dh?: number) => {
              // Mock drawImage - just fill with some test data
              for (let i = 0; i < data.length; i += 4) {
                data[i] = 128;     // R
                data[i + 1] = 128; // G  
                data[i + 2] = 128; // B
                data[i + 3] = 255; // A
              }
            },
            getImageData: (x: number, y: number, w: number, h: number) => {
              return {
                data: data.slice(0, w * h * 4),
                width: w,
                height: h,
                colorSpace: 'srgb' as const
              };
            },
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'low' as const
          };
        }
        return null;
      }
    };
    return canvas;
  }
}));

// Helper to check result type in cross-platform way
function isImageDataLike(result: unknown): boolean {
  return result && typeof result === 'object' && 'data' in result && 'width' in result && 'height' in result;
}

function isUint8ArrayLike(result: unknown): boolean {
  return result instanceof Uint8Array;
}

describe('ditherImage pipeline', () => {
  // Test with simple solid colors first
  describe('basic functionality', () => {
    it('should process a simple black image with default options', async () => {
      const input = createSolidImageData([0, 0, 0], 4, 4);
      
      const result = await ditherImage(input);
      
      // Should return either ImageData or Uint8Array
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      } else {
        expect(result.length).toBe(48); // 4*4*3 = 48 bytes for RGB
      }
    });

    it('should process a simple white image with default options', async () => {
      const input = createSolidImageData([255, 255, 255], 4, 4);
      
      const result = await ditherImage(input);
      
      // Should return either ImageData or Uint8Array
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      } else {
        expect(result.length).toBe(48); // 4*4*3 = 48 bytes for RGB
      }
    });

    it('should process a gradient with black/white palette', async () => {
      const input = createGradient();
      const options: DitherOptions = {
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(input, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4); // Gradient is 4x4
        expect(result.height).toBe(4);
      }
    });
  });

  describe('algorithm/palette combinations', () => {
    const testImage = createGradient();

    it('should work with Atkinson + BW palette', async () => {
      const options: DitherOptions = {
        algorithm: 'atkinson',
        palette: TEST_PALETTES.BW
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4); // Gradient is 4x4
        expect(result.height).toBe(4);
      }
    });

    it('should work with Floyd-Steinberg + GameBoy palette', async () => {
      const options: DitherOptions = {
        algorithm: 'floyd-steinberg', 
        palette: TEST_PALETTES.GAMEBOY
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      }
    });

    it('should work with Ordered + RGB palette', async () => {
      const options: DitherOptions = {
        algorithm: 'ordered',
        palette: TEST_PALETTES.RGB
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      }
    });

    it('should default to black/white palette when none specified', async () => {
      const options: DitherOptions = {
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      // Check that we get black and white values (since default palette is BW)
      if (result instanceof Uint8Array) {
        const uniqueValues = new Set(result);
        expect(uniqueValues.size).toBeLessThanOrEqual(6); // R,G,B values for black (0) and white (255)
        expect(uniqueValues.has(0) || uniqueValues.has(255)).toBe(true);
      }
    });

    it('should default to atkinson algorithm when none specified', async () => {
      const options: DitherOptions = {
        palette: TEST_PALETTES.BW
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      }
    });
  });

  describe('resize integration', () => {
    const largeImage = createSolidImageData([128, 128, 128], 8, 8);

    it('should resize by width while maintaining aspect ratio', async () => {
      const options: DitherOptions = {
        width: 4,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(largeImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4); // Resized to width 4
        expect(result.height).toBe(4); // Aspect ratio preserved (square)
      } else {
        expect(result.length).toBe(48); // 4*4*3 = 48 bytes for RGB
      }
    });

    it('should resize by height while maintaining aspect ratio', async () => {
      const options: DitherOptions = {
        height: 4,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(largeImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4); // Resized to height 4
      } else {
        expect(result.length).toBe(48); // 4*4*3 = 48 bytes for RGB
      }
    });

    it('should resize by both width and height with contain fit', async () => {
      const options: DitherOptions = {
        width: 6,
        height: 4,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(largeImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        // Should fit within bounds while preserving aspect ratio
        expect(result.width).toBeLessThanOrEqual(6);
        expect(result.height).toBeLessThanOrEqual(4);
      }
    });

    it('should skip resize when dimensions match', async () => {
      const options: DitherOptions = {
        width: 8,
        height: 8,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(largeImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(8); // Should match original
        expect(result.height).toBe(8);
      } else {
        expect(result.length).toBe(192); // 8*8*3 = 192 bytes for RGB
      }
    });
  });

  describe('step parameter (chunky pixels)', () => {
    const testImage = createGradient();

    it('should handle step=1 (normal pixels)', async () => {
      const options: DitherOptions = {
        step: 1,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      }
    });

    it('should handle step=2 (2x2 chunky pixels)', async () => {
      const options: DitherOptions = {
        step: 2,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      
      expect(result).toBeDefined();
      expect(isImageDataLike(result) || isUint8ArrayLike(result)).toBe(true);
      
      if (isImageDataLike(result)) {
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);
      }
    });

    it('should handle step=3 (3x3 chunky pixels)', async () => {
      const options: DitherOptions = {
        step: 3,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should default step to 1 when not specified', async () => {
      const options: DitherOptions = {
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should reject invalid step values', async () => {
      const options: DitherOptions = {
        step: 0,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      // TODO: Replace with actual implementation - should reject step <= 0
      await expect(ditherImage(testImage, options)).rejects.toThrow();
    });
  });

  describe('quality parameter handling', () => {
    const testImage = createGradient();

    it('should accept quality values between 0 and 1', async () => {
      const options: DitherOptions = {
        quality: 0.8,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle quality=0 (lowest quality)', async () => {
      const options: DitherOptions = {
        quality: 0,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle quality=1 (highest quality)', async () => {
      const options: DitherOptions = {
        quality: 1,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should reject quality values outside 0-1 range', async () => {
      const options: DitherOptions = {
        quality: 1.5,
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      // TODO: Replace with actual implementation - should reject quality > 1
      await expect(ditherImage(testImage, options)).rejects.toThrow();
    });
  });

  describe('output format handling', () => {
    const testImage = createSolidImageData([128, 128, 128], 2, 2);

    it('should return Uint8Array in Node environment', async () => {
      const options: DitherOptions = {
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return consistent output format', async () => {
      const options: DitherOptions = {
        palette: TEST_PALETTES.BW,
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('palette extraction integration', () => {
    it('should extract palette from paletteImg option', async () => {
      const testImage = createGradient();
      const options: DitherOptions = {
        paletteImg: 'test-palette.png', // Use string path for Node environment
        algorithm: 'atkinson'
      };
      
      // This will fail because test-palette.png doesn't exist, which is expected
      await expect(ditherImage(testImage, options)).rejects.toThrow();
    });

    it('should prioritize explicit palette over paletteImg', async () => {
      const testImage = createGradient();
      const options: DitherOptions = {
        palette: TEST_PALETTES.BW, // Explicit palette should win
        paletteImg: 'test-palette.png', // This should be ignored
        algorithm: 'atkinson'
      };
      
      const result = await ditherImage(testImage, options);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid algorithm names', async () => {
      const testImage = createGradient();
      const options = {
        algorithm: 'invalid-algorithm',
        palette: TEST_PALETTES.BW
      } as DitherOptions;
      
      // TODO: Replace with actual implementation - should reject invalid algorithm
      await expect(ditherImage(testImage, options)).rejects.toThrow();
    });

    it('should handle empty palettes', async () => {
      const testImage = createGradient();
      const options: DitherOptions = {
        palette: [],
        algorithm: 'atkinson'
      };
      
      // TODO: Replace with actual implementation - should reject empty palette
      await expect(ditherImage(testImage, options)).rejects.toThrow();
    });

    it('should handle invalid input types', async () => {
      const invalidInput = null as InputImageSource;
      
      // TODO: Replace with actual implementation - should reject null input
      await expect(ditherImage(invalidInput)).rejects.toThrow();
    });
  });
});