// ABOUTME: Output format conversion and encoding utilities
// ABOUTME: Handles ImageData to various output formats with quality parameters

/**
 * Convert ImageData to Uint8Array (RGB format)
 */
export function convertToUint8Array(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const rgbData = new Uint8Array(width * height * 3);
  
  // Convert RGBA to RGB
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgbData[j] = data[i];       // Red
    rgbData[j + 1] = data[i + 1]; // Green
    rgbData[j + 2] = data[i + 2]; // Blue
    // Skip alpha channel (data[i + 3])
  }
  
  return rgbData;
}

/**
 * Apply quality encoding (for future PNG/JPEG encoding)
 * For now, this is a placeholder that validates quality parameter
 */
export function encodeWithQuality(imageData: ImageData, quality: number): ImageData {
  if (quality < 0 || quality > 1) {
    throw new Error('Quality must be between 0 and 1');
  }
  
  // For now, just return the original ImageData
  // In a real implementation, this would apply lossy compression
  return imageData;
}

/**
 * Format output for the current environment
 */
export function formatForEnvironment(
  imageData: ImageData, 
  explicitFormat?: 'imagedata' | 'uint8array'
): ImageData | Uint8Array {
  if (explicitFormat === 'uint8array') {
    return convertToUint8Array(imageData);
  }
  if (explicitFormat === 'imagedata') {
    return imageData;
  }
  
  // Auto-detect environment
  if (typeof window !== 'undefined') {
    // Browser environment - return ImageData
    return imageData;
  } else {
    // Node environment - return Uint8Array
    return convertToUint8Array(imageData);
  }
}

/**
 * Simulate PNG encoding for testing purposes
 */
export function simulatePngEncoding(
  imageData: ImageData, 
  options?: { quality?: number }
): Uint8Array {
  const quality = options?.quality ?? 1.0;
  
  if (quality < 0 || quality > 1) {
    throw new Error('Quality must be between 0 and 1');
  }
  
  // Apply quality encoding first
  const processedData = encodeWithQuality(imageData, quality);
  
  // Convert to RGB bytes
  return convertToUint8Array(processedData);
}

/**
 * Cross-platform formatting that produces identical output
 */
export function formatForBrowser(imageData: ImageData): ImageData {
  return imageData;
}

export function formatForNode(imageData: ImageData): Uint8Array {
  return convertToUint8Array(imageData);
}