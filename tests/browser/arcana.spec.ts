import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { ditherToImageData, loadImageData } from '../../dist/index.js';
import { cards, themes, paletteFor } from '../../site/themes.js';

const hash = canvas => canvas.evaluate(async c => {
  const bytes = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
});
async function matchesOriginal(canvas, file, options) {
  const width = await canvas.evaluate(c=>c.parentElement.clientWidth);
  const pixels = await ditherToImageData(`site/tarot/${file}`,{width,resample:'area',...options});
  await expect.poll(()=>hash(canvas)).toBe(createHash('sha256').update(pixels.data).digest('hex'));
}

test('Arcana rerenders original cards and preserves composited palette colors at multiple densities', async ({browser,baseURL},testInfo) => {
  test.setTimeout(90_000);
  for(const deviceScaleFactor of [1,1.25,2]) {
    const context=await browser.newContext({deviceScaleFactor,viewport:{width:1280,height:1000}});
    const page=await context.newPage();
    try {
      await page.goto(`${baseURL}/`);
      await expect(page.locator('h1')).toHaveText('dither·to');
      await expect(page.locator('canvas.arcana-image')).toHaveCount(6);
      for(const width of [1280,393,850,1280]) {
        await page.setViewportSize({width,height:1000});
        const canvas=page.locator('.hero-card canvas');
        await matchesOriginal(canvas,'01-the-magician.png',{palette:paletteFor('amber'),exposure:0.3});
        await canvas.scrollIntoViewIfNeeded();
        const box=(await canvas.boundingBox())!;
        const displayed=await loadImageData(await page.screenshot({clip:{x:Math.ceil(box.x)+2,y:Math.ceil(box.y)+2,width:Math.floor(box.width)-4,height:Math.floor(box.height)-4}}));
        const allowed=new Set(paletteFor('amber').map(rgb=>rgb.join(',')));
        let outside=0;
        for(let i=0;i<displayed.data.length;i+=4)if(!allowed.has(Array.from(displayed.data.subarray(i,i+3)).join(',')))outside++;
        expect(outside,`viewport ${width}, density ${deviceScaleFactor}`).toBe(0);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      }
      if(deviceScaleFactor===1) {
        for(const card of cards) {
          await page.locator('#card-select').selectOption(card.id);
          await matchesOriginal(page.locator('.hero-card canvas'),card.file,{palette:paletteFor('amber'),exposure:0.3});
        }
        await page.screenshot({path:testInfo.outputPath('arcana-home.png'),fullPage:true});
      }
    } finally { await context.close(); }
  }
});

test('Arcana themes and settings carry to both playgrounds; recipes start expanded', async ({page}) => {
  await page.goto('/index.html');
  await expect(page.locator('canvas.arcana-image')).toHaveCount(6);
  for(const theme of Object.keys(themes)) {
    await page.getByRole('button',{name:themes[theme].name,exact:true}).click();
    await matchesOriginal(page.locator('.hero-card canvas'),'01-the-magician.png',{palette:paletteFor(theme),exposure:0.3});
  }
  await page.locator('#texture').selectOption('ordered');
  await page.locator('#tone').fill('0.8');
  await page.locator('#card-select').selectOption('00-the-fool');
  await matchesOriginal(page.locator('.hero-card canvas'),'00-the-fool.png',{palette:paletteFor('moss'),algorithm:'ordered',exposure:0.8});
  await page.locator('#open-playground').click();
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#sourceName')).toContainText('The Fool');
  await expect(page.locator('#recipe')).toBeVisible();
  await expect(page.locator('#cliRecipe')).toBeVisible();
  await matchesOriginal(page.locator('#resultCanvas'),'00-the-fool.png',{palette:paletteFor('moss'),algorithm:'ordered',exposure:0.8});
  await page.getByRole('button',{name:'Orchid',exact:true}).click();
  await matchesOriginal(page.locator('#resultCanvas'),'00-the-fool.png',{palette:paletteFor('orchid'),algorithm:'ordered',exposure:0.8});
  await page.setViewportSize({width:390,height:844});
  await matchesOriginal(page.locator('#resultCanvas'),'00-the-fool.png',{palette:paletteFor('orchid'),algorithm:'ordered',exposure:0.8});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/index.html');
  await page.getByRole('button',{name:'Orchid',exact:true}).click();
  await page.getByRole('link',{name:'See the responsive API in action'}).click();
  await expect(page.locator('#colors')).toHaveValue('orchid');
  await expect(page.locator('.gallery canvas')).toHaveCount(5);
});

test('Arcana gallery retains per-image tuning through resize and restore; old URLs redirect', async ({page}) => {
  await page.goto('/examples/responsive-demo.html?theme=orchid&algorithm=ordered');
  await expect(page).toHaveURL(/\/responsive.html\?theme=orchid&algorithm=ordered/);
  await expect(page.locator('.gallery canvas')).toHaveCount(5);
  await expect(page.locator('#galleryRecipe')).toBeVisible();
  const second=await hash(page.locator('.gallery canvas').nth(1));
  await page.locator('.exposure').first().fill('0.8');
  const check=()=>matchesOriginal(page.locator('.gallery canvas').first(),'00-the-fool.png',{palette:paletteFor('orchid'),algorithm:'ordered',exposure:0.8});
  await check();
  expect(await hash(page.locator('.gallery canvas').nth(1))).toBe(second);
  await expect(page.locator('#galleryRecipe')).toContainText('"exposure": 0.8');
  for(const width of ['55','100']) { await page.locator('#galleryWidth').fill(width); await check(); }
  await page.locator('#toggle').click();
  await expect(page.locator('.gallery img')).toHaveCount(5);
  await page.locator('#toggle').click();
  await expect(page.locator('.gallery canvas')).toHaveCount(5);
  await check();
  await page.setViewportSize({width:390,height:844});
  await check();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/experiments/playground.html?card=00-the-fool');
  await expect(page).toHaveURL(/\/playground.html\?card=00-the-fool/);
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#sourceName')).toContainText('The Fool');
});
