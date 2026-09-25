import type { ColorRGB, DitherAlgorithm } from '../types.js';
import { findClosestColor } from '../palette/utils.js';
import { fillBlock, prepare, sampleIndex } from './shared.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
const dot = (a: ColorRGB, b: ColorRGB) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a: ColorRGB, b: ColorRGB): ColorRGB => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const key = (color: ColorRGB) => color[0] * 65536 + color[1] * 256 + color[2];

/**
 * Bayer thresholding generalized to arbitrary palettes: project onto the best
 * segment from the nearest palette color to another palette color. For BW this
 * is the standard comparison of intensity against (Bayer rank + 0.5) / 16.
 */
function choose(pixel: ColorRGB, palette: readonly ColorRGB[], threshold: number): ColorRGB {
  const nearest = findClosestColor(pixel, palette);
  const delta = subtract(pixel, nearest);
  let bestError = dot(delta, delta);
  if (bestError === 0) return nearest;
  let bestLength = Number.POSITIVE_INFINITY;
  let partner = nearest;
  for (const candidate of palette) {
    const direction = subtract(candidate, nearest);
    const length = dot(direction, direction);
    if (length === 0) continue;
    const amount = Math.max(0, Math.min(1, dot(delta, direction) / length));
    const residual: ColorRGB = [
      delta[0] - amount * direction[0],
      delta[1] - amount * direction[1],
      delta[2] - amount * direction[2],
    ];
    const error = dot(residual, residual);
    if (amount > 0 && (error < bestError || (error === bestError && length < bestLength))) {
      bestLength = length;
      bestError = error;
      partner = candidate;
    }
  }
  if (partner === nearest) return nearest;
  // A fixed orientation avoids inverting the pattern halfway through a ramp.
  const low = key(nearest) < key(partner) ? nearest : partner;
  const high = low === nearest ? partner : nearest;
  const direction = subtract(high, low);
  const amount = Math.max(
    0,
    Math.min(1, dot(subtract(pixel, low), direction) / dot(direction, direction))
  );
  return amount > threshold ? high : low;
}

export const orderedAlgorithm: DitherAlgorithm = {
  name: 'ordered',
  apply(data, palette, step) {
    const result = prepare(data, palette, step);
    for (let y = 0; y < data.height; y += step) {
      for (let x = 0; x < data.width; x += step) {
        const i = sampleIndex(data, x, y, step);
        if (i < 0) continue;
        const threshold = (BAYER[((y / step) % 4) * 4 + ((x / step) % 4)]! + 0.5) / 16;
        const color = choose(
          [data.data[i]!, data.data[i + 1]!, data.data[i + 2]!],
          palette,
          threshold
        );
        fillBlock(result, x, y, step, color);
      }
    }
    return result;
  },
};
