// ABOUTME: Image I/O and processing utilities for cross-environment support
// ABOUTME: Handles loading images from various sources and resizing with aspect ratio preservation

import type { InputImageSource } from './types.js';

/**
 * Load ImageData from various input sources with environment detection
 */
export async function loadImageData(input: InputImageSource): Promise<ImageData> {
  if (typeof input === 'string') {
    // File path - Node.js environment
    return loadImageDataFromPath(input);
  }
  if (input instanceof HTMLImageElement) {
    // Browser environment
    return loadImageDataFromHTMLImage(input);
  }
  if (input instanceof Blob || input instanceof File) {
    // Browser environment - convert to HTMLImageElement
    return loadImageDataFromBlob(input);
  }
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    // Convert to Blob first, then process
    const blob = new Blob([input as BlobPart]);
    return loadImageDataFromBlob(blob);
  }
  
  throw new Error('Unsupported input image source type');
}

/**
 * Load image data from file path (Node.js)
 */
async function loadImageDataFromPath(path: string): Promise<ImageData> {
  // For Node.js environment, we need to use canvas
  if (typeof window !== 'undefined') {
    throw new Error('File path loading not supported in browser environment');
  }
  
  try {
    // Dynamic import for Node.js-only dependency
    const { readFile } = await import('node:fs/promises');
    const canvasPackageName = '@napi-rs/canvas';
    const canvasModule = await import(canvasPackageName) as { createCanvas: (width: number, height: number) => HTMLCanvasElement; loadImage: (buffer: Buffer) => Promise<HTMLImageElement> };
    const { createCanvas, loadImage } = canvasModule;
    
    const imageBuffer = await readFile(path);
    const image = await loadImage(imageBuffer);
    
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context from canvas');
    }
    
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot resolve module')) {
      throw new Error('@napi-rs/canvas package required for Node.js image loading. Install with: npm install @napi-rs/canvas');
    }
    throw new Error(`Failed to load image from path: ${error}`);
  }
}

/**
 * Load image data from HTMLImageElement (Browser)
 */
function loadImageDataFromHTMLImage(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2d context from canvas');
  }

  // Use naturalWidth/naturalHeight to get actual image dimensions, not rendered size
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
}

/**
 * Load image data from Blob/File (Browser)
 */
async function loadImageDataFromBlob(blob: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return loadImageDataFromHTMLImage(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Resize options for maintaining aspect ratio
 */
export interface ResizeOptions {
  /** Maximum width (maintains aspect ratio) */
  width?: number;
  /** Maximum height (maintains aspect ratio) */
  height?: number;
  /** Fit mode: 'contain' (default) or 'cover' */
  fit?: 'contain' | 'cover';
}

/**
 * Calculate resize dimensions while preserving aspect ratio
 */
export function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ResizeOptions
): { width: number; height: number } {
  if (!options.width && !options.height) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const { width: maxWidth, height: maxHeight, fit = 'contain' } = options;
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  if (maxWidth && maxHeight) {
    if (fit === 'contain') {
      // Scale to fit within bounds
      const scaleWidth = maxWidth / originalWidth;
      const scaleHeight = maxHeight / originalHeight;
      const scale = Math.min(scaleWidth, scaleHeight);
      
      newWidth = Math.round(originalWidth * scale);
      newHeight = Math.round(originalHeight * scale);
    } else {
      // Scale to cover bounds
      const scaleWidth = maxWidth / originalWidth;
      const scaleHeight = maxHeight / originalHeight;
      const scale = Math.max(scaleWidth, scaleHeight);
      
      newWidth = Math.round(originalWidth * scale);
      newHeight = Math.round(originalHeight * scale);
    }
  } else if (maxWidth) {
    // Scale by width
    newWidth = maxWidth;
    newHeight = Math.round(maxWidth / aspectRatio);
  } else if (maxHeight) {
    // Scale by height
    newHeight = maxHeight;
    newWidth = Math.round(maxHeight * aspectRatio);
  }
  
  return { width: newWidth, height: newHeight };
}

/**
 * Resize ImageData to new dimensions
 */
export async function resizeImageData(
  imageData: ImageData,
  options: ResizeOptions
): Promise<ImageData> {
  const { width: newWidth, height: newHeight } = calculateResizeDimensions(
    imageData.width,
    imageData.height,
    options
  );

  console.log(`[resizeImageData] Original: ${imageData.width}x${imageData.height}, Target: ${newWidth}x${newHeight}`);

  // If no resize needed, return original
  if (newWidth === imageData.width && newHeight === imageData.height) {
    console.log('[resizeImageData] No resize needed');
    return imageData;
  }
  
  // Create canvas for resizing
  const canvas = typeof document !== 'undefined' 
    ? document.createElement('canvas')
    : await createNodeCanvas(imageData.width, imageData.height);
  
  if (!canvas) {
    throw new Error('Failed to create canvas for resizing');
  }
    
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context for resizing');
  }
  
  // Set original size and draw image data
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);
  
  // Create output canvas at new size
  const outputCanvas = typeof document !== 'undefined'
    ? document.createElement('canvas') 
    : await createNodeCanvas(newWidth, newHeight);
  
  if (!outputCanvas) {
    throw new Error('Failed to create output canvas');
  }
    
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) {
    throw new Error('Failed to get 2d context for output');
  }
  
  outputCanvas.width = newWidth;
  outputCanvas.height = newHeight;
  
  // Use nearest-neighbor scaling to preserve original pixel values
  outputCtx.imageSmoothingEnabled = false;
  if ('imageSmoothingQuality' in outputCtx) {
    outputCtx.imageSmoothingQuality = 'low';
  }
  
  // Draw resized image - use 9-parameter version to properly scale source to destination
  outputCtx.drawImage(
    canvas as HTMLCanvasElement,
    0, 0, imageData.width, imageData.height,  // source rectangle
    0, 0, newWidth, newHeight                 // destination rectangle
  );

  return outputCtx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Create canvas in Node.js environment
 */
async function createNodeCanvas(width: number, height: number): Promise<{ width: number; height: number; getContext: (type: string) => CanvasRenderingContext2D | null }> {
  try {
    // Use dynamic import for ES modules
    const canvasModule = await import('@napi-rs/canvas');
    const { createCanvas } = canvasModule;
    return createCanvas(width, height) as unknown as { width: number; height: number; getContext: (type: string) => CanvasRenderingContext2D | null };
  } catch (error) {
    // Log the actual error to help debug
    console.error('Canvas creation failed:', error);
    throw new Error('@napi-rs/canvas package required for Node.js image resizing. Install with: npm install @napi-rs/canvas');
  }
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }
  if (width > 8192 || height > 8192) {
    throw new Error(`Image dimensions too large: ${width}x${height} (max 8192x8192)`);
  }
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`Image dimensions must be integers: ${width}x${height}`);
  }
}

/**
 * Create ImageData in a cross-platform way
 */
export function createImageDataCrossPlatform(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ImageData {
  if (typeof ImageData !== 'undefined') {
    // Create a proper Uint8ClampedArray with ArrayBuffer (not SharedArrayBuffer)
    const safeData = new Uint8ClampedArray(data);
    return new ImageData(safeData, width, height);
  }
  // Mock ImageData for Node environment
  return {
    data,
    width,
    height,
    colorSpace: 'srgb' as const
  } as ImageData;
}