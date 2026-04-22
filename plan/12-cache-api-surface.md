# 12 — Cache API Surface

## Context

Cache Storage (used by service workers) is the second missing surface. Unlike
cookies, it lives entirely in the page world and we access it via
`chrome.scripting.executeScript({ world: "MAIN" })` just like we already do
for IndexedDB.

## Files to change

- `src/shared/types.ts` — new request / response / selected-node variants.
- `src/background/index.ts` — new handlers using `caches.keys()`, `caches.open()`,
  `cache.keys()`, `cache.match()`, `cache.delete()`.
- `src/panel/main.tsx` — sidebar node (`Cache Storage → <cacheName>`) and a
  new view branch.
- New file: `src/panel/CacheView.tsx`.

## RPC surface

```ts
| { type: "readCacheNames"; tabId: number; frameId: number }
| { type: "readCacheEntries"; tabId: number; frameId: number; cacheName: string; limit: number; offset: number }
| { type: "readCacheResponse"; tabId: number; frameId: number; cacheName: string; url: string; requestMethod: string }
| { type: "deleteCacheEntry"; tabId: number; frameId: number; cacheName: string; url: string; requestMethod: string }
| { type: "clearCache"; tabId: number; frameId: number; cacheName: string };
```

Response:

```ts
interface CacheEntrySummary {
  url: string;
  method: string;
  status: number;
  statusText: string;
  contentType: string;
  contentLength: number | null;
  dateHeader: string | null;
}

interface CacheResponseBody {
  contentType: string;
  kind: "text" | "json" | "image" | "binary";
  preview: string;     // text, or base64 (images/binary capped to 200 KB)
}
```

The split between "summary" and "full body" keeps initial load cheap — only
fetch body on demand when the user opens a preview.

## Discovery

Extend `StorageDiscovery`:

```ts
cacheStorage: {
  caches: { name: string; entryCount: number | null }[]; // count lazy (see Plan 14)
};
```

## UI

### Sidebar

```
Cache Storage
├── static-v4    318 entries
└── api-v1       42 entries
```

### Grid

Columns: `URL · method · status · content-type · size · date`.

- Uses the virtualized grid (Plan 09).
- Selecting a row opens the right pane with:
  - Request headers (if any — Cache API only stores request meta).
  - Response headers.
  - Body preview (text / JSON formatted / image rendered / binary shown as
    "<N KB binary>").

### Actions

- Delete entry.
- Clear cache (entire named cache).
- Copy URL.

## Body previews

Decoding rules, enforced in the page world before shipping back:

- `text/*`, `application/json`, `application/javascript`: decode to string,
  cap at 200 KB. Larger bodies truncated with a notice.
- `image/*`: read as Blob → `FileReader.readAsDataURL` → base64. Cap at 2 MB.
- Anything else: return size only.

## Acceptance

- A Cache Storage cache opens with all entries listed.
- Clicking a JSON entry previews pretty-printed JSON.
- Clicking an image entry previews the image.
- Deleting an entry disappears from the grid without full reload.

## Verification

- Manual: run on a site with an active Service Worker + caches (e.g. any PWA).
- Regression: ensure IndexedDB flows still work (no coupling).
