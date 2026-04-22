import type { StorageRequest } from "./types";

// Read-only request types that are safe to automatically retry after a
// service-worker restart (they have no side-effects).
export const IDEMPOTENT_TYPES = new Set<StorageRequest["type"]>([
  "discover",
  "readIndexedDbStore",
  "readIndexedDbStoreChunk",
  "runIndexedDbQuery",
  "readKeyValue",
  "readCookies",
  "readCacheNames",
  "readCacheEntries",
  "readCacheResponse",
  "readStoreSummary",
  "storageEstimate",
]);

export function isIdempotent(request: StorageRequest): boolean {
  return IDEMPOTENT_TYPES.has(request.type);
}

// Metadata written to chrome.storage.session per in-flight request.
export interface PendingEntry {
  id: string;
  type: StorageRequest["type"];
  startedAt: number;
  idempotent: boolean;
}

// Synthetic error class surfaced when a non-idempotent request is lost due to
// a service-worker restart.
export class PortLostError extends Error {
  constructor() {
    super("Operation interrupted — the service worker was restarted. Please retry.");
    this.name = "PortLostError";
  }
}
