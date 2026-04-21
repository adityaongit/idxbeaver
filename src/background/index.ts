import type { FrameInfo, IndexedDbDatabaseInfo, PanelMessage, PanelReply, StorageRequest, StorageResponse } from "../shared/types";

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (message: PanelMessage) => {
    const response = await handleStorageRequest(message.request);
    const reply: PanelReply = { id: message.id, response };
    port.postMessage(reply);
  });
});

async function handleStorageRequest(request: StorageRequest): Promise<StorageResponse> {
  try {
    if (request.type === "discover") {
      return await discoverAcrossFrames(request.tabId);
    }

    // RPCs that target a specific frame (IndexedDB per-origin partition).
    if ("frameId" in request) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: request.tabId, frameIds: [request.frameId] },
        world: "MAIN",
        args: [request],
        func: executeStorageRequest
      });
      return result as StorageResponse;
    }

    // KV RPCs run in the top frame.
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

async function discoverAcrossFrames(tabId: number): Promise<StorageResponse> {
  let frames: chrome.webNavigation.GetAllFrameResultDetails[] | null = null;
  try {
    frames = (await chrome.webNavigation.getAllFrames({ tabId })) ?? null;
  } catch {
    frames = null;
  }

  // Skip frames we can never script into (about:srcdoc, chrome-extension://,
  // chrome://, data URIs, blob: — webNavigation returns them but executeScript
  // with world:"MAIN" will reject).
  const scriptable = (frames ?? []).filter((f) => {
    if (f.errorOccurred) return false;
    const url = f.url ?? "";
    if (!url) return f.frameId === 0;
    return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
  });

  const targetFrames: { frameId: number; url?: string }[] = scriptable.length > 0
    ? scriptable.map((f) => ({ frameId: f.frameId, url: f.url }))
    : [{ frameId: 0 }];

  const indexedDb: IndexedDbDatabaseInfo[] = [];
  const seen = new Set<string>();
  const frameInfos: FrameInfo[] = [];
  const frameErrors: string[] = [];
  let topOrigin = "";
  let topLocalStorage = { count: 0, bytes: 0 };
  let topSessionStorage = { count: 0, bytes: 0 };

  // Scan frames in parallel — serial scanning on a tab with 20+ frames is slow.
  const results = await Promise.all(targetFrames.map(async (frame) => {
    try {
      const [execution] = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frame.frameId] },
        world: "MAIN",
        args: [{ type: "discover", tabId } as StorageRequest],
        func: executeStorageRequest
      });
      return { frame, result: execution?.result, error: null as string | null };
    } catch (error) {
      return { frame, result: null, error: error instanceof Error ? error.message : String(error) };
    }
  }));

  for (const { frame, result, error } of results) {
    if (error) {
      frameErrors.push(`frame ${frame.frameId} (${frame.url ?? "?"}): ${error}`);
      continue;
    }
    if (!result || typeof result !== "object" || !("ok" in result) || !(result as { ok: boolean }).ok) {
      const errMsg = (result as { error?: string } | null)?.error ?? "no result";
      frameErrors.push(`frame ${frame.frameId} (${frame.url ?? "?"}): ${errMsg}`);
      continue;
    }
    const payload = (result as unknown as { data: {
      origin: string;
      indexedDb: Omit<IndexedDbDatabaseInfo, "origin" | "frameId">[];
      localStorage: { count: number; bytes: number };
      sessionStorage: { count: number; bytes: number };
    } }).data;

    frameInfos.push({ frameId: frame.frameId, origin: payload.origin, url: frame.url ?? payload.origin });

    if (frame.frameId === 0) {
      topOrigin = payload.origin;
      topLocalStorage = payload.localStorage;
      topSessionStorage = payload.sessionStorage;
    }

    for (const db of payload.indexedDb) {
      const key = `${payload.origin}::${db.name}::v${db.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      indexedDb.push({ ...db, origin: payload.origin, frameId: frame.frameId });
    }
  }

  // Log per-frame errors to the service worker console so users can inspect via
  // chrome://extensions → service worker. Silent failures are what hid the
  // cross-origin iframes in the first place.
  if (frameErrors.length > 0) {
    console.warn("[idxbeaver] discovery errors:", frameErrors);
  }

  return {
    ok: true,
    data: {
      origin: topOrigin,
      indexedDb,
      localStorage: topLocalStorage,
      sessionStorage: topSessionStorage,
      frames: frameInfos
    }
  };
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

  const openDb = (dbName: string, version?: number): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const openRequest = version !== undefined ? indexedDB.open(dbName, version) : indexedDB.open(dbName);
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

  // Inline MongoDB-style filter matcher.
  const matchFilter = (doc: unknown, filter: unknown): boolean => {
    if (!filter || typeof filter !== "object" || Array.isArray(filter)) return true;
    for (const [key, raw] of Object.entries(filter as Record<string, unknown>)) {
      if (key === "$and") {
        if (!Array.isArray(raw) || !raw.every((sub) => matchFilter(doc, sub))) return false;
        continue;
      }
      if (key === "$or") {
        if (!Array.isArray(raw) || !raw.some((sub) => matchFilter(doc, sub))) return false;
        continue;
      }
      if (key === "$not") {
        if (matchFilter(doc, raw)) return false;
        continue;
      }
      const actual = getPathValue(doc, key);
      if (!matchFieldExpr(actual, raw)) return false;
    }
    return true;
  };

  const matchFieldExpr = (actual: unknown, expr: unknown): boolean => {
    if (expr && typeof expr === "object" && !Array.isArray(expr) && !(expr instanceof RegExp) && Object.keys(expr).some((k) => k.startsWith("$"))) {
      for (const [op, val] of Object.entries(expr as Record<string, unknown>)) {
        switch (op) {
          case "$eq": if (!deepEqual(actual, val)) return false; break;
          case "$ne": if (deepEqual(actual, val)) return false; break;
          case "$gt": if (!(compareScalars(actual, val) > 0)) return false; break;
          case "$gte": if (!(compareScalars(actual, val) >= 0)) return false; break;
          case "$lt": if (!(compareScalars(actual, val) < 0)) return false; break;
          case "$lte": if (!(compareScalars(actual, val) <= 0)) return false; break;
          case "$in": if (!Array.isArray(val) || !val.some((v) => deepEqual(actual, v))) return false; break;
          case "$nin": if (!Array.isArray(val) || val.some((v) => deepEqual(actual, v))) return false; break;
          case "$exists": if (Boolean(val) !== (actual !== undefined)) return false; break;
          case "$regex": {
            const flags = typeof (expr as Record<string, unknown>).$options === "string" ? (expr as Record<string, string>).$options : "";
            const re = val instanceof RegExp ? val : new RegExp(String(val), flags);
            if (typeof actual !== "string" || !re.test(actual)) return false;
            break;
          }
          case "$options": break;
          case "$not": if (matchFieldExpr(actual, val)) return false; break;
          default: return false;
        }
      }
      return true;
    }
    return deepEqual(actual, expr);
  };

  const deepEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  };

  const compareScalars = (a: unknown, b: unknown): number => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    return Number.NaN;
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
        try {
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
        } catch {
          // Skip DBs that can't be opened from this frame (e.g., upgrade pending).
        }
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

    if (request.type === "clearIndexedDbStore") {
      const db = await openDb(request.dbName);
      const tx = db.transaction(request.storeName, "readwrite");
      tx.objectStore(request.storeName).clear();
      await txDone(tx);
      db.close();
      return { ok: true, data: { success: true } };
    }

    if (request.type === "deleteIndexedDbStore") {
      const db = await openDb(request.dbName);
      const currentVersion = db.version;
      db.close();
      await new Promise<void>((resolve, reject) => {
        const upgrade = indexedDB.open(request.dbName, currentVersion + 1);
        upgrade.onupgradeneeded = () => {
          const upgradedDb = upgrade.result;
          if (upgradedDb.objectStoreNames.contains(request.storeName)) {
            upgradedDb.deleteObjectStore(request.storeName);
          }
        };
        upgrade.onsuccess = () => { upgrade.result.close(); resolve(); };
        upgrade.onerror = () => reject(upgrade.error ?? new Error("Failed to delete store"));
        upgrade.onblocked = () => reject(new Error("Delete store blocked — close other tabs using this database."));
      });
      return { ok: true, data: { success: true } };
    }

    if (request.type === "deleteIndexedDbDatabase") {
      await new Promise<void>((resolve, reject) => {
        const del = indexedDB.deleteDatabase(request.dbName);
        del.onsuccess = () => resolve();
        del.onerror = () => reject(del.error ?? new Error("Failed to delete database"));
        del.onblocked = () => reject(new Error("Delete database blocked — close other tabs using this database."));
      });
      return { ok: true, data: { success: true } };
    }

    if (request.type === "runIndexedDbQuery") {
      const db = await openDb(request.dbName);
      const tx = db.transaction(request.query.store, "readonly");
      const store = tx.objectStore(request.query.store);
      const filter = (request.query.filter ?? {}) as Record<string, unknown>;
      const limit = request.query.limit ?? 200;
      const sort = request.query.sort;
      const project = request.query.project;

      let indexName: string | null = null;
      let range: IDBKeyRange | undefined;
      const indexableKeys = Object.keys(filter).filter((k) => !k.startsWith("$"));
      if (indexableKeys.length === 1) {
        const field = indexableKeys[0];
        if (Array.from(store.indexNames).includes(field)) {
          const expr = filter[field];
          if (expr === null || typeof expr === "string" || typeof expr === "number" || typeof expr === "boolean") {
            indexName = field;
            range = IDBKeyRange.only(expr as IDBValidKey);
          } else if (expr && typeof expr === "object" && !Array.isArray(expr)) {
            const e = expr as Record<string, unknown>;
            const hasScalar = (v: unknown) => typeof v === "number" || typeof v === "string";
            if (hasScalar(e.$eq)) { indexName = field; range = IDBKeyRange.only(e.$eq as IDBValidKey); }
            else if (hasScalar(e.$gt) && hasScalar(e.$lt)) { indexName = field; range = IDBKeyRange.bound(e.$gt as IDBValidKey, e.$lt as IDBValidKey, true, true); }
            else if (hasScalar(e.$gte) && hasScalar(e.$lte)) { indexName = field; range = IDBKeyRange.bound(e.$gte as IDBValidKey, e.$lte as IDBValidKey, false, false); }
            else if (hasScalar(e.$gt)) { indexName = field; range = IDBKeyRange.lowerBound(e.$gt as IDBValidKey, true); }
            else if (hasScalar(e.$gte)) { indexName = field; range = IDBKeyRange.lowerBound(e.$gte as IDBValidKey); }
            else if (hasScalar(e.$lt)) { indexName = field; range = IDBKeyRange.upperBound(e.$lt as IDBValidKey, true); }
            else if (hasScalar(e.$lte)) { indexName = field; range = IDBKeyRange.upperBound(e.$lte as IDBValidKey); }
          }
        }
      }
      const source: IDBObjectStore | IDBIndex = indexName ? store.index(indexName) : store;
      const rows: Array<{ key: unknown; value: ReturnType<typeof serializeValue>; projected: Record<string, ReturnType<typeof serializeValue>> }> = [];
      let scanned = 0;

      await new Promise<void>((resolve, reject) => {
        const cursorRequest = source.openCursor(range);
        cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("Unable to query records"));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor || (!sort && rows.length >= limit)) {
            resolve();
            return;
          }
          scanned += 1;
          const record = cursor.value;
          if (matchFilter(record, filter)) {
            const columns = project && project.length > 0
              ? project
              : (record && typeof record === "object" && !Array.isArray(record) ? Object.keys(record as Record<string, unknown>) : []);
            rows.push({
              key: serializeValue(cursor.primaryKey).value,
              value: serializeValue(record),
              projected: Object.fromEntries(columns.map((column) => [column, serializeValue(getPathValue(record, column))]))
            });
          }
          cursor.continue();
        };
      });

      if (sort) {
        const entries = Object.entries(sort);
        rows.sort((left, right) => {
          for (const [field, dir] of entries) {
            const a = getPathValue(left.value.value, field) as string | number | boolean | null | undefined;
            const b = getPathValue(right.value.value, field) as string | number | boolean | null | undefined;
            if (a === b) continue;
            const cmp = String(a ?? "") > String(b ?? "") ? 1 : -1;
            return dir === -1 ? -cmp : cmp;
          }
          return 0;
        });
      }

      const limited = rows.slice(0, limit);
      db.close();
      const columns = project && project.length > 0
        ? project
        : inferColumns(limited);

      const planParts: string[] = [];
      planParts.push(indexName ? `Used index "${indexName}"` : "Full object-store scan");
      planParts.push(`scanned ${scanned}`);
      planParts.push(`matched ${rows.length}`);
      if (sort) planParts.push(`sorted in memory by ${Object.keys(sort).join(", ")}`);
      planParts.push(`returned ${limited.length}`);

      return {
        ok: true,
        data: { rows: limited, columns, plan: planParts.join(" · ") }
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
