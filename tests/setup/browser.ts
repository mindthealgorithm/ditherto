// Browser environment setup for Vitest
// This file sets up DOM APIs and Canvas mocks for testing

import { vi } from 'vitest';

// Mock Canvas API for browser tests
// This provides basic Canvas/ImageData interfaces that the library expects
global.HTMLCanvasElement = class HTMLCanvasElement {
  width = 0;
  height = 0;
  
  getContext(contextId: string) {
    if (contextId === '2d') {
      return {
        createImageData: (width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: vi.fn(),
        getImageData: vi.fn(),
        drawImage: vi.fn(),
      };
    }
    return null;
  }
} as any;

// Mock ImageBitmap for modern Canvas API
global.ImageBitmap = class ImageBitmap {
  width = 0;
  height = 0;
} as any;

global.createImageBitmap = vi.fn();

// Mock URL.createObjectURL for Blob handling
global.URL = {
  ...global.URL,
  createObjectURL: vi.fn(() => 'mock-object-url'),
  revokeObjectURL: vi.fn(),
};