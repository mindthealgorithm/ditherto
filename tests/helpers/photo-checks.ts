// Independent metadata oracle, shared by Node and actual browser decoder tests.
export function orientationError(source: ImageData, result: ImageData, orientation: number): number {
  let error = 0;
  for (let y = 0; y < result.height; y++) for (let x = 0; x < result.width; x++) {
    let sx = x;
    let sy = y;
    switch (orientation) {
      case 2: sx = source.width - 1 - x; break;
      case 3: sx = source.width - 1 - x; sy = source.height - 1 - y; break;
      case 4: sy = source.height - 1 - y; break;
      case 5: sx = y; sy = x; break;
      case 6: sx = y; sy = source.height - 1 - x; break;
      case 7: sx = source.width - 1 - y; sy = source.height - 1 - x; break;
      case 8: sx = source.width - 1 - y; sy = x; break;
      default: throw new Error('Expected EXIF orientation 2–8');
    }
    for (let c = 0; c < 4; c++) error = Math.max(error, Math.abs(
      source.data[(sy * source.width + sx) * 4 + c]! - result.data[(y * result.width + x) * 4 + c]!
    ));
  }
  return error;
}

export function pixelError(a: ImageData, b: ImageData): number {
  if (a.width !== b.width || a.height !== b.height) return Infinity;
  let error = 0;
  for (let i = 0; i < a.data.length; i++) error = Math.max(error, Math.abs(a.data[i]! - b.data[i]!));
  return error;
}
