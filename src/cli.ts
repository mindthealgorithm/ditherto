/**
 * CLI wrapper for ditherto
 *
 * Provides command-line interface for batch processing images
 */

import { parseArgs } from 'node:util';
import { writeFile, access, mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { encodePng } from './node.js';
import { ditherToImageData, validateOptions } from './imageProcessor.js';
import type { DitherOptions } from './types.js';

export interface CliArgs {
  input: string;
  output: string | undefined;
  algorithm: 'atkinson' | 'floyd-steinberg' | 'ordered' | undefined;
  resample?: DitherOptions['resample'];
  paletteImg: string | undefined;
  paletteColors?: number;
  exposure?: number;
  contrast?: number;
  width: number | undefined;
  height: number | undefined;
  step: number | undefined;
  quality: number | undefined;
  help: boolean | undefined;
  version: boolean | undefined;
}

function parseNumber(value: string | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '' || !Number.isFinite(Number(value)))
    throw new Error(`${label} must be a number`);
  return Number(value);
}

export function parseCliArgs(args: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: 'string', short: 'o' },
      algorithm: { type: 'string' },
      paletteimg: { type: 'string' },
      'palette-colors': { type: 'string' },
      resample: { type: 'string' },
      exposure: { type: 'string' },
      contrast: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      step: { type: 'string' },
      quality: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
  });

  if (!positionals[0] && !values.help && !values.version) {
    throw new Error('Input file is required');
  }

  if (positionals.length > 1)
    throw new Error('Expected one input file; use a shell loop for batch processing');

  const result: CliArgs = {
    input: positionals[0] ?? '',
    output: values.output,
    algorithm: values.algorithm as CliArgs['algorithm'],
    paletteImg: values.paletteimg,
    width: parseNumber(values.width, 'Width'),
    height: parseNumber(values.height, 'Height'),
    step: parseNumber(values.step, 'Step'),
    quality: parseNumber(values.quality, 'Quality'),
    help: values.help,
    version: values.version,
  };

  if (values.exposure !== undefined) result.exposure = parseNumber(values.exposure, 'Exposure')!;
  if (values.contrast !== undefined) result.contrast = parseNumber(values.contrast, 'Contrast')!;
  if (values['palette-colors'] !== undefined)
    result.paletteColors = parseNumber(values['palette-colors'], 'Palette color count')!;
  if (values.resample !== undefined) {
    if (values.resample !== 'nearest' && values.resample !== 'area')
      throw new Error('Resample must be nearest or area');
    result.resample = values.resample;
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

  validateOptions(buildDitherOptions(args));
}

export function showHelp(): void {
  console.log(`
ditherto - Pixelate your life by dithering images

Usage:
  ditherto input.png -o output.png [options]

Options:
  -o, --output <file>     Output file path
  --algorithm <name>      Dither algorithm (atkinson|floyd-steinberg|ordered)
  --paletteimg <file>     Swatch or photo for palette extraction
  --palette-colors <n>    Choose up to 1–256 colors from paletteimg
  --width <number>        Target max width
  --height <number>       Target max height  
  --resample <method>     Resize filter (nearest|area), default nearest
  --exposure <stops>      Exposure in stops (-4 to 4), default 0
  --contrast <factor>     Contrast slope (0 to 2), default 1
  --step <number>         Pixel block size (>=1)
  --quality <number>      Reserved quality hint (PNG is lossless)
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
  await mkdir(outputDir, { recursive: true });
}

/**
 * Convert CLI args to DitherOptions
 */
function buildDitherOptions(args: CliArgs): DitherOptions {
  const options: DitherOptions = {};

  if (args.algorithm) options.algorithm = args.algorithm;
  if (args.resample !== undefined) options.resample = args.resample;
  if (args.paletteImg) options.paletteImg = args.paletteImg;
  if (args.paletteColors !== undefined) options.paletteColors = args.paletteColors;
  if (args.exposure !== undefined) options.exposure = args.exposure;
  if (args.contrast !== undefined) options.contrast = args.contrast;
  if (args.width !== undefined) options.width = args.width;
  if (args.height !== undefined) options.height = args.height;
  if (args.step !== undefined) options.step = args.step;
  if (args.quality !== undefined) options.quality = args.quality;

  return options;
}

/** Load once, retain dimensions/alpha, and only write extensions we actually encode. */
export async function processFiles(args: CliArgs): Promise<void> {
  validateCliArgs(args);
  const extension = extname(args.input);
  const output =
    args.output ??
    `${extension ? args.input.slice(0, -extension.length) : args.input}.dithered.png`;
  if (extname(output).toLowerCase() !== '.png')
    throw new Error('Output must use .png; other encoders are not yet supported');
  await validateInputFile(args.input);
  await ensureOutputDirectory(output);
  try {
    const result = await ditherToImageData(args.input, buildDitherOptions(args));
    await writeFile(output, encodePng(result));
    console.log(`Processed: ${args.input} -> ${output}`);
  } catch (error) {
    throw new Error(
      `Failed to process ${args.input}: ${error instanceof Error ? error.message : String(error)}`
    );
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

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  void main();
}
