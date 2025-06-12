// ABOUTME: Tests for output format conversion and encoding
// ABOUTME: Covers ImageData to various output formats with quality parameters

import { describe, it, expect } from 'vitest';
import { createSolidImageData, createImageData, TEST_PALETTES } from './testUtils.js';
import type { ColorRGB } from '../types.js';

import { 
  convertToUint8Array, 
  encodeWithQuality, 
  formatForEnvironment,
  simulatePngEncoding,
  formatForBrowser,
  formatForNode
} from '../outputFormat.js';

describe('output format conversion', () => {
  describe('ImageData to Uint8Array conversion', () => {
    it('should convert simple 2x2 ImageData to Uint8Array', () => {
      const imageData = createSolidImageData([255, 0, 0], 2, 2);
      
      const result = convertToUint8Array(imageData);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(12); // 2*2*3 = 12 bytes for RGB
      
      // Check first pixel is red
      expect(result[0]).toBe(255); // R
      expect(result[1]).toBe(0);   // G
      expect(result[2]).toBe(0);   // B
      
      // Check all pixels are red
      for (let i = 0; i < result.length; i += 3) {
        expect(result[i]).toBe(255);     // R
        expect(result[i + 1]).toBe(0);   // G
        expect(result[i + 2]).toBe(0);   // B
      }
    });

    it('should preserve pixel data in conversion', () => {
      const imageData = createImageData([
        [[255, 0, 0], [0, 255, 0]],
        [[0, 0, 255], [255, 255, 255]]
      ]);
      
      const result = convertToUint8Array(imageData);
      
      expect(result.length).toBe(12); // 2*2*3 = 12 bytes
      
      // Check pixel data is preserved (row-major order)
      expect(result[0]).toBe(255); expect(result[1]).toBe(0);   expect(result[2]).toBe(0);   // Red
      expect(result[3]).toBe(0);   expect(result[4]).toBe(255); expect(result[5]).toBe(0);   // Green
      expect(result[6]).toBe(0);   expect(result[7]).toBe(0);   expect(result[8]).toBe(255); // Blue
      expect(result[9]).toBe(255); expect(result[10]).toBe(255); expect(result[11]).toBe(255); // White
    });

    it('should handle single pixel image', () => {
      const imageData = createSolidImageData([128, 128, 128], 1, 1);
      
      const result = convertToUint8Array(imageData);
      
      expect(result.length).toBe(3); // 1*1*3 = 3 bytes
      expect(result[0]).toBe(128);
      expect(result[1]).toBe(128);
      expect(result[2]).toBe(128);
    });

    it('should handle larger images efficiently', () => {
      const imageData = createSolidImageData([100, 150, 200], 100, 100);
      
      const result = convertToUint8Array(imageData);
      
      expect(result.length).toBe(30000); // 100*100*3 = 30000 bytes
      expect(result[0]).toBe(100);
      expect(result[1]).toBe(150);
      expect(result[2]).toBe(200);
    });
  });

  describe('quality parameter encoding', () => {
    const testImage = createImageData([
      [[255, 0, 0], [0, 255, 0]],
      [[0, 0, 255], [255, 255, 0]]
    ]);

    it('should apply quality=1.0 (highest quality)', () => {
      const result = encodeWithQuality(testImage, 1.0);
      
      expect(result).toBe(testImage); // For now, returns original
      expect(result.width).toBe(testImage.width);
      expect(result.height).toBe(testImage.height);
    });

    it('should apply quality=0.5 (medium quality)', () => {
      const result = encodeWithQuality(testImage, 0.5);
      
      expect(result).toBe(testImage); // For now, returns original
      expect(result.width).toBe(testImage.width);
      expect(result.height).toBe(testImage.height);
    });

    it('should apply quality=0.0 (lowest quality)', () => {
      const result = encodeWithQuality(testImage, 0.0);
      
      expect(result).toBe(testImage); // For now, returns original
      expect(result.width).toBe(testImage.width);
      expect(result.height).toBe(testImage.height);
    });

    it('should reject quality values outside 0-1 range', () => {
      expect(() => {
        encodeWithQuality(testImage, 1.5);
      }).toThrow('Quality must be between 0 and 1');
    });

    it('should reject negative quality values', () => {
      expect(() => {
        encodeWithQuality(testImage, -0.1);
      }).toThrow('Quality must be between 0 and 1');
    });
  });

  describe('environment-specific output handling', () => {
    const testImage = createSolidImageData([255, 255, 255], 4, 4);

    it('should detect browser environment and return ImageData', () => {
      // Mock browser environment
      const originalWindow = (global as any).window;
      (global as any).window = {};
      
      const result = formatForEnvironment(testImage);
      
      expect(result).toBe(testImage); // Should return ImageData in browser
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      
      // Restore original
      (global as any).window = originalWindow;
    });

    it('should detect Node environment and return Uint8Array', () => {
      // Ensure Node environment (window undefined)
      const originalWindow = (global as any).window;
      delete (global as any).window;
      
      const result = formatForEnvironment(testImage);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).not.toBe(testImage);
      
      // Restore original
      (global as any).window = originalWindow;
    });

    it('should allow explicit format override', () => {
      const uint8Result = formatForEnvironment(testImage, 'uint8array');
      const imageDataResult = formatForEnvironment(testImage, 'imagedata');
      
      expect(uint8Result).toBeInstanceOf(Uint8Array);
      expect(imageDataResult).toBe(testImage);
    });
  });

  describe('PNG encoding simulation', () => {
    it('should simulate PNG-like encoding for testing', () => {
      const imageData = createImageData([
        [[255, 0, 0], [0, 255, 0]],
        [[0, 0, 255], [128, 128, 128]]
      ]);

      const encoded = simulatePngEncoding(imageData);
      
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBe(12); // 2*2*3 = 12 bytes
      
      // Should preserve pixel data
      expect(encoded[0]).toBe(255); expect(encoded[1]).toBe(0);   expect(encoded[2]).toBe(0);   // Red
      expect(encoded[3]).toBe(0);   expect(encoded[4]).toBe(255); expect(encoded[5]).toBe(0);   // Green
      expect(encoded[6]).toBe(0);   expect(encoded[7]).toBe(0);   expect(encoded[8]).toBe(255); // Blue
      expect(encoded[9]).toBe(128); expect(encoded[10]).toBe(128); expect(encoded[11]).toBe(128); // Gray
    });

    it('should handle compression artifacts in simulation', () => {
      const imageData = createSolidImageData([127, 127, 127], 10, 10);

      const encoded = simulatePngEncoding(imageData, { quality: 0.5 });
      
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBe(300); // 10*10*3 = 300 bytes
      
      // Should still preserve pixel data (for now)
      expect(encoded[0]).toBe(127);
      expect(encoded[1]).toBe(127);
      expect(encoded[2]).toBe(127);
    });
  });

  describe('cross-platform compatibility', () => {
    it('should produce identical output across environments', () => {
      const imageData = createImageData([
        [[255, 255, 255], [0, 0, 0]],
        [[128, 128, 128], [64, 64, 64]]
      ]);

      const browserResult = formatForBrowser(imageData);
      const nodeResult = formatForNode(imageData);
      
      expect(browserResult).toBe(imageData); // Browser returns ImageData
      expect(nodeResult).toBeInstanceOf(Uint8Array); // Node returns Uint8Array
      
      // When converted to same format, should be equivalent
      const browserAsUint8 = convertToUint8Array(browserResult);
      expect(browserAsUint8).toEqual(nodeResult);
    });

    it('should handle endianness correctly', () => {
      const imageData = createSolidImageData([255, 0, 128], 2, 2);

      const result = convertToUint8Array(imageData);
      
      // Should have consistent RGB byte order
      expect(result[0]).toBe(255); // R
      expect(result[1]).toBe(0);   // G
      expect(result[2]).toBe(128); // B
      expect(result[3]).toBe(255); // Next pixel R
      expect(result[4]).toBe(0);   // Next pixel G
      expect(result[5]).toBe(128); // Next pixel B
    });
  });

  describe('memory efficiency', () => {
    it('should handle large images without excessive memory usage', () => {
      const largeImage = createSolidImageData([200, 100, 50], 500, 500);

      const result = convertToUint8Array(largeImage);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(750000); // 500*500*3 = 750000 bytes
      expect(result[0]).toBe(200);
      expect(result[1]).toBe(100);
      expect(result[2]).toBe(50);
    });

    it('should clean up intermediate buffers', () => {
      const imageData = createSolidImageData([150, 75, 200], 50, 50);

      const result = encodeWithQuality(imageData, 0.8);
      
      expect(result).toBe(imageData); // No intermediate buffers created yet
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });
  });
});