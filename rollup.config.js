import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = ['fs', 'path', 'url'];

const commonConfig = {
  external,
};

export default [
  // Main library - ESM
  {
    ...commonConfig,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Main library - CommonJS
  {
    ...commonConfig,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Browser helper - ESM
  {
    ...commonConfig,
    input: 'src/browser.ts',
    output: {
      file: 'dist/browser.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Browser helper - CommonJS
  {
    ...commonConfig,
    input: 'src/browser.ts',
    output: {
      file: 'dist/browser.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // CLI
  {
    ...commonConfig,
    input: 'src/cli.ts',
    output: {
      file: 'dist/cli.js',
      format: 'es',
      sourcemap: true,
      banner: '#!/usr/bin/env node',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Type definitions
  {
    ...commonConfig,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  {
    ...commonConfig,
    input: 'src/browser.ts',
    output: {
      file: 'dist/browser.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];