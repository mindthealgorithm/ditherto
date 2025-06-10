# Specification: **ditherto**

*Pronounced like ‘hitherto'*

## 1 Overview

`ditherto` is a JavaScript/TypeScript library that **resizes** raster images and then **dithers** them to a fixed colour palette, ensuring crisp pixel edges. It runs identically in the **browser** (via the HTML Canvas API) and on the **server** (via Node Canvas or Off‑screen Canvas). A small CLI wrapper is provided for batch processing.

---

## 2 Goals

* 🎯 Re‑usable core that works in any JS runtime supporting Canvas‐style ImageData.
* 🎯 Strict processing order: *resize → dither*.
* 🎯 Accept **any** common raster input format (PNG, JPEG, GIF, WebP, AVIF, etc.).
* 🎯 Emit **any** raster output format supported by the runtime.
* 🎯 Extract palettes from a reference PNG at runtime.
* 🎯 Ship three pluggable dither algorithms (Atkinson, Floyd‑Steinberg diffusion, Bayer ordered) with a clean extension point.
* 🎯 Minimal, tree‑shakeable bundle; zero external deps in browsers.
* 🎯 First‑class TypeScript types, JSDoc + TSDoc comments, strict linting.
* 🎯 MIT licence, ESM + CommonJS + UMD builds.

---

## 3 Non‑Goals

* ❌ Vector image support (SVG, PDF).
* ❌ Lossy palette compression/optimal median‑cut quantisation (may come later).
* ❌ SSR image component helpers (left to host frameworks).

---

## 4 Environments & Runtime Support

| Environment | Minimum Version                              | Notes                                                                             |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| **Browser** | Chrome 110, Firefox 108, Safari 16, Edge 110 | Modern Canvas & ImageBitmap.                                                      |
| **Node**    | v20 LTS                                      | Uses `@napi-rs/canvas` (fast native) with automatic fallback to `canvas` package. |

> **Detection**: At build time, the bundler picks the correct target; at run‑time, the library detects global `window` to choose adapters.

---

## 5 External Dependencies

| Package              | Usage                 | Runtime |
| -------------------- | --------------------- | ------- |
| `@napi-rs/canvas`    | Canvas polyfill       | Node    |
| `pngjs` *(optional)* | Fast PNG palette scan | Node    |
| `p‑limit`            | Async concurrency     | Both    |

Browser build is dependency‑free; the above are *peer deps* for Node.

---

## 6 High‑Level Architecture

```
┌──────────────────────┐
│      Public API      │
└─────────┬────────────┘
          ▼
┌──────────────────────┐
│   imageProcessor     │  ← orchestrates pipeline
└─────────┬────────────┘
          ▼
┌─────────▼────────────┐         ┌─────────────────────────┐
│ resizeAdapter.ts     │◄───────▶│ algorithmRegistry.ts    │
└─────────┬────────────┘         └─────────────────────────┘
          ▼
┌─────────▼────────────┐         ┌─────────────────────────┐
│ palette/extract.ts   │◄───────▶│ palette/Palette.ts      │
└─────────┬────────────┘         └─────────────────────────┘
          ▼
   (environment adapter)
        ├─ browser/io.ts
        └─ node/io.ts
```

---

## 7 Public API (ESM)

```ts
import {
  ditherImage,           // core function (async)
  generatePalette,       // extract colours from PNG
  algorithms,            // registry helper
  version                // semver string
} from 'ditherto';

interface DitherOptions {
  algorithm?: 'atkinson' | 'floyd-steinberg' | 'ordered';
  palette?: readonly ColorRGB[];             // overrides default
  paletteImg?: InputImageSource;             // PNG for palette extraction
  width?: number;                            // target max W
  height?: number;                           // target max H
  step?: number;                             // pixel block size (>=1)
  quality?: number;                          // output encoder hint (0‑1)
}

type InputImageSource =
  | string              // file path or URL
  | ArrayBuffer
  | Uint8Array
  | Blob
  | File
  | HTMLImageElement;

async function ditherImage(
  input: InputImageSource,
  opts?: DitherOptions
): Promise<Uint8Array | ImageData>; // Node returns Buffer‑like
```

### 7.1 Algorithm Plug‑in Interface

```ts
export interface DitherAlgorithm {
  readonly name: string;
  apply(
    data: ImageData,
    palette: readonly ColorRGB[],
    step: number
  ): ImageData;
}
```

Register with `algorithms.register(myAlg)`; tree‑shaken consumers can import only what they need.

---

## 8 CLI (`ditherto`)

```
$ ditherto input.png -o output.png \
             --algorithm atkinson \
             --paletteimg gameboy.png \
             --width 128 --height 128 \
             --step 2
```

Flags mirror `DitherOptions`; unknown flags trigger `--help`.

---

## 9 Browser Helper (`autoDitherDOM`)

```html
<img class="ditherto" data-width="96" data-alg="ordered" src="photo.jpg" />
```

```ts
import { autoDitherDOM } from 'ditherto/browser';
autoDitherDOM({ selector: 'img.ditherto' });
```

* Replaces each `<img>` with a `<canvas>` element in‑place once the image has loaded.
* Observes `data-*` attributes for per‑element overrides.

---

## 10 Configuration Object Details

| Option       | Type               | Default                   | Description                                           |
| ------------ | ------------------ | ------------------------- | ----------------------------------------------------- |
| `algorithm`  | string             | `'atkinson'`              | Dither algorithm name.                                |
| `palette`    | `ColorRGB[]`       | `[[0,0,0],[255,255,255]]` | Explicit palette overrides everything else.           |
| `paletteImg` | `InputImageSource` | `undefined`               | PNG used to build palette (unique colours, unsorted). |
| `width`      | number             | `undefined`               | Target max width; maintains aspect.                   |
| `height`     | number             | `undefined`               | Target max height; maintains aspect.                  |
| `step`       | number ≥ 1         | `1`                       | Pixel block size; >1 creates chunky pixels.           |
| `quality`    | number 0‑1         | `0.92`                    | Only for lossy encoders (JPEG/WebP/AVIF).             |

`width` **and/or** `height` may be omitted; the missing dimension scales proportionally.

---

## 11 Input/Output Support Matrix

| Runtime | Reader                   | Writer                                                   |
| ------- | ------------------------ | -------------------------------------------------------- |
| Browser | `<img>` / `Blob` / `URL` | `Blob`, `dataURL`, `ImageBitmap`, `canvas` dom injection |
| Node    | `fs.readFile`, streams   | `fs.writeFile`, stream, `Buffer`                         |

Encoding selection is inferred from `output` file extension or `opts.format`.

---

## 12 Testing & Quality

* **Unit tests** via **Vitest** (works in Node & jsdom).
* **Golden image** visual regression tests stored as PNG fixtures.
* **ESLint** (airbnb‑base), **Prettier**, **TypeScript strict**.
* Conventional Commits + semantic‑release CI.

---

## 13 Example Projects

1. \`\` – resize & dither a folder of images.
2. \`\` – integrate with Webpack asset pipeline.
3. \`\` – React component that lazily dithers screenshots.

---

## 14 Roadmap / Future Ideas

* ✨ WebGL/WebGPU shader backend for large images.
* ✨ Custom Bayer matrix sizes & kernels.
* ✨ Median‑cut palette optimiser.
* ✨ WASM SIMD acceleration via Rust.
* ✨ Progressive streaming encoder for huge spritesheets.

---

## 15 Open Questions 🧐

* Should we offer synchronous variants for tiny images?
* Is Node runtime guaranteed to have AVIF/WEBP encoders available?
* How do we cap memory usage for 10k×10k images on low‑RAM devices?

---

*© 2025 ditherto authors • MIT*

