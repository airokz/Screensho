const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [],
    outgoing = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) outgoing.push(request.url());
  });
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);
    await page.waitForFunction(() => db !== null);
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    assert.equal(await page.locator("#connect").textContent(), "Choose Screenshots folder");
    assert.equal(await page.locator("#start").textContent(), "Choose Screenshots folder");
    // A protected folder failure explains the supported subfolder setup.
    await page.evaluate(async () => {
      const picker = window.showDirectoryPicker;
      try {
        window.showDirectoryPicker = async () => {
          throw new DOMException("Protected folder", "SecurityError");
        };
        await connect();
        window.showDirectoryPicker = async (options) => {
          window.pickerOptions = options;
          throw new DOMException("Cancelled", "AbortError");
        };
        await connect();
      } finally {
        window.showDirectoryPicker = picker;
      }
    });
    assert.equal(await page.locator(".setup").getAttribute("open"), "");
    assert.deepEqual(await page.evaluate(() => window.pickerOptions), {
      id: "screensho-screenshots",
      startIn: "pictures",
      mode: "read",
    });
    // Cancelling Chrome's own "can't open this folder" dialog only reaches the page as a
    // cancel, so a cancel without a connected folder must also show the setup help.
    await page.locator(".setup summary").click();
    assert.equal(await page.locator(".setup").getAttribute("open"), null);
    await page.evaluate(async () => {
      const picker = window.showDirectoryPicker;
      try {
        window.showDirectoryPicker = async () => {
          throw new DOMException("Cancelled", "AbortError");
        };
        await connect();
      } finally {
        window.showDirectoryPicker = picker;
      }
    });
    assert.equal(await page.locator(".setup").getAttribute("open"), "");
    assert.match(await page.locator("#toast").textContent(), /Desktop\/Screenshots/);
    assert.match(await page.locator("#folderHint").textContent(), /Desktop\/Screenshots/);
    await page.locator(".setup summary").click();
    // All test images are generated in memory. Never load the user's screenshots.
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 800;
      c.height = 400;
      const x = c.getContext("2d");
      x.fillStyle = "#faf9f6";
      x.fillRect(0, 0, 800, 400);
      x.fillStyle = "#6253d9";
      x.fillRect(0, 0, 400, 400);
      x.fillStyle = "white";
      x.font = "28px sans-serif";
      x.fillText("A little room", 65, 190);
      x.fillStyle = "#272633";
      x.fillText("for screenshots.", 440, 220);
      return c.toDataURL().split(",")[1];
    });
    const upload = async (name) => {
      await page
        .locator("#fileInput")
        .setInputFiles({ name, mimeType: "image/png", buffer: Buffer.from(png, "base64") });
      await page.waitForFunction(() => selected && !busy);
    };
    await upload("Screenshot 2026-11-09 at 13.00.00.png");
    assert.deepEqual(await page.evaluate(() => [canvas.width, canvas.height]), [800, 400]);
    // Zoom must never alter output dimensions or pixels.
    await page.locator("#zoomIn").click();
    await page.locator("#actual").click();
    assert.deepEqual(await page.evaluate(() => [canvas.width, canvas.height, zoom]), [800, 400, 1]);
    await page.locator("#crop").click();
    const bounds = await page.locator("#canvas").boundingBox();
    await page.mouse.move(bounds.x + 50, bounds.y + 50);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 350, bounds.y + 250, { steps: 10 });
    await page.mouse.up();
    await page.locator("#applyCrop").click();
    assert.deepEqual(await page.evaluate(() => [canvas.width, canvas.height]), [300, 200]);
    assert.deepEqual(
      await page.evaluate(() => Array.from(ctx.getImageData(10, 10, 1, 1).data)),
      [98, 83, 217, 255],
    );
    await page.locator("#undo").click();
    await page.waitForFunction(() => !busy && canvas.width === 800);
    assert.equal(await page.evaluate(() => dirty), false);
    // Reversed drag, bounds clamping, cancel without editing.
    await page.locator("#crop").click();
    await page.mouse.move(bounds.x + 500, bounds.y + 250);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 300, bounds.y + 150);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [cropRect.w, cropRect.h]), [200, 100]);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#cropbar").isVisible(), false);
    await page.locator("#resize").click();
    await page.locator("#width").fill("400");
    assert.equal(await page.locator("#height").inputValue(), "200");
    await page.locator("#resizeForm button[type=submit]").click();
    assert.deepEqual(await page.evaluate(() => [canvas.width, canvas.height]), [400, 200]);
    // Clipboard must contain a real PNG at the resized dimensions.
    await page.locator("#copy").click();
    await page.waitForFunction(() =>
      document.querySelector("#status").textContent.startsWith("Copied 400"),
    );
    const clipboard = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const blob = await item.getType("image/png");
      const bitmap = await createImageBitmap(blob);
      return { type: blob.type, width: bitmap.width, height: bitmap.height };
    });
    assert.deepEqual(clipboard, { type: "image/png", width: 400, height: 200 });
    // Paste through the actual clipboard into Dro, when a checkout is available.
    const droPath = process.env.DRO_PATH || path.resolve(__dirname, "../../Dro/whiteboard.html");
    if (
      await fs.access(droPath).then(
        () => true,
        () => false,
      )
    ) {
      const dro = await context.newPage();
      await dro.goto(pathToFileURL(droPath).href);
      await dro.keyboard.press("ControlOrMeta+v");
      await dro.waitForFunction(() => nodes.some((n) => n.type === "image"));
      const pasted = await dro.evaluate(() => nodes.find((n) => n.type === "image"));
      assert.equal(pasted.w / pasted.h, 2);
      await dro.close();
    } else {
      console.log("Skipping Dro paste check: set DRO_PATH or check out Dro next to Screensho.");
    }
    await page.bringToFront();
    const downloadEvent = page.waitForEvent("download");
    await page.locator("#download").click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /-screensho\.png$/);
    const downloadPath = path.join(os.tmpdir(), "screensho-test-" + Date.now() + ".png");
    await download.saveAs(downloadPath);
    const saved = await fs.readFile(downloadPath);
    await fs.unlink(downloadPath);
    assert.equal(saved.readUInt32BE(16), 400);
    assert.equal(saved.readUInt32BE(20), 200);
    // Reset is undoable and preserves the dirty state of the preceding edit.
    await page.locator("#reset").click();
    assert.deepEqual(await page.evaluate(() => [canvas.width, canvas.height, dirty]), [
      800,
      400,
      false,
    ]);
    await page.locator("#undo").click();
    await page.waitForFunction(() => !busy);
    assert.deepEqual(await page.evaluate(() => [canvas.width, canvas.height, dirty]), [
      400,
      200,
      true,
    ]);
    // Switching images must ask before discarding edits.
    page.once("dialog", (dialog) => dialog.dismiss());
    await upload("<img src=x onerror=alert(1)>.png");
    assert.match(await page.locator("#filename").textContent(), /Screenshot/);
    assert.equal(await page.locator("#files img:not(.thumb)").count(), 0);
    await page.locator("#reset").click();
    // Simulate read-only directory handles while retaining actual File objects.
    await page.evaluate(async (base64) => {
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      window.fixtureFiles = [
        new File([data], "Screenshot older.png", { type: "image/png", lastModified: 1000 }),
        new File([data], "Screenshot latest.png", { type: "image/png", lastModified: 2000 }),
        new File([data], "renamed-capture.png", { type: "image/png", lastModified: 1500 }),
        new File(["notes"], "notes.txt", { type: "text/plain", lastModified: 3000 }),
      ];
      directory = {
        name: "Screenshots",
        queryPermission: async () => "granted",
        async *values() {
          for (const file of window.fixtureFiles)
            yield { kind: "file", name: file.name, getFile: async () => file };
        },
      };
      folderUI();
      await scan();
    }, png);
    assert.equal(await page.locator(".shot b").first().textContent(), "Screenshot latest.png");
    assert.equal(await page.locator(".shot b").filter({ hasText: "notes.txt" }).count(), 0);
    assert.equal(
      await page.locator(".shot b").filter({ hasText: "renamed-capture.png" }).count(),
      1,
    );
    const selectionBefore = await page.locator("#filename").textContent();
    await page.evaluate(async (base64) => {
      window.fixtureFiles.push(
        new File([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], "Screenshot new.png", {
          type: "image/png",
          lastModified: 4000,
        }),
      );
      await scan();
    }, png);
    assert.equal(await page.locator(".shot b").first().textContent(), "Screenshot new.png");
    assert.equal(await page.locator("#filename").textContent(), selectionBefore);
    // Removing a file releases its list entry on the next refresh.
    await page.evaluate(async () => {
      window.fixtureFiles = window.fixtureFiles.filter((f) => f.name !== "Screenshot older.png");
      await scan();
    });
    assert.equal(await page.locator(".shot b").filter({ hasText: "Screenshot older" }).count(), 0);
    await page.locator("#filter").fill("latest");
    assert.equal(await page.locator(".shot").count(), 1);
    await page.locator("#filter").fill("");
    // Resize the view to exercise the compact layout and responsive fit.
    await page.setViewportSize({ width: 780, height: 800 });
    await page.locator("#fit").click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(outgoing.length, 0, "The standalone editor must make no network requests");
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#fit").click();
    await fs.mkdir(path.resolve(__dirname, "../test-results"), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, "../test-results/editor.png") });
    console.log(
      "PASS: file:// launch, import, crop pixels, reverse crop, cancel, resize, undo/reset, native PNG clipboard, paste into Dro, PNG download, folder ordering/refresh/filter/deletion, safe filenames, responsive layout, no outgoing requests.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
