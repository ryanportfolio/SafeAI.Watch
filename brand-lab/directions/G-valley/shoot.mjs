/* Stills of board.html in headed Chrome on the real GPU, window parked offscreen.
   Run: node shoot.mjs [outDir] [url]
   Uses the repo's launcher; needs playwright-core (npm i --no-save playwright-core@latest). */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

process.env.CHROME_PLACE = 'offscreen';
const { launchPlacedChrome } = await import('../../../scripts/lib/launch-chrome.mjs');

const OUT = process.argv[2] || 'D:\\screenshots\\SafeAI.Watch\\logo-lab\\G';
const URL = process.argv[3] || 'http://localhost:4330/brand-lab/directions/G-valley/board.html';
mkdirSync(OUT, { recursive: true });

const browser = await launchPlacedChrome({ place: 'offscreen', args: ['--mute-audio'] });
try {
  const open = async (scale) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
    const res = await page.goto(URL);
    if (!res?.ok()) throw new Error(`${URL} returned ${res?.status() ?? 'no response'}; run build.mjs first`);
    await page.evaluate(() => document.fonts.ready);
    return page;
  };

  const page = await open(1);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  console.log('fonts loaded:', fonts.join(', ') || 'none');
  await page.waitForTimeout(6500); // draw-on finishes
  await page.screenshot({ path: join(OUT, 'board-1440x900.png') });
  await page.screenshot({ path: join(OUT, 'board-full.png'), fullPage: true });
  // favicon row at real pixels (1x), then 3x for a closer look
  await page.locator('#favicons').screenshot({ path: join(OUT, 'favicons-1x.png') });
  const p3 = await open(3);
  await p3.waitForTimeout(500);
  await p3.locator('#favicons').screenshot({ path: join(OUT, 'favicons-3x.png') });
  await p3.locator('.site').screenshot({ path: join(OUT, 'site-header-3x.png'), clip: undefined });
  // a mid-animation frame
  const p4 = await open(1);
  await p4.locator('#anim-paper').scrollIntoViewIfNeeded();
  await p4.evaluate(() => document.querySelector('#anim-paper .replay').click());
  await p4.waitForTimeout(1600);
  await p4.locator('#anim-paper').screenshot({ path: join(OUT, 'anim-mid.png') });
  console.log('wrote', OUT);
} finally {
  await browser.close();
}
