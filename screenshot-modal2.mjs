import puppeteer from './node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { existsSync, mkdirSync } from 'fs';
import { readdirSync } from 'fs';
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
await page.setViewport({ width: 1280, height: 900 });

// Hard refresh — bypass cache
await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2', cache: 'reload' });
await page.evaluate(() => { /* force fresh */ });

// Log in
await page.type('#pw', 'TxPropSource2024');
await page.click('#login-btn');
await page.waitForSelector('#add-btn', { visible: true, timeout: 5000 });

// Click edit on first property card
const editBtns = await page.$$('.btn-edit');
if (editBtns.length > 0) {
  await editBtns[0].click();
} else {
  await page.click('#add-btn');
}
await page.waitForSelector('#modal-overlay.open', { timeout: 5000 });
await new Promise(r => setTimeout(r, 600));

// Crop screenshot to just the form area
const modalEl = await page.$('.modal');
const box = await modalEl.boundingBox();

const idx = nextIndex();
const filename = join(SCREENSHOTS_DIR, `screenshot-${idx}-modal-form-full.png`);
await page.screenshot({ path: filename, clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 600) } });
console.log(`Saved: temporary screenshots/screenshot-${idx}-modal-form-full.png`);

await browser.close();
