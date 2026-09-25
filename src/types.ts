/**
 * Core TypeScript type definitions for ditherto
 */

/** RGB color tuple [red, green, blue] where each value is 0-255 */
export type ColorRGB = readonly [number, number, number];

/** Area averages when shrinking; enlargement uses nearest-neighbor. */
export type ResampleMethod = 'nearest' | 'area';

/** Input image sources supported by the library */
export type InputImageSource =
  | string // file path or URL
  | ArrayBuffer
  | Uint8Array
  | Blob
  | File
  | HTMLImageElement
  | ImageData;

/** Palette generation: exact swatches by default, representative colors when requested. */
export interface GeneratePaletteOptions {
  /** Photo color budget, 1–256; may return fewer for simple images or merged histogram bins. */
  colors?: number;
  /** Exact extraction guard, 1–4096. Cannot be combined with colors. */
  maxColors?: number;
}

/** Configuration options for dithering operations */
export interface DitherOptions {
  /** Dither algorithm name */
  algorithm?: 'atkinson' | 'floyd-steinberg' | 'ordered' | (string & {});
  /** Explicit palette overrides everything else */
  palette?: readonly ColorRGB[];
  /** Swatch or reference photo for palette extraction */
  paletteImg?: InputImageSource;
  /** Quantize paletteImg to at most this many colors (1–256); omitted means exact extraction. */
  paletteColors?: number;
  /** Target max width; maintains aspect ratio */
  width?: number;
  /** Target max height; maintains aspect ratio */
  height?: number;
  /** Resizing filter; nearest preserves pixel art, area reduces photographic aliasing. */
  resample?: ResampleMethod;
  /** Pixel block size (>=1); >1 creates chunky pixels */
  step?: number;
  /** Exposure in stops (−4 to +4), applied in linear sRGB; default 0. */
  exposure?: number;
  /** Contrast slope around encoded sRGB 0.5 (0–2); default 1. */
  contrast?: number;
  /** Deprecated: validated for compatibility; pixel processing does not encode images */
  quality?: number;
}

/** Dithering algorithm interface for pluggable algorithms */
export interface DitherAlgorithm {
  readonly name: string;
  apply(data: ImageData, palette: readonly ColorRGB[], step: number): ImageData;
}
