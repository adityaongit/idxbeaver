# 19 — Serialization Fidelity

## Context

`src/shared/serialize.ts` (and background code) already handles Date, RegExp,
Map, Set, ArrayBuffer views, Blob metadata, BigInt, `undefined`, Function and
circular refs. Gaps that block Plans 10, 12, 15, 16:

- Blob bodies are metadata-only. We need lazy body fetch so cells can render
  image/text previews and so `.zip` archives can round-trip binary payloads.
- No distinction between typed-array views of the same buffer — values are
  lossy.
- No wire-format versioning — when we change the format for snapshots, we have
  no migration story.

## Files to change

- `src/shared/serialize.ts` — extend type map, add version header, add a lazy
  Blob-ref system.
- `src/background/index.ts` — adopt the lazy Blob-ref protocol.
- New file: `src/shared/wire.ts` — stable type tags and version constants.

## Wire format v2

```ts
type Wire =
  | { $t: "p"; v: string | number | boolean | null }
  | { $t: "u" }                          // undefined
  | { $t: "bi"; v: string }              // BigInt (stringified)
  | { $t: "d"; v: number }               // Date (epoch ms)
  | { $t: "r"; src: string; flags: string } // RegExp
  | { $t: "m"; entries: [Wire, Wire][] }   // Map
  | { $t: "s"; values: Wire[] }            // Set
  | { $t: "a"; items: Wire[] }             // Array
  | { $t: "o"; fields: { k: string; v: Wire }[] } // plain Object
  | { $t: "tA"; ctor: TypedArrayName; b64: string }   // typed array
  | { $t: "ab"; b64: string }              // ArrayBuffer
  | { $t: "B"; blobId: string; size: number; mime: string } // Blob ref
  | { $t: "circ"; ref: number };

export const WIRE_VERSION = 2;

export interface Envelope {
  version: number;
  root: Wire;
  blobs: Record<string, string>;  // blobId → base64 (filled on demand)
}
```

## Lazy Blob rehydration

- On encode, Blobs replaced with `{ $t: "B", blobId, size, mime }`; the
  actual base64 is not shipped with the envelope.
- Separate RPC `fetchBlob(blobId)` fetches exactly one blob on demand.
- Cache decoded Blobs in the panel keyed by `blobId` with a weak-LRU of 50 MB.

## Typed arrays

- Preserved as the exact constructor (`Int32Array` vs `Uint8Array`) so
  round-trip is lossless.

## Circular refs

- Keep existing `WeakSet` detection but replace the current placeholder
  string with a structured `{ $t: "circ", ref }` so import can reconstruct.

## Versioning & migration

- Envelope version stamped on all persisted artefacts (history rows that
  carry results, snapshots, archive zip manifests).
- Decoder dispatches by version; v1 reader kept as fallback until everything
  is migrated.

## Acceptance

- Round-trip an object containing Date, RegExp, Map, Set, Uint8Array, Blob,
  and a self-reference; structurally equal to the input after decode.
- Archive `.zip` preserves a PNG Blob; re-importing renders the same image.

## Verification

- Extend `src/shared/serialize.test.ts` with the above round-trip cases.
- Manual: snapshot a store with binary blobs, restore, diff → clean.
