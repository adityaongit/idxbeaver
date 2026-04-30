export type StorageSurface = "indexeddb" | "localStorage" | "sessionStorage";

export interface CacheEntrySummary {
  url: string;
  method: string;
  status: number;
  statusText: string;
  contentType: string;
  contentLength: number | null;
  dateHeader: string | null;
}

export interface CacheResponseBody {
  contentType: string;
  kind: "text" | "json" | "image" | "binary";
  preview: string;
}

export interface CacheNamesResult {
  caches: { name: string; entryCount: number | null }[];
}

export type SerializableValue =
  | null
  | string
  | number
  | boolean
  | SerializableValue[]
  | { [key: string]: SerializableValue };

export interface SerializedCell {
  type: string;
  preview: string;
  value: SerializableValue;
}

export interface IndexedDbIndexInfo {
  name: string;
  keyPath: string | string[] | null;
  unique: boolean;
  multiEntry: boolean;
}

export interface IndexedDbStoreInfo {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  count: number | null;
  indexes: IndexedDbIndexInfo[];
}

export interface IndexedDbDatabaseInfo {
  name: string;
  version: number;
  stores: IndexedDbStoreInfo[];
  // The inspected page can contain iframes with distinct origins, and each
  // origin has its own IndexedDB partition. We tag every discovered DB with
  // the frame origin that returned it, plus the frameId we can use to route
  // follow-up RPCs to that frame.
  origin: string;
  frameId: number;
  // Storage Buckets API name (https://wicg.github.io/storage-buckets/). "default"
  // is the bucket-less default. Named buckets are invisible to a plain
  // indexedDB.databases() call and require navigator.storageBuckets.open(name).
  bucketName: string;
}

export interface CookieRecord {
  name: string;
  value: string;
  domain: string;
  path: string;
  expirationDate: number | undefined;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  session: boolean;
}

export interface StorageDiscovery {
  origin: string;
  url: string;
  indexedDb: IndexedDbDatabaseInfo[];
  localStorage: StorageKvSummary;
  sessionStorage: StorageKvSummary;
  cookies: StorageKvSummary;
  cacheStorage: { caches: { name: string; entryCount: number | null }[] };
  frames: FrameInfo[];
}

export interface FrameInfo {
  frameId: number;
  origin: string;
  url: string;
}

export interface StorageKvSummary {
  count: number;
  bytes: number;
}

export interface IndexedDbRecord {
  key: SerializableValue;
  value: SerializedCell;
}

export interface KeyValueRecord {
  key: string;
  value: string;
  parsed: SerializedCell;
}

export interface TableReadResult {
  rows: IndexedDbRecord[];
  columns: string[];
  total: number | null;
}

export interface KvReadResult {
  rows: KeyValueRecord[];
}

export type MongoFilter = Record<string, unknown>;
export type MongoSort = Record<string, 1 | -1>;

export interface NoSqlQuery {
  store: string;
  filter?: MongoFilter;
  sort?: MongoSort;
  limit?: number;
  project?: string[];
}

export interface QueryResult {
  rows: IndexedCellRecord[];
  columns: string[];
  plan: string;
  elapsedMs?: number;
}

export interface QueryTab {
  id: string;
  name: string;
  queryText: string;
  savedQueryId: string | null;
  lastResult: QueryResult | null;
}

export interface IndexedCellRecord {
  key: SerializableValue;
  value: SerializedCell;
  projected: Record<string, SerializedCell>;
}

// Optional bucket selector for IDB-targeted RPCs so reads/writes hit the right
// IDBFactory when a DB lives in a non-default Storage Bucket.
export interface IndexedDbTarget {
  bucketName?: string;
}

export type StorageRequest =
  | { type: "discover"; tabId: number }
  | ({ type: "readIndexedDbStore"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; limit: number } & IndexedDbTarget)
  | ({ type: "putIndexedDbRecord"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; key: SerializableValue; value: SerializableValue } & IndexedDbTarget)
  | ({ type: "addIndexedDbRecord"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; key?: SerializableValue; value: SerializableValue } & IndexedDbTarget)
  | ({ type: "deleteIndexedDbRecord"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; key: SerializableValue } & IndexedDbTarget)
  | ({ type: "runIndexedDbQuery"; tabId: number; frameId: number; dbName: string; dbVersion: number; query: NoSqlQuery } & IndexedDbTarget)
  | ({ type: "clearIndexedDbStore"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string } & IndexedDbTarget)
  | ({ type: "deleteIndexedDbStore"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string } & IndexedDbTarget)
  | ({ type: "deleteIndexedDbDatabase"; tabId: number; frameId: number; dbName: string } & IndexedDbTarget)
  | { type: "readKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage" }
  | { type: "setKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage"; key: string; value: string }
  | { type: "removeKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage"; key: string }
  | { type: "clearKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage" }
  | { type: "readCookies"; tabId: number; url: string }
  | { type: "setCookie"; tabId: number; url: string; details: chrome.cookies.SetDetails }
  | { type: "removeCookie"; tabId: number; url: string; name: string }
  | { type: "clearCookies"; tabId: number; url: string }
  | { type: "readCacheNames"; tabId: number; frameId: number }
  | { type: "readCacheEntries"; tabId: number; frameId: number; cacheName: string; limit: number; offset: number }
  | { type: "readCacheResponse"; tabId: number; frameId: number; cacheName: string; url: string; requestMethod: string }
  | { type: "deleteCacheEntry"; tabId: number; frameId: number; cacheName: string; url: string; requestMethod: string }
  | { type: "clearCache"; tabId: number; frameId: number; cacheName: string }
  | ({ type: "readStoreSummary"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string } & IndexedDbTarget)
  | { type: "storageEstimate"; tabId: number }
  | ({ type: "readIndexedDbStoreChunk"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; offset: number; limit: number } & IndexedDbTarget)
  | ({ type: "bulkPutIndexedDbRows"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; rows: Array<{ key: SerializableValue; value: SerializableValue }> } & IndexedDbTarget);

export interface StoreSummary {
  rowCount: number | null;
  approxBytes: number | null;
  sampledRows: number;
}

export interface StorageEstimateResult {
  usage: number | null;
  quota: number | null;
}

export interface CookieReadResult {
  rows: CookieRecord[];
}

export type StorageResponse =
  | { ok: true; data: StorageDiscovery }
  | { ok: true; data: TableReadResult }
  | { ok: true; data: KvReadResult }
  | { ok: true; data: QueryResult }
  | { ok: true; data: CookieReadResult }
  | { ok: true; data: CacheEntrySummary[] }
  | { ok: true; data: CacheResponseBody }
  | { ok: true; data: CacheNamesResult }
  | { ok: true; data: StoreSummary }
  | { ok: true; data: StorageEstimateResult }
  | { ok: true; data: { success: true } }
  | { ok: false; error: string };

export interface PanelMessage {
  id: string;
  // Preferred wire form: a JSON-encoded request string. Sidesteps Chrome
  // port.postMessage's structured-clone quirks (e.g., refusing certain large
  // payloads, proxied objects, or strings with unpaired surrogates).
  requestJson?: string;
  // Legacy / unused-on-this-build form. Kept for back-compat in case a stale
  // panel build is connected to a fresh background.
  request?: StorageRequest;
}

export interface PanelReply {
  id: string;
  response: StorageResponse;
}
