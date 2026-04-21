export type StorageSurface = "indexeddb" | "localStorage" | "sessionStorage";

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
}

export interface StorageDiscovery {
  origin: string;
  indexedDb: IndexedDbDatabaseInfo[];
  localStorage: StorageKvSummary;
  sessionStorage: StorageKvSummary;
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
}

export interface IndexedCellRecord {
  key: SerializableValue;
  value: SerializedCell;
  projected: Record<string, SerializedCell>;
}

export type StorageRequest =
  | { type: "discover"; tabId: number }
  | { type: "readIndexedDbStore"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; limit: number }
  | { type: "putIndexedDbRecord"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; key: SerializableValue; value: SerializableValue }
  | { type: "addIndexedDbRecord"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; key?: SerializableValue; value: SerializableValue }
  | { type: "deleteIndexedDbRecord"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string; key: SerializableValue }
  | { type: "runIndexedDbQuery"; tabId: number; frameId: number; dbName: string; dbVersion: number; query: NoSqlQuery }
  | { type: "clearIndexedDbStore"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string }
  | { type: "deleteIndexedDbStore"; tabId: number; frameId: number; dbName: string; dbVersion: number; storeName: string }
  | { type: "deleteIndexedDbDatabase"; tabId: number; frameId: number; dbName: string }
  | { type: "readKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage" }
  | { type: "setKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage"; key: string; value: string }
  | { type: "removeKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage"; key: string }
  | { type: "clearKeyValue"; tabId: number; surface: "localStorage" | "sessionStorage" };

export type StorageResponse =
  | { ok: true; data: StorageDiscovery }
  | { ok: true; data: TableReadResult }
  | { ok: true; data: KvReadResult }
  | { ok: true; data: QueryResult }
  | { ok: true; data: { success: true } }
  | { ok: false; error: string };

export interface PanelMessage {
  id: string;
  request: StorageRequest;
}

export interface PanelReply {
  id: string;
  response: StorageResponse;
}
