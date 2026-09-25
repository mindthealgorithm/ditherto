import { test, expect } from '@playwright/test';
import { ditherToImageData } from '../../dist/index.js';

async function setup(page, html = '<div id="well" style="width:96px"><img id="photo" class="dither" alt="Coffee" src="/tests/fixtures/photos/coffee.png" data-exposure="0.3"></div>') {
  await page.route('**/dom-test', route => route.fulfill({contentType:'text/html', body:`<!doctype html><html><body>${html}</body></html>`}));
  await page.goto('/dom-test');
  await page.evaluate(async () => { window['api'] = await import('/dist/dom.js'); });
}
const pixels = page => page.locator('canvas').first().evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));

test('options layer predictably, resizing and updates use original pixels, cleanup restores the original node', async ({page}) => {
  await setup(page);
  await page.evaluate(async () => {
    const image = document.querySelector('img')!;
    window['original'] = image;
    window['clicks'] = 0;
    image.addEventListener('click', () => window['clicks']++);
    window['group'] = window['api'].observeDitherDOM('.dither', {exposure:-1, contrast:1.1, resample:'area'}, {
      debounceMs:0, resolveOptions: () => ({contrast:1.2}),
    });
    await window['group'].ready;
  });
  const expected = await ditherToImageData('tests/fixtures/photos/coffee.png', {width:96, exposure:0.3, contrast:1.2, resample:'area'});
  expect(await pixels(page)).toEqual(Array.from(expected.data));
  await expect(page.locator('canvas')).toHaveAttribute('aria-label','Coffee');
  await page.evaluate(async () => { await window['group'].images[0].update({exposure:0.8}); });
  expect(await pixels(page)).not.toEqual(Array.from(expected.data));
  await page.evaluate(async () => { await window['group'].images[0].update({exposure:undefined}); });
  expect(await pixels(page)).toEqual(Array.from(expected.data));
  await page.locator('#well').evaluate(el => (el as HTMLElement).style.width = '61px');
  await expect(page.locator('canvas')).toHaveJSProperty('width',61);
  const smaller = await ditherToImageData('tests/fixtures/photos/coffee.png', {width:61, exposure:0.3, contrast:1.2, resample:'area'});
  expect(await pixels(page)).toEqual(Array.from(smaller.data));
  await page.locator('#well').evaluate(el => (el as HTMLElement).style.width = '96px');
  await expect(page.locator('canvas')).toHaveJSProperty('width',96);
  expect(await pixels(page)).toEqual(Array.from(expected.data));
  expect(await page.evaluate(() => {
    window['group'].destroy(); window['group'].destroy();
    return document.querySelector('img') === window['original'];
  })).toBe(true);
  await page.locator('img').click();
  expect(await page.evaluate(() => window['clicks'])).toBe(1);
  await page.locator('#well').evaluate(el => (el as HTMLElement).style.width = '70px');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(async () => {
    try { await window['group'].images[0].update({exposure:1}); return ''; }
    catch (error) { return error.name; }
  })).toBe('AbortError');
  await page.evaluate(async () => { window['group'] = window['api'].observeDitherDOM('img'); await window['group'].ready; });
  await expect(page.locator('canvas')).toHaveJSProperty('width',70);
});

test('hidden images recover and a failed image does not block its neighbors', async ({page}) => {
  await setup(page, '<div style="width:80px"><img class="dither" src="/missing-photo.png"></div><div id="hidden" style="display:none;width:72px"><img class="dither" src="/tests/fixtures/photos/coffee.png"></div><div style="width:64px"><img class="dither" src="/tests/fixtures/photos/chelsea.png"></div>');
  const states = await page.evaluate(async () => {
    window['errors'] = [];
    window['group'] = window['api'].observeDitherDOM('img', {}, {debounceMs:0,onError:error => window['errors'].push(error.message)});
    return (await window['group'].ready).map(result => result.status === 'rejected' ? 'rejected' : result.value === null ? 'hidden' : 'rendered');
  });
  expect(states).toEqual(['rejected','hidden','rendered']);
  await page.locator('#hidden').evaluate(el => (el as HTMLElement).style.display = 'block');
  await expect(page.locator('#hidden canvas')).toHaveJSProperty('width',72);
  expect(await page.evaluate(() => window['errors'].length)).toBe(1);
});

test('slow stale renders cannot overwrite an update or reinsert after disposal', async ({page}) => {
  await setup(page);
  await page.evaluate(() => {
    window['jobs'] = []; window['painted'] = [];
    window['group'] = window['api'].observeDitherDOM('img', {}, {
      debounceMs:0,
      render:(source, options) => new Promise(resolve => window['jobs'].push({source,options,resolve})),
      onRender:canvas => window['painted'].push(canvas.width),
    });
  });
  await expect.poll(() => page.evaluate(() => window['jobs'].length)).toBe(1);
  expect(await page.evaluate(() => {
    try { window['api'].observeDitherDOM('img'); return ''; } catch(error) { return error.message; }
  })).toContain('already has');
  await page.evaluate(() => {
    window['updated'] = window['group'].images[0].update({width:43});
    window['jobs'][0].resolve(new ImageData(96,64));
  });
  await expect.poll(() => page.evaluate(() => window['jobs'].length)).toBe(2);
  expect(await page.evaluate(() => window['painted'])).toEqual([]);
  await page.evaluate(async () => { window['jobs'][1].resolve(new ImageData(43,29)); await window['updated']; });
  await expect(page.locator('canvas')).toHaveJSProperty('width',43);
  await page.evaluate(() => { window['disposedResult'] = window['group'].images[0].update({width:20}).catch(error => error.name); });
  await expect.poll(() => page.evaluate(() => window['jobs'].length)).toBe(3);
  expect(await page.evaluate(async () => {
    window['group'].destroy(); window['jobs'][2].resolve(new ImageData(20,13));
    return await window['disposedResult'];
  })).toBe('AbortError');
  await expect(page.locator('img')).toHaveCount(1);
  expect(await page.evaluate(() => window['painted'])).toEqual([43]);
});

test('refresh rereads changed sources and renderer mutation cannot corrupt cached originals', async ({page}) => {
  await setup(page);
  await page.evaluate(async () => {
    window['samples'] = [];
    window['group'] = window['api'].observeDitherDOM('img', {resample:'area'}, {debounceMs:0,render:async (source,options) => {
      window['samples'].push(source.data.reduce((sum, value, index) => sum + (index % 4 === 3 ? 0 : value), 0));
      const result = await window['api'].ditherToImageData(source,options);
      source.data.fill(0);
      return result;
    }});
    await window['group'].ready;
    await window['group'].images[0].update({contrast:1.2});
    const image = window['group'].images[0].image;
    image.src = '/tests/fixtures/photos/chelsea.png';
    image.dataset.exposure = '-0.3';
    await window['group'].images[0].refresh();
  });
  const samples = await page.evaluate(() => window['samples']);
  expect(samples[0]).toBeGreaterThan(0);
  expect(samples[1]).toBe(samples[0]);
  const expected = await ditherToImageData('tests/fixtures/photos/chelsea.png', {width:96,resample:'area',exposure:-0.3,contrast:1.2});
  expect(await pixels(page)).toEqual(Array.from(expected.data));
});

test('waiting on an unloaded image leaves the shared queue available', async ({page}) => {
  await setup(page, '<div style="width:60px"><img id="slow"></div><div style="width:60px"><img id="fast" src="/tests/fixtures/photos/chelsea.png"></div>');
  // Delay decoding at the source, not the renderer: native lazy images behave similarly.
  await page.route('**/delayed-photo.png', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.fulfill({path:'tests/fixtures/photos/coffee.png',contentType:'image/png'});
  });
  await page.evaluate(() => {
    document.querySelector<HTMLImageElement>('#slow')!.src = '/delayed-photo.png';
    window['order'] = [];
    window['group'] = window['api'].observeDitherDOM('img', {}, {debounceMs:0,onRender:(_,image) => window['order'].push(image.id)});
  });
  await expect(page.locator('canvas#fast')).toHaveCount(1);
  expect(await page.evaluate(() => window['order'][0])).toBe('fast');
  await expect(page.locator('canvas#slow')).toHaveCount(1);
});

test('shared-worker gallery tunes images independently, rerenders on resize, and restores/rebinds', async ({page}, testInfo) => {
  // Keep polling in the browser: serializing half a million numbers per attempt
  // can exhaust the assertion timeout on a shared CI runner.
  const snapshot = () => page.locator('canvas').first().evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.goto('/examples/classic-responsive-demo.html');
  await expect(page.locator('.gallery canvas')).toHaveCount(3);
  const before = await snapshot();
  const second = await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.locator('.exposure').first().fill('1.1');
  await expect.poll(snapshot).not.toBe(before);
  expect(await page.locator('canvas').nth(1).evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(second);
  const originalWidth = await page.locator('canvas').first().evaluate((c: HTMLCanvasElement) => c.width);
  await page.locator('#galleryWidth').fill('45');
  await expect.poll(() => page.locator('canvas').first().evaluate((c: HTMLCanvasElement) => c.width)).not.toBe(originalWidth);
  await page.locator('#galleryWidth').fill('100');
  await expect(page.locator('canvas').first()).toHaveJSProperty('width', originalWidth);
  await page.locator('#texture').selectOption('ordered');
  await page.locator('#colors').selectOption('ink');
  await expect.poll(() => page.locator('canvas').first().evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.every((value,index) => index%4 === 3 ? value === 255 : value === 0 || value === 255))).toBe(true);
  await page.screenshot({path:testInfo.outputPath('responsive-gallery.png'),fullPage:true});
  await page.locator('#toggle').click();
  await expect(page.locator('.gallery img')).toHaveCount(3);
  await expect(page.locator('.gallery canvas')).toHaveCount(0);
  await page.locator('#toggle').click();
  await expect(page.locator('.gallery canvas')).toHaveCount(3);
  await expect(page.locator('.exposure').first()).toHaveValue('1.1');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => page.locator('canvas').first().evaluate((c: HTMLCanvasElement) => Math.abs(c.width - c.parentElement!.clientWidth) <= 1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('responsive-gallery-mobile.png'),fullPage:true});
});

test('disposing a stuck renderer releases the queue; update failures retain the previous canvas', async ({page}) => {
  await setup(page, '<div style="width:60px"><img src="/tests/fixtures/photos/coffee.png"></div><div style="width:60px"><img src="/tests/fixtures/photos/chelsea.png"></div>');
  await page.evaluate(() => {
    window['started'] = false;
    let first = true;
    window['group'] = window['api'].observeDitherDOM('img', {}, {debounceMs:0,render: (source,options) => {
      if (first) { first = false; window['started'] = true; return new Promise(() => {}); }
      return window['api'].ditherToImageData(source, options);
    }});
  });
  await expect.poll(() => page.evaluate(() => window['started'])).toBe(true);
  await page.evaluate(() => window['group'].images[0].destroy());
  await expect(page.locator('canvas')).toHaveCount(1);
  const before = await pixels(page);
  expect(await page.evaluate(async () => {
    try { await window['group'].images[1].update({exposure:99}); return ''; }
    catch (error) { return error.message; }
  })).toMatch(/exposure/i);
  expect(await pixels(page)).toEqual(before);
  expect(await page.evaluate(() => !!window['group'].images[1].error)).toBe(true);
  await page.evaluate(async () => { await window['group'].images[1].update({exposure:0.4}); });
  expect(await page.evaluate(() => window['group'].images[1].error)).toBe(null);
  expect(await pixels(page)).not.toEqual(before);
});

test('a burst of per-image updates coalesces and all callers receive the latest result', async ({page}) => {
  await setup(page);
  expect(await page.evaluate(async () => {
    let calls = 0;
    const group = window['api'].observeDitherDOM('img', {}, {debounceMs:30,render:async (source,options) => {
      calls++;
      return window['api'].ditherToImageData(source,options);
    }});
    const handle = group.images[0];
    const results = await Promise.all([handle.ready, handle.update({width:30}), handle.update({width:40}), handle.update({width:50})]);
    const value = {calls, widths:results.map(c => c.width), identical:results.every(c => c === results[0])};
    group.destroy();
    return value;
  })).toEqual({calls:1,widths:[50,50,50,50],identical:true});
});
