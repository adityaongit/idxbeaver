# YouTube listing for the demo video

The Chrome Web Store's "Video" field only accepts a YouTube URL, so `brag.mp4` has to be
uploaded to YouTube first and the link pasted into the listing.

## Upload settings

| Field | Value |
|---|---|
| Video file | `brag-output/brag.mp4` (25s, 1920x1080) |
| Thumbnail | `brag-output/brag.jpg` (the closing lockup, also baked as frame 0) |
| Visibility | **Public** or **Unlisted**. Private fails Web Store validation. Unlisted keeps it off the channel feed and still works in the listing. |
| Category | Science & Technology |
| Audience | Not made for kids |
| Language | English |

## Title

```
IdxBeaver: IndexedDB Viewer & Editor for Chrome DevTools
```

Punchier alternative:

```
IndexedDB, but with a real database client - IdxBeaver for Chrome DevTools
```

## Description

```
Chrome's Application panel treats browser storage as an afterthought: no filtering, no schema awareness, no query history, no exports that survive a refresh.

IdxBeaver adds a panel to Chrome DevTools that behaves like a real database client. Everything in this video is real screen capture of the extension running on a live site, not a mockup.

What you see:
- The IdxBeaver panel opening inside DevTools, next to Elements and Console
- A 220-row IndexedDB object store in a dense, keyboard-first grid
- A MongoDB-style query returning 10 rows in 46ms, with the index plan shown
- The row inspector, editing a record field by field with type indicators
- Schema inference: type, nullable and coverage per column

Also handles LocalStorage, SessionStorage, Cookies and Cache Storage, bulk import/export (NDJSON, CSV, SQL, ZIP), snapshots and diffs, saved queries and history, and a ⌘K command palette.

Install (free): https://chromewebstore.google.com/detail/dhffiackmepdmiceljgghbmkapfgfcag
Source (MIT): https://github.com/adityaongit/idxbeaver
Site: https://idxbeaver.portlabs.in

Chromium 120+ · Manifest V3 · no telemetry

#chrome #devtools #indexeddb #webdev #chromeextension
```

## Tags

```
indexeddb, chrome devtools, chrome extension, indexeddb viewer, indexeddb editor,
browser storage, localstorage, devtools extension, web development, database client,
mongodb query, schema inference, dexie, web dev tools
```
