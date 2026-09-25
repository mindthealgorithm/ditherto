import { createImageDataCrossPlatform } from './imageData.js';

/** Pixel-center nearest neighbour, preserving exact colors when enlarging pixel art. */
export function resizeNearest(image: ImageData, width: number, height: number): ImageData {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(image.height - 1, Math.floor(((y + 0.5) * image.height) / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.floor(((x + 0.5) * image.width) / width));
      const source = (sy * image.width + sx) * 4;
      const target = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) output[target + c] = image.data[source + c]!;
    }
  }
  return createImageDataCrossPlatform(output, width, height);
}

/**
 * Exact box-area integration in encoded sRGB with premultiplied alpha.
 * Footprint coordinates are integers scaled by the destination dimensions;
 * every output pixel has weight sourceWidth × sourceHeight. This avoids
 * fractional boundary drift and intermediate rounding across runtimes.
 * No full-frame floating-point scratch buffer is needed.
 */
export function resizeArea(image: ImageData, width: number, height: number): ImageData {
  if (width >= image.width && height >= image.height) return resizeNearest(image, width, height);
  const output = new Uint8ClampedArray(width * height * 4);
  const area = image.width * image.height;
  for (let y = 0; y < height; y++) {
    const top = y * image.height;
    const bottom = (y + 1) * image.height;
    for (let x = 0; x < width; x++) {
      const left = x * image.width;
      const right = (x + 1) * image.width;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let sy = Math.floor(top / height); sy < Math.ceil(bottom / height); sy++) {
        const wy = Math.min(bottom, (sy + 1) * height) - Math.max(top, sy * height);
        for (let sx = Math.floor(left / width); sx < Math.ceil(right / width); sx++) {
          const wx = Math.min(right, (sx + 1) * width) - Math.max(left, sx * width);
          const i = (sy * image.width + sx) * 4;
          const weight = wx * wy * image.data[i + 3]!;
          alpha += weight;
          red += image.data[i]! * weight;
          green += image.data[i + 1]! * weight;
          blue += image.data[i + 2]! * weight;
        }
      }
      const target = (y * width + x) * 4;
      output[target + 3] = Math.round(alpha / area);
      if (output[target + 3] !== 0) {
        output[target] = Math.round(red / alpha);
        output[target + 1] = Math.round(green / alpha);
        output[target + 2] = Math.round(blue / alpha);
      }
    }
  }
  return createImageDataCrossPlatform(output, width, height);
}
