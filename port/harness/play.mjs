// Plays the port headless: one human (bets a fixed amount on racer 0)
// and two computers, until Game Over. Prints one line per round.
//   node harness/play.mjs [rounds] [url]
// VIEWPORT=390x844 plays on a phone screen; SHOTS=dir saves a screenshot of
// each new set of visible windows.
import { chromium } from "playwright-core";

const rounds = process.argv[2] ?? "2";
const url = process.argv[3] ?? "http://localhost:5199/?tick=5";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const [vw, vh] = (process.env.VIEWPORT ?? "1000x750").split("x").map(Number);
const phone = process.env.VIEWPORT ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {};
const page = await browser.newPage({ viewport: { width: vw, height: vh }, ...phone });
const shots = new Set();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => document.querySelector(".vb-window"));

const js = (f, a) => page.evaluate(f, a);
await js(() => {
  window.vis = () => [...document.querySelectorAll(".vb-window")].filter((w) => w.style.display !== "none" && w.offsetParent);
  window.btn = (t) => {
    const b = [...document.querySelectorAll(".vb-window button")].find(
      (b) => b.offsetParent && b.textContent.trim() === t && !b.disabled);
    if (b) b.click();
    return !!b;
  };
  window.text = (pred, v) => {
    const t = [...document.querySelectorAll(".vb-window input.vb-textbox")].find((i) => i.offsetParent && pred(i));
    t.value = v;
    t.dispatchEvent(new Event("input"));
  };
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await js(() => btn("OPTIONS"));
await wait(100);
await js((n) => { text((i) => i.value === " 12", n); btn("Done"); }, rounds);
await js(() => btn("START"));
await wait(100);
await js(() => { btn("Human"); text(() => true, "Tester"); btn("Done"); btn("Computer"); btn("Computer"); });

let lastRound = 0;
const t0 = Date.now();
for (;;) {
  await wait(50);
  const s = await js(() => {
    const titles = vis().map((w) => w.querySelector(".vb-title").textContent);
    const G = window.__G;
    return { titles, round: G.Round, cash: G.PlayerCash.slice(), debt: G.PlayerDebt.slice(), state: G.TurnState,
      cur: G.CurPlayer, race: G.RaceState, msg: !!document.querySelector(".vb-modal"),
      ended: !!document.querySelector(".vb-ended") };
  });
  if (s.ended) { console.log("ended"); break; }
  const key = s.titles.join("+") + (s.msg ? "+MsgBox" : "");
  if (process.env.SHOTS && !shots.has(key)) {
    shots.add(key);
    await page.screenshot({ path: `${process.env.SHOTS}/${String(shots.size).padStart(2, "0")} ${key}.png` });
  }
  if (s.msg) { await js(() => document.querySelector(".vb-modal button").click()); continue; }
  if (s.titles.includes("Game Over")) {
    const txt = await js(() => vis().map((w) => w.innerText.replace(/\s+/g, " ")).join(" | "));
    console.log("GAME OVER:", txt.slice(0, 300));
    await js(() => btn("OK"));
    await wait(200);
    console.log("ended:", await js(() => !!document.querySelector(".vb-ended")));
    break;
  }
  if (s.round !== lastRound && s.titles.includes("Menu Screen")) {
    lastRound = s.round;
    console.log(`round ${s.round} cash ${s.cash.map(Math.round)} debt ${s.debt}`);
  }
  if (s.titles.includes("Menu Screen") && s.state === 2) {
    const bet = Math.min(10, Math.floor(s.cash[s.cur]));
    if (bet < 1) await js(() => { btn("Retire"); btn("Yes"); });
    else await js((b) => { text((i) => i.value === "0" || true, String(b)); btn("Done"); }, bet);
  }
  if (s.race === 2) {
    const box = await page.locator(".vb-canvas canvas").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6);
  }
  await js(() => btn("OK"));
  if (Date.now() - t0 > 600000) { console.log("timeout", JSON.stringify(s)); break; }
}
console.log(errors.length ? "page errors: " + errors.join("\n") : "no page errors", `${Math.round((Date.now() - t0) / 1000)}s`);
await browser.close();
