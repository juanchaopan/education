import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const url = "http://127.0.0.1:8280/";
for (const channel of ["chrome", "msedge"]) {
  const browser = await chromium.launch({ channel, args: ["--use-fake-device-for-media-stream"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3 });
    const page = await context.newPage();
    const exceptions = [];
    page.on("pageerror", (error) => exceptions.push(error.message));
    await page.goto(url);
    const log = page.locator("#log");
    const waitForLog = (needle) => page.waitForFunction((s) => document.querySelector("#log").textContent.includes(s), needle);
    await page.locator("#record").click();
    await waitForLog("NotAllowedError");
    await page.locator("#answer").fill("文字入口可用");
    await context.grantPermissions(["microphone"], { origin: url });
    for (let i = 1; i <= 5; i++) {
      await page.locator("#record").click();
      await page.locator("#stop-record").waitFor();
      await page.waitForTimeout(550);
      await page.locator("#stop-record").click();
      await page.waitForFunction((n) => document.querySelector("#log").textContent.split("record-stop ").length === n + 1, i);
    }
    await page.locator("#clip").evaluate((clip) => clip.play());
    await waitForLog("record-playback-start");
    await page.locator("#record").click();
    await page.waitForFunction(() => !document.querySelector("#stop-record").disabled);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      delete document.hidden;
    });
    await waitForLog("record-interrupted");
    await page.waitForFunction(() => !document.querySelector("#record").disabled);
    assert.equal(await page.locator("#clip").isHidden(), true);
    await page.locator("#recognize-local").click();
    await page.waitForFunction(() => /recognition-(error|unavailable|result|timeout|no-result)/.test(document.querySelector("#log").textContent));
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#recognize-online").click();
    await page.waitForFunction(() => /recognition-(error|unavailable|result|timeout|no-result) .*"mode":"online"/.test(document.querySelector("#log").textContent), null, { timeout: 14000 });
    await page.locator("#speak").click();
    await page.waitForFunction(() => /speech-(start|error|no-local|unavailable)/.test(document.querySelector("#log").textContent));
    await page.locator("#stop-speak").click();
    const canvas = page.locator("#drawing");
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const cdp = await context.newCDPSession(page);
    const x = Math.round(box.x + 20);
    const y = Math.round(box.y + 50);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 100, y: y + 30 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitForLog('"type":"touch","event":"pointerup"');
    const hasInk = () => canvas.evaluate((c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data.some((v) => v));
    assert.equal(await hasInk(), true);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await waitForLog('"type":"touch","event":"pointercancel"');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 70, y + 40, { steps: 5 });
    await page.mouse.up();
    await waitForLog('"type":"mouse","event":"pointerup"');
    await page.locator("#clear").click();
    assert.equal(await hasInk(), false);
    assert.equal(await page.locator("#answer").inputValue(), "文字入口可用");
    assert.deepEqual(exceptions, []);
    console.log(channel, browser.version(), "\n" + await log.textContent());
  } finally {
    await browser.close();
  }
}


