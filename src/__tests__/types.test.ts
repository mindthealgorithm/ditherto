import { describe, it, expect } from 'vitest';
import type { ColorRGB, DitherOptions } from '../types.js';

describe('Types', () => {
  it('should define ColorRGB correctly', () => {
    const color: ColorRGB = [255, 128, 0];
    expect(color).toHaveLength(3);
    expect(color[0]).toBe(255);
  });

  it('should allow valid DitherOptions', () => {
    const options: DitherOptions = {
      algorithm: 'atkinson',
      width: 128,
      height: 128,
      step: 2,
    };
    expect(options.algorithm).toBe('atkinson');
  });
});