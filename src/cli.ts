#!/usr/bin/env node
/**
 * CLI wrapper for ditherto
 * 
 * Provides command-line interface for batch processing images
 */

// import { parseArgs } from 'node:util'; // TODO: Use when implementing CLI
// import { ditherImage } from './imageProcessor.js'; // TODO: Use when implementing CLI
// import type { DitherOptions } from './types.js'; // TODO: Use when implementing CLI

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
  // TODO: Implement CLI argument parsing and image processing
  // This stub ensures the CLI module loads without errors
  console.log('CLI not yet implemented - use showHelp() for usage info');
  showHelp();
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}