import puppeteer from './node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'temporary screenshots');
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function nextIndex() {
  const files = readdirSync(SCREENSHOTS_DIR);
  const nums = files.map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] || '0')).filter(Boolean);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 800));

// Kill GSAP and force all elements visible via injected CSS (beats inline styles)
await page.addStyleTag({ content: '.g-reveal, [class*="g-d"], .faq-item, .prop-card { opacity: 1 !important; transform: none !important; visibility: visible !important; }' });
await page.evaluate(() => {
  if (window.gsap) {
    try { gsap.killTweensOf('*'); } catch(e) {}
    try { if (window.ScrollTrigger) ScrollTrigger.killAll(); } catch(e) {}
  }
  // Also override any inline styles GSAP already applied
  document.querySelectorAll('.g-reveal, [class^="g-d"], [class*=" g-d"]').forEach(el => {
    el.style.removeProperty('opacity');
    el.style.removeProperty('transform');
    el.style.removeProperty('visibility');
  });
});
await new Promise(r => setTimeout(r, 400));

const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('Page height with animations resolved:', totalHeight);

// Screenshot in viewport-height chunks
const viewH = 844;
const chunks = Math.ceil(totalHeight / viewH);
for (let i = 0; i < Math.min(chunks, 14); i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * viewH);
  await new Promise(r => setTimeout(r, 200));
  const idx = nextIndex();
  const path = join(SCREENSHOTS_DIR, `screenshot-${idx}-raw-section-${i+1}.png`);
  await page.screenshot({ path });
  console.log(`Saved: temporary screenshots/screenshot-${idx}-raw-section-${i+1}.png`);
}

await browser.close();
