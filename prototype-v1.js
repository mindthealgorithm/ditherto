import { readFile, writeFile } from 'fs/promises';
import { createCanvas, loadImage } from 'canvas';

// Extract unique colors from a PNG palette file
async function loadPaletteFromPNG(palettePath) {
  console.log(`🎨 Loading palette from ${palettePath}...`);
  
  try {
    const paletteImage = await loadImage(palettePath);
    const canvas = createCanvas(paletteImage.width, paletteImage.height);
    const ctx = canvas.getContext('2d');
    
    // Draw palette image to canvas
    ctx.drawImage(paletteImage, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, paletteImage.width, paletteImage.height);
    const data = imageData.data;
    
    // Extract unique colors
    const colorSet = new Set();
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip fully transparent pixels
      if (a === 0) continue;
      
      // Create a unique string for the color
      const colorKey = `${r},${g},${b}`;
      colorSet.add(colorKey);
    }
    
    // Convert Set to array of RGB arrays
    const palette = Array.from(colorSet).map(colorKey => {
      const [r, g, b] = colorKey.split(',').map(Number);
      return [r, g, b];
    });
    
    console.log(`✅ Extracted ${palette.length} unique colors from palette`);
    
    // Log first few colors for verification
    if (palette.length > 0) {
      console.log('🔍 First few palette colors:');
      palette.slice(0, Math.min(8, palette.length)).forEach((color, index) => {
        console.log(`   ${index + 1}. RGB(${color[0]}, ${color[1]}, ${color[2]})`);
      });
      if (palette.length > 8) {
        console.log(`   ... and ${palette.length - 8} more colors`);
      }
    }
    
    return palette;
    
  } catch (error) {
    console.error(`❌ Error loading palette from ${palettePath}:`, error.message);
    throw error;
  }
}

// Atkinson dithering implementation with pixel step support
function atkinsonDither(imageData, palette, step = 1) {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  // Process pixels in step x step blocks
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // Calculate average color for the step x step block
      let totalR = 0, totalG = 0, totalB = 0;
      let pixelCount = 0;
      
      // Sample all pixels in the current block
      for (let blockY = y; blockY < Math.min(y + step, height); blockY++) {
        for (let blockX = x; blockX < Math.min(x + step, width); blockX++) {
          const idx = (blockY * width + blockX) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          pixelCount++;
        }
      }
      
      // Calculate average color for the block
      const avgR = Math.round(totalR / pixelCount);
      const avgG = Math.round(totalG / pixelCount);
      const avgB = Math.round(totalB / pixelCount);
      
      // Find closest color in palette
      const closest = findClosestColor([avgR, avgG, avgB], palette);
      
      // Apply the closest color to all pixels in the block
      for (let blockY = y; blockY < Math.min(y + step, height); blockY++) {
        for (let blockX = x; blockX < Math.min(x + step, width); blockX++) {
          const idx = (blockY * width + blockX) * 4;
          
          // Calculate error for dithering (from original pixel, not average)
          const oldR = data[idx];
          const oldG = data[idx + 1];
          const oldB = data[idx + 2];
          
          // Set new pixel color
          data[idx] = closest[0];
          data[idx + 1] = closest[1];
          data[idx + 2] = closest[2];
          
          // Calculate error from original values
          const errR = oldR - closest[0];
          const errG = oldG - closest[1];
          const errB = oldB - closest[2];
          
          // Distribute error using Atkinson dithering pattern
          const errorDistribution = [
            { x: blockX + 1, y: blockY, weight: 1/8 },
            { x: blockX + 2, y: blockY, weight: 1/8 },
            { x: blockX - 1, y: blockY + 1, weight: 1/8 },
            { x: blockX, y: blockY + 1, weight: 1/8 },
            { x: blockX + 1, y: blockY + 1, weight: 1/8 },
            { x: blockX, y: blockY + 2, weight: 1/8 }
          ];
          
          errorDistribution.forEach(({ x: px, y: py, weight }) => {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const pidx = (py * width + px) * 4;
              data[pidx] = Math.max(0, Math.min(255, data[pidx] + errR * weight));
              data[pidx + 1] = Math.max(0, Math.min(255, data[pidx + 1] + errG * weight));
              data[pidx + 2] = Math.max(0, Math.min(255, data[pidx + 2] + errB * weight));
            }
          });
        }
      }
    }
  }
  
  return { data, width, height };
}

// Floyd-Steinberg (diffusion) dithering implementation with pixel step support
function floydSteinbergDither(imageData, palette, step = 1) {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  // Process pixels in step x step blocks
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // Calculate average color for the step x step block
      let totalR = 0, totalG = 0, totalB = 0;
      let pixelCount = 0;
      
      // Sample all pixels in the current block
      for (let blockY = y; blockY < Math.min(y + step, height); blockY++) {
        for (let blockX = x; blockX < Math.min(x + step, width); blockX++) {
          const idx = (blockY * width + blockX) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          pixelCount++;
        }
      }
      
      // Calculate average color for the block
      const avgR = Math.round(totalR / pixelCount);
      const avgG = Math.round(totalG / pixelCount);
      const avgB = Math.round(totalB / pixelCount);
      
      // Find closest color in palette
      const closest = findClosestColor([avgR, avgG, avgB], palette);
      
      // Apply the closest color to all pixels in the block
      for (let blockY = y; blockY < Math.min(y + step, height); blockY++) {
        for (let blockX = x; blockX < Math.min(x + step, width); blockX++) {
          const idx = (blockY * width + blockX) * 4;
          
          // Calculate error for dithering (from original pixel, not average)
          const oldR = data[idx];
          const oldG = data[idx + 1];
          const oldB = data[idx + 2];
          
          // Set new pixel color
          data[idx] = closest[0];
          data[idx + 1] = closest[1];
          data[idx + 2] = closest[2];
          
          // Calculate error from original values
          const errR = oldR - closest[0];
          const errG = oldG - closest[1];
          const errB = oldB - closest[2];
          
          // Distribute error using Floyd-Steinberg pattern
          const errorDistribution = [
            { x: blockX + 1, y: blockY, weight: 7/16 },
            { x: blockX - 1, y: blockY + 1, weight: 3/16 },
            { x: blockX, y: blockY + 1, weight: 5/16 },
            { x: blockX + 1, y: blockY + 1, weight: 1/16 }
          ];
          
          errorDistribution.forEach(({ x: px, y: py, weight }) => {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const pidx = (py * width + px) * 4;
              data[pidx] = Math.max(0, Math.min(255, data[pidx] + errR * weight));
              data[pidx + 1] = Math.max(0, Math.min(255, data[pidx + 1] + errG * weight));
              data[pidx + 2] = Math.max(0, Math.min(255, data[pidx + 2] + errB * weight));
            }
          });
        }
      }
    }
  }
  
  return { data, width, height };
}

// Ordered (Bayer matrix) dithering implementation with pixel step support
function orderedDither(imageData, palette, step = 1) {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  // 4x4 Bayer matrix
  const bayerMatrix = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];
  
  const matrixSize = 4;
  const threshold = 16; // Maximum value in matrix + 1
  
  // Process pixels in step x step blocks
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // Calculate average color for the step x step block
      let totalR = 0, totalG = 0, totalB = 0;
      let pixelCount = 0;
      
      // Sample all pixels in the current block
      for (let blockY = y; blockY < Math.min(y + step, height); blockY++) {
        for (let blockX = x; blockX < Math.min(x + step, width); blockX++) {
          const idx = (blockY * width + blockX) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          pixelCount++;
        }
      }
      
      // Calculate average color for the block
      const avgR = Math.round(totalR / pixelCount);
      const avgG = Math.round(totalG / pixelCount);
      const avgB = Math.round(totalB / pixelCount);
      
      // Get threshold from Bayer matrix (using block position)
      const matrixValue = bayerMatrix[y % matrixSize][x % matrixSize];
      const bayerThreshold = (matrixValue / threshold - 0.5) * 255 / palette.length;
      
      // Apply threshold to each channel
      const adjustedR = Math.max(0, Math.min(255, avgR + bayerThreshold));
      const adjustedG = Math.max(0, Math.min(255, avgG + bayerThreshold));
      const adjustedB = Math.max(0, Math.min(255, avgB + bayerThreshold));
      
      // Find closest color in palette
      const closest = findClosestColor([adjustedR, adjustedG, adjustedB], palette);
      
      // Apply the closest color to all pixels in the block
      for (let blockY = y; blockY < Math.min(y + step, height); blockY++) {
        for (let blockX = x; blockX < Math.min(x + step, width); blockX++) {
          const idx = (blockY * width + blockX) * 4;
          data[idx] = closest[0];
          data[idx + 1] = closest[1];
          data[idx + 2] = closest[2];
        }
      }
    }
  }
  
  return { data, width, height };
}

// Find closest color in palette using Euclidean distance
function findClosestColor(color, palette) {
  let minDistance = Infinity;
  let closest = palette[0];
  
  for (const paletteColor of palette) {
    const distance = Math.sqrt(
      Math.pow(color[0] - paletteColor[0], 2) +
      Math.pow(color[1] - paletteColor[1], 2) +
      Math.pow(color[2] - paletteColor[2], 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = paletteColor;
    }
  }
  
  return closest;
}

// Apply dithering algorithm
function applyDithering(algorithm, imageData, palette, step = 1) {
  switch (algorithm) {
    case 'atkinson':
      return atkinsonDither(imageData, palette, step);
    case 'diffusion':
    case 'floyd-steinberg':
      return floydSteinbergDither(imageData, palette, step);
    case 'ordered':
    case 'bayer':
      return orderedDither(imageData, palette, step);
    default:
      throw new Error(`Unknown dithering algorithm: ${algorithm}`);
  }
}

async function ditherImage() {
  try {
    // Configuration - step controls pixel block size (like DitherJS)
    // Can be set via environment variable: STEP=4 node v36.js
    const step = parseInt(process.env.STEP) || 1; // 1 = per-pixel, 2+ = process in NxN pixel blocks
    
    // Try to load palette from PNG file, fallback to default palette
    let customPalette;
    const palettePath = process.env.PALETTE || 'palette.png';
    
    try {
      customPalette = await loadPaletteFromPNG(palettePath);
    } catch (error) {
      console.log(`⚠️  Could not load palette from ${palettePath}, using default palette`);
      console.log(`💡 To use a custom palette: PALETTE=your_palette.png node v36.js`);
      
      // Fallback to default palette
      customPalette = [
        [0, 0, 0],       // Black
        [255, 255, 255], // White
        [255, 0, 0],     // Red
        [0, 255, 0],     // Green
        [0, 0, 255],     // Blue
        [255, 255, 0],   // Yellow
        [255, 0, 255],   // Magenta
        [0, 255, 255],   // Cyan
      ];
    }

    // Dithering algorithms to apply
    const algorithms = [
      { name: 'atkinson', description: 'Atkinson (classic Mac)' },
      { name: 'diffusion', description: 'Floyd-Steinberg (diffusion)' },
      { name: 'ordered', description: 'Ordered (Bayer matrix)' }
    ];

    console.log('\n📖 Loading image...');
    
    // Load image using node-canvas
    const image = await loadImage('input.jpg');
    console.log(`📏 Image size: ${image.width}x${image.height}`);
    console.log(`🎨 Palette colors: ${customPalette.length}`);
    console.log(`⚙️  Pixel step size: ${step}x${step} ${step === 1 ? '(per-pixel processing)' : '(chunky pixel blocks)'}`);
    
    // Process each algorithm
    for (const algorithm of algorithms) {
      console.log(`\n🔄 Processing ${algorithm.description}...`);
      
      // Create fresh canvas for each algorithm
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      
      // Draw original image to canvas
      ctx.drawImage(image, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      
      // Apply dithering
      const ditheredResult = applyDithering(algorithm.name, imageData, customPalette, step);
      
      // Create new ImageData from the result
      const newImageData = ctx.createImageData(ditheredResult.width, ditheredResult.height);
      newImageData.data.set(ditheredResult.data);
      
      // Put dithered data back on canvas
      ctx.putImageData(newImageData, 0, 0);
      
      // Save the result with algorithm name and step size
      const filename = `output_${algorithm.name}_step${step}.png`;
      const outputBuffer = canvas.toBuffer('image/png');
      await writeFile(filename, outputBuffer);
      
      console.log(`✅ Saved ${filename}`);
    }
    
    console.log('\n🎉 All dithering algorithms complete!');
    console.log('📁 Generated files:');
    console.log(`   • output_atkinson_step${step}.png - Classic Mac-style dithering`);
    console.log(`   • output_diffusion_step${step}.png - Floyd-Steinberg error diffusion`);
    console.log(`   • output_ordered_step${step}.png - Bayer matrix ordered dithering`);
    console.log('\n💡 Usage options:');
    console.log('   • Default: node v36.js');
    console.log('   • Custom palette: PALETTE=your_palette.png node v36.js');
    console.log('   • Custom step size: STEP=4 node v36.js');
    console.log('   • Both: PALETTE=my_palette.png STEP=2 node v36.js');
    console.log('\n🎨 Pixel step sizes:');
    console.log('   • step = 1: Per-pixel processing (finest detail)');
    console.log('   • step = 2: 2x2 pixel blocks (slightly chunky)');
    console.log('   • step = 4: 4x4 pixel blocks (retro game style)');
    console.log('   • step = 8: 8x8 pixel blocks (very chunky, pixel art)');
    console.log('   • step = 16: 16x16 pixel blocks (extremely blocky)'); 
    
  } catch (error) {
    console.error('❌ Error processing image:', error.message);
    console.error('💡 Make sure you have:');
    console.error('   1. "input.jpg" file in the same directory');
    console.error('   2. Installed canvas: npm install canvas');
    console.error('   3. Added "type": "module" to package.json');
    console.error('   4. Optional: "palette.png" file for custom palette');
  }
}

// Run the script
ditherImage();
