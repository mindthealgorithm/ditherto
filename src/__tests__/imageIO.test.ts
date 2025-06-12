// ABOUTME: Tests for image I/O functionality across environments
// ABOUTME: Validates loading from various sources and resizing with aspect ratio preservation

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { 
  loadImageData, 
  calculateResizeDimensions, 
  resizeImageData, 
  validateImageDimensions,
  type ResizeOptions 
} from '../imageIO.js';
import { createImageData } from './testUtils.js';

// Mock browser APIs for Node environment
beforeAll(() => {
  if (typeof globalThis.HTMLImageElement === 'undefined') {
    globalThis.HTMLImageElement = class HTMLImageElement {} as any;
  }
  if (typeof globalThis.Blob === 'undefined') {
    globalThis.Blob = class Blob {} as any;
  }
  if (typeof globalThis.File === 'undefined') {
    globalThis.File = class File {} as any;
  }
});

describe('loadImageData', () => {
  it('should reject unsupported input types', async () => {
    await expect(loadImageData({} as any)).rejects.toThrow('Unsupported input image source type');
    await expect(loadImageData(123 as any)).rejects.toThrow('Unsupported input image source type');
  });

  // Note: File path testing requires canvas package which we're mocking in other tests
  // Real file loading is tested in the palette extraction tests
});

describe('calculateResizeDimensions', () => {
  it('should return original dimensions when no constraints given', () => {
    const result = calculateResizeDimensions(100, 200, {});
    expect(result).toEqual({ width: 100, height: 200 });
  });

  it('should scale by width while maintaining aspect ratio', () => {
    const result = calculateResizeDimensions(100, 200, { width: 50 });
    expect(result).toEqual({ width: 50, height: 100 });
  });

  it('should scale by height while maintaining aspect ratio', () => {
    const result = calculateResizeDimensions(100, 200, { height: 100 });
    expect(result).toEqual({ width: 50, height: 100 });
  });

  it('should fit within bounds using contain mode (default)', () => {
    // Wide image in tall bounds - should be limited by width
    const result1 = calculateResizeDimensions(200, 100, { width: 100, height: 200 });
    expect(result1).toEqual({ width: 100, height: 50 });
    
    // Tall image in wide bounds - should be limited by height
    const result2 = calculateResizeDimensions(100, 200, { width: 200, height: 100 });
    expect(result2).toEqual({ width: 50, height: 100 });
  });

  it('should cover bounds using cover mode', () => {
    // Wide image in tall bounds - should be limited by height
    const result1 = calculateResizeDimensions(200, 100, { 
      width: 100, 
      height: 200, 
      fit: 'cover' 
    });
    expect(result1).toEqual({ width: 400, height: 200 });
    
    // Tall image in wide bounds - should be limited by width
    const result2 = calculateResizeDimensions(100, 200, { 
      width: 200, 
      height: 100, 
      fit: 'cover' 
    });
    expect(result2).toEqual({ width: 200, height: 400 });
  });

  it('should handle square images correctly', () => {
    const result = calculateResizeDimensions(100, 100, { width: 50, height: 75 });
    expect(result).toEqual({ width: 50, height: 50 });
  });

  it('should handle edge cases with very small dimensions', () => {
    const result = calculateResizeDimensions(1000, 1000, { width: 1 });
    expect(result).toEqual({ width: 1, height: 1 });
  });

  it('should handle edge cases with very large original dimensions', () => {
    const result = calculateResizeDimensions(8000, 6000, { width: 100 });
    expect(result).toEqual({ width: 100, height: 75 });
  });
});

describe('resizeImageData', () => {
  it('should return original ImageData when no resize needed', () => {
    const original = createImageData([
      [[255, 0, 0], [0, 255, 0]],
      [[0, 0, 255], [255, 255, 255]]
    ]);
    
    const result = resizeImageData(original, {});
    expect(result).toBe(original);
    
    const result2 = resizeImageData(original, { width: 2, height: 2 });
    expect(result2).toBe(original);
  });

  // Note: Actual resizing tests would require canvas API
  // These are integration tests that would need browser or canvas package
});

describe('validateImageDimensions', () => {
  it('should accept valid dimensions', () => {
    expect(() => validateImageDimensions(100, 200)).not.toThrow();
    expect(() => validateImageDimensions(1, 1)).not.toThrow();
    expect(() => validateImageDimensions(8192, 8192)).not.toThrow();
  });

  it('should reject zero or negative dimensions', () => {
    expect(() => validateImageDimensions(0, 100)).toThrow('Invalid image dimensions: 0x100');
    expect(() => validateImageDimensions(100, 0)).toThrow('Invalid image dimensions: 100x0');
    expect(() => validateImageDimensions(-1, 100)).toThrow('Invalid image dimensions: -1x100');
    expect(() => validateImageDimensions(100, -1)).toThrow('Invalid image dimensions: 100x-1');
  });

  it('should reject dimensions that are too large', () => {
    expect(() => validateImageDimensions(8193, 100)).toThrow('Image dimensions too large: 8193x100');
    expect(() => validateImageDimensions(100, 8193)).toThrow('Image dimensions too large: 100x8193');
    expect(() => validateImageDimensions(10000, 10000)).toThrow('Image dimensions too large: 10000x10000');
  });

  it('should reject non-integer dimensions', () => {
    expect(() => validateImageDimensions(100.5, 100)).toThrow('Image dimensions must be integers: 100.5x100');
    expect(() => validateImageDimensions(100, 100.5)).toThrow('Image dimensions must be integers: 100x100.5');
    expect(() => validateImageDimensions(99.9, 100.1)).toThrow('Image dimensions must be integers: 99.9x100.1');
  });
});

describe('ResizeOptions type safety', () => {
  it('should accept valid resize options', () => {
    const options1: ResizeOptions = { width: 100 };
    const options2: ResizeOptions = { height: 200 };
    const options3: ResizeOptions = { width: 100, height: 200 };
    const options4: ResizeOptions = { width: 100, height: 200, fit: 'contain' };
    const options5: ResizeOptions = { width: 100, height: 200, fit: 'cover' };
    const options6: ResizeOptions = {};
    
    expect(options1).toBeDefined();
    expect(options2).toBeDefined();
    expect(options3).toBeDefined();
    expect(options4).toBeDefined();
    expect(options5).toBeDefined();
    expect(options6).toBeDefined();
  });
});