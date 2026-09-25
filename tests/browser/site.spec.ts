import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { loadImageData } from '../../dist/index.js';

test('homepage links both playgrounds and stays readable on mobile', async ({page},testInfo) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/index.html');
  await expect(page.locator('h1')).toContainText('A little less color.');
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath('homepage-desktop.png'),fullPage:true});
  await page.getByRole('link',{name:'Try an image'}).click();
  await expect(page.locator('#download')).toBeEnabled();
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await page.getByRole('link',{name:'See it across a page'}).click();
  await expect(page.locator('.gallery canvas')).toHaveCount(3);
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('homepage-mobile.png'),fullPage:true});
  expect(errors).toEqual([]);
});

test('exported CLI recipes reproduce named and photo palettes pixel-for-pixel', async ({page},testInfo) => {
  await page.goto('/');
  await page.locator('#photoSample').selectOption('coffee');
  await expect(page.locator('#sourceName')).toContainText('coffee');
  await expect(page.locator('#download')).toBeEnabled();
  await page.locator('#widthNumber').fill('80');
  await expect(page.locator('#resultCanvas')).toHaveJSProperty('width',80);
  await expect(page.locator('#download')).toBeEnabled();
  for(const palette of ['MONO_RED','PHOTO']) {
    await page.locator('#palette').selectOption(palette);
    await expect(page.locator('#copyCli')).toBeEnabled();
    const command=await page.locator('#cliRecipe').textContent();
    const args=command!.match(/(?:[^\s']+|'[^']*')+/g)!.slice(2).map(value=>value.replace(/^'|'$/g,''));
    args[0]='tests/fixtures/photos/coffee.png';
    const path=testInfo.outputPath(`cli-${palette}.png`);
    args[args.indexOf('-o')+1]=path;
    const record=JSON.parse(execFileSync(process.execPath,['dist/cli.js',...args],{encoding:'utf8'}));
    expect(record.width).toBe(80);
    const decoded=await loadImageData(path);
    const actual=await page.locator('#resultCanvas').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
    expect(actual).toEqual(Array.from(decoded.data));
  }
  await page.locator('#paletteColors').fill('0');
  await expect(page.locator('#copyCli')).toBeDisabled();
  await expect(page.locator('#copy')).toBeDisabled();
});

test('gallery recipe follows shared style and individual exposure', async ({page}) => {
  await page.goto('/examples/responsive-demo.html');
  await expect(page.locator('.gallery canvas')).toHaveCount(3);
  await page.locator('#colors').selectOption('blue');
  await page.locator('#texture').selectOption('ordered');
  await page.locator('.exposure').first().fill('0.8');
  await expect(page.locator('#galleryRecipe')).toContainText("algorithm: 'ordered'");
  await expect(page.locator('#galleryRecipe')).toContainText('[[0,0,255],[255,255,255]]');
  await expect(page.locator('#galleryRecipe')).toContainText('"exposure": 0.8');
  await expect(page.locator('#galleryRecipe')).toContainText('"exposure": 0.2');
});
