import { resizeArea, resizeNearest } from './resample.js';
import { validateImageDimensions } from './imageData.js';
export { createImageDataCrossPlatform, validateImageDimensions } from './imageData.js';
import { loadNodeImage } from './nodeIO.js';
import type { InputImageSource, ResampleMethod } from './types.js';
import { validatePixels, validatePositiveInteger } from './validation.js';

/** True for browsers and workers, false in Node (which also provides Blob/File). */
function isBrowserRuntime(): boolean {
  return typeof process === 'undefined' || !process.versions?.node;
}

function isPixelSource(input: InputImageSource): input is ImageData {
  return Boolean(
    input && typeof input === 'object' && 'data' in input && 'width' in input && 'height' in input
  );
}

export async function loadImageData(input: InputImageSource): Promise<ImageData> {
  if (isPixelSource(input)) {
    validatePixels(input as ImageData);
    return input as ImageData;
  }
  if (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement) {
    await waitForImage(input);
    return readBrowserImage(input, input.naturalWidth, input.naturalHeight);
  }
  if (!isBrowserRuntime()) return loadNodeImage(input);
  if (typeof input === 'string') return loadBrowserUrl(input);
  let blob: Blob;
  if (typeof Blob !== 'undefined' && input instanceof Blob) blob = input;
  else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    blob = new Blob([new Uint8Array(input instanceof ArrayBuffer ? input : input.slice())]);
  } else throw new Error('Unsupported input image source type');
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    try {
      return readBrowserImage(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await waitForImage(image);
    return readBrowserImage(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadBrowserUrl(url: string): Promise<ImageData> {
  if (typeof Image === 'undefined') {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load image: HTTP ${response.status}`);
    return loadImageData(await response.blob());
  }
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await waitForImage(image);
  return readBrowserImage(image, image.naturalWidth, image.naturalHeight);
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error('Image could not be decoded'));
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Image could not be decoded'));
    };
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
  });
}

function readBrowserImage(image: CanvasImageSource, width: number, height: number): ImageData {
  validateImageDimensions(width, height);
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) throw new Error('Failed to get 2d context from canvas');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, width, height);
}

export interface ResizeOptions {
  resample?: ResampleMethod;
  width?: number;
  height?: number;
  /** contain fits within both bounds; cover fills both bounds without cropping. */
  fit?: 'contain' | 'cover';
}

export function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ResizeOptions
): { width: number; height: number } {
  validatePositiveInteger(originalWidth, 'Original width');
  validatePositiveInteger(originalHeight, 'Original height');
  if (options.width !== undefined) validatePositiveInteger(options.width, 'Width');
  if (options.height !== undefined) validatePositiveInteger(options.height, 'Height');
  if (options.fit !== undefined && options.fit !== 'contain' && options.fit !== 'cover')
    throw new Error('Invalid resize fit');
  let scale = 1;
  if (options.width !== undefined && options.height !== undefined) {
    const scales = [options.width / originalWidth, options.height / originalHeight];
    scale = options.fit === 'cover' ? Math.max(...scales) : Math.min(...scales);
  } else if (options.width !== undefined) scale = options.width / originalWidth;
  else if (options.height !== undefined) scale = options.height / originalHeight;
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  validateImageDimensions(width, height);
  return { width, height };
}

/** Shared deterministic resizing in Node, browsers and workers. Defaults to nearest. */
export async function resizeImageData(
  imageData: ImageData,
  options: ResizeOptions
): Promise<ImageData> {
  validatePixels(imageData);
  const method = options.resample ?? 'nearest';
  if (method !== 'nearest' && method !== 'area')
    throw new Error('Resample must be nearest or area');
  const { width, height } = calculateResizeDimensions(imageData.width, imageData.height, options);
  if (width === imageData.width && height === imageData.height) return imageData;
  return method === 'area'
    ? resizeArea(imageData, width, height)
    : resizeNearest(imageData, width, height);
}
