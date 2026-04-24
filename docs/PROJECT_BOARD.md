# Storage Studio Project Board

Last updated: 2026-04-20

## Workflow

- Move tasks between `Now`, `Next`, `Backlog`, `Blocked`, and `Done` as work progresses.
- Keep task IDs stable. Use the format `E<epic>-T<task>`.
- When a task moves to `Done`, add the completion date and verification performed.
- When a task is blocked, add the blocker and unblock condition.

## Now

No active tasks.

## Next

No ready MVP tasks.

## Backlog

- [ ] `E8-T1` Cookies grid
  - Epic: Additional Storage Surfaces
  - Status: Deferred
  - Reason: Adds permission and API complexity after IndexedDB wedge is validated.
- [ ] `E8-T2` Cache API browser
  - Epic: Additional Storage Surfaces
  - Status: Deferred
  - Reason: Valuable for PWA debugging but not required for MVP validation.
- [ ] `E9-T1` Snapshot and diff mode
  - Epic: Advanced Workflows
  - Status: Deferred
  - Reason: Strong Pro feature candidate after core browse/edit/query workflows are proven.
- [ ] `E9-T2` Import origin archive
  - Epic: Advanced Workflows
  - Status: Deferred
  - Reason: Requires conflict handling and archive format design.

## Blocked

No blocked tasks.

## Done

- [x] `E0-T1` Scaffold MV3 React extension
  - Epic: Project Board and Scaffold
  - Completed: 2026-04-20
  - Verification: `npm run build`
  - Result: Vite builds a Chrome extension with DevTools page, panel page, and MV3 service worker in `dist/`.
- [x] `E1-T1` Build DevTools panel shell
  - Epic: DevTools Panel Shell
  - Completed: 2026-04-20
  - Verification: Playwright screenshot `storage-studio-panel.png`; no console errors after favicon fix.
  - Result: Panel renders three-pane Storage Studio workspace with overview, empty/loading/error, and inspector states.
- [x] `E2-T1` Implement inspected-tab storage RPC
  - Epic: Inspected-Tab Storage RPC
  - Completed: 2026-04-20
  - Verification: `npm run build`
  - Result: Panel sends typed requests through a long-lived runtime port to the MV3 service worker, which executes storage operations in the inspected tab.
- [x] `E3-T1` IndexedDB discovery and browsing
  - Epic: IndexedDB Discovery and Browsing
  - Completed: 2026-04-20
  - Verification: Playwright screenshot `storage-studio-users.png`; `npm run build`
  - Result: Databases, stores, schema metadata, counts, and sampled records render in the panel.
- [x] `E4-T1` IndexedDB editing
  - Epic: Editing
  - Completed: 2026-04-20
  - Verification: `npm run build`
  - Result: Users can add, edit, and delete rows with confirmation and storage refresh after writes.
- [x] `E5-T1` SELECT query MVP
  - Epic: Query MVP
  - Completed: 2026-04-20
  - Verification: `npm test`; Playwright screenshot `storage-studio-query-inspector.png`
  - Result: Users can run a SELECT-only query subset and see result rows plus scan/index plan text.
- [x] `E6-T1` LocalStorage and SessionStorage
  - Epic: LocalStorage and SessionStorage
  - Completed: 2026-04-20
  - Verification: `npm run build`
  - Result: Users can browse, edit, add, delete, and clear key/value rows.
- [x] `E7-T1` Export current view
  - Epic: Export
  - Completed: 2026-04-20
  - Verification: `npm run build`
  - Result: Users can export current table/query/key-value result as JSON or CSV.
