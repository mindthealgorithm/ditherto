import type { DitherAlgorithm } from '../types.js';
import { diffuse } from './shared.js';

/** Atkinson distributes 6/8 of the quantization error; the remaining 2/8 is discarded. */
export const atkinsonAlgorithm: DitherAlgorithm = {
  name: 'atkinson',
  apply: (data, palette, step) =>
    diffuse(data, palette, step, [
      [1, 0, 1 / 8],
      [2, 0, 1 / 8],
      [-1, 1, 1 / 8],
      [0, 1, 1 / 8],
      [1, 1, 1 / 8],
      [0, 2, 1 / 8],
    ]),
};
