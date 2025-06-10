import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in both Node and browser-like environments
    environment: 'node',
    globals: true,
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'examples'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'tests/fixtures/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/cli.ts' // CLI might need separate integration tests
      ]
    },

    // For golden image tests mentioned in spec
    testTimeout: 10000,
  },
  
  resolve: {
    alias: {
      // Allow importing from src during tests
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});