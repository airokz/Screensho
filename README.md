# Screensho

A private screenshot editor in one self-contained HTML file. Built for the macOS screenshot → crop → copy → paste workflow. No server, runtime dependencies, account, analytics, remote fonts, or network requests.

## Open and bookmark

Open `index.html` in **Google Chrome**. Bookmark its file URL with **⌘D**:

```
file:///Users/apple/Projects/personal_tools/Screensho/index.html
```

1. Click **Connect Desktop folder**, choose Desktop, and allow read access. The picker starts at Desktop. macOS may also ask Chrome for Desktop access.
2. The latest 100 screenshots appear in the left sidebar, newest first. Screensho checks for changes every 2.5 seconds while the page is visible, and when you return to it. Existing edits stay open when a new screenshot arrives.
3. Select a screenshot. **Crop** → drag a rectangle in either direction → **Apply crop**. Escape cancels the crop selection.
4. **Resize** changes the actual pixel dimensions, with proportions locked by default. **Zoom**, **Fit**, and **1:1** only change the view. Scroll to move around a zoomed image; Cmd/Ctrl + wheel zooms.
5. Click **Copy image** (or **⌘C**) and **⌘V** into a chat or Dro. The clipboard contains an actual PNG image at the edited dimensions. If clipboard access is blocked, allow it in Chrome or use **Save PNG** and drag the downloaded file into your destination.

The folder handle is remembered in IndexedDB. Chrome may ask you to reconnect after reopening or when permissions expire. The application cannot bypass the initial folder picker. Clearing browser storage or moving the HTML can require selecting the folder again.

**Import images**, drag-and-drop, and **⌘V** also work without a folder connection. Safari/Firefox users should use those options; live folder access requires a supporting Chromium browser. Only read permission is requested, and Screensho never writes to your screenshot folder.

## Editing and privacy

- Original files stay untouched. **Save PNG** downloads a separate `-screensho.png` copy.
- **Undo / ⌘Z** keeps up to eight previous edits. Reset returns to the original and is also undoable.
- Switching images asks before discarding edits. Reloading or closing an edited image triggers the browser's unsaved-work prompt. Edits themselves are held in memory and are not saved between sessions: copy or download anything you want to keep.
- Folder scans include common macOS screenshot filename patterns (including English, Russian, Latvian, German, and French) and PNG/JPEG/WebP/GIF/AVIF/BMP files. Unrelated Desktop images are excluded. Manually import a capture if it has been renamed or your system uses another naming pattern. Scanning is limited to the selected folder, without recursion.
- Output is PNG; animated images become a still frame. Image limits: 16,384 px per side and 40 megapixels.
- Images and folder permissions stay in your browser. Nothing is uploaded to GitHub or another service. The private repository stores application code only.

**Open Dro** links to the sibling `../Dro/whiteboard.html` in your `personal_tools` folder.

## Development and validation

Edit `index.html` and reload it. The application remains a single HTML file; Node and Playwright are used only for development tests.

```sh
npm ci
npm test
```

Tests use installed macOS Google Chrome. Set `CHROME_PATH` to override its executable path. They generate their own image fixtures and do not read Desktop or real screenshots. They cover cropping and output pixels, resize, zoom invariance, undo/reset, native PNG clipboard writing and reading, pasting into the sibling Dro checkout, PNG download dimensions, mocked folder ordering and refresh, filtering, disappearing files, safe filename rendering, responsive layout, and absence of outgoing requests. The Dro integration test expects `../Dro/whiteboard.html`.

Native folder selection, its OS permission prompts, and permission restoration after restarting your regular Chrome profile require a manual first-run check. The automated folder test uses read-only handle fixtures, not your real Desktop. Clipboard tests temporarily replace the system clipboard with a generated test image. Test artifacts are ignored by Git.

Browser API references: [Chrome File System Access](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access), [MDN clipboard writing](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write).
