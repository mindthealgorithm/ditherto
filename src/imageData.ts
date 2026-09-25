export function validateImageDimensions(width: number, height: number): void {
  if (width <= 0 || height <= 0) throw new Error(`Invalid image dimensions: ${width}x${height}`);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height))
    throw new Error(`Image dimensions must be integers: ${width}x${height}`);
  if (width > 8192 || height > 8192 || width * height > 16_777_216) {
    throw new Error(
      `Image dimensions too large: ${width}x${height} (max 8192 per side, 16 megapixels)`
    );
  }
}

/** A native ImageData in browsers; an equivalent RGBA record in Node. */
export function createImageDataCrossPlatform(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ImageData {
  if (typeof ImageData !== 'undefined')
    return new ImageData(
      data.buffer instanceof ArrayBuffer
        ? (data as Uint8ClampedArray<ArrayBuffer>)
        : new Uint8ClampedArray(data),
      width,
      height
    );
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}
