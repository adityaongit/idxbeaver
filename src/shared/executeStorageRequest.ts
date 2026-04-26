import type { StorageRequest } from "./types";

// Self-contained worker function executed inside the inspected page (or
// wherever IndexedDB lives). It MUST NOT reference any module-scope variables
// because chrome.scripting.executeScript serializes it to a string and re-
// evaluates inside the target frame; chrome.devtools.inspectedWindow.eval (in
// the panel) does the same. Keep all helpers inline.

export 
async function executeStorageRequest(request: StorageRequest): Promise<any> {
  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const serializeValue = (input: unknown, seen: unknown[] = []): { type: string; preview: string; value: unknown } => {
    const normalizeValue = (value: unknown, s: unknown[]): unknown => {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
      }
      if (typeof value === "undefined") return { $type: "Undefined" };
      if (typeof value === "bigint") return { $type: "BigInt", value: value.toString() };
      if (typeof value === "function") return { $type: "Function" };
      if (typeof value !== "object") return String(value);
      const refIdx = s.indexOf(value);
      if (refIdx !== -1) return { $type: "Circular", ref: refIdx };
      s.push(value);
      if (value instanceof Date) return { $type: "Date", value: value.toISOString() };
      if (value instanceof RegExp) return { $type: "RegExp", src: value.source, flags: value.flags };
      if (value instanceof Map) {
        return { $type: "Map", entries: Array.from(value.entries()).map(([key, item]) => [normalizeValue(key, s), normalizeValue(item, s)]) };
      }
      if (value instanceof Set) {
        return { $type: "Set", values: Array.from(value.values()).map((item) => normalizeValue(item, s)) };
      }
      if (value instanceof ArrayBuffer) {
        return { $type: "ArrayBuffer", bytes: value.byteLength, b64: uint8ToBase64(new Uint8Array(value)) };
      }
      if (ArrayBuffer.isView(value)) {
        const ctor = (value as unknown as { constructor: { name: string } }).constructor.name;
        return { $type: ctor, bytes: (value as ArrayBufferView).byteLength, b64: uint8ToBase64(new Uint8Array((value as ArrayBufferView).buffer)) };
      }
      if (typeof Blob !== "undefined" && value instanceof Blob) {
        return { $type: "Blob", blobId: crypto.randomUUID(), bytes: (value as Blob).size, mime: (value as Blob).type };
      }
      if (Array.isArray(value)) return value.map((item) => normalizeValue(item, s));
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeValue(item, s)]));
    };

    const normalized = normalizeValue(input, seen);
    const preview = (() => {
      if (normalized === null) return "null";
      if (typeof normalized === "string") return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
      if (typeof normalized === "number" || typeof normalized === "boolean") return String(normalized);
      if (Array.isArray(normalized)) return `Array(${normalized.length})`;
      const objectValue = normalized as Record<string, unknown>;
      if (typeof objectValue.$type === "string") {
        if (typeof objectValue.bytes === "number") {
          const b = objectValue.bytes as number;
          const fmtB = b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
          return `<${objectValue.$type} ${fmtB}>`;
        }
        if (typeof objectValue.value === "string") return `<${objectValue.$type} ${objectValue.value}>`;
        if (typeof objectValue.src === "string") return `<${objectValue.$type} /${objectValue.src}/${(objectValue.flags as string) ?? ""}>`;
        return `<${objectValue.$type}>`;
      }
      const keys = Object.keys(objectValue).filter((k) => !k.startsWith("$"));
      return `{ ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", ..." : ""} }`;
    })();

    return {
      type: input === null ? "null" : Array.isArray(input) ? "array" : input instanceof Date ? "Date" : typeof input,
      preview,
      value: normalized
    };
  };

  // Resolve the IDBFactory for an optional bucket name. "default" / undefined
  // returns the page's indexedDB. Named buckets go through
  // navigator.storageBuckets.open().
  const resolveFactory = async (bucketName?: string): Promise<IDBFactory> => {
    if (!bucketName || bucketName === "default") return indexedDB;
    const sb = (navigator as unknown as { storageBuckets?: { open: (n: string) => Promise<{ indexedDB: IDBFactory }> } }).storageBuckets;
    if (!sb || typeof sb.open !== "function") {
      throw new Error(`Storage Buckets API not available; cannot open bucket "${bucketName}".`);
    }
    const bucket = await sb.open(bucketName);
    return bucket.indexedDB;
  };

  const openDb = async (dbName: string, version?: number, bucketName?: string): Promise<IDBDatabase> => {
    const factory = await resolveFactory(bucketName);
    return new Promise((resolve, reject) => {
      const openRequest = version !== undefined ? factory.open(dbName, version) : factory.open(dbName);
      openRequest.onerror = () => reject(openRequest.error ?? new Error(`Unable to open ${dbName}`));
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onupgradeneeded = () => {
        openRequest.transaction?.abort();
        reject(new Error(`Database ${dbName} needs an upgrade transaction and cannot be inspected safely.`));
      };
    });
  };

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

  // Inspect a single object store and return its shape. Shared between the
  // default-bucket scan and the named-bucket loop.
  const inspectStore = async (db: IDBDatabase, storeName: string) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    let count: number | null = null;
    try {
      count = await requestToPromise(store.count());
    } catch {
      count = null;
    }
    return {
      name: store.name,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement,
      count,
      indexes: Array.from(store.indexNames).map((indexName) => {
        const index = store.index(indexName);
        return { name: index.name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
      })
    };
  };

  // Enumerate all DBs in a given IDBFactory (default page IDB *or* a named
  // bucket's IDB). Skips DBs that can't be opened from this frame (e.g.
  // upgrade pending).
  const enumerateFactory = async (factory: IDBFactory, bucketName: string) => {
    if (typeof factory.databases !== "function") return [];
    let dbInfos: IDBDatabaseInfo[];
    try {
      dbInfos = await factory.databases();
    } catch {
      return [];
    }
    const out: Array<{ name: string; version: number; stores: unknown[]; bucketName: string }> = [];
    for (const dbInfo of dbInfos) {
      if (!dbInfo.name) continue;
      try {
        const openRequest = dbInfo.version !== undefined ? factory.open(dbInfo.name, dbInfo.version) : factory.open(dbInfo.name);
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          openRequest.onerror = () => reject(openRequest.error ?? new Error(`Unable to open ${dbInfo.name}`));
          openRequest.onsuccess = () => resolve(openRequest.result);
          openRequest.onupgradeneeded = () => {
            openRequest.transaction?.abort();
            reject(new Error(`Database ${dbInfo.name} needs upgrade.`));
          };
        });
        const stores = [];
        for (const storeName of Array.from(db.objectStoreNames)) {
          stores.push(await inspectStore(db, storeName));
        }
        out.push({ name: db.name, version: db.version, stores, bucketName });
        db.close();
      } catch {
        // Skip DBs that can't be opened from this frame.
      }
    }
    return out;
  };

  try {
    if (request.type === "discover") {
      const databasesApiAvailable = typeof indexedDB.databases === "function";
      const indexedDb = await enumerateFactory(indexedDB, "default");

      // Layer B — named Storage Buckets are invisible to indexedDB.databases().
      // Enumerate them via navigator.storageBuckets and merge results, tagging
      // each DB with the bucket name so follow-up RPCs can reopen via the
      // right factory.
      const bucketNames: string[] = ["default"];
      const sb = (navigator as unknown as { storageBuckets?: { keys: () => Promise<string[]>; open: (name: string) => Promise<{ indexedDB: IDBFactory }> } }).storageBuckets;
      if (sb && typeof sb.keys === "function") {
        try {
          const names = await sb.keys();
          for (const name of names) {
            if (name === "default") continue;
            bucketNames.push(name);
            try {
              const bucket = await sb.open(name);
              const dbs = await enumerateFactory(bucket.indexedDB, name);
              indexedDb.push(...dbs);
            } catch {
              // Bucket may be inaccessible; skip silently — diagnostics still
              // record the bucket name.
            }
          }
        } catch {
          // storageBuckets present but not usable in this context.
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
          sessionStorage: summarize(sessionStorage),
          bucketNames,
          databasesApiAvailable
        }
      };
    }

    if (request.type === "readIndexedDbStore") {
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
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
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
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
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
      const tx = db.transaction(request.storeName, "readwrite");
      tx.objectStore(request.storeName).delete(request.key as IDBValidKey);
      await txDone(tx);
      db.close();
      return { ok: true, data: { success: true } };
    }

    if (request.type === "clearIndexedDbStore") {
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
      const tx = db.transaction(request.storeName, "readwrite");
      tx.objectStore(request.storeName).clear();
      await txDone(tx);
      db.close();
      return { ok: true, data: { success: true } };
    }

    if (request.type === "deleteIndexedDbStore") {
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
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
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
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

    if (request.type === "readCacheNames") {
      if (typeof caches === "undefined") return { ok: true, data: { caches: [] } };
      const names = await caches.keys();
      return { ok: true, data: { caches: names.map((n: string) => ({ name: n, entryCount: null })) } };
    }

    if (request.type === "readCacheEntries") {
      if (typeof caches === "undefined") return { ok: true, data: [] };
      const cache = await caches.open(request.cacheName);
      const allRequests = await cache.keys();
      const sliced = allRequests.slice(request.offset, request.offset + request.limit);
      const entries: Array<{
        url: string;
        method: string;
        status: number;
        statusText: string;
        contentType: string;
        contentLength: number | null;
        dateHeader: string | null;
      }> = [];
      for (const req of sliced) {
        const resp = await cache.match(req);
        if (!resp) continue;
        const contentType = resp.headers.get("content-type") ?? "";
        const contentLengthStr = resp.headers.get("content-length");
        const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : null;
        entries.push({
          url: req.url,
          method: req.method,
          status: resp.status,
          statusText: resp.statusText,
          contentType: contentType.split(";")[0].trim(),
          contentLength: contentLength !== null && isFinite(contentLength) ? contentLength : null,
          dateHeader: resp.headers.get("date")
        });
      }
      return { ok: true, data: entries };
    }

    if (request.type === "readCacheResponse") {
      if (typeof caches === "undefined") return { ok: false, error: "Cache API not available." };
      const cache = await caches.open(request.cacheName);
      const allRequests = await cache.keys();
      const matchedReq = allRequests.find((r: Request) => r.url === request.url && r.method === request.requestMethod);
      if (!matchedReq) return { ok: false, error: "Cache entry not found." };
      const resp = await cache.match(matchedReq);
      if (!resp) return { ok: false, error: "Cache entry not found." };
      const contentType = (resp.headers.get("content-type") ?? "").split(";")[0].trim();
      let kind: "text" | "json" | "image" | "binary";
      let preview: string;
      if (contentType === "application/json" || contentType.endsWith("+json")) {
        kind = "json";
        const text = await resp.clone().text().catch(() => "");
        const limited = text.slice(0, 204800);
        try {
          preview = JSON.stringify(JSON.parse(limited), null, 2);
        } catch {
          preview = limited;
        }
      } else if (contentType.startsWith("text/")) {
        kind = "text";
        preview = (await resp.clone().text().catch(() => "")).slice(0, 204800);
      } else if (contentType.startsWith("image/")) {
        kind = "image";
        const buf = await resp.clone().arrayBuffer().catch(() => new ArrayBuffer(0));
        if (buf.byteLength > 2097152) {
          preview = `data:${contentType};base64,(too large — ${buf.byteLength} bytes)`;
        } else {
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          preview = `data:${contentType};base64,${btoa(binary)}`;
        }
      } else {
        kind = "binary";
        const buf = await resp.clone().arrayBuffer().catch(() => new ArrayBuffer(0));
        preview = `${Math.round(buf.byteLength / 1024)} KB binary`;
      }
      return { ok: true, data: { contentType, kind, preview } };
    }

    if (request.type === "deleteCacheEntry") {
      if (typeof caches === "undefined") return { ok: false, error: "Cache API not available." };
      const cache = await caches.open(request.cacheName);
      const allRequests = await cache.keys();
      const matchedReq = allRequests.find((r: Request) => r.url === request.url && r.method === request.requestMethod);
      if (matchedReq) {
        await cache.delete(matchedReq);
      }
      return { ok: true, data: { success: true } };
    }

    if (request.type === "clearCache") {
      if (typeof caches === "undefined") return { ok: false, error: "Cache API not available." };
      await caches.delete(request.cacheName);
      return { ok: true, data: { success: true } };
    }

    if (request.type === "readStoreSummary") {
      const db = await openDb(request.dbName, request.dbVersion, (request as { bucketName?: string }).bucketName);
      const tx = db.transaction(request.storeName, "readonly");
      const store = tx.objectStore(request.storeName);
      const rowCount: number = await new Promise((resolve, reject) => {
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const sampleRows: unknown[] = [];
      await new Promise<void>((resolve) => {
        const cursor = store.openCursor();
        cursor.onsuccess = (e) => {
          const c = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!c || sampleRows.length >= 100) { resolve(); return; }
          sampleRows.push(c.value);
          c.continue();
        };
        cursor.onerror = () => resolve();
      });
      db.close();
      let approxBytes: number | null = null;
      if (sampleRows.length > 0) {
        try {
          const sampleBytes = sampleRows.reduce((sum: number, row) => sum + JSON.stringify(row).length * 2, 0);
          approxBytes = Math.round((sampleBytes / sampleRows.length) * rowCount);
        } catch { approxBytes = null; }
      }
      return { ok: true, data: { rowCount, approxBytes, sampledRows: sampleRows.length } };
    }

    if (request.type === "storageEstimate") {
      if (!navigator.storage || typeof navigator.storage.estimate !== "function") {
        return { ok: true, data: { usage: null, quota: null } };
      }
      const est = await navigator.storage.estimate();
      return { ok: true, data: { usage: est.usage ?? null, quota: est.quota ?? null } };
    }

    if (request.type === "readIndexedDbStoreChunk") {
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
      const tx = db.transaction(request.storeName, "readonly");
      const store = tx.objectStore(request.storeName);
      const total = await requestToPromise(store.count()).catch(() => null);
      const rows: Array<{ key: unknown; value: ReturnType<typeof serializeValue> }> = [];
      let skipped = 0;

      await new Promise<void>((resolve, reject) => {
        const cursorRequest = store.openCursor();
        cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("Unable to read records"));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor || rows.length >= request.limit) {
            resolve();
            return;
          }
          if (skipped < request.offset) {
            skipped++;
            cursor.continue();
            return;
          }
          rows.push({ key: serializeValue(cursor.primaryKey).value, value: serializeValue(cursor.value) });
          cursor.continue();
        };
      });

      db.close();
      return { ok: true, data: { rows, columns: inferColumns(rows), total } };
    }

    if (request.type === "bulkPutIndexedDbRows") {
      const db = await openDb(request.dbName, undefined, (request as { bucketName?: string }).bucketName);
      const tx = db.transaction(request.storeName, "readwrite");
      const store = tx.objectStore(request.storeName);
      const hasInlineKey = store.keyPath !== null;
      for (const row of request.rows) {
        if (hasInlineKey) store.put(row.value);
        else store.put(row.value, row.key as IDBValidKey);
      }
      await txDone(tx);
      db.close();
      return { ok: true, data: { success: true } };
    }

    return { ok: false, error: "Unsupported storage request." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
