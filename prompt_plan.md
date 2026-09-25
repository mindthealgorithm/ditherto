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
- [x] **Test & implement CLI argument parsing**
  - Write tests for command-line flag parsing
  - Test flag validation and error handling
  - Test help text generation
  - Implement CLI argument processing

- [x] **Test & implement CLI file operations**
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

## Audit implementation update (2026-09)

See [DESIGN_AUDIT.md](DESIGN_AUDIT.md) for the detailed findings and next decisions.

- [x] Correct deterministic Bayer dithering and float-precision diffusion; add independent reference tests.
- [x] Preserve alpha and validate finite dimensions, step, palette channels and image buffers.
- [x] Add a consistent RGBA result API, separate PNG encoding and fix Node binary inputs.
- [x] Replace browser helper no-op tests with exercised DOM behavior and real Chromium checks.
- [x] Wire existing BW golden PNGs and verify browser/Node parity after resizing.
- [x] Add a reproducible processing benchmark and bounded palette extraction.
- [x] Replace the mock demo with the actual library, worker processing and responsive rerendering from the original.
- [x] Repair build exit, browser dependency isolation, CLI invocation and lockfile-based CI.
- [x] Real photographic corpus, independent area-downsampling references, JPEG/WebP/EXIF/sRGB fixtures and Firefox/WebKit coverage.
- [x] Explicit photo resampling across API/CLI/DOM/demo; controls wait during photo loading.
- [x] Photo palettes with chosen color counts and separate reference uploads; exposure/contrast controls with reset.
- [x] Review ditherjs feature coverage and record selective algorithm recommendations.
- [ ] Wide-gamut/CMYK and real-device color-management coverage.
- [ ] Decode-time resource controls, configurable limits and exhaustive memory profiling.

The broader unfinished Phase 7/8 items above are retained where those remaining tasks still apply.

### Responsive selector integration

- [x] Add optional `ditherto/dom` entry with shared defaults and independent image handles.
- [x] Retain original nodes/pixels, rerender on parent width changes, and restore on disposal.
- [x] Serialize/coalesce work, reject stale results, and isolate failed/unloaded images.
- [x] Add shared-worker photographic gallery with per-image exposure and resize controls.
- [x] Exercise lifecycle and pixel accuracy in Chromium, Firefox and WebKit; check optional entry declarations and bundle size.
