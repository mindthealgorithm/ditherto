import { test, expect } from '@playwright/test';
import { ditherToImageData, loadImageData, PALETTES } from '../../dist/index.js';
import { orientationError, pixelError } from '../helpers/photo-checks.js';

// Functions are passed as source because browser evaluation cannot import test-runner modules.
const helpers = { orientation: orientationError.toString(), pixels: pixelError.toString() };

test('JPEG orientation, tagged sRGB and lossless WebP through URL and Blob decoders', async ({ page }) => {
  await page.goto('/examples/classic-browser-demo.html');
  const results = await page.evaluate(async (helpers) => {
    const { loadImageData } = await import('/dist/browser.js');
    const orientationError = (0, eval)(`(${helpers.orientation})`);
    const pixelError = (0, eval)(`(${helpers.pixels})`);
    const output = [];
    for (const mode of ['url', 'blob']) {
      const load = async (name) => {
        const url = `/tests/fixtures/photos/${name}`;
        return loadImageData(mode === 'url' ? url : await (await fetch(url)).blob());
      };
      const base = await load('coffee.jpg');
      for (let orientation = 2; orientation <= 8; orientation++) {
        const result = await load(`coffee-orientation-${orientation}.jpg`);
        output.push({ mode, orientation, width: result.width, height: result.height, error: orientationError(base, result, orientation) });
      }
      output.push({ mode, kind: 'icc', error: pixelError(base, await load('coffee-srgb.jpg')) });
      output.push({ mode, kind: 'webp', error: pixelError(await load('coffee.png'), await load('coffee.webp')) });
    }
    return output;
  }, helpers);
  for (const result of results) {
    if (result.orientation) {
      expect([result.width, result.height], JSON.stringify(result)).toEqual(result.orientation >= 5 ? [400, 600] : [600, 400]);
      expect(result.error, JSON.stringify(result)).toBe(0);
    } else expect(result.error, JSON.stringify(result)).toBeLessThanOrEqual(result.kind === 'icc' ? 1 : 0);
  }
});

for (const name of ['astronaut', 'coffee', 'chelsea']) {
  test(`${name}: identical photographic pixels produce identical area+dither output in Node and browser`, async ({ page }) => {
    await page.goto('/examples/classic-browser-demo.html');
    // Decode in the browser, then use those exact pixels in Node: native JPEG/color
    // decoders are not promised byte-identical, but our transforms must be.
    const input = await page.evaluate(async (name) => {
      const { loadImageData } = await import('/dist/browser.js');
      const image = await loadImageData(`/tests/fixtures/photos/${name}.png`);
      window.photoInput = image;
      return { width: image.width, height: image.height, data: Array.from(image.data) };
    }, name);
    for (const algorithm of ['atkinson', 'floyd-steinberg', 'ordered']) {
      for (const step of [1, 3]) {
        const options = { algorithm, width: 37, step, resample: 'area' as const, palette: PALETTES.GAMEBOY };
        const expected = await ditherToImageData({ ...input, data: new Uint8ClampedArray(input.data), colorSpace: 'srgb' }, options);
        const actual = await page.evaluate(async (options) => {
          const { ditherToImageData } = await import('/dist/browser.js');
          const image = await ditherToImageData(window.photoInput, options);
          return { width: image.width, height: image.height, data: Array.from(image.data) };
        }, options);
        expect(actual).toEqual({ width: expected.width, height: expected.height, data: Array.from(expected.data) });
      }
    }
  });
}

test('photo controls, area/nearest comparison and rerendering from the original', async ({ page }, testInfo) => {
  await page.goto('/examples/classic-browser-demo.html');
  await page.locator('#photoSample').selectOption('coffee');
  await expect(page.locator('#sourceName')).toContainText('coffee');
  await expect(page.locator('#download')).toBeEnabled();
  await page.locator('#widthNumber').fill('96');
  await expect(page.locator('#resultCanvas')).toHaveJSProperty('width', 96);
  await expect(page.locator('#download')).toBeEnabled();
  const result = () => page.locator('#resultCanvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const area = await result();
  await page.locator('#resample').selectOption('nearest');
  await expect(page.locator('#download')).toBeEnabled();
  expect(await result()).not.toBe(area);
  await page.locator('#resample').selectOption('area');
  await expect(page.locator('#download')).toBeEnabled();
  expect(await result()).toBe(area);
  await page.locator('#widthNumber').fill('192');
  await expect(page.locator('#resultCanvas')).toHaveJSProperty('width', 192);
  await page.locator('#widthNumber').fill('96');
  await expect(page.locator('#resultCanvas')).toHaveJSProperty('width', 96);
  await expect(page.locator('#download')).toBeEnabled();
  expect(await result()).toBe(area);
  await expect(page.locator('#recipe')).toContainText("resample: 'area'");
  await page.screenshot({ path: testInfo.outputPath('photo-area.png'), fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloadPromise;
  const png = await loadImageData((await download.path())!);
  expect([png.width, png.height]).toEqual([96, 64]);
});

test('controls during a slow photo load wait for the new source; later source selection wins', async ({ page }) => {
  await page.goto('/examples/classic-browser-demo.html');
  await expect(page.locator('#download')).toBeEnabled();
  let release;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/photos/coffee.png', async route => { await gate; await route.continue(); });
  await page.locator('#photoSample').selectOption('coffee');
  await page.locator('#widthNumber').fill('37');
  await page.locator('#resample').selectOption('nearest');
  // Wait beyond the debounce without timing a transient disabled state.
  await expect(page.locator('#status')).toHaveText('Opening photograph…');
  await page.waitForTimeout(200);
  await expect(page.locator('#download')).toBeDisabled();
  await expect(page.locator('#status')).toHaveText('Opening photograph…');
  release();
  await expect(page.locator('#sourceName')).toContainText('coffee');
  await expect(page.locator('#resultCanvas')).toHaveJSProperty('width', 37);
  await expect(page.locator('#download')).toBeEnabled();
  const expected = await ditherToImageData('tests/fixtures/photos/coffee.png', { width:37, resample:'nearest', palette: [[37,33,59],[139,80,102],[221,167,123],[244,236,207]] });
  const pixels = await page.locator('#resultCanvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
  expect(pixels).toEqual(Array.from(expected.data));
  await page.unroute('**/photos/coffee.png');
  let releaseOld;
  const stale = new Promise<void>(resolve => { releaseOld = resolve; });
  let finished;
  const done = new Promise<void>(resolve => { finished = resolve; });
  await page.route('**/photos/astronaut.png', async route => { await stale; await route.continue(); finished(); });
  await page.locator('#photoSample').selectOption('astronaut');
  await page.locator('#photoSample').selectOption('chelsea');
  await expect(page.locator('#sourceName')).toContainText('chelsea');
  await expect(page.locator('#download')).toBeEnabled();
  releaseOld();
  await done;
  await page.waitForTimeout(200);
  await expect(page.locator('#sourceName')).toContainText('chelsea');
});
