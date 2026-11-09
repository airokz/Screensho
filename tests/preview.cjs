// Regenerate the README screenshot from the same fictional billing examples as Dro.
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);
    await page.waitForFunction(() => db !== null);
    const example = await fs.readFile(path.resolve(__dirname, "../../Dro/docs/screenshot.png"));
    await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      const regions = [
        { name: "Screenshot - Billing after.png", rect: [785, 252, 408, 250] },
        { name: "Screenshot - Billing before.png", rect: [255, 252, 408, 250] },
        { name: "Screenshot - Test output.png", rect: [976, 545, 285, 152] },
      ];
      const files = [];
      for (const [i, item] of regions.entries()) {
        const c = document.createElement("canvas");
        c.width = item.rect[2] * 2;
        c.height = item.rect[3] * 2;
        c.getContext("2d").drawImage(image, ...item.rect, 0, 0, c.width, c.height);
        const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
        files.push(
          new File([blob], item.name, {
            type: "image/png",
            lastModified: new Date("2026-11-09T11:20:00Z").getTime() - i * 600000,
          }),
        );
      }
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
    }, example.toString("base64"));
    await page.locator("#crop").click();
    const bounds = await page.locator("#canvas").boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 0.31, bounds.y + bounds.height * 0.14);
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
