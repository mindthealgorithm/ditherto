import { describe, it, expect, beforeEach } from 'vitest';
import { algorithms } from '../algorithmRegistry.js';
import type { DitherAlgorithm } from '../types.js';

// Import algorithms to ensure they get registered before tests run
import '../algorithms/atkinson.js';
import '../algorithms/floydSteinberg.js';
import '../algorithms/ordered.js';

describe('AlgorithmRegistry', () => {
  // Create mock algorithms for testing
  const mockAlgorithm: DitherAlgorithm = {
    name: 'test-algorithm',
    apply: (data, palette, step) => {
      // Simple mock that just returns the input data
      return data;
    }
  };

  const anotherMockAlgorithm: DitherAlgorithm = {
    name: 'another-test',
    apply: (data, palette, step) => data
  };

  // Note: We don't clear the registry in beforeEach because built-in algorithms
  // are registered on module import. Individual tests clear when needed.

  describe('register', () => {
    it('should register a new algorithm', () => {
      algorithms.register(mockAlgorithm);
      expect(algorithms.get('test-algorithm')).toBe(mockAlgorithm);
    });

    it('should allow overwriting existing algorithms', () => {
      algorithms.register(mockAlgorithm);
      
      const newAlgorithm: DitherAlgorithm = {
        name: 'test-algorithm',
        apply: (data) => data
      };
      
      algorithms.register(newAlgorithm);
      expect(algorithms.get('test-algorithm')).toBe(newAlgorithm);
    });

    it('should register multiple algorithms', () => {
      algorithms.register(mockAlgorithm);
      algorithms.register(anotherMockAlgorithm);
      
      expect(algorithms.get('test-algorithm')).toBe(mockAlgorithm);
      expect(algorithms.get('another-test')).toBe(anotherMockAlgorithm);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent algorithms', () => {
      expect(algorithms.get('non-existent')).toBeUndefined();
    });

    it('should return the correct algorithm', () => {
      algorithms.register(mockAlgorithm);
      expect(algorithms.get('test-algorithm')).toBe(mockAlgorithm);
    });

    it('should be case-sensitive', () => {
      algorithms.register(mockAlgorithm);
      expect(algorithms.get('Test-Algorithm')).toBeUndefined();
      expect(algorithms.get('test-algorithm')).toBe(mockAlgorithm);
    });
  });

  describe('list', () => {
    it('should return array of algorithm names', () => {
      algorithms.register(mockAlgorithm);
      algorithms.register(anotherMockAlgorithm);
      
      const names = algorithms.list();
      expect(names).toContain('test-algorithm');
      expect(names).toContain('another-test');
      expect(names.length).toBeGreaterThanOrEqual(2); // At least our mocks, possibly built-ins too
    });

    it('should return names in consistent order', () => {
      algorithms.register(mockAlgorithm);
      algorithms.register(anotherMockAlgorithm);
      
      const names1 = algorithms.list();
      const names2 = algorithms.list();
      expect(names1).toEqual(names2);
    });

    it('should return empty array when no algorithms registered', () => {
      algorithms.clear(); // Clear for this specific test - run last to avoid affecting other tests
      expect(algorithms.list()).toEqual([]);
    });
  });

  describe('algorithm interface validation', () => {
    it('should work with algorithms that validate inputs', () => {
      const validatingAlgorithm: DitherAlgorithm = {
        name: 'validator',
        apply: (data, palette, step) => {
          if (palette.length === 0) {
            throw new Error('Palette cannot be empty');
          }
          if (step < 1) {
            throw new Error('Step must be >= 1');
          }
          return data;
        }
      };

      algorithms.register(validatingAlgorithm);
      
      // Create minimal mock ImageData for testing
      const mockImageData = {
        width: 2,
        height: 2,
        data: new Uint8ClampedArray(16) // 2x2x4 channels
      } as ImageData;
      
      const testPalette = [[0, 0, 0], [255, 255, 255]] as const;
      
      // Should work with valid inputs
      expect(() => {
        validatingAlgorithm.apply(mockImageData, testPalette, 1);
      }).not.toThrow();
      
      // Should throw with invalid inputs
      expect(() => {
        validatingAlgorithm.apply(mockImageData, [], 1);
      }).toThrow('Palette cannot be empty');
      
      expect(() => {
        validatingAlgorithm.apply(mockImageData, testPalette, 0);
      }).toThrow('Step must be >= 1');
    });
  });

  // Note: Built-in algorithm tests are skipped in unit tests due to module loading complexity
  // They are tested in integration tests and verified to work in the build output
});