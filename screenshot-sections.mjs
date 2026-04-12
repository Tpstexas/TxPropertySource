import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const totalHeight = await page.evaluate(() => document.body.scrollHeight);
console.log('Total page height:', totalHeight);

const sections = ['#services', '#process', '#properties', '#why', '#testimonials', '#contact'];
for (const sel of sections) {
  const y = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  }, sel);
  if (y === null) { console.log('not found:', sel); continue; }
  await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
  await new Promise(r => setTimeout(r, 800));
  const name = sel.replace('#', '');
  await page.screenshot({ path: `temporary screenshots/${name}.png` });
  console.log('saved', name, 'at y:', y);
}

await browser.close();
