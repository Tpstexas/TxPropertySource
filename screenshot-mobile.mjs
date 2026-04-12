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

// iPhone 14 Pro viewport
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const pages = [
  { url: 'http://localhost:3000/', label: 'home' },
  { url: 'http://localhost:3000/properties', label: 'properties' },
  { url: 'http://localhost:3000/property/p1', label: 'detail' },
  { url: 'http://localhost:3000/admin', label: 'admin' },
];

for (const { url, label } of pages) {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const idx = nextIndex();
  const path = join(SCREENSHOTS_DIR, `screenshot-${idx}-mobile-${label}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`Saved: temporary screenshots/screenshot-${idx}-mobile-${label}.png`);
}

await browser.close();
