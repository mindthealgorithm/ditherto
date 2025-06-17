// ABOUTME: Tests for CLI argument parsing and command-line interface functionality
// ABOUTME: Covers argument parsing, flag validation, help text, and file operations

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { parseCliArgs, validateCliArgs, showHelp, processFiles } from '../cli.js';
import { access, writeFile, mkdir } from 'node:fs/promises';

// Mock process.exit and console methods
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock fs operations
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('../imageProcessor.js', () => ({
  ditherImage: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
}));

describe('CLI argument parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCliArgs', () => {
    it('should parse basic input and output arguments', () => {
      const args = ['input.png', '-o', 'output.png'];
      const result = parseCliArgs(args);
      
      expect(result.input).toBe('input.png');
      expect(result.output).toBe('output.png');
    });

    it('should parse algorithm flag', () => {
      const args = ['input.png', '--algorithm', 'floyd-steinberg'];
      const result = parseCliArgs(args);
      
      expect(result.algorithm).toBe('floyd-steinberg');
    });

    it('should parse width and height flags', () => {
      const args = ['input.png', '--width', '300', '--height', '200'];
      const result = parseCliArgs(args);
      
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });

    it('should parse step flag', () => {
      const args = ['input.png', '--step', '2'];
      const result = parseCliArgs(args);
      
      expect(result.step).toBe(2);
    });

    it('should parse quality flag', () => {
      const args = ['input.png', '--quality', '0.8'];
      const result = parseCliArgs(args);
      
      expect(result.quality).toBe(0.8);
    });

    it('should parse palette image flag', () => {
      const args = ['input.png', '--paletteimg', 'palette.png'];
      const result = parseCliArgs(args);
      
      expect(result.paletteImg).toBe('palette.png');
    });

    it('should handle help flag', () => {
      const args = ['input.png', '--help'];
      const result = parseCliArgs(args);
      
      expect(result.help).toBe(true);
      expect(result.input).toBe('input.png');
    });

    it('should handle version flag', () => {
      const args = ['input.png', '--version'];
      const result = parseCliArgs(args);
      
      expect(result.version).toBe(true);
      expect(result.input).toBe('input.png');
    });

    it('should handle short flags', () => {
      const args = ['input.png', '-o', 'output.png', '-h'];
      const result = parseCliArgs(args);
      
      expect(result.input).toBe('input.png');
      expect(result.output).toBe('output.png');
      expect(result.help).toBe(true);
    });

    it('should handle multiple arguments', () => {
      const args = [
        'input.png',
        '-o', 'output.png',
        '--algorithm', 'atkinson',
        '--width', '400',
        '--step', '2',
        '--quality', '0.9'
      ];
      const result = parseCliArgs(args);
      
      expect(result.input).toBe('input.png');
      expect(result.output).toBe('output.png');
      expect(result.algorithm).toBe('atkinson');
      expect(result.width).toBe(400);
      expect(result.step).toBe(2);
      expect(result.quality).toBe(0.9);
    });

    it('should throw error for unknown flags', () => {
      const args = ['input.png', '--unknown-flag'];
      
      expect(() => parseCliArgs(args)).toThrow();
    });
  });

  describe('validateCliArgs', () => {
    it('should validate required input file', () => {
      const args = { output: 'output.png' };
      
      expect(() => validateCliArgs(args)).toThrow('Input file is required');
    });

    it('should validate algorithm values', () => {
      const args = { 
        input: 'input.png',
        algorithm: 'invalid-algorithm' 
      };
      
      expect(() => validateCliArgs(args)).toThrow('Invalid algorithm');
    });

    it('should validate width is positive', () => {
      const args = { 
        input: 'input.png',
        width: 0 
      };
      
      expect(() => validateCliArgs(args)).toThrow('Width must be greater than 0');
    });

    it('should validate height is positive', () => {
      const args = { 
        input: 'input.png',
        height: -1 
      };
      
      expect(() => validateCliArgs(args)).toThrow('Height must be greater than 0');
    });

    it('should validate step is positive', () => {
      const args = { 
        input: 'input.png',
        step: 0 
      };
      
      expect(() => validateCliArgs(args)).toThrow('Step must be greater than 0');
    });

    it('should validate quality range', () => {
      const args = { 
        input: 'input.png',
        quality: 1.5 
      };
      
      expect(() => validateCliArgs(args)).toThrow('Quality must be between 0 and 1');
    });

    it('should pass validation for valid arguments', () => {
      const args = { 
        input: 'input.png',
        output: 'output.png',
        algorithm: 'atkinson',
        width: 300,
        height: 200,
        step: 2,
        quality: 0.8
      };
      
      expect(() => validateCliArgs(args)).not.toThrow();
    });
  });
});

describe('help text generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display help text', () => {
    showHelp();
    
    expect(mockConsoleLog).toHaveBeenCalled();
    const helpText = mockConsoleLog.mock.calls[0][0];
    expect(helpText).toContain('ditherto - Pixelate your life');
    expect(helpText).toContain('Usage:');
    expect(helpText).toContain('Options:');
  });

  it('should include all CLI options in help text', () => {
    showHelp();
    
    const helpText = mockConsoleLog.mock.calls[0][0];
    expect(helpText).toContain('-o, --output');
    expect(helpText).toContain('--algorithm');
    expect(helpText).toContain('--paletteimg');
    expect(helpText).toContain('--width');
    expect(helpText).toContain('--height');
    expect(helpText).toContain('--step');
    expect(helpText).toContain('--quality');
    expect(helpText).toContain('-h, --help');
    expect(helpText).toContain('-v, --version');
  });
});

describe('file processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process single file', async () => {
    const args = {
      input: 'input.png',
      output: 'output.png',
      algorithm: 'atkinson' as const
    };

    // Mock file exists
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);
    
    await expect(processFiles(args)).resolves.not.toThrow();
    expect(access).toHaveBeenCalledWith('input.png');
    expect(writeFile).toHaveBeenCalled();
  });

  it('should handle file processing errors', async () => {
    const args = {
      input: 'nonexistent.png',
      output: 'output.png'
    };

    // Mock file doesn't exist
    vi.mocked(access).mockRejectedValue(new Error('File not found'));

    await expect(processFiles(args)).rejects.toThrow('Input file not found');
  });

  it('should validate input file exists', async () => {
    const args = {
      input: 'missing.png',
      output: 'output.png'
    };

    // Mock file doesn't exist
    vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

    await expect(processFiles(args)).rejects.toThrow('Input file not found');
  });

  it('should handle output directory creation', async () => {
    const args = {
      input: 'input.png',
      output: 'subdir/output.png'
    };

    // Mock file exists and directory creation
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    await expect(processFiles(args)).resolves.not.toThrow();
    expect(mkdir).toHaveBeenCalledWith('subdir', { recursive: true });
  });

  it('should use default output filename when not specified', async () => {
    const args = {
      input: 'test.jpg',
      algorithm: 'atkinson' as const
    };

    // Mock file exists
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    await expect(processFiles(args)).resolves.not.toThrow();
    expect(writeFile).toHaveBeenCalledWith('test.dithered.png', expect.any(Uint8Array));
  });

  it('should pass all options to ditherImage', async () => {
    const { ditherImage } = await import('../imageProcessor.js');
    
    const args = {
      input: 'input.png',
      output: 'output.png',
      algorithm: 'floyd-steinberg' as const,
      width: 300,
      height: 200,
      step: 2,
      quality: 0.8,
      paletteImg: 'palette.png'
    };

    // Mock file exists
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    await processFiles(args);

    expect(ditherImage).toHaveBeenCalledWith('input.png', {
      algorithm: 'floyd-steinberg',
      width: 300,
      height: 200,
      step: 2,
      quality: 0.8,
      paletteImg: 'palette.png'
    });
  });
});

describe('error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing input file gracefully', () => {
    const args = [];
    
    expect(() => parseCliArgs(args)).toThrow('Input file is required');
  });

  it('should handle invalid numeric arguments', () => {
    const args = ['input.png', '--width', 'not-a-number'];
    
    expect(() => parseCliArgs(args)).toThrow();
  });

  it('should handle missing flag values', () => {
    const args = ['input.png', '--output'];
    
    expect(() => parseCliArgs(args)).toThrow();
  });
});