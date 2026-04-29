import { CHROME_WEB_STORE_URL } from "@/lib/brand";
import { resolveSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const base = resolveSiteUrl();
  const body = `# IdxBeaver

> Chrome DevTools extension that turns the Application panel into a database client for browser storage. Inspect, query, edit, and export IndexedDB, LocalStorage, SessionStorage, Cookies, and Cache Storage with a TablePlus-style data grid.

## What it is

- IndexedDB browser — every database and object store across every frame, in a dense data grid with column pinning, sticky headers, and inline editing.
- MongoDB-style query language — filter, project, sort, limit. Index-aware plan selection with an in-memory fallback for compound operators. The chosen plan is shown alongside results.
- Multi-tab query workspace — keep several queries open at once; save the ones worth keeping; auto-recorded history per origin.
- Editor for LocalStorage, SessionStorage, Cookies, and Cache Storage — browse, add, edit, delete, clear.
- Schema inference — samples rows per store to drive autocomplete and a Structure view. One-click TypeScript / Dexie schema export.
- Import/export — NDJSON, CSV, SQL INSERT, ZIP. Round-trips non-JSON types (Date, BigInt, Map, Set, Blob, ArrayBuffer).
- Runs entirely in the browser. No telemetry. No servers. No account.

## Install

- Chrome Web Store: ${CHROME_WEB_STORE_URL}
- Source (MIT): https://github.com/adityaongit/idxbeaver
- Latest .zip for unpacked install: https://github.com/adityaongit/idxbeaver/releases/latest

## Privacy

- Policy: ${base}/privacy
- IdxBeaver reads storage only on pages the developer is actively debugging. Data never leaves the browser.

## Compatibility

- Chromium 110+ (Chrome, Edge, Brave, Arc, Opera). Manifest V3.
- License: MIT. Author: Aditya Jindal.

## Project links

- Homepage: ${base}/
- Issues: https://github.com/adityaongit/idxbeaver/issues
- Releases: https://github.com/adityaongit/idxbeaver/releases
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
