/**
 * CLI wrapper for ditherto
 * 
 * Provides command-line interface for batch processing images
 */

import { parseArgs } from 'node:util';
import { writeFile, access, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ditherImage } from './imageProcessor.js';
import type { DitherOptions } from './types.js';

export interface CliArgs {
  input: string;
  output: string | undefined;
  algorithm: 'atkinson' | 'floyd-steinberg' | 'ordered' | undefined;
  paletteImg: string | undefined;
  width: number | undefined;
  height: number | undefined;
  step: number | undefined;
  quality: number | undefined;
  help: boolean | undefined;
  version: boolean | undefined;
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

  if (!positionals[0]) {
    throw new Error('Input file is required');
  }

  const result: CliArgs = {
    input: positionals[0],
    output: values.output,
    algorithm: values.algorithm as CliArgs['algorithm'],
    paletteImg: values.paletteimg,
    width: values.width as number | undefined,
    height: values.height as number | undefined,
    step: values.step as number | undefined,
    quality: values.quality as number | undefined,
    help: values.help,
    version: values.version,
  };

  // Parse numeric values
  if (values.width) {
    const width = Number.parseInt(values.width);
    if (Number.isNaN(width)) throw new Error('Width must be a number');
    result.width = width;
  }

  if (values.height) {
    const height = Number.parseInt(values.height);
    if (Number.isNaN(height)) throw new Error('Height must be a number');
    result.height = height;
  }

  if (values.step) {
    const step = Number.parseInt(values.step);
    if (Number.isNaN(step)) throw new Error('Step must be a number');
    result.step = step;
  }

  if (values.quality) {
    const quality = Number.parseFloat(values.quality);
    if (Number.isNaN(quality)) throw new Error('Quality must be a number');
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

/**
 * Validate input file exists
 */
async function validateInputFile(inputPath: string): Promise<void> {
  try {
    await access(inputPath);
  } catch {
    throw new Error(`Input file not found: ${inputPath}`);
  }
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(outputPath: string): Promise<void> {
  const outputDir = dirname(outputPath);
  try {
    await mkdir(outputDir, { recursive: true });
  } catch {
    // Directory might already exist, ignore error
  }
}

/**
 * Convert CLI args to DitherOptions
 */
function buildDitherOptions(args: CliArgs): DitherOptions {
  const options: DitherOptions = {};
  
  if (args.algorithm) options.algorithm = args.algorithm;
  if (args.paletteImg) options.paletteImg = args.paletteImg;
  if (args.width) options.width = args.width;
  if (args.height) options.height = args.height;
  if (args.step) options.step = args.step;
  if (args.quality) options.quality = args.quality;
  
  return options;
}

/**
 * Write processed image to output file
 */
async function writeOutput(data: Uint8Array, args: CliArgs): Promise<void> {
  const outputPath = args.output || args.input.replace(/\.[^.]+$/, '.dithered.png');
  await writeFile(outputPath, data);
  console.log(`Processed: ${args.input} -> ${outputPath}`);
}

export async function processFiles(args: CliArgs): Promise<void> {
  if (!args.input) {
    throw new Error('Input file is required');
  }

  // Validate input and prepare output
  await validateInputFile(args.input);
  if (args.output) {
    await ensureOutputDirectory(args.output);
  }

  // Build options and process
  const options = buildDitherOptions(args);

  try {
    const result = await ditherImage(args.input, options);
    const outputData = result instanceof Uint8Array ? result : new Uint8Array(result.data.buffer);
    await writeOutput(outputData, args);
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