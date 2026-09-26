// Renders a test string in each pixel font (dev server must be running) to
// <outdir>/font-<px>.png, black on white at 1x, for tools/fontcheck.py.
import { chromium } from "playwright-core";
const out = process.argv[2];
const text = process.argv[3];
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1600, height: 200 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:5199/fonts/README.txt");
for (const px of [13, 16, 20]) {
  await page.setContent(`<style>
    @font-face { font-family: F; src: url("http://localhost:5199/fonts/sans-${px}.woff"); }
    body { margin: 0; background: #fff; }
    span { font: ${px}px F; line-height: ${px}px; white-space: pre; position: absolute; left: 0; top: 0; color: #000;
      -webkit-font-smoothing: none; }
  </style><span></span>`);
  await page.evaluate((t) => (document.querySelector("span").textContent = t), text);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const w = await page.evaluate(() => Math.ceil(document.querySelector("span").getBoundingClientRect().width));
  await page.screenshot({ path: `${out}/font-${px}.png`, clip: { x: 0, y: 0, width: w, height: px } });
}
await browser.close();
