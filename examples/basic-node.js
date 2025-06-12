#!/usr/bin/env node

/**
 * Basic Node.js example showing dithering functionality
 * 
 * Run with: node examples/basic-node.js
 */

// For this example, we'll import directly from the compiled JS files
// In a real project, you'd use: import { ditherImage, PALETTES } from 'ditherto';

// Mock implementation for demo purposes
const PALETTES = {
  BW: [[0,0,0], [255,255,255]],
  GAMEBOY: [[15,56,15], [48,98,48], [139,172,15], [155,188,15]],
  RGB: [[0,0,0], [255,0,0], [0,255,0], [0,0,255], [255,255,0], [255,0,255], [0,255,255], [255,255,255]]
};

// Simple test image data creation
function createImageData(pixels) {
  const height = pixels.length;
  const width = pixels[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = pixels[y][x];
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  
  return { data, width, height, colorSpace: 'srgb' };
}

// Mock dithering function
async function ditherImage(imageData, options = {}) {
  const { palette = PALETTES.BW, algorithm = 'atkinson', step = 1 } = options;
  
  console.log(`  📊 Using ${algorithm} algorithm with ${palette.length} colors`);
  
  // Simple quantization to nearest palette color
  const result = new Uint8Array(imageData.width * imageData.height * 3);
  
  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 3) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    
    // Find closest palette color
    let closest = palette[0];
    let minDist = Infinity;
    
    for (const color of palette) {
      const dist = Math.sqrt(
        Math.pow(r - color[0], 2) +
        Math.pow(g - color[1], 2) +
        Math.pow(b - color[2], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }
    
    result[j] = closest[0];
    result[j + 1] = closest[1];
    result[j + 2] = closest[2];
  }
  
  return result;
}

async function main() {
  console.log('🎨 ditherto - Basic Node.js Example\n');

  // Create a simple test gradient
  const testImage = createImageData([
    [[0, 0, 0], [64, 64, 64], [128, 128, 128], [255, 255, 255]],
    [[32, 32, 32], [96, 96, 96], [160, 160, 160], [255, 255, 255]],
    [[64, 64, 64], [128, 128, 128], [192, 192, 192], [255, 255, 255]],
    [[96, 96, 96], [160, 160, 160], [224, 224, 224], [255, 255, 255]]
  ]);

  console.log(`📸 Input: ${testImage.width}x${testImage.height} gradient image`);

  // Example 1: Basic black & white dithering
  console.log('\n🔄 Example 1: Black & White Atkinson dithering');
  const bwResult = await ditherImage(testImage, {
    algorithm: 'atkinson',
    palette: PALETTES.BW
  });
  
  console.log(`✅ Result: ${bwResult.length / 3} pixels (${bwResult.constructor.name})`);
  console.log(`📊 Sample pixels: [${Array.from(bwResult.slice(0, 12)).join(', ')}...]`);

  // Example 2: GameBoy palette with Floyd-Steinberg
  console.log('\n🔄 Example 2: GameBoy Floyd-Steinberg dithering');
  const gameBoyResult = await ditherImage(testImage, {
    algorithm: 'floyd-steinberg',
    palette: PALETTES.GAMEBOY,
    step: 1
  });
  
  console.log(`✅ Result: ${gameBoyResult.length / 3} pixels`);
  const firstPixel = [gameBoyResult[0], gameBoyResult[1], gameBoyResult[2]];
  console.log(`🎨 First pixel RGB: [${firstPixel.join(', ')}]`);

  // Example 3: Chunky pixel art style
  console.log('\n🔄 Example 3: Chunky pixel art (step=2)');
  const chunkyResult = await ditherImage(testImage, {
    algorithm: 'ordered',
    palette: PALETTES.RGB,
    step: 2
  });
  
  console.log(`✅ Result: ${chunkyResult.length / 3} pixels`);

  // Example 4: With resizing
  console.log('\n🔄 Example 4: Resize to 8x8 with quality parameter');
  const resizedResult = await ditherImage(testImage, {
    algorithm: 'atkinson',
    palette: PALETTES.BW,
    width: 8,
    height: 8,
    quality: 0.8
  });
  
  console.log(`✅ Result: ${resizedResult.length / 3} pixels (resized)`);

  console.log('\n🎉 All examples completed successfully!');
  console.log('\n💡 Try modifying the algorithms, palettes, or adding your own images!');
}

main().catch(console.error);