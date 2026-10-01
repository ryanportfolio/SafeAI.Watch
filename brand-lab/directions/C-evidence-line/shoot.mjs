/* Stills of board.html in headed Chrome (real GPU), window parked offscreen.
   Run: node shoot.mjs [outDir]
   Uses the about-film checkout's launcher because it has playwright-core installed. */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.CHROME_PLACE = 'offscreen';
const HERE = dirname(fileURLToPath(import.meta.url));
const LAUNCHER = join(HERE, '..', '..', '..', '..', 'about-film', 'scripts', 'lib', 'launch-chrome.mjs');
const { launchPlacedChrome } = await import(pathToFileURL(LAUNCHER).href);

const OUT = process.argv[2] || 'D:\\screenshots\\SafeAI.Watch\\logo-lab\\C';
mkdirSync(OUT, { recursive: true });

const browser = await launchPlacedChrome({ place: 'offscreen' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(HERE, 'board.html')).href);
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.style));
console.log('fonts loaded:', fonts.join(', ') || 'none');
await page.waitForTimeout(5200); // let the draw-on finish
await page.screenshot({ path: join(OUT, 'board-1440x900.png') });
await page.screenshot({ path: join(OUT, 'board-full.png'), fullPage: true });

// zoomed detail captures (2x) of the favicon row and the site header
const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page2.goto(pathToFileURL(join(HERE, 'board.html')).href);
await page2.evaluate(() => document.fonts.ready);
await page2.waitForTimeout(5200);
await page2.locator('section[aria-label="Favicon"]').screenshot({ path: join(OUT, 'detail-favicon-2x.png') });
await page2.locator('.site .nav').screenshot({ path: join(OUT, 'detail-nav-2x.png') });

// mid-animation frame
const page3 = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page3.goto(pathToFileURL(join(HERE, 'board.html')).href);
await page3.evaluate(() => document.fonts.ready);
await page3.evaluate(() => document.querySelector('.replay').click());
await page3.waitForTimeout(2300);
await page3.locator('#anim-paper').screenshot({ path: join(OUT, 'anim-mid.png') });

await browser.close();
console.log('wrote', OUT);
