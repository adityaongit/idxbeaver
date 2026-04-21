# IdxBeaver

A Manifest V3 Chrome DevTools extension that gives browser storage a database-client workflow.

## What Works

- DevTools panel registration.
- IndexedDB database/store discovery.
- IndexedDB record browsing, add, edit, and delete.
- SELECT-only query MVP for IndexedDB stores.
- LocalStorage and SessionStorage browsing, add, edit, delete, and clear.
- JSON and CSV export for the current view.
- Standalone preview mode for UI development outside Chrome DevTools.

## Run Locally

```bash
npm install
npm run build
```

Load the extension from `dist/`:

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the `dist/` directory.
5. Open DevTools on any page and choose the "IdxBeaver" panel.

For UI preview without extension APIs:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173/panel.html`.

## Test

```bash
npm test
npm run build
```

## Project Tracking

Use `PROJECT_BOARD.md` as the durable task board. Move tasks between sections as implementation progresses and record verification when work lands.
