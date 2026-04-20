import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { parseSelectQuery, serializedPreview } from "../shared/query";
import type {
  IndexedDbDatabaseInfo,
  IndexedDbRecord,
  KeyValueRecord,
  KvReadResult,
  PanelReply,
  QueryResult,
  SerializableValue,
  StorageDiscovery,
  StorageRequest,
  StorageResponse,
  TableReadResult
} from "../shared/types";
import "./styles.css";

type SelectedNode =
  | { kind: "overview" }
  | { kind: "indexeddb"; dbName: string; storeName: string }
  | { kind: "kv"; surface: "localStorage" | "sessionStorage" };

type Notice = { tone: "success" | "error" | "info"; message: string } | null;

const extensionRuntime =
  typeof chrome !== "undefined" &&
  Boolean(chrome.runtime?.connect) &&
  Boolean(chrome.devtools?.inspectedWindow);
const tabId = extensionRuntime ? chrome.devtools.inspectedWindow.tabId : 0;

function App() {
  const rpc = useStorageRpc();
  const [discovery, setDiscovery] = useState<StorageDiscovery | null>(null);
  const [selected, setSelected] = useState<SelectedNode>({ kind: "overview" });
  const [tableResult, setTableResult] = useState<TableReadResult | null>(null);
  const [kvResult, setKvResult] = useState<KvReadResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryText, setQueryText] = useState("SELECT * FROM users LIMIT 100;");
  const [selectedRecord, setSelectedRecord] = useState<IndexedDbRecord | KeyValueRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [editDraft, setEditDraft] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("{\n  \n}");

  const refreshDiscovery = useCallback(async () => {
    setBusy(true);
    const response = await rpc({ type: "discover", tabId });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    setDiscovery(response.data as StorageDiscovery);
    setNotice({ tone: "success", message: "Storage refreshed." });
  }, [rpc]);

  useEffect(() => {
    void refreshDiscovery();
  }, [refreshDiscovery]);

  const selectedDb = useMemo(() => {
    if (selected.kind !== "indexeddb" || !discovery) return null;
    return discovery.indexedDb.find((db) => db.name === selected.dbName) ?? null;
  }, [discovery, selected]);

  const selectedStore = useMemo(() => {
    if (selected.kind !== "indexeddb" || !selectedDb) return null;
    return selectedDb.stores.find((store) => store.name === selected.storeName) ?? null;
  }, [selected, selectedDb]);

  const loadIndexedStore = useCallback(
    async (dbName: string, storeName: string) => {
      setBusy(true);
      setQueryResult(null);
      setKvResult(null);
      setSelectedRecord(null);
      const response = await rpc({ type: "readIndexedDbStore", tabId, dbName, storeName, limit: 500 });
      setBusy(false);
      if (!response.ok) {
        setNotice({ tone: "error", message: response.error });
        return;
      }
      setTableResult(response.data as TableReadResult);
      setNotice({ tone: "info", message: `Loaded ${storeName}.` });
    },
    [rpc]
  );

  const loadKv = useCallback(
    async (surface: "localStorage" | "sessionStorage") => {
      setBusy(true);
      setTableResult(null);
      setQueryResult(null);
      setSelectedRecord(null);
      const response = await rpc({ type: "readKeyValue", tabId, surface });
      setBusy(false);
      if (!response.ok) {
        setNotice({ tone: "error", message: response.error });
        return;
      }
      setKvResult(response.data as KvReadResult);
      setNotice({ tone: "info", message: `Loaded ${surface}.` });
    },
    [rpc]
  );

  const chooseNode = (node: SelectedNode) => {
    setSelected(node);
    if (node.kind === "indexeddb") void loadIndexedStore(node.dbName, node.storeName);
    if (node.kind === "kv") void loadKv(node.surface);
    if (node.kind === "overview") {
      setTableResult(null);
      setKvResult(null);
      setQueryResult(null);
      setSelectedRecord(null);
    }
  };

  const runQuery = async () => {
    if (selected.kind !== "indexeddb") {
      setNotice({ tone: "error", message: "Select an IndexedDB store before running a query." });
      return;
    }

    try {
      const plan = parseSelectQuery(queryText);
      setBusy(true);
      const response = await rpc({ type: "runIndexedDbQuery", tabId, dbName: selected.dbName, plan });
      setBusy(false);
      if (!response.ok) {
        setNotice({ tone: "error", message: response.error });
        return;
      }
      setQueryResult(response.data as QueryResult);
      setTableResult(null);
      setSelectedRecord(null);
      setNotice({ tone: "success", message: "Query completed." });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const saveIndexedRecord = async () => {
    if (selected.kind !== "indexeddb" || !selectedRecord || "parsed" in selectedRecord) return;
    try {
      const value = JSON.parse(editDraft) as SerializableValue;
      setBusy(true);
      const response = await rpc({
        type: "putIndexedDbRecord",
        tabId,
        dbName: selected.dbName,
        storeName: selected.storeName,
        key: selectedRecord.key,
        value
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      await loadIndexedStore(selected.dbName, selected.storeName);
      setNotice({ tone: "success", message: "Record saved." });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const addIndexedRecord = async () => {
    if (selected.kind !== "indexeddb") return;
    try {
      const value = JSON.parse(newValue) as SerializableValue;
      const key = newKey.trim() ? (JSON.parse(newKey) as SerializableValue) : undefined;
      setBusy(true);
      const response = await rpc({
        type: "addIndexedDbRecord",
        tabId,
        dbName: selected.dbName,
        storeName: selected.storeName,
        key,
        value
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      setNewKey("");
      setNewValue("{\n  \n}");
      await loadIndexedStore(selected.dbName, selected.storeName);
      await refreshDiscovery();
      setNotice({ tone: "success", message: "Record added." });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const deleteIndexedRecord = async (record: IndexedDbRecord) => {
    if (selected.kind !== "indexeddb") return;
    if (!confirm("Delete this IndexedDB record?")) return;
    setBusy(true);
    const response = await rpc({
      type: "deleteIndexedDbRecord",
      tabId,
      dbName: selected.dbName,
      storeName: selected.storeName,
      key: record.key
    });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    await loadIndexedStore(selected.dbName, selected.storeName);
    await refreshDiscovery();
    setNotice({ tone: "success", message: "Record deleted." });
  };

  const saveKv = async () => {
    if (selected.kind !== "kv" || !selectedRecord || !("parsed" in selectedRecord)) return;
    setBusy(true);
    const response = await rpc({
      type: "setKeyValue",
      tabId,
      surface: selected.surface,
      key: selectedRecord.key,
      value: editDraft
    });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    await loadKv(selected.surface);
    await refreshDiscovery();
    setNotice({ tone: "success", message: "Value saved." });
  };

  const addKv = async () => {
    if (selected.kind !== "kv" || !newKey.trim()) return;
    setBusy(true);
    const response = await rpc({
      type: "setKeyValue",
      tabId,
      surface: selected.surface,
      key: newKey.trim(),
      value: newValue
    });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    setNewKey("");
    setNewValue("{\n  \n}");
    await loadKv(selected.surface);
    await refreshDiscovery();
    setNotice({ tone: "success", message: "Key added." });
  };

  const deleteKv = async (record: KeyValueRecord) => {
    if (selected.kind !== "kv") return;
    if (!confirm(`Delete ${record.key}?`)) return;
    setBusy(true);
    const response = await rpc({ type: "removeKeyValue", tabId, surface: selected.surface, key: record.key });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    await loadKv(selected.surface);
    await refreshDiscovery();
    setNotice({ tone: "success", message: "Key deleted." });
  };

  const clearKv = async () => {
    if (selected.kind !== "kv") return;
    const typed = prompt(`Type ${selected.surface} to clear all keys.`);
    if (typed !== selected.surface) return;
    setBusy(true);
    const response = await rpc({ type: "clearKeyValue", tabId, surface: selected.surface });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    await loadKv(selected.surface);
    await refreshDiscovery();
    setNotice({ tone: "success", message: `${selected.surface} cleared.` });
  };

  const visibleExportRows = useMemo(() => {
    if (queryResult) return queryResult.rows.map((row) => row.projected);
    if (tableResult) return tableResult.rows.map((row) => row.value.value);
    if (kvResult) return kvResult.rows.map((row) => ({ key: row.key, value: row.value }));
    return [];
  }, [kvResult, queryResult, tableResult]);

  const exportVisible = (format: "json" | "csv") => {
    const fileName = `storage-studio-${Date.now()}.${format}`;
    const content = format === "json" ? JSON.stringify(visibleExportRows, null, 2) : toCsv(visibleExportRows);
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: "success", message: `Exported ${fileName}.` });
  };

  const selectRecord = (record: IndexedDbRecord | KeyValueRecord) => {
    setSelectedRecord(record);
    setEditDraft("parsed" in record ? record.value : JSON.stringify(record.value.value, null, 2));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SS</span>
          <div>
            <h1>Storage Studio</h1>
            <p>{discovery?.origin ?? "Inspecting current tab"}</p>
          </div>
        </div>
        <button className="primary-action" onClick={refreshDiscovery} disabled={busy}>
          {busy ? "Working..." : "Refresh storage"}
        </button>
        <StorageTree discovery={discovery} selected={selected} chooseNode={chooseNode} />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{selected.kind === "overview" ? "Origin" : selected.kind === "indexeddb" ? "IndexedDB" : selected.surface}</p>
            <h2>{titleForSelection(selected)}</h2>
          </div>
          <div className="actions">
            <button onClick={() => exportVisible("json")} disabled={visibleExportRows.length === 0}>Export JSON</button>
            <button onClick={() => exportVisible("csv")} disabled={visibleExportRows.length === 0}>Export CSV</button>
          </div>
        </header>

        {notice && <div className={`notice ${notice.tone}`}>{notice.message}</div>}

        {selected.kind === "overview" && <Overview discovery={discovery} />}

        {selected.kind === "indexeddb" && (
          <>
            <section className="query-strip">
              <textarea value={queryText} onChange={(event) => setQueryText(event.target.value)} spellCheck={false} />
              <button className="run-button" onClick={runQuery} disabled={busy}>Run query</button>
            </section>
            {queryResult && <p className="plan-text">{queryResult.plan}</p>}
            <DataGrid
              columns={queryResult?.columns ?? tableResult?.columns ?? []}
              indexedRows={queryResult ? queryResult.rows.map((row) => ({ key: row.key, value: row.value })) : tableResult?.rows ?? []}
              onSelect={selectRecord}
              onDelete={deleteIndexedRecord}
            />
            <section className="add-panel">
              <h3>Add record</h3>
              <input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="Optional key as JSON, e.g. 42 or &quot;id&quot;" />
              <textarea value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} />
              <button onClick={addIndexedRecord}>Add record</button>
              {selectedStore && (
                <p>
                  Key path: <code>{JSON.stringify(selectedStore.keyPath)}</code> · Auto increment: {String(selectedStore.autoIncrement)}
                </p>
              )}
            </section>
          </>
        )}

        {selected.kind === "kv" && (
          <>
            <KvGrid rows={kvResult?.rows ?? []} onSelect={selectRecord} onDelete={deleteKv} />
            <section className="add-panel">
              <h3>Add key</h3>
              <input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="Key" />
              <textarea value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} />
              <div className="actions">
                <button onClick={addKv}>Save key</button>
                <button className="danger" onClick={clearKv}>Clear {selected.surface}</button>
              </div>
            </section>
          </>
        )}
      </section>

      <aside className="inspector">
        <h2>Inspector</h2>
        {selectedRecord ? (
          <>
            <p className="eyebrow">Selected record</p>
            <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} spellCheck={false} />
            <button onClick={selected.kind === "kv" ? saveKv : saveIndexedRecord} disabled={busy}>Save changes</button>
          </>
        ) : (
          <p className="empty-state">Select a row to inspect and edit its value.</p>
        )}
      </aside>
    </main>
  );
}

function useStorageRpc() {
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const pendingRef = useRef(new Map<string, (response: StorageResponse) => void>());

  useEffect(() => {
    if (!extensionRuntime) return;

    const port = connectPort(portRef, pendingRef);
    return () => {
      port.disconnect();
      portRef.current = null;
    };
  }, []);

  return useCallback((request: StorageRequest) => {
    if (!extensionRuntime) return Promise.resolve(mockStorageResponse(request));
    const id = crypto.randomUUID();
    return new Promise<StorageResponse>((resolve) => {
      pendingRef.current.set(id, resolve);
      const port = portRef.current ?? connectPort(portRef, pendingRef);
      try {
        port.postMessage({ id, request });
      } catch (error) {
        portRef.current = null;
        pendingRef.current.delete(id);
        resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }, []);
}

function connectPort(
  portRef: React.MutableRefObject<chrome.runtime.Port | null>,
  pendingRef: React.MutableRefObject<Map<string, (response: StorageResponse) => void>>
) {
  const port = chrome.runtime.connect({ name: "storage-studio-panel" });
  portRef.current = port;
  port.onMessage.addListener((reply: PanelReply) => {
    const resolve = pendingRef.current.get(reply.id);
    if (!resolve) return;
    pendingRef.current.delete(reply.id);
    resolve(reply.response);
  });
  port.onDisconnect.addListener(() => {
    if (portRef.current === port) {
      portRef.current = null;
    }
    const disconnectError = chrome.runtime.lastError?.message ?? "Storage Studio disconnected from the background worker.";
    for (const resolve of pendingRef.current.values()) {
      resolve({ ok: false, error: disconnectError });
    }
    pendingRef.current.clear();
  });
  return port;
}

function mockStorageResponse(request: StorageRequest): StorageResponse {
  if (request.type === "discover") {
    return {
      ok: true,
      data: {
        origin: "https://app.example.test",
        indexedDb: [
          {
            name: "local_first_app",
            version: 3,
            stores: [
              {
                name: "users",
                keyPath: "id",
                autoIncrement: false,
                count: 3,
                indexes: [{ name: "email", keyPath: "email", unique: true, multiEntry: false }]
              },
              {
                name: "syncQueue",
                keyPath: "id",
                autoIncrement: true,
                count: 18,
                indexes: [{ name: "createdAt", keyPath: "createdAt", unique: false, multiEntry: false }]
              }
            ]
          }
        ],
        localStorage: { count: 4, bytes: 2048 },
        sessionStorage: { count: 2, bytes: 420 }
      }
    };
  }

  if (request.type === "readIndexedDbStore" || request.type === "runIndexedDbQuery") {
    const rows = [
      {
        key: 1,
        value: { type: "object", preview: "{ id, email, role, active }", value: { id: 1, email: "ada@example.com", role: "admin", active: true } }
      },
      {
        key: 2,
        value: { type: "object", preview: "{ id, email, role, active }", value: { id: 2, email: "grace@example.com", role: "editor", active: true } }
      },
      {
        key: 3,
        value: { type: "object", preview: "{ id, email, role, active }", value: { id: 3, email: "linus@example.com", role: "viewer", active: false } }
      }
    ];

    if (request.type === "runIndexedDbQuery") {
      return {
        ok: true,
        data: {
          rows: rows.map((row) => ({
            ...row,
            projected: {
              id: { type: "number", preview: String((row.value.value as Record<string, unknown>).id), value: (row.value.value as Record<string, unknown>).id as number },
              email: { type: "string", preview: String((row.value.value as Record<string, unknown>).email), value: (row.value.value as Record<string, unknown>).email as string },
              role: { type: "string", preview: String((row.value.value as Record<string, unknown>).role), value: (row.value.value as Record<string, unknown>).role as string }
            }
          })),
          columns: ["id", "email", "role", "active"],
          plan: "Preview mode: full object-store scan."
        }
      };
    }

    return { ok: true, data: { rows, columns: ["id", "email", "role", "active"], total: rows.length } };
  }

  if (request.type === "readKeyValue") {
    return {
      ok: true,
      data: {
        rows: [
          { key: "featureFlags", value: "{\"newNav\":true}", parsed: { type: "object", preview: "{ newNav }", value: { newNav: true } } },
          { key: "theme", value: "dark", parsed: { type: "string", preview: "dark", value: "dark" } }
        ]
      }
    };
  }

  return { ok: true, data: { success: true } };
}

function StorageTree({
  discovery,
  selected,
  chooseNode
}: {
  discovery: StorageDiscovery | null;
  selected: SelectedNode;
  chooseNode: (node: SelectedNode) => void;
}) {
  if (!discovery) return <p className="empty-state">Open DevTools on a page and refresh storage.</p>;
  return (
    <nav className="tree">
      <button className={selected.kind === "overview" ? "active" : ""} onClick={() => chooseNode({ kind: "overview" })}>
        Origin dashboard
      </button>
      <h3>IndexedDB</h3>
      {discovery.indexedDb.length === 0 && <p className="tree-note">No IndexedDB databases.</p>}
      {discovery.indexedDb.map((db) => (
        <DatabaseNode key={db.name} db={db} selected={selected} chooseNode={chooseNode} />
      ))}
      <h3>Storage</h3>
      <button className={selected.kind === "kv" && selected.surface === "localStorage" ? "active" : ""} onClick={() => chooseNode({ kind: "kv", surface: "localStorage" })}>
        LocalStorage <span>{discovery.localStorage.count}</span>
      </button>
      <button className={selected.kind === "kv" && selected.surface === "sessionStorage" ? "active" : ""} onClick={() => chooseNode({ kind: "kv", surface: "sessionStorage" })}>
        SessionStorage <span>{discovery.sessionStorage.count}</span>
      </button>
    </nav>
  );
}

function DatabaseNode({ db, selected, chooseNode }: { db: IndexedDbDatabaseInfo; selected: SelectedNode; chooseNode: (node: SelectedNode) => void }) {
  return (
    <div className="db-node">
      <p>{db.name} <span>v{db.version}</span></p>
      {db.stores.map((store) => (
        <button
          key={store.name}
          className={selected.kind === "indexeddb" && selected.dbName === db.name && selected.storeName === store.name ? "active child" : "child"}
          onClick={() => chooseNode({ kind: "indexeddb", dbName: db.name, storeName: store.name })}
        >
          {store.name} <span>{store.count ?? "?"}</span>
        </button>
      ))}
    </div>
  );
}

function Overview({ discovery }: { discovery: StorageDiscovery | null }) {
  if (!discovery) return <p className="empty-state">No storage metadata loaded yet.</p>;
  const stores = discovery.indexedDb.flatMap((db) => db.stores.map((store) => ({ db: db.name, ...store })));
  return (
    <section className="overview-grid">
      <article>
        <p className="eyebrow">IndexedDB</p>
        <strong>{discovery.indexedDb.length}</strong>
        <span>databases</span>
      </article>
      <article>
        <p className="eyebrow">Object stores</p>
        <strong>{stores.length}</strong>
        <span>tables</span>
      </article>
      <article>
        <p className="eyebrow">LocalStorage</p>
        <strong>{discovery.localStorage.count}</strong>
        <span>{formatBytes(discovery.localStorage.bytes)}</span>
      </article>
      <article>
        <p className="eyebrow">SessionStorage</p>
        <strong>{discovery.sessionStorage.count}</strong>
        <span>{formatBytes(discovery.sessionStorage.bytes)}</span>
      </article>
      <section className="wide-panel">
        <h3>Largest stores</h3>
        {stores.length === 0 ? <p>No object stores found.</p> : stores.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 8).map((store) => (
          <div className="metric-row" key={`${store.db}:${store.name}`}>
            <span>{store.db}.{store.name}</span>
            <strong>{store.count ?? "?"} rows</strong>
          </div>
        ))}
      </section>
    </section>
  );
}

function DataGrid({
  columns,
  indexedRows,
  onSelect,
  onDelete
}: {
  columns: string[];
  indexedRows: IndexedDbRecord[];
  onSelect: (record: IndexedDbRecord) => void;
  onDelete: (record: IndexedDbRecord) => void;
}) {
  if (indexedRows.length === 0) return <p className="empty-state">No records loaded.</p>;
  const visibleColumns = columns.length > 0 ? columns : ["value"];
  return (
    <div className="grid-wrap">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            {visibleColumns.map((column) => <th key={column}>{column}</th>)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {indexedRows.map((record, index) => (
            <tr key={index} onClick={() => onSelect(record)}>
              <td><code>{JSON.stringify(record.key)}</code></td>
              {visibleColumns.map((column) => (
                <td key={column}>{renderColumn(record, column)}</td>
              ))}
              <td><button className="link-danger" onClick={(event) => { event.stopPropagation(); onDelete(record); }}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KvGrid({ rows, onSelect, onDelete }: { rows: KeyValueRecord[]; onSelect: (record: KeyValueRecord) => void; onDelete: (record: KeyValueRecord) => void }) {
  if (rows.length === 0) return <p className="empty-state">No keys found.</p>;
  return (
    <div className="grid-wrap">
      <table>
        <thead>
          <tr><th>Key</th><th>Value</th><th>Type</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} onClick={() => onSelect(row)}>
              <td><code>{row.key}</code></td>
              <td>{row.parsed.preview}</td>
              <td>{row.parsed.type}</td>
              <td><button className="link-danger" onClick={(event) => { event.stopPropagation(); onDelete(row); }}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderColumn(record: IndexedDbRecord, column: string) {
  if (column === "value") return record.value.preview;
  const value = record.value.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const cell = (value as Record<string, unknown>)[column];
  if (cell && typeof cell === "object" && "preview" in cell && "value" in cell) {
    return serializedPreview(cell as never);
  }
  if (cell === null || typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") return String(cell);
  if (typeof cell === "undefined") return "";
  return JSON.stringify(cell);
}

function titleForSelection(selected: SelectedNode) {
  if (selected.kind === "overview") return "Origin dashboard";
  if (selected.kind === "kv") return selected.surface;
  return `${selected.dbName}.${selected.storeName}`;
}

function toCsv(rows: unknown[]) {
  const normalized = rows.map((row) => (row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : { value: row }));
  const headers = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${String(typeof value === "object" ? JSON.stringify(value) : value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...normalized.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

createRoot(document.getElementById("root")!).render(<App />);
