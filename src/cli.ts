/**
 * CLI wrapper for ditherto
 * 
 * Provides command-line interface for batch processing images
 */

import { parseArgs } from 'node:util';
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ditherImage } from './imageProcessor.js';
import type { DitherOptions } from './types.js';

export interface CliArgs {
  input?: string;
  output?: string;
  algorithm?: 'atkinson' | 'floyd-steinberg' | 'ordered';
  paletteImg?: string;
  width?: number;
  height?: number;
  step?: number;
  quality?: number;
  help?: boolean;
  version?: boolean;
}

export function parseCliArgs(args: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: 'string', short: 'o' },
      algorithm: { type: 'string' },
      paletteimg: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      step: { type: 'string' },
      quality: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
  });

  const result: CliArgs = {
    input: positionals[0],
    output: values.output,
    algorithm: values.algorithm as CliArgs['algorithm'],
    paletteImg: values.paletteimg,
    help: values.help,
    version: values.version,
  };

  // Parse numeric values
  if (values.width) {
    const width = parseInt(values.width);
    if (isNaN(width)) throw new Error('Width must be a number');
    result.width = width;
  }

  if (values.height) {
    const height = parseInt(values.height);
    if (isNaN(height)) throw new Error('Height must be a number');
    result.height = height;
  }

  if (values.step) {
    const step = parseInt(values.step);
    if (isNaN(step)) throw new Error('Step must be a number');
    result.step = step;
  }

  if (values.quality) {
    const quality = parseFloat(values.quality);
    if (isNaN(quality)) throw new Error('Quality must be a number');
    result.quality = quality;
  }

  return result;
}

export function validateCliArgs(args: CliArgs): void {
  if (!args.input && !args.help && !args.version) {
    throw new Error('Input file is required');
  }

  if (args.algorithm && !['atkinson', 'floyd-steinberg', 'ordered'].includes(args.algorithm)) {
    throw new Error('Invalid algorithm. Must be: atkinson, floyd-steinberg, or ordered');
  }

  if (args.width !== undefined && args.width <= 0) {
    throw new Error('Width must be greater than 0');
  }

  if (args.height !== undefined && args.height <= 0) {
    throw new Error('Height must be greater than 0');
  }

  if (args.step !== undefined && args.step <= 0) {
    throw new Error('Step must be greater than 0');
  }

  if (args.quality !== undefined && (args.quality < 0 || args.quality > 1)) {
    throw new Error('Quality must be between 0 and 1');
  }
}

export function showHelp(): void {
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

export function showVersion(): void {
  console.log('0.1.0');
}

export async function processFiles(args: CliArgs): Promise<void> {
  if (!args.input) {
    throw new Error('Input file is required');
  }

  // Check if input file exists
  try {
    await access(args.input);
  } catch {
    throw new Error(`Input file not found: ${args.input}`);
  }

  // Create output directory if needed
  if (args.output) {
    const outputDir = dirname(args.output);
    try {
      await mkdir(outputDir, { recursive: true });
    } catch {
      // Directory might already exist, ignore error
    }
  }

  // Convert CLI args to DitherOptions
  const options: DitherOptions = {
    algorithm: args.algorithm,
    paletteImg: args.paletteImg,
    width: args.width,
    height: args.height,
    step: args.step,
    quality: args.quality,
  };

  try {
    // Process the image
    const result = await ditherImage(args.input, options);
    
    if (args.output) {
      // Write result to file
      await writeFile(args.output, result);
      console.log(`Processed: ${args.input} -> ${args.output}`);
    } else {
      // Write to stdout or default name
      const defaultOutput = args.input.replace(/\.[^.]+$/, '.dithered.png');
      await writeFile(defaultOutput, result);
      console.log(`Processed: ${args.input} -> ${defaultOutput}`);
    }
  } catch (error) {
    throw new Error(`Failed to process ${args.input}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<void> {
  try {
    const args = parseCliArgs(process.argv.slice(2));

    if (args.help) {
      showHelp();
      return;
    }

    if (args.version) {
      showVersion();
      return;
    }

    validateCliArgs(args);
    await processFiles(args);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}