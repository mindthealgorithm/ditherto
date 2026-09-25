import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { loadImageData, ditherToImageData, PALETTES } from '../../dist/index.js';
import { createHash } from 'node:crypto';

const dusk = [[37,33,59],[139,80,102],[221,167,123],[244,236,207]];

test('homepage rerenders original photographs and preserves displayed palette colors on resize', async ({browser,baseURL}) => {
  test.setTimeout(60_000);
  for (const deviceScaleFactor of [1,1.25,2]) {
    const context = await browser.newContext({deviceScaleFactor, viewport:{width:1280,height:1000}});
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/index.html`);
      await expect(page.locator('canvas.live-dither')).toHaveCount(7);
      const recipes = [
        {photo:'coffee',palette:dusk,exposure:0.3,contrast:1.1},
        {photo:'chelsea',palette:PALETTES.MONO_BLUE},
        {photo:'chelsea',palette:dusk},
        {photo:'chelsea',palette:PALETTES.GAMEBOY},
        ...['atkinson','floyd-steinberg','ordered'].map(algorithm=>({photo:'astronaut',palette:PALETTES.BW,algorithm})),
      ];
      // The final width repeats the first: resizing must never redither a previous output.
      for (const width of [1280,393,901,1280]) {
        await page.setViewportSize({width,height:1000});
        for (let index=0;index<recipes.length;index++) {
          const canvas=page.locator('canvas.live-dither').nth(index);
          const displayWidth=await canvas.evaluate(c=>c.parentElement!.clientWidth);
          const {photo,...options}=recipes[index];
          const expected=await ditherToImageData(`tests/fixtures/photos/${photo}.png`,{...options,width:displayWidth,resample:'area'});
          const hash=createHash('sha256').update(expected.data).digest('hex');
          await expect.poll(()=>canvas.evaluate(async(c:HTMLCanvasElement)=>{
            const bytes=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
            const digest=await crypto.subtle.digest('SHA-256',bytes);
            return {width:c.width,hash:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')};
          })).toEqual({width:displayWidth,hash});
        }
        // Inspect composited screen pixels too: correct canvas data alone cannot catch CSS blur.
        const hero=page.locator('.hero-comparison canvas');
        await hero.scrollIntoViewIfNeeded();
        const box=(await hero.boundingBox())!;
        const screenshot=await page.screenshot({clip:{x:Math.ceil(box.x)+2,y:Math.ceil(box.y)+2,width:Math.floor(box.width)-4,height:Math.floor(box.height)-4}});
        const displayed=await loadImageData(screenshot);
        const allowed=new Set(dusk.map(color=>color.join(',')));
        let outside=0;
        for(let i=0;i<displayed.data.length;i+=4) if(!allowed.has(Array.from(displayed.data.subarray(i,i+3)).join(','))) outside++;
        expect(outside,`composited palette at viewport ${width}, DPR ${deviceScaleFactor}`).toBe(0);
      }
    } finally { await context.close(); }
  }
});

test('homepage links both playgrounds and stays readable on mobile', async ({page},testInfo) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/index.html');
  await expect(page.locator('h1')).toContainText('A little less color.');
  await expect(page.locator('canvas.live-dither')).toHaveCount(7);
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
  await expect(page.locator('canvas.live-dither')).toHaveCount(7);
  await expect.poll(()=>page.locator('canvas.live-dither').evaluateAll(canvases=>canvases.every((c:HTMLCanvasElement)=>c.width===c.parentElement!.clientWidth))).toBe(true);
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
