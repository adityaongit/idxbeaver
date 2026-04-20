import type { PanelMessage, PanelReply, StorageRequest, StorageResponse } from "../shared/types";

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (message: PanelMessage) => {
    const response = await handleStorageRequest(message.request);
    const reply: PanelReply = { id: message.id, response };
    port.postMessage(reply);
  });
});

async function handleStorageRequest(request: StorageRequest): Promise<StorageResponse> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      world: "MAIN",
      args: [request],
      func: executeStorageRequest
    });

    return result as StorageResponse;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function executeStorageRequest(request: StorageRequest): Promise<any> {
  const serializeValue = (input: unknown, seen = new WeakSet<object>()): { type: string; preview: string; value: unknown } => {
    const normalizeValue = (value: unknown): unknown => {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
      }
      if (typeof value === "undefined") return { $type: "Undefined" };
      if (typeof value === "bigint") return { $type: "BigInt", value: value.toString() };
      if (typeof value === "function") return { $type: "Function" };
      if (typeof value !== "object") return String(value);
      if (seen.has(value)) return { $type: "Circular" };
      seen.add(value);
      if (value instanceof Date) return { $type: "Date", value: value.toISOString() };
      if (value instanceof RegExp) return { $type: "RegExp", value: value.toString() };
      if (value instanceof Map) {
        return { $type: "Map", entries: Array.from(value.entries()).map(([key, item]) => [normalizeValue(key), normalizeValue(item)]) };
      }
      if (value instanceof Set) {
        return { $type: "Set", values: Array.from(value.values()).map((item) => normalizeValue(item)) };
      }
      if (ArrayBuffer.isView(value)) return { $type: value.constructor.name, bytes: value.byteLength };
      if (value instanceof ArrayBuffer) return { $type: "ArrayBuffer", bytes: value.byteLength };
      if (typeof Blob !== "undefined" && value instanceof Blob) {
        return { $type: "Blob", bytes: value.size, mime: value.type };
      }
      if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeValue(item)]));
    };

    const normalized = normalizeValue(input);
    const preview = (() => {
      if (normalized === null) return "null";
      if (typeof normalized === "string") return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
      if (typeof normalized === "number" || typeof normalized === "boolean") return String(normalized);
      if (Array.isArray(normalized)) return `Array(${normalized.length})`;
      const objectValue = normalized as Record<string, unknown>;
      if (typeof objectValue.$type === "string") {
        if (typeof objectValue.bytes === "number") return `<${objectValue.$type} ${objectValue.bytes} bytes>`;
        if (typeof objectValue.value === "string") return `<${objectValue.$type} ${objectValue.value}>`;
        return `<${objectValue.$type}>`;
      }
      return `{ ${Object.keys(objectValue).slice(0, 4).join(", ")}${Object.keys(objectValue).length > 4 ? ", ..." : ""} }`;
    })();

    return {
      type: input === null ? "null" : Array.isArray(input) ? "array" : input instanceof Date ? "Date" : typeof input,
      preview,
      value: normalized
    };
  };

  const openDb = (dbName: string): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(dbName);
      openRequest.onerror = () => reject(openRequest.error ?? new Error(`Unable to open ${dbName}`));
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onupgradeneeded = () => {
        openRequest.transaction?.abort();
        reject(new Error(`Database ${dbName} needs an upgrade transaction and cannot be inspected safely.`));
      };
    });

  const requestToPromise = <T>(idbRequest: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      idbRequest.onerror = () => reject(idbRequest.error ?? new Error("IndexedDB request failed"));
      idbRequest.onsuccess = () => resolve(idbRequest.result);
    });

  const txDone = (transaction: IDBTransaction): Promise<void> =>
    new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });

  const getPathValue = (value: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, value);

  const compareValues = (actual: unknown, operator: string, expected: unknown): boolean => {
    if (operator === "LIKE") {
      const pattern = String(expected).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
      return new RegExp(`^${pattern}$`, "i").test(String(actual ?? ""));
    }
    if (operator === "=") return actual === expected;
    if (operator === "!=") return actual !== expected;
    if ((typeof actual !== "number" && typeof actual !== "string") || (typeof expected !== "number" && typeof expected !== "string")) {
      return false;
    }
    if (operator === "<") return actual < expected;
    if (operator === "<=") return actual <= expected;
    if (operator === ">") return actual > expected;
    if (operator === ">=") return actual >= expected;
    return false;
  };

  const inferColumns = (records: Array<{ value: { value: unknown } }>): string[] => {
    const columns = new Set<string>();
    for (const record of records.slice(0, 100)) {
      const value = record.value.value;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const key of Object.keys(value as Record<string, unknown>)) columns.add(key);
      }
    }
    return Array.from(columns);
  };

  try {
    if (request.type === "discover") {
      const databases = typeof indexedDB.databases === "function" ? await indexedDB.databases() : [];
      const indexedDb = [];
      for (const dbInfo of databases) {
        if (!dbInfo.name) continue;
        const db = await openDb(dbInfo.name);
        const stores = [];
        for (const storeName of Array.from(db.objectStoreNames)) {
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          let count: number | null = null;
          try {
            count = await requestToPromise(store.count());
          } catch {
            count = null;
          }
          stores.push({
            name: store.name,
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            count,
            indexes: Array.from(store.indexNames).map((indexName) => {
              const index = store.index(indexName);
              return { name: index.name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
            })
          });
        }
        indexedDb.push({ name: db.name, version: db.version, stores });
        db.close();
      }

      const summarize = (storage: Storage) => {
        let bytes = 0;
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index) ?? "";
          bytes += key.length + (storage.getItem(key) ?? "").length;
        }
        return { count: storage.length, bytes };
      };

      return {
        ok: true,
        data: {
          origin: location.origin,
          indexedDb,
          localStorage: summarize(localStorage),
          sessionStorage: summarize(sessionStorage)
        }
      };
    }

    if (request.type === "readIndexedDbStore") {
      const db = await openDb(request.dbName);
      const tx = db.transaction(request.storeName, "readonly");
      const store = tx.objectStore(request.storeName);
      const total = await requestToPromise(store.count()).catch(() => null);
      const rows: Array<{ key: unknown; value: ReturnType<typeof serializeValue> }> = [];

      await new Promise<void>((resolve, reject) => {
        const cursorRequest = store.openCursor();
        cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("Unable to read records"));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor || rows.length >= request.limit) {
            resolve();
            return;
          }
          rows.push({ key: serializeValue(cursor.primaryKey).value, value: serializeValue(cursor.value) });
          cursor.continue();
        };
      });

      db.close();
      return { ok: true, data: { rows, columns: inferColumns(rows), total } };
    }

    if (request.type === "putIndexedDbRecord" || request.type === "addIndexedDbRecord") {
      const db = await openDb(request.dbName);
      const tx = db.transaction(request.storeName, "readwrite");
      const store = tx.objectStore(request.storeName);
      const hasInlineKey = store.keyPath !== null;
      if (request.type === "addIndexedDbRecord") {
        if (hasInlineKey || typeof request.key === "undefined") store.add(request.value);
        else store.add(request.value, request.key as IDBValidKey);
      } else {
        if (hasInlineKey) store.put(request.value);
        else store.put(request.value, request.key as IDBValidKey);
      }
      await txDone(tx);
      db.close();
      return { ok: true, data: { success: true } };
    }

    if (request.type === "deleteIndexedDbRecord") {
      const db = await openDb(request.dbName);
      const tx = db.transaction(request.storeName, "readwrite");
      tx.objectStore(request.storeName).delete(request.key as IDBValidKey);
      await txDone(tx);
      db.close();
      return { ok: true, data: { success: true } };
    }

    if (request.type === "runIndexedDbQuery") {
      const db = await openDb(request.dbName);
      const tx = db.transaction(request.plan.storeName, "readonly");
      const store = tx.objectStore(request.plan.storeName);
      const firstCondition = request.plan.where[0];
      const canUseIndex =
        firstCondition?.operator === "=" &&
        Array.from(store.indexNames).includes(firstCondition.column) &&
        (typeof firstCondition.value === "string" || typeof firstCondition.value === "number");
      const source: IDBObjectStore | IDBIndex = canUseIndex ? store.index(firstCondition.column) : store;
      const range = canUseIndex ? IDBKeyRange.only(firstCondition.value as IDBValidKey) : undefined;
      const rows: Array<{ key: unknown; value: ReturnType<typeof serializeValue>; projected: Record<string, ReturnType<typeof serializeValue>> }> = [];

      await new Promise<void>((resolve, reject) => {
        const cursorRequest = source.openCursor(range);
        cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("Unable to query records"));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor || rows.length >= request.plan.limit) {
            resolve();
            return;
          }
          const record = cursor.value;
          const matches = request.plan.where.every((condition) =>
            compareValues(getPathValue(record, condition.column), condition.operator, condition.value)
          );
          if (matches) {
            const columns =
              request.plan.select[0] === "*"
                ? Object.keys(record && typeof record === "object" && !Array.isArray(record) ? (record as Record<string, unknown>) : {})
                : request.plan.select;
            rows.push({
              key: serializeValue(cursor.primaryKey).value,
              value: serializeValue(record),
              projected: Object.fromEntries(columns.map((column) => [column, serializeValue(getPathValue(record, column))]))
            });
          }
          cursor.continue();
        };
      });

      if (request.plan.orderBy) {
        const { column, direction } = request.plan.orderBy;
        rows.sort((left, right) => {
          const leftValue = (left.projected[column]?.value ?? null) as string | number | boolean | null;
          const rightValue = (right.projected[column]?.value ?? null) as string | number | boolean | null;
          if (leftValue === rightValue) return 0;
          const result = String(leftValue) > String(rightValue) ? 1 : -1;
          return direction === "DESC" ? -result : result;
        });
      }

      db.close();
      const columns = request.plan.select[0] === "*" ? inferColumns(rows) : request.plan.select;
      return {
        ok: true,
        data: {
          rows,
          columns,
          plan: canUseIndex
            ? `Used index ${firstCondition.column} for equality lookup.`
            : `${request.plan.explain} Full object-store scan.`
        }
      };
    }

    if (request.type === "readKeyValue") {
      const storage = request.surface === "localStorage" ? localStorage : sessionStorage;
      const rows = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        const value = storage.getItem(key) ?? "";
        let parsedInput: unknown = value;
        try {
          parsedInput = JSON.parse(value);
        } catch {
          parsedInput = value;
        }
        rows.push({ key, value, parsed: serializeValue(parsedInput) });
      }
      rows.sort((left, right) => left.key.localeCompare(right.key));
      return { ok: true, data: { rows } };
    }

    if (request.type === "setKeyValue") {
      const storage = request.surface === "localStorage" ? localStorage : sessionStorage;
      storage.setItem(request.key, request.value);
      return { ok: true, data: { success: true } };
    }

    if (request.type === "removeKeyValue") {
      const storage = request.surface === "localStorage" ? localStorage : sessionStorage;
      storage.removeItem(request.key);
      return { ok: true, data: { success: true } };
    }

    if (request.type === "clearKeyValue") {
      const storage = request.surface === "localStorage" ? localStorage : sessionStorage;
      storage.clear();
      return { ok: true, data: { success: true } };
    }

    return { ok: false, error: "Unsupported storage request." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
