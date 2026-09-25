import type { ColorRGB } from '../types.js';
import { validatePixels, validatePositiveInteger } from '../validation.js';

export function validateColorCount(colors: number): void {
  validatePositiveInteger(colors, 'Palette color count');
  if (colors > 256) throw new Error('Palette color count cannot exceed 256');
}

/** Stable dark-to-light ordering, including a numeric tie break. */
export function sortPalette(palette: ColorRGB[]): ColorRGB[] {
  const lightness = (c: ColorRGB) => 299 * c[0] + 587 * c[1] + 114 * c[2];
  return palette.sort(
    (a, b) => lightness(a) - lightness(b) || a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  );
}

type Sample = { rgb: ColorRGB; weight: number; key: number };
type Box = { samples: Sample[]; weight: number; mean: ColorRGB; axis: number; error: number };

function box(samples: Sample[]): Box {
  const sums = [0, 0, 0];
  let weight = 0;
  for (const sample of samples) {
    weight += sample.weight;
    for (let c = 0; c < 3; c++) sums[c] = sums[c]! + sample.rgb[c]! * sample.weight;
  }
  const mean: ColorRGB = [sums[0]! / weight, sums[1]! / weight, sums[2]! / weight];
  const variance = [0, 0, 0];
  for (const sample of samples)
    for (let c = 0; c < 3; c++) {
      variance[c] = variance[c]! + (sample.rgb[c]! - mean[c]!) ** 2 * sample.weight;
    }
  let axis = 0;
  for (let c = 1; c < 3; c++) if (variance[c]! > variance[axis]!) axis = c;
  return { samples, weight, mean, axis, error: variance[0]! + variance[1]! + variance[2]! };
}

function splitBox(parent: Box): [Box, Box] {
  const { samples, axis, weight } = parent;
  samples.sort((a, b) => a.rgb[axis]! - b.rgb[axis]! || a.key - b.key);
  let sum = 0;
  let split = 1;
  for (let i = 0; i < samples.length - 1; i++) {
    sum += samples[i]!.weight;
    split = i + 1;
    if (sum >= weight / 2) break;
  }
  return [box(samples.slice(0, split)), box(samples.slice(split))];
}

function histogram(image: ImageData, colors: number) {
  const exact = new Set<number>();
  const weights = new Float64Array(32768);
  const sums = new Float64Array(32768 * 3);
  for (let i = 0; i < image.data.length; i += 4) {
    const alpha = image.data[i + 3]!;
    if (!alpha) continue;
    const r = image.data[i]!;
    const g = image.data[i + 1]!;
    const b = image.data[i + 2]!;
    if (exact.size <= colors) exact.add((r << 16) | (g << 8) | b);
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    weights[key] = weights[key]! + alpha;
    sums[key * 3] = sums[key * 3]! + r * alpha;
    sums[key * 3 + 1] = sums[key * 3 + 1]! + g * alpha;
    sums[key * 3 + 2] = sums[key * 3 + 2]! + b * alpha;
  }
  return { exact, weights, sums };
}

function nextBox(boxes: Box[]): number {
  let candidate = -1;
  for (let i = 0; i < boxes.length; i++) {
    if (
      boxes[i]!.samples.length > 1 &&
      (candidate < 0 || boxes[i]!.error > boxes[candidate]!.error)
    )
      candidate = i;
  }
  return candidate;
}

/**
 * Deterministic, alpha-weighted median cut in encoded sRGB. A fixed 5-bit/channel
 * histogram bounds memory to 32768 bins; bins retain original weighted means.
 * Exact colors are preserved when the source already fits within the budget.
 * Returns at most `colors` unique colors, never padding with invented duplicates.
 */
export function quantizePalette(image: ImageData, colors: number): ColorRGB[] {
  validatePixels(image);
  validateColorCount(colors);
  const { exact, weights, sums } = histogram(image, colors);
  if (exact.size === 0) throw new Error('Palette image has no visible colors');
  if (exact.size <= colors)
    return sortPalette(
      Array.from(exact, (key) => [(key >> 16) & 255, (key >> 8) & 255, key & 255])
    );
  const samples: Sample[] = [];
  for (let key = 0; key < weights.length; key++) {
    const weight = weights[key]!;
    if (weight)
      samples.push({
        key,
        weight,
        rgb: [sums[key * 3]! / weight, sums[key * 3 + 1]! / weight, sums[key * 3 + 2]! / weight],
      });
  }
  const boxes = [box(samples)];
  while (boxes.length < colors) {
    const candidate = nextBox(boxes);
    if (candidate < 0) break;
    boxes.splice(candidate, 1, ...splitBox(boxes[candidate]!));
  }
  const unique = new Map<string, ColorRGB>();
  for (const group of boxes) {
    const color: ColorRGB = [
      Math.round(group.mean[0]),
      Math.round(group.mean[1]),
      Math.round(group.mean[2]),
    ];
    unique.set(color.join(','), color);
  }
  return sortPalette([...unique.values()]);
}
