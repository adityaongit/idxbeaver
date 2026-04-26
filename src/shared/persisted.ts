// Extension-owned IndexedDB for persistent query history, saved queries,
// and snapshots. Runs in the panel page context — no manifest permission needed.

import type { IndexedDbRecord } from "./types";

export interface HistoryEntry {
  id: string;
  origin: string;
  dbName: string | null;
  storeName: string | null;
  queryText: string;
  createdAt: number;
  ok: boolean;
  rowCount: number | null;
  durationMs: number | null;
}

export interface SavedQuery {
  id: string;
  origin: string;
  name: string;
  queryText: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type SnapshotScope = "origin" | "database" | "store";

export interface SnapshotManifest {
  id: string;
  origin: string;
  scope: SnapshotScope;
  dbName?: string;
  dbVersion?: number;
  storeName?: string;
  createdAt: number;
  label?: string;
  bytes: number;
  entryCount: number;
}

export interface SnapshotRowChunk {
  id: string;
  snapshotId: string;
  seq: number;
  rows: IndexedDbRecord[];
}

const DB_NAME = "idxbeaver";
const DB_VERSION = 2;
const HISTORY_LIMIT = 100;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      if (oldVersion < 1) {
        const hist = db.createObjectStore("history", { keyPath: "id" });
        hist.createIndex("origin", "origin");
        hist.createIndex("createdAt", "createdAt");
        const saved = db.createObjectStore("saved_queries", { keyPath: "id" });
        saved.createIndex("origin", "origin");
        saved.createIndex("updatedAt", "updatedAt");
        const snaps = db.createObjectStore("snapshots", { keyPath: "id" });
        snaps.createIndex("origin", "origin");
        snaps.createIndex("createdAt", "createdAt");
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("snapshot_chunks")) {
          const chunks = db.createObjectStore("snapshot_chunks", { keyPath: "id" });
          chunks.createIndex("snapshotId", "snapshotId");
          chunks.createIndex("snapshotSeq", ["snapshotId", "seq"]);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    t.onerror = () => reject(t.error);
    const result = fn(t);
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result as T);
      result.onerror = () => reject(result.error);
    } else {
      result.then(resolve, reject);
    }
  });
}

function getAll<T>(store: IDBObjectStore, index?: string, query?: IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const source = index ? store.index(index) : store;
    const req = source.getAll(query);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function countByIndex(store: IDBObjectStore, indexName: string, query: IDBKeyRange): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = store.index(indexName).count(query);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllByIndex<T>(store: IDBObjectStore, indexName: string, query: IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.index(indexName).getAll(query);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// --- History ---

export async function appendHistory(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<void> {
  const db = await openDb();
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  const t = db.transaction("history", "readwrite");
  const store = t.objectStore("history");

  const originRange = IDBKeyRange.only(entry.origin);
  const existing = await getAllByIndex<HistoryEntry>(store, "origin", originRange);

  store.put(full);

  if (existing.length >= HISTORY_LIMIT) {
    const oldest = existing.sort((a, b) => a.createdAt - b.createdAt).slice(0, existing.length - HISTORY_LIMIT + 1);
    for (const old of oldest) store.delete(old.id);
  }

  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getHistory(origin: string): Promise<HistoryEntry[]> {
  const db = await openDb();
  const t = db.transaction("history", "readonly");
  const store = t.objectStore("history");
  const entries = await getAllByIndex<HistoryEntry>(store, "origin", IDBKeyRange.only(origin));
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearHistory(origin: string): Promise<void> {
  const db = await openDb();
  const t = db.transaction("history", "readwrite");
  const store = t.objectStore("history");
  const entries = await getAllByIndex<HistoryEntry>(store, "origin", IDBKeyRange.only(origin));
  for (const entry of entries) store.delete(entry.id);
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// --- Saved queries ---

export async function saveQuery(query: Omit<SavedQuery, "id" | "createdAt" | "updatedAt">): Promise<SavedQuery> {
  const db = await openDb();
  const now = Date.now();
  const full: SavedQuery = { ...query, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await tx(db, "saved_queries", "readwrite", (t) => t.objectStore("saved_queries").put(full));
  return full;
}

export async function updateSavedQuery(id: string, patch: Partial<Pick<SavedQuery, "name" | "queryText" | "tags">>): Promise<void> {
  const db = await openDb();
  const t = db.transaction("saved_queries", "readwrite");
  const store = t.objectStore("saved_queries");
  await new Promise<void>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result as SavedQuery | undefined;
      if (!existing) { resolve(); return; }
      store.put({ ...existing, ...patch, updatedAt: Date.now() });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSavedQuery(id: string): Promise<void> {
  const db = await openDb();
  await tx(db, "saved_queries", "readwrite", (t) => t.objectStore("saved_queries").delete(id));
}

export async function getSavedQueries(origin: string): Promise<SavedQuery[]> {
  const db = await openDb();
  const t = db.transaction("saved_queries", "readonly");
  const store = t.objectStore("saved_queries");
  const entries = await getAllByIndex<SavedQuery>(store, "origin", IDBKeyRange.only(origin));
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

// --- Snapshots ---

export async function saveSnapshotManifest(manifest: Omit<SnapshotManifest, "id" | "createdAt">): Promise<SnapshotManifest> {
  const db = await openDb();
  const full: SnapshotManifest = { ...manifest, id: crypto.randomUUID(), createdAt: Date.now() };
  await tx(db, "snapshots", "readwrite", (t) => t.objectStore("snapshots").put(full));
  return full;
}

export async function appendSnapshotChunk(snapshotId: string, seq: number, rows: IndexedDbRecord[]): Promise<void> {
  const db = await openDb();
  const chunk: SnapshotRowChunk = { id: crypto.randomUUID(), snapshotId, seq, rows };
  await tx(db, "snapshot_chunks", "readwrite", (t) => t.objectStore("snapshot_chunks").put(chunk));
}

export async function listSnapshots(origin: string): Promise<SnapshotManifest[]> {
  const db = await openDb();
  const t = db.transaction("snapshots", "readonly");
  const store = t.objectStore("snapshots");
  const entries = await getAllByIndex<SnapshotManifest>(store, "origin", IDBKeyRange.only(origin));
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSnapshotRows(snapshotId: string): Promise<IndexedDbRecord[]> {
  const db = await openDb();
  const t = db.transaction("snapshot_chunks", "readonly");
  const store = t.objectStore("snapshot_chunks");
  const chunks = await getAllByIndex<SnapshotRowChunk>(store, "snapshotId", IDBKeyRange.only(snapshotId));
  chunks.sort((a, b) => a.seq - b.seq);
  return chunks.flatMap((c) => c.rows);
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const db = await openDb();
  const t = db.transaction(["snapshots", "snapshot_chunks"], "readwrite");
  t.objectStore("snapshots").delete(snapshotId);
  const chunks = await getAllByIndex<SnapshotRowChunk>(
    t.objectStore("snapshot_chunks"),
    "snapshotId",
    IDBKeyRange.only(snapshotId)
  );
  for (const chunk of chunks) t.objectStore("snapshot_chunks").delete(chunk.id);
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
