# ditherto

**Pixelate your life by dithering your images to fixed colour palettes**

A fast, cross-platform TypeScript library for applying classic dithering algorithms to images. Transform photos into retro pixel art with Floyd-Steinberg, Atkinson, or ordered dithering.

## Features

- 🎨 **Multiple dithering algorithms**: Atkinson, Floyd-Steinberg, Ordered (Bayer)
- 🎯 **Custom palettes**: Use any color palette or extract from reference images
- 📱 **Cross-platform**: Works in browsers and Node.js
- ⚡ **Fast & efficient**: Optimized algorithms with chunky pixel support
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🎮 **Retro palettes**: Built-in GameBoy, CGA, and grayscale palettes

## Installation

```bash
npm install ditherto
```

## Quick Start

### Browser

```javascript
import { ditherImage } from 'ditherto';

// Dither an image element with GameBoy palette
const img = document.querySelector('img');
const result = await ditherImage(img, {
  algorithm: 'atkinson',
  palette: [
    [15, 56, 15],    // Dark green
    [48, 98, 48],    // Medium green  
    [139, 172, 15],  // Light green
    [155, 188, 15]   // Lightest green
  ]
});

// Result is ImageData, ready for canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = result.width;
canvas.height = result.height;
ctx.putImageData(result, 0, 0);
```

### Node.js

```javascript
import { ditherImage } from 'ditherto';

// Dither from file path
const result = await ditherImage('./photo.jpg', {
  algorithm: 'floyd-steinberg',
  palette: [[0,0,0], [255,255,255]], // Black & white
  width: 320,  // Resize to 320px wide
  step: 2      // 2x2 chunky pixels
});

// Result is Uint8Array (RGB data)
console.log(`Dithered to ${result.length / 3} pixels`);
```

## API Reference

### `ditherImage(input, options)`

Transform an image using dithering algorithms.

**Parameters:**
- `input`: Image source (file path, HTMLImageElement, Blob, File, ArrayBuffer, or ImageData)
- `options`: Dithering configuration

**Options:**
```typescript
interface DitherOptions {
  algorithm?: 'atkinson' | 'floyd-steinberg' | 'ordered';
  palette?: ColorRGB[];           // [[r,g,b], [r,g,b], ...]
  paletteImg?: InputImageSource;  // Extract palette from image
  width?: number;                 // Resize width (maintains aspect ratio)
  height?: number;                // Resize height (maintains aspect ratio)
  step?: number;                  // Pixel block size (1=normal, 2=chunky, etc.)
  quality?: number;               // Encoding quality hint (0-1)
}
```

**Returns:** `Promise<ImageData | Uint8Array>`
- Browser: Returns `ImageData` ready for canvas
- Node.js: Returns `Uint8Array` with RGB pixel data

## Examples

### Classic GameBoy Look

```javascript
import { ditherImage, PALETTES } from 'ditherto';

const gameBoyResult = await ditherImage('./photo.jpg', {
  algorithm: 'atkinson',
  palette: PALETTES.GAMEBOY,
  width: 160,  // Original GameBoy screen width
  step: 2      // Chunky pixels for authentic feel
});
```

### Extract Palette from Reference Image

```javascript
// Use colors from one image to dither another
const result = await ditherImage('./photo.jpg', {
  algorithm: 'floyd-steinberg',
  paletteImg: './color-reference.png',  // Extract palette from this
  width: 640
});
```

### Retro CGA 4-Color

```javascript
const cgaResult = await ditherImage('./photo.jpg', {
  algorithm: 'ordered',
  palette: [
    [0, 0, 0],       // Black
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [255, 255, 255]  // White
  ]
});
```

### High-Contrast Black & White

```javascript
const bwResult = await ditherImage('./photo.jpg', {
  algorithm: 'floyd-steinberg', 
  palette: [[0,0,0], [255,255,255]],
  width: 800
});
```

### Chunky Pixel Art Style

```javascript
// Create blocky pixel art effect
const pixelArt = await ditherImage('./photo.jpg', {
  algorithm: 'atkinson',
  palette: PALETTES.RGB,
  width: 64,   // Small size
  step: 4      // 4x4 pixel blocks
});
```

## Built-in Palettes

```javascript
import { PALETTES } from 'ditherto';

PALETTES.BW          // Black & white
PALETTES.GAMEBOY     // Classic GameBoy green
PALETTES.RGB         // Basic RGB primaries  
PALETTES.GRAYSCALE_16 // 16-level grayscale
PALETTES.CGA_4       // CGA 4-color palette
```

## Algorithms

### Atkinson Dithering
- **Best for**: Art, illustrations, GameBoy-style graphics
- **Characteristics**: Preserves detail, creates distinct patterns
- **Invented by**: Bill Atkinson (Apple)

### Floyd-Steinberg Dithering  
- **Best for**: Photographs, natural images
- **Characteristics**: Smooth gradients, minimal artifacts
- **Most common**: Standard error diffusion algorithm

### Ordered (Bayer) Dithering
- **Best for**: Fast processing, consistent patterns
- **Characteristics**: Regular texture, no error accumulation
- **Good for**: Real-time applications

## Advanced Usage

### Custom Palette Generation

```javascript
import { generatePalette } from 'ditherto';

// Extract unique colors from an image
const palette = await generatePalette('./reference-colors.png');
console.log(`Found ${palette.length} unique colors`);

// Use extracted palette for dithering
const result = await ditherImage('./photo.jpg', {
  algorithm: 'atkinson',
  palette: palette.slice(0, 8)  // Use first 8 colors
});
```

### Batch Processing (Node.js)

```javascript
import { ditherImage } from 'ditherto';
import { readdir, writeFile } from 'fs/promises';

const files = await readdir('./images');

for (const file of files) {
  if (file.endsWith('.jpg')) {
    const result = await ditherImage(`./images/${file}`, {
      algorithm: 'floyd-steinberg',
      palette: PALETTES.GAMEBOY,
      width: 320
    });
    
    await writeFile(`./output/${file}.rgb`, result);
  }
}
```

## Performance Tips

- **Use `step > 1`** for faster processing and pixel art effects
- **Resize images** before dithering for better performance
- **Limit palette size** to 2-16 colors for best results
- **Ordered dithering** is fastest for real-time applications

## Browser Support

- ✅ Modern browsers with Canvas API support
- ✅ Web Workers and Service Workers  
- ✅ Node.js 16+ with optional `canvas` package for file loading

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

---

Transform your images into beautiful retro pixel art with **ditherto**! 🎨✨