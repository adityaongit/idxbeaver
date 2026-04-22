# 17 — Destructive Action Typed-Confirmation

## Context

PRD §8.4 requires that bulk-destructive operations require typing the target
name and show a preview of what will be affected, with an optional "take a
snapshot first" toggle. Today we show a simple "Delete store?" dialog with
Confirm / Cancel.

## Files to change

- New file: `src/panel/DestructiveDialog.tsx`.
- `src/panel/main.tsx` — current `pendingAction` dialog replaced by the new
  component; shape of `PendingAction` slightly extended.

## Confirmation shape

```ts
type DestructivePlan = {
  title: string;                 // "Delete database?"
  verb: "delete" | "clear" | "nuke" | "replace";
  noun: string;                  // "users store"
  confirmText: string;           // what the user must type
  preview: {
    label: string;               // "Row count"
    value: string | number;      // 12,341
  }[];
  snapshotOffer?: {
    defaultEnabled: boolean;
    snapshotScope: "store" | "database" | "origin";
  };
  execute: () => Promise<void>;
};
```

All existing destructive triggers (`clearStore`, `deleteStore`, `deleteDatabase`,
`clearKv`, `deleteKv`) are rewritten to produce a `DestructivePlan`.

## UI

- Title + concise subtitle (one line).
- Preview table (e.g. "Rows: 12,341 · Bytes: 89 MB").
- Text input: "Type `<store-name>` to confirm."
- "Take snapshot first" checkbox (default `true` when snapshots available).
- Confirm button disabled until the text matches exactly (case-sensitive).
- Cancel dismisses.

## Snapshot-before integration

If the checkbox is on, execution is:

1. Invoke Plan 15's snapshot capture for `snapshotScope`.
2. On snapshot success, continue with `execute()`.
3. On failure, surface the snapshot error and do NOT proceed with destruction.

## Preference coupling

Plan 05's `confirmDestructive` pref controls whether the typed-confirm is
required at all. When off (power-user mode), the dialog still appears but the
text input is not required — the user just clicks Confirm. The snapshot toggle
remains.

## Acceptance

- Attempting to delete the `users` store requires typing `users`; mistyping
  keeps Confirm disabled.
- With snapshot checkbox on, the store is snapshotted before being deleted.
- Nuke origin (Plan 13) uses the hostname as the required text.

## Verification

- Manual: each destructive entry-point opens the new dialog with the right
  noun / preview.
