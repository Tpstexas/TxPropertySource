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

await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

// Log in
await page.type('#pw', 'TxHeritage2024');
await page.click('#login-btn');
await page.waitForSelector('#add-btn', { visible: true, timeout: 5000 });

// Click "Add Property"
await page.click('#add-btn');
await page.waitForSelector('#modal-overlay.open', { timeout: 5000 });
await new Promise(r => setTimeout(r, 500));

// Screenshot the modal
const idx = nextIndex();
const filename = join(SCREENSHOTS_DIR, `screenshot-${idx}-admin-modal.png`);
await page.screenshot({ path: filename, fullPage: false });
console.log(`Saved: temporary screenshots/screenshot-${idx}-admin-modal.png`);

// Scroll down in modal body to see more
await page.evaluate(() => {
  const mb = document.querySelector('.modal-body');
  if (mb) mb.scrollTop = 300;
});
await new Promise(r => setTimeout(r, 300));
const idx2 = nextIndex();
const filename2 = join(SCREENSHOTS_DIR, `screenshot-${idx2}-admin-modal-scroll.png`);
await page.screenshot({ path: filename2, fullPage: false });
console.log(`Saved: temporary screenshots/screenshot-${idx2}-admin-modal-scroll.png`);

await browser.close();
