import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Browser-like environment for testing Canvas API, ImageBitmap, etc.
    environment: 'jsdom',
    globals: true,
    
    // Test file patterns - focus on browser-specific tests
    include: [
      'src/browser/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/browser/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'examples',
      'src/node/**', // Exclude Node-specific tests
      'tests/node/**'
    ],

    // Setup files for browser environment
    setupFiles: ['./tests/setup/browser.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'tests/fixtures/**',
        'tests/setup/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/node/**' // Exclude Node-specific code from browser coverage
      ]
    },

    // Browser tests might need more time for Canvas operations
    testTimeout: 15000,
  },
  
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});