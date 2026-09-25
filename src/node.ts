import type { Buffer } from 'node:buffer';
import { createCanvas } from '@napi-rs/canvas';
import { validatePixels } from './validation.js';

/** Encode RGBA pixels as a real PNG, retaining transparency. Node-only entry point. */
export function encodePng(image: ImageData): Buffer {
  validatePixels(image);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  const native = context.createImageData(image.width, image.height);
  native.data.set(image.data);
  context.putImageData(native, 0, 0);
  return canvas.toBuffer('image/png');
}
