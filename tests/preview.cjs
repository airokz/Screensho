// Regenerate the README screenshot from the fictional captures in docs/examples.
const { chromium } = require("playwright-core");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "en-GB" });
    await page.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);
    await page.waitForFunction(() => db !== null);
    // Fictional example captures (2x, like macOS Retina screenshots). No personal screenshots.
    const examples = await Promise.all(
      [
        ["Screenshot - Billing after.png", "billing-after.png"],
        ["Screenshot - Billing before.png", "billing-before.png"],
        ["Screenshot - Test output.png", "test-output.png"],
      ].map(async ([name, file]) => [
        name,
        (await fs.readFile(path.resolve(__dirname, "../docs/examples", file))).toString("base64"),
      ]),
    );
    await page.evaluate(async (examples) => {
      const files = examples.map(([name, base64], i) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        return new File([bytes], name, {
          type: "image/png",
          lastModified: new Date("2026-11-09T11:20:00Z").getTime() - i * 600000,
        });
      });
      directory = {
        name: "Screenshots",
        queryPermission: async () => "granted",
        async *values() {
          for (const file of files)
            yield { kind: "file", name: file.name, getFile: async () => file };
        },
      };
      folderUI();
      await scan();
      status("Select the part you want to share. Your original stays untouched.");
    }, examples);
    await page.locator("#crop").click();
    const bounds = await page.locator("#canvas").boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 0.295, bounds.y + bounds.height * 0.125);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.97, bounds.y + bounds.height * 0.96, {
      steps: 12,
    });
    await page.mouse.up();
    await fs.mkdir(path.resolve(__dirname, "../docs"), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, "../docs/screenshot.png") });
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
