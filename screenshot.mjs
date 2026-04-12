import puppeteer from 'puppeteer';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Auto-increment: find the next available screenshot-N[.png / -label.png]
const screenshotsDir = join(__dirname, 'temporary screenshots');

const existing = existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'))
  : [];

const nums = existing.map(f => {
  const m = f.match(/^screenshot-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
});

const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;

const outPath = join(screenshotsDir, filename);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Brief pause for animations to settle
await new Promise(r => setTimeout(r, 600));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved: temporary screenshots/${filename}`);
