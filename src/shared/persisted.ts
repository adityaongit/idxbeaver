// Extension-owned IndexedDB for persistent query history, saved queries,
// and snapshots (Plan 15). Runs in the panel page context — no manifest
// permission needed.

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

const DB_NAME = "storage-studio";
const DB_VERSION = 1;
const HISTORY_LIMIT = 100;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("history")) {
        const hist = db.createObjectStore("history", { keyPath: "id" });
        hist.createIndex("origin", "origin");
        hist.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("saved_queries")) {
        const saved = db.createObjectStore("saved_queries", { keyPath: "id" });
        saved.createIndex("origin", "origin");
        saved.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("snapshots")) {
        const snaps = db.createObjectStore("snapshots", { keyPath: "id" });
        snaps.createIndex("origin", "origin");
        snaps.createIndex("createdAt", "createdAt");
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
