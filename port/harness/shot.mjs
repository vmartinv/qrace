// Screenshots of the title and the first menu screen:
// node harness/shot.mjs <outdir> [query] [WxH: a phone viewport, e.g. 390x844]
import { chromium } from "playwright-core";
const out = process.argv[2], q = process.argv[3] ?? "";
const [w, h] = (process.argv[4] ?? "800x600").split("x").map(Number);
const phone = process.argv[4] ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {};
// SwiftShader: the default headless GL leaves parts of the race canvas unpainted.
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: w, height: h }, ...phone });
await page.goto(`http://localhost:5199/?tick=10${q}`);
await page.waitForFunction(() => document.querySelector(".vb-window"));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/title.png` });
const click = (t) => page.evaluate((t) => [...document.querySelectorAll(".vb-window button")]
  .find((b) => b.offsetParent && b.textContent.trim() === t)?.click(), t);
await click("OPTIONS");
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/options.png` });
await click("Done");
await click("START");
await page.waitForTimeout(200);
await click("Human");
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/player.png` });
await page.evaluate(() => { const t = [...document.querySelectorAll("input.vb-textbox")].find((i) => i.offsetParent); t.value = "Tester"; t.dispatchEvent(new Event("input")); });
await click("Done");
await click("Computer");
await click("Computer");
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/menu.png` });
await browser.close();
