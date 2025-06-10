#!/usr/bin/env node
/**
 * CLI wrapper for ditherto
 * 
 * Provides command-line interface for batch processing images
 */

import { parseArgs } from 'node:util';
import { ditherImage } from './imageProcessor.js';
import type { DitherOptions } from './types.js';

function showHelp(): void {
  console.log(`
ditherto - Pixelate your life by dithering images

Usage:
  ditherto input.png -o output.png [options]

Options:
  -o, --output <file>     Output file path
  --algorithm <name>      Dither algorithm (atkinson|floyd-steinberg|ordered)
  --paletteimg <file>     PNG file for palette extraction
  --width <number>        Target max width
  --height <number>       Target max height  
  --step <number>         Pixel block size (>=1)
  --quality <number>      Output quality (0-1)
  -h, --help              Show this help
  -v, --version           Show version
`);
}

async function main(): Promise<void> {
  // Implementation will be added when we build the core functionality
  console.log('CLI not yet implemented');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}