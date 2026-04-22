# 11 — Cookies Surface

## Context

Cookies are one of the five PRD surfaces and are currently absent. They differ
from IndexedDB / LocalStorage because they are not scoped to the page world —
they are read and written through the `chrome.cookies` API from the extension's
background service worker.

## Files to change

- `src/manifest.ts` — add `"cookies"` to `permissions`.
- `src/shared/types.ts` — extend `StorageRequest` / `StorageResponse` and `SelectedNode`.
- `src/background/index.ts` — new cases for the cookie RPCs.
- `src/panel/main.tsx` — sidebar node, selected-view branch, new `CookieGrid` component.
- New file: `src/panel/CookieGrid.tsx`.

## RPC surface

```ts
// additions to StorageRequest union
| { type: "readCookies"; tabId: number; url: string }
| { type: "setCookie"; tabId: number; url: string; details: chrome.cookies.SetDetails }
| { type: "removeCookie"; tabId: number; url: string; name: string }
| { type: "clearCookies"; tabId: number; url: string };
```

Background handlers:

- `readCookies` → `chrome.cookies.getAll({ url })`. Returns full array including
  `domain`, `path`, `expirationDate`, `httpOnly`, `secure`, `sameSite`, `session`.
- `setCookie` / `removeCookie` → straight pass-through.
- `clearCookies` → iterate the array and `remove` each.

The `url` is the inspected page URL (`chrome.devtools.inspectedWindow.tabId`
→ tab → url); stashed in discovery response.

## Discovery

Extend `StorageDiscovery`:

```ts
cookies: { count: number; bytes: number };
```

`bytes` is sum of `name.length + value.length` (conservative).

## UI

### Sidebar

Under the origin root: `Cookies (N)` as a leaf node, like the existing KV leaves.

### Grid

Columns: `name · value · domain · path · expires · httpOnly · secure · sameSite`.

- Reuses the virtualized `DataGrid` shell from Plan 09 but with a dedicated
  column set — not IndexedDB-specific logic, so extract the grid frame to
  take arbitrary columns. Alternative: a dedicated `CookieGrid` that reuses
  the same footer (`DataFooter`).
- Inline editing of `value`, `expires`, `sameSite`, `httpOnly`, `secure`.
- `+ Row` opens inline draft that collects `name` + `value` at minimum.
- Context menu: Delete cookie, Copy name, Copy value, Copy as curl header.

### Footer

- `Data` tab only (Structure is not meaningful for cookies).
- Filters (Plan 02) honored over `name` / `domain`.
- Export JSON / CSV reuses the same mechanism.

## Permission copy

Store listing must mention cookies access. We already request `<all_urls>` for
scripting; cookies adds no new host surface, just the API.

## Acceptance

- Cookies tab lists all cookies returned by `chrome.cookies.getAll` for the
  inspected URL.
- Editing the `value` cell updates via `chrome.cookies.set`; reload page keeps
  the change.
- Destructive ops (`Clear cookies`) go through Plan 17's typed confirmation.

## Verification

- Unit tests: skip (API interactions are thin).
- Manual: set a session cookie via the page; see it appear. Edit. Delete. Confirm via page-side read.
