# ditherto - Test-Driven Development Plan

This plan follows TDD principles: write tests first, implement to make tests pass, refactor.

## Phase 1: Core Infrastructure & Algorithm Registry
- [x] **Test & implement algorithm registry functionality**
  - Write tests for registering, retrieving, and listing algorithms
  - Test error handling for missing algorithms
  - Implement the registry to pass tests

- [x] **Test & implement basic dithering algorithms**
  - Write tests for Atkinson dithering algorithm on simple ImageData
  - Write tests for Floyd-Steinberg dithering algorithm
  - Write tests for ordered (Bayer) dithering algorithm
  - Implement each algorithm to pass their respective tests
  - Test algorithm registration with the registry

## Phase 2: Palette Operations
- [x] **Test & implement palette extraction**
  - Write tests for extracting colors from test PNG images
  - Test edge cases: empty images, single color, many colors
  - Create test fixtures with known color palettes
  - Implement generatePalette function for both browser/Node environments
  - Test palette deduplication and sorting

- [x] **Test & implement palette utilities**
  - Write tests for color distance calculations
  - Write tests for finding closest palette color
  - Test default palettes (black/white, gameboy, etc.)
  - Implement palette matching utilities

## Phase 3: Image I/O & Environment Detection
- [x] **Test & implement input image handling**
  - Write tests for loading various InputImageSource types
  - Test browser environment: HTMLImageElement, Blob, File
  - Test Node environment: file paths, ArrayBuffer, Uint8Array
  - Create test fixtures for different image formats
  - Implement image loading adapters for both environments

- [x] **Test & implement resize functionality**
  - Write tests for proportional resizing with width/height constraints
  - Test aspect ratio preservation
  - Test edge cases: zero dimensions, very large images
  - Implement canvas-based resizing for both environments

## Phase 4: Core Pipeline Integration
- [x] **Test & implement ditherImage pipeline**
  - Write integration tests for the full resize → dither pipeline
  - Test with different algorithm/palette combinations
  - Test step parameter for chunky pixel effects
  - Test quality parameter handling
  - Implement the orchestrating ditherImage function

- [x] **Test & implement output formatting**
  - Write tests for different output formats (ImageData, Uint8Array)
  - Test browser vs Node output differences
  - Test encoding quality parameters
  - Implement output format conversion

## Phase 5: Browser-Specific Features
- [x] **Test & implement browser helper functions**
  - Write tests for autoDitherDOM functionality
  - Test DOM manipulation and canvas replacement
  - Test data-* attribute parsing
  - Create browser test fixtures with HTML elements
  - Implement browser.ts module

## Phase 6: CLI Interface
- [ ] **Test & implement CLI argument parsing**
  - Write tests for command-line flag parsing
  - Test flag validation and error handling
  - Test help text generation
  - Implement CLI argument processing

- [ ] **Test & implement CLI file operations**
  - Write tests for batch file processing
  - Test input/output file handling
  - Test CLI error reporting
  - Implement CLI main function

## Phase 7: Advanced Features & Edge Cases
- [ ] **Test & implement error handling**
  - Write tests for various error conditions
  - Test memory limits and large image handling
  - Test invalid input handling
  - Implement comprehensive error handling

- [ ] **Test & implement performance optimizations**
  - Write performance benchmarks
  - Test memory usage patterns
  - Test processing speed with different image sizes
  - Optimize critical paths based on test results

## Phase 8: Golden Image Testing
- [ ] **Create visual regression test suite**
  - Create reference images for each algorithm
  - Test consistent output across environments
  - Test with various palette/size combinations
  - Set up golden image comparison utilities

## Test Strategy Notes
- Use Vitest for both Node and browser testing
- Create shared test fixtures for consistency
- Mock Canvas APIs where needed for deterministic tests
- Use golden image testing for visual validation
- Test memory usage and performance characteristics
- Ensure identical behavior between browser and Node environments

## Implementation Order
Each checkbox represents a complete TDD cycle:
1. Write failing tests
2. Implement minimum code to pass
3. Refactor for quality
4. Commit with descriptive message
5. Move to next item

This ensures we build a robust, well-tested library that matches the specification exactly.