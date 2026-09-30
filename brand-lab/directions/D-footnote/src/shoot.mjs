// node shoot.mjs <html path> <out png> [width height fullPage]
process.env.CHROME_PLACE = 'offscreen';
const { launchPlacedChrome } = await import('file:///C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/scripts/lib/launch-chrome.mjs');
const [, , html, out, w = '1440', h = '900', full = '0', dsf = '1'] = process.argv;
const browser = await launchPlacedChrome({ place: 'offscreen' });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf });
const page = await ctx.newPage();
await page.goto('file:///' + html.replace(/\\/g, '/'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3500);
const sel = process.env.SHOT_SEL; if (sel) await page.locator(sel).first().screenshot({ path: out }); else await page.screenshot({ path: out, fullPage: full === '1' });
const fails = await page.evaluate(() => [...document.fonts].map((f) => `${f.family}:${f.status}`));
console.log(fails.join(' '));
await browser.close();
