# Browser Test Fixtures

This directory contains HTML and image fixtures for testing browser-specific functionality.

## Files

- `test.html` - HTML document with various image configurations for testing autoDitherDOM
- Test images would be added here for integration testing

## Test Scenarios Covered

1. **Basic dithering** - Simple image with `ditherto` class
2. **Algorithm selection** - Image with `data-algorithm` attribute
3. **Size constraints** - Image with `data-width` and `data-height`
4. **Complex configuration** - Image with all possible data attributes
5. **Palette extraction** - Image with `data-palette-img` for palette source
6. **Custom selectors** - Image with different class for custom selector testing
7. **Invalid attributes** - Image with malformed data attributes
8. **Nested elements** - Image within complex DOM structure

## Usage

These fixtures are referenced by the browser tests to ensure proper DOM manipulation and attribute parsing.