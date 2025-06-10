/**
 * Core TypeScript type definitions for ditherto
 */

/** RGB color tuple [red, green, blue] where each value is 0-255 */
export type ColorRGB = readonly [number, number, number];

/** Input image sources supported by the library */
export type InputImageSource =
  | string              // file path or URL
  | ArrayBuffer
  | Uint8Array
  | Blob
  | File
  | HTMLImageElement;

/** Configuration options for dithering operations */
export interface DitherOptions {
  /** Dither algorithm name */
  algorithm?: 'atkinson' | 'floyd-steinberg' | 'ordered';
  /** Explicit palette overrides everything else */
  palette?: ColorRGB[];
  /** PNG for palette extraction */
  paletteImg?: InputImageSource;
  /** Target max width; maintains aspect ratio */
  width?: number;
  /** Target max height; maintains aspect ratio */
  height?: number;
  /** Pixel block size (>=1); >1 creates chunky pixels */  
  step?: number;
  /** Output encoder quality hint (0-1), only for lossy encoders */
  quality?: number;
}

/** Dithering algorithm interface for pluggable algorithms */
export interface DitherAlgorithm {
  readonly name: string;
  apply(
    data: ImageData,
    palette: ColorRGB[],
    step: number
  ): ImageData;
}