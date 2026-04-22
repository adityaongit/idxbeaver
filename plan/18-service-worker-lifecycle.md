# 18 — Service-Worker Lifecycle Resilience

## Context

The current panel holds a long-lived port to the background service worker
(see `useStorageRpc` in `src/panel/main.tsx` and the `onConnect` listener in
`src/background/index.ts`). If the service worker is terminated (Chrome
terminates MV3 workers aggressively), the port breaks and any in-flight
request rejects. Long-running operations — streaming a large snapshot, an
origin import, a huge query — cannot tolerate this.

## Files to change

- `src/panel/main.tsx` — rework `useStorageRpc` to auto-reconnect and retry
  idempotent requests.
- `src/background/index.ts` — classify in-flight requests into idempotent
  vs non-idempotent; persist in-flight metadata to `chrome.storage.session`
  for the idempotent ones so they can be rerun on restart.
- New file: `src/shared/rpcIds.ts` — shared UUID helper + metadata schema.

## Reconnect strategy

- On port `onDisconnect`, the panel waits 250 ms, then attempts `chrome.runtime.connect`
  up to 3 times with exponential backoff.
- Pending requests are bucketed:
  - **Idempotent** (reads, discovery, cache reads): automatically retried on
    the new port.
  - **Non-idempotent** (mutations, deletes): rejected with a `PortLostError`
    that the UI surfaces as "Operation interrupted — retry?".
- Snapshots and imports (Plans 15, 16) use chunked, resumable operations;
  each chunk is idempotent, so the top-level action continues from the last
  acknowledged chunk.

## `chrome.storage.session` state

- Keyed by request UUID:
  ```ts
  type PendingEntry = {
    id: string;
    type: StorageRequest["type"];
    startedAt: number;
    idempotent: boolean;
  };
  ```
- Background worker records on receive, deletes on reply.
- On restart, the worker reads back the session state and emits a
  `PANEL_RESYNC` message so the panel can reconcile.

## Error surface

- New `PortLostError` + `RetriedError` types.
- Notice strip shows appropriate message; inline retries where possible.

## Acceptance

- Force-kill the SW via `chrome://serviceworker-internals` during a 5-minute
  import; import resumes after the SW restarts, no manual action.
- A mutation that was in-flight at kill-time surfaces a "retry?" prompt.

## Verification

- Manual: use the DevTools "Update on reload" + force-terminate to repeatedly
  break the port; verify recovery.
- Load test: start 10 large reads; terminate worker mid-flight; all should
  succeed after reconnect.
