import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ditherToImageData, PALETTES, loadImageData } from '../dist/index.js';
import { encodePng } from '../dist/node.js';
const require = createRequire(import.meta.url);
// npm can prune other platforms from a lockfile when node_modules already exists.
// Preserve these optional binaries so a successful local build also installs in CI.
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
for (const name of ['rollup', 'esbuild']) {
  for (const [dependency, version] of Object.entries(lock.packages[`node_modules/${name}`].optionalDependencies)) {
    if (!dependency.startsWith('@')) continue;
    assert.equal(lock.packages[`node_modules/${dependency}`]?.version, version, `Missing or mismatched platform binary: ${dependency}`);
  }
}
const cjs = require('../dist/index.cjs');
const input = await loadImageData('tests/fixtures/input/gradient-4x4.png');
const result = await ditherToImageData(input, { width: 8, palette: PALETTES.GAMEBOY });
assert.deepEqual((await cjs.ditherToImageData(input, { width: 8, palette: PALETTES.GAMEBOY })).data, result.data);
assert.equal(encodePng(result).readUInt32BE(0), 0x89504e47);
const browser = await readFile(new URL('../dist/browser.js', import.meta.url), 'utf8');
assert(!browser.includes('@napi-rs/canvas') && !browser.includes('node:'), 'Browser bundle must not reference Node modules');
const browserGzipBytes = gzipSync(browser).length;
const browserBudgetBytes = 12 * 1024;
assert(browserGzipBytes <= browserBudgetBytes, `Browser bundle is ${browserGzipBytes} gzip bytes, exceeding the ${browserBudgetBytes}-byte budget. Review optional entry points before raising the budget.`);
console.log(`Browser bundle: ${Buffer.byteLength(browser)} bytes raw, ${browserGzipBytes} gzip bytes (budget ${browserBudgetBytes}).`);
const dom = await readFile(new URL('../dist/dom.js', import.meta.url), 'utf8');
assert(!dom.includes('@napi-rs/canvas') && !dom.includes('node:'), 'DOM bundle must not reference Node modules');
assert.equal(typeof require('../dist/dom.cjs').observeDitherDOM, 'function');
assert.equal(typeof (await import('../dist/dom.js')).observeDitherDOM, 'function');
const domGzipBytes = gzipSync(dom).length;
assert(domGzipBytes <= 16 * 1024, 'Optional DOM bundle exceeded its 16 KiB gzip budget');
console.log(`Optional DOM bundle: ${Buffer.byteLength(dom)} bytes raw, ${domGzipBytes} gzip bytes (includes core).`);
const consumer = `import { ditherToImageData, generatePalette, PALETTES } from 'ditherto';
import { encodePng } from 'ditherto/node';
import { observeDitherDOM, type DitherDOMController } from 'ditherto/dom';
function mount() {
  const controller: DitherDOMController = observeDitherDOM('img', {resample:'area'});
  void controller.images[0]?.update({exposure:undefined});
  controller.destroy();
}
void mount;
import { ditherToImageData as browserDither } from 'ditherto/browser';
async function check(image: ImageData) {
  const result = await ditherToImageData(image, { palette: PALETTES.GAMEBOY, resample: 'area' });
  encodePng(result);
  const palette = await generatePalette(image, { colors: 8 });
  await browserDither(image, { paletteImg: image, paletteColors: 8, exposure: 0.5, contrast: 1.2 });
  await ditherToImageData(image, { palette });
  return browserDither(image, { palette: PALETTES.BW, resample: 'area' });
}
void check;
`;
for (const extension of ['mts', 'cts']) {
  const path = `.build/consumer.${extension}`;
  await writeFile(path, consumer);
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--exactOptionalPropertyTypes', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--skipLibCheck', path], { stdio: 'pipe' });
}
const temp = await mkdtemp(join(tmpdir(), 'ditherto-package-'));
try {
  const cli = resolve('dist/cli.js');
  assert.match(execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' }), /Usage:/);
  assert.equal(execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' }).trim(), '0.1.0');
  const link = join(temp, 'ditherto');
  await symlink(cli, link);
  assert.match(execFileSync(process.execPath, [link, '--help'], { encoding: 'utf8' }), /Usage:/);
  const output = join(temp, 'resized.png');
  execFileSync(process.execPath, [cli, 'tests/fixtures/input/gradient-4x4.png', '-o', output, '--width', '7']);
  const decoded = await loadImageData(output);
  assert.deepEqual([decoded.width, decoded.height], [7, 7]);
  const photoOutput = join(temp, 'photo.png');
  execFileSync(process.execPath, [cli, 'tests/fixtures/photos/coffee.jpg', '-o', photoOutput, '--width', '37', '--resample', 'area', '--paletteimg', 'tests/fixtures/photos/astronaut.png', '--palette-colors', '8', '--exposure', '0.5', '--contrast', '1.2']);
  const expectedPhoto = await ditherToImageData('tests/fixtures/photos/coffee.jpg', { width: 37, resample: 'area', paletteImg: 'tests/fixtures/photos/astronaut.png', paletteColors: 8, exposure: 0.5, contrast: 1.2 });
  assert.deepEqual((await loadImageData(photoOutput)).data, expectedPhoto.data);
  for (const args of [['--palette-colors','0'], ['--palette-colors','257'], ['--palette-colors','8'], ['--exposure','NaN'], ['--exposure','5'], ['--contrast','-1'], ['--resample', 'invalid'], ['--width', '2px'], ['--width', '1.5'], ['--quality', 'NaN'], ['-o', join(temp, 'wrong.jpg')]]) {
    assert.equal(spawnSync(process.execPath, [cli, 'tests/fixtures/input/gradient-4x4.png', ...args]).status, 1);
  }
} finally { await rm(temp, { recursive: true, force: true }); }
console.log('Package smoke checks passed: ESM/CJS runtime and declaration parity, browser isolation, PNG encoder, CLI help/version/symlink/resizing/validation.');
