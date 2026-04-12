import puppeteer from './node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'temporary screenshots');
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function nextIndex() {
  const files = existsSync(SCREENSHOTS_DIR) ? readdirSync(SCREENSHOTS_DIR) : [];
  const nums = files.map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] || '0')).filter(Boolean);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1000));

const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('Total page height:', totalHeight);

// Take viewport-sized screenshots scrolling down
const viewHeight = 844;
const steps = Math.ceil(totalHeight / viewHeight);
for (let i = 0; i < Math.min(steps, 12); i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * viewHeight);
  await new Promise(r => setTimeout(r, 300));
  const idx = nextIndex();
  const path = join(SCREENSHOTS_DIR, `screenshot-${idx}-home-section-${i+1}.png`);
  await page.screenshot({ path });
  console.log(`Saved: temporary screenshots/screenshot-${idx}-home-section-${i+1}.png`);
}

await browser.close();
