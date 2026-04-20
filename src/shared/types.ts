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
}

export interface StorageDiscovery {
  origin: string;
  indexedDb: IndexedDbDatabaseInfo[];
  localStorage: StorageKvSummary;
  sessionStorage: StorageKvSummary;
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

export type ComparisonOperator = "=" | "!=" | "<" | "<=" | ">" | ">=" | "LIKE";

export interface QueryCondition {
  column: string;
  operator: ComparisonOperator;
  value: string | number | boolean | null;
}

export interface QueryPlan {
  select: string[];
  storeName: string;
  where: QueryCondition[];
  orderBy?: {
    column: string;
    direction: "ASC" | "DESC";
  };
  limit: number;
  explain: string;
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
  | { type: "readIndexedDbStore"; tabId: number; dbName: string; storeName: string; limit: number }
  | { type: "putIndexedDbRecord"; tabId: number; dbName: string; storeName: string; key: SerializableValue; value: SerializableValue }
  | { type: "addIndexedDbRecord"; tabId: number; dbName: string; storeName: string; key?: SerializableValue; value: SerializableValue }
  | { type: "deleteIndexedDbRecord"; tabId: number; dbName: string; storeName: string; key: SerializableValue }
  | { type: "runIndexedDbQuery"; tabId: number; dbName: string; plan: QueryPlan }
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
