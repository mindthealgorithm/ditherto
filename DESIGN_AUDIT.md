# Design and correctness audit

Audited baseline: `05dbc38` (September 30, 2025). This working-tree revision is an unreleased implementation of the findings below.

## Assessment

The product idea and resize → dither pipeline are sound. The main weaknesses were incorrect ordered dithering, implicit runtime-dependent output, unreliable environment boundaries, and tests that sometimes checked mocks or assertions without invoking the behavior. The example page did not use the library at all. Those problems mattered more than adding algorithms or a UI framework.

## Findings and changes

| Priority | Baseline problem | Implemented response |
| --- | --- | --- |
| Critical | Ordered dithering added `Math.random()` noise instead of applying Bayer thresholds. Repeated runs differed. | Fixed 4×4 Bayer ranks, centered thresholds, exact coverage tests and a documented arbitrary-palette extension. |
| High | Diffusion errors were accumulated in `Uint8ClampedArray`, rounding and clipping each contribution. | Floating-point rolling error rows; correct original kernels; independent full-frame scalar oracle and hand-computed results. |
| High | All algorithms forced alpha to 255. Invisible pixels could affect visible neighbors. | Preserve destination alpha; skip fully transparent samples and diffusion targets; handle blocks with transparent origins. |
| High | Node output lost dimensions and alpha. The CLI decoded input again to recover dimensions. | Add `ditherToImageData` as the preferred, consistent RGBA result; keep legacy `ditherImage` behavior; separate `encodePng` in `ditherto/node`. |
| High | Node byte inputs referenced `HTMLImageElement` and browser constructors without guards. Browser URL strings were treated as file paths. | Explicit Node/browser adapters, safe constructor checks, real path/byte/view/Blob tests, browser URL loading and worker support. |
| High | Browser helpers processed unloaded images and swallowed errors. | Wait for image loading, awaitable helpers, preserve accessible labels, propagate failures. |
| High | Browser bundle still exposed native Node imports to consumer bundlers. | Replace the Node adapter at browser build time; assert no Node/native imports in the distributed browser bundle. |
| High | Resize relied on different canvases and accepted invalid/unbounded dimensions. | Shared nearest-neighbor and alpha-weighted area resizing, finite integer checks, minimum one-pixel dimensions, decoded/output allocation guards. |
| High | Demo used a mock quantizer; resizing did not represent real library behavior. | Real library worker, original-source rerendering, debounced controls, latest-result protection, ResizeObserver, original/result comparison and PNG download. |
| Medium | Built-in readonly palettes did not fit mutable option types; custom registry names were rejected by the pipeline. | Readonly palette contracts, registered algorithm lookup and input isolation for plugins. |
| Medium | CLI help/version required a filename; numeric parsing accepted trailing junk; output was PNG regardless of extension. | Standalone help/version, strict numbers, PNG-only validation, real executable/symlink smoke checks. |
| Medium | Palette extraction could build a massive set from a photograph. | Numeric color keys and a default 256-color extraction guard, configurable to 4096 with a clear swatch-oriented error. |
| Medium | Build generated artifacts but leaked filesystem watchers; configuration emitted warnings. | Compile once with TypeScript, then bundle JavaScript/declarations; clean outputs; verify process completion. |
| Medium | Browser test command matched no tests; DOM tests often did not execute the helper; CI discarded the lockfile. | Real DOM helper assertions, Playwright browser/worker tests, package smoke tests, deterministic `npm ci`, browser checks in CI/release workflows. |

## Algorithm decisions

Floyd–Steinberg uses its standard raster kernel, without serpentine scanning. Atkinson uses six equal 1/8 contributions, deliberately diffusing only 3/4 of the error. Errors outside image bounds are discarded; there is no edge renormalization. Intermediate errors are neither rounded nor clipped. Nearest-color matching uses squared distance in encoded sRGB, with stable palette-order tie breaking.

Ordered dithering requires an explicit policy for arbitrary palettes. The implementation reduces to standard Bayer thresholding for black/white. For other palettes it anchors at the nearest color, chooses the other palette color whose segment best approximates the source RGB, and thresholds the interpolation fraction. Equal-residual segments prefer the shorter segment. This is a deliberate color-palette extension, not a claim that Bayer specified a unique arbitrary-palette algorithm. It is tested for exact colors, adjacent grayscale levels, determinism, palette membership and binary coverage.

The baseline kernel positions were already correct. The changes fix precision, determinism, alpha and validation around those kernels. Visual output will change: old outputs should not be treated as authoritative where they encode the earlier bugs.

References consulted:

- [Tanner Helland's implementation and diffusion diagrams](https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html): Floyd–Steinberg and Atkinson kernel definitions.
- [Hany Farid, Fundamentals of Image Processing](https://farid.berkeley.edu/downloads/tutorials/fip.pdf): quantization/error diffusion background.
- [ImageMagick's ordered-dither documentation](https://imagemagick.org/command-line-options/#ordered-dither): deterministic threshold maps; its uniform-channel quantizer is distinct from this library's arbitrary-palette mapping.

## API direction

Keep the library focused on three responsibilities: decode input, transform pixels, encode output. Prefer explicit data contracts over hidden environment-dependent return values. The new API is additive so existing `ditherImage` users are not silently switched from RGB to RGBA.

For a subsequent version, consider making the consistent result the default and deprecating the old runtime-dependent API. The `quality` option remains validated for compatibility but does not pretend to compress pixel data. PNG is lossless; actual JPEG/WebP quality belongs on an encoder API with format-specific capability checks and an explicit alpha-compositing policy.

The runtime limit is currently 8192 pixels per side and 16,777,216 pixels total. This prevents excessive downstream allocations but does not limit the memory needed to decode a compressed input first. Extraction now defaults to at most 256 exact colors. These stricter rejection cases and corrected algorithm outputs warrant an explicit release note; recommend a 0.2.0 release after review rather than republishing 0.1.0.

## Verification

- Independent scalar reference for diffusion, hand-computed small examples, Bayer coverage patterns, exact palette membership, transparent-pixel behavior and clipped blocks.
- Existing black/white checkerboard golden PNGs are now exercised. They test exact palette preservation; gradients/reference tests carry more of the correctness burden.
- Real Node path, byte-array, offset-view, ArrayBuffer and Blob decoding; PNG alpha round trip; immutable rerendering; custom algorithms and invalid input rejection.
- Real Chromium, Firefox and WebKit browser/Node pixel parity for all three algorithms after resizing, worker-based demo rendering, uploads, rapidly changed controls, responsive bitmap resizing, mobile layout, custom-palette error recovery, download decoding and DOM replacement.
- Package-level ESM/CommonJS parity, browser dependency isolation, PNG output, CLI help/version, symlink invocation, dimension checks and invalid arguments.
- Desktop and mobile screenshots manually inspected.

Initial local processing benchmark (Node 22.23.2, macOS ARM64, four-color Game Boy palette; one warmup and three measured runs; excludes decode/encode):

| Image | Atkinson | Floyd–Steinberg | Ordered |
| --- | ---: | ---: | ---: |
| 256×256 | 9.5 ms | 6.8 ms | 5.1 ms |
| 512×512 | 38.4 ms | 27.5 ms | 19.7 ms |
| 1024×1024 | 156.8 ms | 117.5 ms | 78.5 ms |

These are a local baseline, not a cross-device performance guarantee or a before/after speedup claim. Diffusion scratch memory grows with block-grid width, not full image area; input/output pixel buffers still scale with total pixels.

## Photographic audit follow-up

- Added three pinned real photographs (NASA portrait, coffee/wood, cat fur) with recorded public-domain/CC0 provenance, plus JPEG, lossless WebP and metadata variants.
- Added opt-in `resample: 'area'` across the API, CLI (`--resample area`) and DOM (`data-resample="area"`). The library retains nearest-neighbor by default; the playground chooses area for photos and offers both filters.
- Area filtering integrates exact pixel coverage with integer footprint coordinates and a single final rounding. Colors are premultiplied by alpha before averaging; fully transparent output is canonical zero RGBA. It averages encoded sRGB, not linear light. Enlargements retain nearest-neighbor behavior.
- Compared integral reductions against independent Pillow BOX fixtures: maximum difference ≤1 channel value, reflecting Pillow's intermediate separable rounding. The cat original is 451 pixels wide, so the integral reference uses a documented one-column crop; fractional tests use the untouched original. Fractional reductions to width 37 preserve per-channel image means within 0.5/255 on all three originals. Checkerboard, 3→2 coverage, transpose and alpha tests exercise properties independently of the implementation.
- All three browser engines and Node correctly apply EXIF orientations 2–8 once, with exact pixel-coordinate correspondence to the same untagged JPEG stream. URL and Blob paths are exercised in browsers. Lossless WebP matches the PNG; tagged sRGB stays within one channel value. This is not a general ICC or wide-gamut certification.
- Photo transforms match Node exactly when starting with identical decoded RGBA, for all three algorithms and block sizes 1 and 3. Native decoders are not required to produce identical pixels for every encoded file.
- Added real photo selection and resize-filter controls, original-source rerender checks, recipe/download coverage, and a loading guard so control changes cannot render an old source while a new image is opening. All three engines now run in CI and release checks.
- Desktop/mobile browser screenshots and a generated photographic comparison sheet are reviewed locally. WebKit selects now have a 44px minimum target height; native styling previously ignored their vertical padding.

Local follow-up verification: **233 Vitest tests and 39 Playwright tests passed**, plus typecheck, warning-free lint, build and package/CLI smoke checks. Browser results cover Playwright Chromium, Firefox and WebKit on macOS; the expanded Linux CI configuration has not been run remotely.

## dither.js comparison and palette/tone follow-up

Reviewed [danielepiccone/ditherjs](https://github.com/danielepiccone/ditherjs), the project whose demo is titled “dither.js.” Its latest default-branch commit is [aa719357, 2020-08-24](https://github.com/danielepiccone/ditherjs/commit/aa719357cdccd8384c2ed4323c2636ba0babe799), verified from GitHub's commits API. That supports calling development inactive; it does not establish that the maintainer has formally abandoned the project.

| ditherjs feature | Recommendation for ditherto |
| --- | --- |
| Ordered, diffusion and Atkinson algorithms | Already covered; no missing algorithm to port. |
| Fixed RGB palettes, CGA default, pixel blocks | Already covered with additional built-in palettes. |
| Constructor-level default options | Consider saved recipes/presets for repeated workflows; ordinary option objects already provide the core capability. |
| Selector-based image replacement | Already covered by awaitable DOM helpers. |
| Browser UMD/jQuery and Node wrappers | Existing ESM/CJS/worker entry points fit this project; add a legacy wrapper only for a real integration need. |
| Debug timing | Already exposed in the playground and local benchmarks. |

The [ordered implementation](https://github.com/danielepiccone/ditherjs/blob/aa719357cdccd8384c2ed4323c2636ba0babe799/lib/algorithms/orderedDither.js) adds a positive matrix offset before nearest-color selection and uses unchecked block writes. The [browser adapter](https://github.com/danielepiccone/ditherjs/blob/aa719357cdccd8384c2ed4323c2636ba0babe799/lib/client.js) works at element display dimensions and reloads image URLs for selectors. These are not behaviors to import into our corrected pixel pipeline. No upstream code was copied.

Implemented here:

- `generatePalette(reference, { colors: N })` explicitly selects photo quantization; existing exact-swatch behavior is unchanged. `paletteImg` + `paletteColors`, CLI `--palette-colors`, and DOM `data-palette-colors` expose the same behavior. Explicit palettes win.
- A deterministic median-cut variant selects the box with largest total squared error, splits its highest-variance channel at the weighted median, and uses weighted means as representatives. Alpha-weighted 5-bit RGB bins bound histogram memory to about 1 MiB regardless of source color count. Exact source colors are retained when already within budget. Outputs have at most N unique colors; bin merging and simple sources can yield fewer. This is an encoded-sRGB heuristic, not an optimal perceptual quantizer.
- The playground offers “From this image” and “From another photo,” a 1–256 color budget, actual count and swatches. Quantization runs in the worker; cached palettes survive resolution/tone changes, and changing the source invalidates only its own cache. Copied recipes contain the actual RGB palette.
- Exposure (−4 to +4 stops) applies linear-light gain before contrast (factor 0–2 around encoded midpoint 0.5), then final clipping and dithering. The sRGB transfer functions follow the [W3C color conversion reference](https://www.w3.org/TR/css-color-4/#color-conversion-code). Defaults are exact identity; alpha and source buffers are preserved. Controls include reset and CLI/DOM/API equivalents.
- Replaced the old mocked palette fixture suite with actual image decoding. Its gradient expectation had asserted four invented colors; the real fixture contains eleven.
- New checks cover hand-computed palette centers, population/alpha weighting, invisible images, pixel-order invariance, budgets, real-photo error reduction, reference-palette pipeline equivalence, tonal endpoints/stops, all-algorithm runtime parity, and complete UI flows. Desktop/mobile screenshots were inspected; photo controls receive full width on small screens.

Local palette/tone verification: **257 Vitest tests and 51 Playwright tests passed**, plus typecheck, warning-free lint, build and package/CLI smoke checks. Final layout changes were additionally checked in all three browser engines.

Algorithm priorities: first add a **nearest-palette/no-dither mode** as a useful comparison and posterization tool; then **serpentine Floyd–Steinberg**, which alternates scan direction to reduce directional bias. If users want another diffusion texture after those, **Sierra Lite** is a small, distinct kernel worth evaluating. Larger kernel catalogs, random dithering and GPU paths are lower priority than usable palette/tone controls. [Helland's algorithm discussion and implementations](https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html) provide useful comparison material. These algorithm additions are recommendations, not implemented features in this revision.

## Dithertone Pro aesthetic reference

Reviewed the public [Dithertone Pro page and gallery](https://www.doronsupply.com/product/dithertone-pro), not the installed plugin. Its advertised preparation controls, tonal/indexed color modes and bleed/rounding are relevant references. It also advertises batch processing of Photoshop layers/frames. Internal algorithms, parameter semantics and output quality have not been independently verified.

My proposed direction for ditherto, informed by that reference:

1. **Levels and midtones first.** Add explicit black/white points and gamma, with a small histogram. These let users place useful subject detail into the palette's available tonal range without relying entirely on exposure and a midpoint contrast slope. Keep neutral values exact and expose clipping clearly.
2. **Control detail before quantization.** Prototype gentle, alpha-aware smoothing and optional unsharp masking at the processing resolution. Evaluate skin, hair, fabric, foliage, line art and text. Radius should have an explicit pixel scale so responsive resizing produces predictable results. Avoid treating blur and sharpening as mandatory preset ingredients.
3. **Offer tonal mapping separately from RGB matching.** Let users map luminance through ordered shadow/midtone/highlight colors for deliberate duotone/tritone looks. Existing nearest-RGB palettes answer a different question. Preserve an explicit distinction between source colors and art-directed tonal colors.
4. **Add a visually distinct pattern family.** A clustered-dot halftone with size and angle controls would broaden the aesthetic more than another similar diffusion kernel. Retain no-dither and serpentine Floyd–Steinberg as useful small additions, but move the larger kernel catalog below tonal and detail controls.
5. **Separate pattern generation from finishing.** Optional ink expansion and rounded marks belong after the logical dither grid. A finish may change coverage, introduce antialiasing colors or require an alpha/background policy; it must not silently change the exact-palette guarantee of the core pixel API.
6. **Make successful looks reusable.** Save versioned recipes containing preparation settings, palette values, grid/algorithm settings and optional finish settings. Test the same recipe against a small image corpus and across sizes. Suggested starting looks: two-ink portrait, warm editorial print, coarse newsprint and crisp interface art; each needs visual validation before being shipped as a preset.

Suggested next prototype: a levels/midtones control plus a two-color tonal portrait recipe, evaluated against the existing three photographic fixtures and an additional noisy portrait. This changes the prior emphasis toward tone/detail preparation before expanding the diffusion list. These are design recommendations only; no processing behavior changed during this reference review.

## Design direction: shared style, independent image tuning

The user clarified that site-wide processing is one important use case, not a prescribed workflow. Library consumers may be people, agents, build scripts, servers or interactive applications. The design should support those contexts through explicit composable operations, without embedding a particular authoring workflow or agent framework in the core.

A useful pattern is to fix a palette and algorithm as shared style constraints, then tune exposure, contrast and future preparation controls for each image. Consistency does not require identical processing values: a dark portrait and a bright landscape can need different preparation to achieve a coherent result. This is already possible with ordinary option objects and the existing deterministic pixel pipeline.

For agent-assisted use:

- Document types, units, ranges, neutral values, processing order and palette precedence precisely. Keep failures actionable and preserve the original source.
- Make complete settings easy to serialize and replay. A future recipe format should record its version, explicit palette values, shared constraints and per-image adjustments. The current exported option objects can already be saved by callers; there is no versioned recipe API yet.
- Support the render → inspect → adjust loop. An agent can generate a bounded set of candidates from the original, compare rendered results against the intended aesthetic, and store the selected settings. Lower pixel reconstruction error alone does not establish the best artistic choice.
- Keep candidate/contact-sheet generation, diagnostics and batch scheduling in optional tooling. Useful future diagnostics include tonal histograms and clipping fractions; they should inform tuning rather than silently change settings.
- Test both independent single-image calls and many-image workloads. Build-time rendering, cached server output and interactive client processing remain consumer choices. The optional responsive DOM entry now has a serial queue and explicit cleanup; the one-shot browser helpers remain available.

Measured current unminified browser distribution: **33,469 bytes raw / 9,333 bytes gzip**, including palette quantization and tone controls. The separate playground is not shipped in the runtime. The package check enforces an initial **12 KiB gzip** regression budget. This bounds transfer growth, not image-processing cost. The current all-in-one entry includes every built-in algorithm and palette generation; unused capabilities are not yet guaranteed to disappear through tree shaking. Future heavier effects should use optional entry points, justified by measured needs.

Next priorities are composable tuning controls, documented shared-style/per-image examples, and reproducible candidate evaluation. A site integration helper is a possible consumer of those primitives, not the organizing abstraction of the library. No runtime behavior changed in this clarification pass.

## Next decisions, in order

1. **Support shared style with per-image tuning.** Keep palette/algorithm constraints reusable while allowing independent preparation settings. Prioritize explicit controls, replayable settings and optional candidate-review tools; exercise both single-image and many-image workflows without prescribing where processing runs.
2. **Extend color-management coverage where needed.** Chromium, Firefox and WebKit now pass the photographic corpus. Wide-gamut ICC profiles, CMYK JPEG, real mobile devices and more codec variants remain outside the verified set. Equal decoded RGBA input is deterministic; different decoders/color management may still produce different source pixels.
3. **Evaluate quantization quality.** Photo palettes now require an explicit `colors` budget. Consider perceptual refinement or locked palette colors if real examples justify them; preserve the bounded-memory and deterministic contracts.
4. **Define encoding needs.** JPEG/WebP, indexed PNG, metadata retention and animated inputs are separate features. The current CLI deliberately emits only PNG.
5. **Make large-image policy configurable if needed.** Add cancellation and decode-time resource controls before raising limits. The demo bounds output width and runs processing in a worker; it coalesces pending jobs but does not interrupt an already-running computation.
6. **Exercise responsive integration in consumer layouts.** The optional `ditherto/dom` entry now provides selector snapshots, shared defaults, per-image updates, source-preserving resize renders and cleanup. Dedicated parent-width wrappers are the supported layout contract; arbitrary crop/cover CSS, automatic DOM mutation discovery and automatic source selection tracking remain outside its scope.

Deferred: GPU/WASM acceleration, new diffusion kernels, linear-light/perceptual color modes, full animation processing, general crop/cover behavior, exhaustive memory profiling, real-device Safari/Firefox certification, publication and deployment. No remote CI or publishing was performed during this audit.


## Responsive DOM implementation

`observeDitherDOM` ships in a separate optional entry, reexporting the browser API. It keeps original nodes and source pixels, isolates per-image failures, serializes rendering, coalesces updates and ignores superseded or disposed results. A not-yet-loaded image does not occupy the processing queue. Disposal restores original nodes and frees cached pixels; one handle can be disposed independently. Shared defaults, data attributes, an optional resolver and update overrides give callers explicit control over each image.

The new three-photo gallery uses one worker for all images and demonstrates independent exposure, shared palette/algorithm selection, width changes and restore/rebind. The helper's default renderer remains on the calling thread; the injected renderer hook allows worker processing without imposing worker packaging on all consumers. Cache lifetime and worker disposal are documented. Source pixels remain fixed across resize; explicit refresh rereads sources and attributes. The API is optional integration rather than a required image-processing abstraction.

Regression coverage exercises pixel parity with the Node pipeline, original-source resize round trips, options precedence, refresh, input isolation from custom renderers, hidden images, image failures, unloaded-image scheduling, stale results, disposal during a stuck render, update recovery and burst coalescing. The example is exercised at desktop and mobile widths in Chromium, Firefox and WebKit. Package checks cover ESM/CJS declarations (including removing overrides with `undefined`), server-safe imports and absence of Node adapters in browser distributions.

Measured bundles: ordinary browser entry **33,469 raw / 9,333 gzip bytes**, unchanged; optional DOM entry **45,027 raw / 11,967 gzip bytes**, including the core. No new runtime dependencies. The DOM entry has a separate 16 KiB gzip regression budget. These are distribution sizes, not a promise about processing speed or memory on every device.
