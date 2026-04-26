# IdxBeaver Privacy Policy

_Last updated: 2026-04-27_

IdxBeaver is a Chrome DevTools extension for inspecting and editing browser
storage on pages the developer is actively debugging.

## What data IdxBeaver accesses

When you use the extension on a page, it reads storage belonging to that page:

- IndexedDB databases and object stores
- LocalStorage and SessionStorage entries
- Cookies for the origin
- Cache Storage entries

It does this only in response to actions you take in the panel (clicking a
store, running a query, editing a row, etc.).

## What data IdxBeaver stores

The extension stores the following on your machine only, using
`chrome.storage.local`:

- Your preferences (theme, fonts, sizes, panel layout)
- Your query history (last 100 queries per origin)
- Your saved queries

It also writes to its own private IndexedDB database (`idxbeaver`) on the
extension's origin to persist history and saved queries across DevTools
sessions.

## What data IdxBeaver transmits

**None.** IdxBeaver does not make any network requests. No analytics, no
telemetry, no crash reporting, no remote configuration, no remote code
execution. All processing happens inside your browser.

## Third parties

IdxBeaver does not share data with any third party because it does not
collect or transmit data in the first place.

## Permissions

| Permission | Why it is requested |
|---|---|
| `activeTab` | To operate on the tab the developer has DevTools open for. |
| `scripting` | To run storage-access logic inside the inspected page's MAIN world (the only way an MV3 service worker can read per-origin IndexedDB). |
| `storage` | To persist preferences, history, and saved queries via `chrome.storage.local`. |
| `webNavigation` | To detect when the inspected page navigates so the panel can refresh its view of the origin's storage. |
| `cookies` | To power the Cookies browser as an explicit feature of the extension. |
| `host_permissions: <all_urls>` | Because DevTools may be opened on any origin the developer is debugging. |

## Changes

This policy will be updated in-place when the extension's data practices
change. The "Last updated" date above will reflect the latest revision.

## Contact

Open an issue at https://github.com/adityaongit/idxbeaver/issues
