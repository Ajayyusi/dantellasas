// Dev helper: drive the local app and capture screenshots.
// Usage: node scripts/shot.mjs <steps.json>
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const steps = JSON.parse(readFileSync(process.argv[2], "utf8"));
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: steps.viewport ?? { width: 1440, height: 900 },
  locale: "en-US",
  timezoneId: "Asia/Dubai",
});
if (steps.storage) {
  try { await context.addCookies(JSON.parse(readFileSync(steps.storage, "utf8"))); } catch {}
}
const page = await context.newPage();
const logs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
for (const s of steps.actions) {
  try {
    if (s.goto) await page.goto(s.goto, { waitUntil: "networkidle", timeout: 60000 });
    if (s.fill) await page.fill(s.fill, s.value);
    if (s.click) await page.click(s.click, { timeout: 15000 });
    if (s.press) await page.keyboard.press(s.press);
    if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 30000 });
    if (s.waitUrl) await page.waitForURL(s.waitUrl, { timeout: 60000 });
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.viewport) await page.setViewportSize(s.viewport);
    if (s.eval) console.log("EVAL", JSON.stringify(await page.evaluate(s.eval)));
    if (s.shot) await page.screenshot({ path: s.shot, fullPage: !!s.full });
  } catch (e) {
    console.log("STEP FAILED", JSON.stringify(s), e.message.split("\n")[0]);
    await page.screenshot({ path: "/tmp/claude-0/-home-user-nursery-crm-saas/68a866d7-b5a6-5fb4-8da2-be6b38b38ef8/scratchpad/fail.png" });
    break;
  }
}
if (steps.saveStorage) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(steps.saveStorage, JSON.stringify(await context.cookies()));
}
console.log("URL", page.url());
console.log(logs.slice(0, 30).join("\n"));
await browser.close();
