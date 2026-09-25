import type { InputImageSource } from './types.js';
import { createImageDataCrossPlatform, validateImageDimensions } from './imageData.js';

export async function loadNodeImage(input: InputImageSource): Promise<ImageData> {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    if (/^https?:\/\//i.test(input)) {
      const response = await fetch(input);
      if (!response.ok) throw new Error(`Failed to load image: HTTP ${response.status}`);
      bytes = new Uint8Array(await response.arrayBuffer());
    } else {
      const { readFile } = await import('node:fs/promises');
      bytes = await readFile(input);
    }
  } else if (input instanceof Uint8Array) bytes = input;
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else if (typeof Blob !== 'undefined' && input instanceof Blob)
    bytes = new Uint8Array(await input.arrayBuffer());
  else throw new Error('Unsupported input image source type');
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const image = await loadImage(Buffer.from(bytes));
  validateImageDimensions(image.width, image.height);
  const context = createCanvas(image.width, image.height).getContext('2d');
  context.drawImage(image, 0, 0);
  const result = context.getImageData(0, 0, image.width, image.height);
  return createImageDataCrossPlatform(
    new Uint8ClampedArray(result.data),
    image.width,
    image.height
  );
}
