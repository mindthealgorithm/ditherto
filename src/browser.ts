/**
 * Browser-specific helpers for ditherto
 * 
 * Provides DOM utilities like autoDitherDOM for automatic image processing
 */

import type { DitherOptions, ColorRGB } from './types.js';
import { ditherImage } from './imageProcessor.js';

/** Configuration for autoDitherDOM */
export interface AutoDitherOptions extends DitherOptions {
  /** CSS selector for target images */
  selector?: string;
}

/**
 * Parse data attributes from an image element into DitherOptions
 */
export function parseDataAttributes(img: HTMLImageElement): DitherOptions {
  const options: DitherOptions = {};
  
  if (img.dataset.algorithm) {
    const algorithm = img.dataset.algorithm as DitherOptions['algorithm'];
    if (['atkinson', 'floyd-steinberg', 'ordered'].includes(algorithm!)) {
      options.algorithm = algorithm;
    }
  }
  
  if (img.dataset.width) {
    const width = parseInt(img.dataset.width);
    if (!isNaN(width) && width > 0) {
      options.width = width;
    }
  }
  
  if (img.dataset.height) {
    const height = parseInt(img.dataset.height);
    if (!isNaN(height) && height > 0) {
      options.height = height;
    }
  }
  
  if (img.dataset.step) {
    const step = parseInt(img.dataset.step);
    if (!isNaN(step) && step > 0) {
      options.step = step;
    }
  }
  
  if (img.dataset.quality) {
    const quality = parseFloat(img.dataset.quality);
    if (!isNaN(quality) && quality >= 0 && quality <= 1) {
      options.quality = quality;
    }
  }
  
  if (img.dataset.palette) {
    try {
      const palette = JSON.parse(img.dataset.palette) as ColorRGB[];
      if (Array.isArray(palette)) {
        options.palette = palette;
      }
    } catch {
      // Ignore invalid JSON
    }
  }
  
  if (img.dataset.paletteImg) {
    options.paletteImg = img.dataset.paletteImg;
  }
  
  return options;
}

/**
 * Replace an image element with a canvas containing the dithered result
 */
export function replaceImageWithCanvas(img: HTMLImageElement, imageData: ImageData): void {
  if (!img.parentNode) {
    return; // Can't replace orphaned element
  }
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  
  // Copy important attributes from img to canvas
  if (img.alt) canvas.setAttribute('alt', img.alt);
  if (img.className) canvas.className = img.className;
  if (img.id) canvas.id = img.id;
  
  // Get context and draw the dithered image
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
  }
  
  // Replace the image with the canvas
  img.parentNode.replaceChild(canvas, img);
}

/**
 * Process a single image element
 */
export async function processImage(img: HTMLImageElement, baseOptions: DitherOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    // Parse data attributes and merge with base options
    const dataOptions = parseDataAttributes(img);
    const options = { ...baseOptions, ...dataOptions };
    
    // Handle both loaded and unloaded images
    const processLoadedImage = async () => {
      try {
        // Use the image element as input source
        const result = await ditherImage(img, options);
        
        // Convert result to ImageData if needed
        let imageData: ImageData;
        if (result instanceof ImageData) {
          imageData = result;
        } else {
          // If we get Uint8Array, we need to create ImageData
          // This is a fallback - normally browser should return ImageData
          imageData = new ImageData(
            new Uint8ClampedArray(result), 
            img.width, 
            img.height
          );
        }
        
        // Replace img with canvas
        replaceImageWithCanvas(img, imageData);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    if (img.complete && img.naturalHeight !== 0) {
      // Image is already loaded
      processLoadedImage();
    } else {
      // Wait for image to load
      const onLoad = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        processLoadedImage();
      };
      
      const onError = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        reject(new Error(`Failed to load image: ${img.src}`));
      };
      
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
    }
  });
}

/**
 * Automatically dither images in the DOM
 * Replaces <img> elements with <canvas> elements after processing
 */
export async function autoDitherDOM(options: AutoDitherOptions = {}): Promise<void> {
  const { selector = 'img.ditherto', ...ditherOptions } = options;
  
  // Find all images matching the selector
  const images = document.querySelectorAll(selector) as NodeListOf<HTMLImageElement>;
  console.log(`Found ${images.length} images to dither`);
  
  // Process all images in parallel
  const promises = Array.from(images).map(img => 
    processImage(img, ditherOptions)
  );
  
  await Promise.all(promises.map(p => 
    p.catch(error => {
      console.error('Error processing image:', error);
      return null; // Don't let one failure stop the others
    })
  ));
}