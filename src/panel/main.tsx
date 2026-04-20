import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronRight, Database, Search, Table2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
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

type WorkspaceTab =
  | { id: "overview"; title: string; node: { kind: "overview" } }
  | { id: string; title: string; node: { kind: "indexeddb"; dbName: string; storeName: string } }
  | { id: string; title: string; node: { kind: "kv"; surface: "localStorage" | "sessionStorage" } }
  | { id: "sql"; title: string; node: { kind: "sql" } };

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
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: "overview", title: "Origin", node: { kind: "overview" } },
    { id: "sql", title: "SQL Query", node: { kind: "sql" } }
  ]);
  const [activeTabId, setActiveTabId] = useState("overview");
  const [filterText, setFilterText] = useState("");

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
    const tab = tabForNode(node);
    setTabs((current) => (current.some((item) => item.id === tab.id) ? current : [...current, tab]));
    setActiveTabId(tab.id);
    setFilterText("");
    if (node.kind === "indexeddb") void loadIndexedStore(node.dbName, node.storeName);
    if (node.kind === "kv") void loadKv(node.surface);
    if (node.kind === "overview") {
      setTableResult(null);
      setKvResult(null);
      setQueryResult(null);
      setSelectedRecord(null);
    }
  };

  const chooseTab = (tab: WorkspaceTab) => {
    setActiveTabId(tab.id);
    setFilterText("");
    if (tab.node.kind === "sql") return;
    setSelected(tab.node);
    if (tab.node.kind === "indexeddb") void loadIndexedStore(tab.node.dbName, tab.node.storeName);
    if (tab.node.kind === "kv") void loadKv(tab.node.surface);
    if (tab.node.kind === "overview") {
      setTableResult(null);
      setKvResult(null);
      setQueryResult(null);
      setSelectedRecord(null);
    }
  };

  const closeTab = (tabId: string) => {
    if (tabId === "overview" || tabId === "sql") return;
    setTabs((current) => current.filter((tab) => tab.id !== tabId));
    if (activeTabId === tabId) {
      const fallback = tabs.find((tab) => tab.id === "overview") ?? tabs[0];
      if (fallback) chooseTab(fallback);
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
    <main className="dark h-screen min-w-[1100px] bg-background text-foreground">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="21%" minSize="220px" maxSize="380px">
          <aside className="h-full overflow-auto border-r border-slate-800 bg-slate-900/95 p-3">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-lime-200/40 bg-lime-300 text-xs font-black text-slate-950">
                SS
              </span>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight">Storage Studio</h1>
                <p className="truncate text-xs text-slate-400">{discovery?.origin ?? "Inspecting current tab"}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="mb-3 w-full font-black"
              onClick={refreshDiscovery}
              disabled={busy}
            >
              {busy ? "Working..." : "Refresh storage"}
            </Button>
            <StorageTree
              discovery={discovery}
              selected={selected}
              chooseNode={chooseNode}
              openSql={() => chooseTab(tabs.find((tab) => tab.id === "sql")!)}
            />
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="57%" minSize="520px">
          <section className="flex h-full min-w-0 flex-col bg-slate-950">
            <Tabs
              value={activeTabId}
              onValueChange={(value) => {
                const tab = tabs.find((item) => item.id === value);
                if (tab) chooseTab(tab);
              }}
              className="shrink-0 gap-0"
            >
              <TabsList variant="line" className="h-9 w-full justify-start rounded-none border-b border-border bg-card px-2">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="min-w-28 flex-none px-4">
                    {tab.title}
                    {tab.id !== "overview" && tab.id !== "sql" && (
                      <span
                        className="text-base text-muted-foreground hover:text-foreground"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeTab(tab.id);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-normal text-slate-400">
                  {activeTabId === "sql" ? "Query editor" : selected.kind === "overview" ? "Origin" : selected.kind === "indexeddb" ? "IndexedDB table" : selected.surface}
                </p>
                <h2 className="truncate text-xl font-black">{activeTabId === "sql" ? "SQL Query" : titleForSelection(selected)}</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="w-64 rounded-full pl-9"
                    value={filterText}
                    onChange={(event) => setFilterText(event.target.value)}
                    placeholder="Search for field or value..."
                  />
                </label>
                <Button size="sm" onClick={() => exportVisible("json")} disabled={visibleExportRows.length === 0}>
                  Export JSON
                </Button>
                <Button size="sm" onClick={() => exportVisible("csv")} disabled={visibleExportRows.length === 0}>
                  Export CSV
                </Button>
              </div>
            </header>

            {notice && (
              <div
                className={`shrink-0 border-b border-slate-800 px-4 py-2 text-sm ${
                  notice.tone === "error" ? "bg-red-950/50 text-red-200" : notice.tone === "success" ? "bg-emerald-950/40 text-emerald-200" : "bg-sky-950/40 text-sky-200"
                }`}
              >
                {notice.message}
              </div>
            )}

            {activeTabId === "overview" && <Overview discovery={discovery} />}

            {activeTabId !== "sql" && selected.kind === "indexeddb" && (
              <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                <ResizablePanel defaultSize="70%" minSize="260px">
                  <div className="flex h-full min-h-0 flex-col">
                    <section className="grid shrink-0 grid-cols-[minmax(0,1fr)_150px] gap-3 border-b border-slate-800 p-3">
                      <Textarea className="min-h-20" value={queryText} onChange={(event) => setQueryText(event.target.value)} spellCheck={false} />
                      <Button variant="default" className="border-sky-300 bg-sky-300 font-black text-slate-950 hover:bg-sky-200" onClick={runQuery} disabled={busy}>
                        Run query
                      </Button>
                    </section>
                    {queryResult && <p className="border-b border-slate-800 px-4 py-2 text-sm text-slate-400">{queryResult.plan}</p>}
                    <DataGrid
                      columns={queryResult?.columns ?? tableResult?.columns ?? []}
                      indexedRows={queryResult ? queryResult.rows.map((row) => ({ key: row.key, value: row.value })) : tableResult?.rows ?? []}
                      filterText={filterText}
                      onSelect={selectRecord}
                      onDelete={deleteIndexedRecord}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="30%" minSize="130px">
                  <section className="grid h-full gap-3 overflow-auto bg-slate-900/40 p-4">
                    <h3 className="text-xs font-black uppercase tracking-normal text-slate-400">Add record</h3>
                    <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="Optional key as JSON, e.g. 42 or &quot;id&quot;" />
                    <Textarea className="min-h-24" value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} />
                    <Button size="sm" onClick={addIndexedRecord}>Add record</Button>
                    {selectedStore && (
                      <p className="text-sm text-slate-400">
                        Key path: <code className="text-lime-300">{JSON.stringify(selectedStore.keyPath)}</code> · Auto increment: {String(selectedStore.autoIncrement)}
                      </p>
                    )}
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {activeTabId !== "sql" && selected.kind === "kv" && (
              <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                <ResizablePanel defaultSize="72%" minSize="260px">
                  <KvGrid rows={kvResult?.rows ?? []} filterText={filterText} onSelect={selectRecord} onDelete={deleteKv} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="28%" minSize="130px">
                  <section className="grid h-full gap-3 overflow-auto bg-slate-900/40 p-4">
                    <h3 className="text-xs font-black uppercase tracking-normal text-slate-400">Add key</h3>
                    <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="Key" />
                    <Textarea className="min-h-24" value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addKv}>Save key</Button>
                      <Button size="sm" variant="destructive" onClick={clearKv}>Clear {selected.surface}</Button>
                    </div>
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {activeTabId === "sql" && (
              <section className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-72 grid-cols-[42px_minmax(0,1fr)] border-b border-slate-800 bg-slate-950">
                  <div className="border-r border-slate-800 p-4 text-right font-mono text-sm text-slate-500">1</div>
                  <Textarea className="min-h-72 resize-none rounded-none border-0 p-4 focus:ring-0" value={queryText} onChange={(event) => setQueryText(event.target.value)} spellCheck={false} />
                </div>
                <div className="flex items-center justify-end gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400">
                  <span>{selected.kind === "indexeddb" ? `Context: ${selected.dbName}.${selected.storeName}` : "Select a table from the sidebar for query context"}</span>
                  <Button size="sm" className="border-sky-300 bg-sky-300 font-black text-slate-950 hover:bg-sky-200" onClick={runQuery} disabled={busy || selected.kind !== "indexeddb"}>Run Current ⌘↵</Button>
                </div>
                {queryResult ? (
                  <>
                    <p className="border-b border-slate-800 px-4 py-2 text-sm text-slate-400">{queryResult.plan}</p>
                    <DataGrid
                      columns={queryResult.columns}
                      indexedRows={queryResult.rows.map((row) => ({ key: row.key, value: row.value }))}
                      filterText={filterText}
                      onSelect={selectRecord}
                      onDelete={deleteIndexedRecord}
                    />
                  </>
                ) : (
                  <p className="grid min-h-64 place-items-center text-slate-400">Write a SELECT query, pick a table for context, and run it.</p>
                )}
              </section>
            )}
          </section>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="22%" minSize="240px" maxSize="460px">
          <aside className="h-full overflow-auto border-l border-slate-800 bg-slate-950 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">Inspector</h2>
              {selectedRecord && <span className="text-[11px] font-black uppercase tracking-normal text-slate-500">{selected.kind === "kv" ? "Key value" : "Record"}</span>}
            </div>
            {selectedRecord ? (
              <>
                <p className="mb-2 text-[11px] font-black uppercase tracking-normal text-slate-400">Selected record</p>
                <Textarea className="mb-3 min-h-[430px]" value={editDraft} onChange={(event) => setEditDraft(event.target.value)} spellCheck={false} />
                <Button size="sm" onClick={selected.kind === "kv" ? saveKv : saveIndexedRecord} disabled={busy}>Save changes</Button>
              </>
            ) : (
              <p className="text-sm text-slate-400">Select a row to inspect and edit its value.</p>
            )}
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

function tabForNode(node: SelectedNode): WorkspaceTab {
  if (node.kind === "overview") return { id: "overview", title: "Origin", node };
  if (node.kind === "kv") return { id: node.surface, title: node.surface, node };
  return { id: `${node.dbName}:${node.storeName}`, title: node.storeName, node };
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
  chooseNode,
  openSql
}: {
  discovery: StorageDiscovery | null;
  selected: SelectedNode;
  chooseNode: (node: SelectedNode) => void;
  openSql: () => void;
}) {
  const [expandedDbNames, setExpandedDbNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!discovery?.indexedDb.length) {
      setExpandedDbNames(new Set());
      return;
    }
    if (selected.kind === "indexeddb") {
      setExpandedDbNames((current) => new Set([...current, selected.dbName]));
      return;
    }
    setExpandedDbNames((current) => {
      const existing = Array.from(current).filter((name) => discovery.indexedDb.some((db) => db.name === name));
      return existing.length ? new Set(existing) : new Set([discovery.indexedDb[0].name]);
    });
  }, [discovery, selected]);

  if (!discovery) return <p className="py-4 text-sm text-slate-400">Open DevTools on a page and refresh storage.</p>;

  return (
    <nav className="flex flex-col gap-1">
      <Button variant={selected.kind === "overview" ? "secondary" : "ghost"} className="justify-start" onClick={() => chooseNode({ kind: "overview" })}>
        Origin dashboard
      </Button>
      <Button variant="outline" className="justify-between" onClick={openSql}>
        SQL Query <span className="text-muted-foreground">⌘↵</span>
      </Button>
      <h3 className="mt-4 text-[11px] font-black uppercase tracking-normal text-muted-foreground">IndexedDB</h3>
      {discovery.indexedDb.length === 0 && <p className="text-sm text-slate-400">No IndexedDB databases.</p>}
      {discovery.indexedDb.map((db) => (
        <div key={db.name} className="flex flex-col gap-1">
          <Button
            variant={selected.kind === "indexeddb" && selected.dbName === db.name ? "secondary" : "ghost"}
            className="justify-between"
            onClick={() => {
              setExpandedDbNames((current) => {
                const next = new Set(current);
                if (next.has(db.name)) next.delete(db.name);
                else next.add(db.name);
                return next;
              });
            }}
            aria-expanded={expandedDbNames.has(db.name)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChevronRight
                data-icon="inline-start"
                className={expandedDbNames.has(db.name) ? "rotate-90 transition-transform" : "transition-transform"}
              />
              <Database data-icon="inline-start" />
              <span className="truncate">{db.name}</span>
            </span>
            <span className="text-xs text-muted-foreground">v{db.version}</span>
          </Button>
          {expandedDbNames.has(db.name) && (
            <div className="ml-4 flex flex-col gap-1 border-l border-border pl-2">
              <p className="px-2 py-1 text-[11px] font-black uppercase tracking-normal text-muted-foreground">Tables</p>
              {db.stores.map((store) => (
                <Button
                  key={`${db.name}:${store.name}`}
                  variant={selected.kind === "indexeddb" && selected.dbName === db.name && selected.storeName === store.name ? "secondary" : "ghost"}
                  className="justify-between"
                  onClick={() => chooseNode({ kind: "indexeddb", dbName: db.name, storeName: store.name })}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Table2 data-icon="inline-start" />
                    <span className="truncate">{store.name}</span>
                  </span>
                  <span className="text-muted-foreground">{store.count ?? "?"}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}

      <h3 className="mt-4 text-[11px] font-black uppercase tracking-normal text-muted-foreground">Storage</h3>
      <Button variant={selected.kind === "kv" && selected.surface === "localStorage" ? "secondary" : "ghost"} className="justify-between" onClick={() => chooseNode({ kind: "kv", surface: "localStorage" })}>
        LocalStorage <span className="text-muted-foreground">{discovery.localStorage.count}</span>
      </Button>
      <Button variant={selected.kind === "kv" && selected.surface === "sessionStorage" ? "secondary" : "ghost"} className="justify-between" onClick={() => chooseNode({ kind: "kv", surface: "sessionStorage" })}>
        SessionStorage <span className="text-muted-foreground">{discovery.sessionStorage.count}</span>
      </Button>
    </nav>
  );
}

function Overview({ discovery }: { discovery: StorageDiscovery | null }) {
  if (!discovery) return <p className="p-4 text-sm text-slate-400">No storage metadata loaded yet.</p>;
  const stores = discovery.indexedDb.flatMap((db) => db.stores.map((store) => ({ db: db.name, ...store })));
  return (
    <section className="grid grid-cols-4 gap-3 p-4">
      <article className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-slate-400">IndexedDB</p>
        <strong className="mt-2 block text-3xl font-black">{discovery.indexedDb.length}</strong>
        <span className="text-slate-400">databases</span>
      </article>
      <article className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-slate-400">Object stores</p>
        <strong className="mt-2 block text-3xl font-black">{stores.length}</strong>
        <span className="text-slate-400">tables</span>
      </article>
      <article className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-slate-400">LocalStorage</p>
        <strong className="mt-2 block text-3xl font-black">{discovery.localStorage.count}</strong>
        <span className="text-slate-400">{formatBytes(discovery.localStorage.bytes)}</span>
      </article>
      <article className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-slate-400">SessionStorage</p>
        <strong className="mt-2 block text-3xl font-black">{discovery.sessionStorage.count}</strong>
        <span className="text-slate-400">{formatBytes(discovery.sessionStorage.bytes)}</span>
      </article>
      <section className="col-span-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-normal text-slate-400">Largest stores</h3>
        {stores.length === 0 ? <p>No object stores found.</p> : stores.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 8).map((store) => (
          <div className="flex justify-between border-t border-slate-800 py-3" key={`${store.db}:${store.name}`}>
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
  filterText,
  onSelect,
  onDelete
}: {
  columns: string[];
  indexedRows: IndexedDbRecord[];
  filterText: string;
  onSelect: (record: IndexedDbRecord) => void;
  onDelete: (record: IndexedDbRecord) => void;
}) {
  const visibleColumns = columns.length > 0 ? columns : ["value"];
  const columnDefs = useMemo<ColumnDef<IndexedDbRecord>[]>(
    () => [
      {
        id: "key",
        header: "Key",
        accessorFn: (row) => JSON.stringify(row.key),
        cell: ({ getValue }) => <code className="text-lime-300">{String(getValue())}</code>
      },
      ...visibleColumns.map<ColumnDef<IndexedDbRecord>>((column) => ({
        id: column,
        header: column,
        accessorFn: (row) => renderColumn(row, column),
        cell: ({ getValue }) => String(getValue() ?? "")
      })),
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            className="border-0 bg-transparent p-0 text-red-300 hover:bg-transparent hover:text-red-200"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.original);
            }}
          >
            Delete
          </button>
        )
      }
    ],
    [onDelete, visibleColumns]
  );
  const table = useReactTable({
    data: indexedRows,
    columns: columnDefs,
    state: { globalFilter: filterText },
    globalFilterFn: (row, _columnId, filterValue) => JSON.stringify(row.original).toLowerCase().includes(String(filterValue).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });
  if (indexedRows.length === 0) return <p className="p-4 text-sm text-slate-400">No records loaded.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-auto border-b border-slate-800 bg-slate-950">
      <table className="w-full border-collapse text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="sticky top-0 z-10 border-b border-r border-slate-800 bg-slate-900 px-3 py-2 text-left text-[11px] font-black uppercase tracking-normal text-slate-400">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="cursor-pointer odd:bg-slate-950 even:bg-slate-900/35 hover:bg-sky-950/45" onClick={() => onSelect(row.original)}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-800 px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && <p className="p-4 text-sm text-slate-400">No rows match the filter.</p>}
    </div>
  );
}

function KvGrid({ rows, filterText, onSelect, onDelete }: { rows: KeyValueRecord[]; filterText: string; onSelect: (record: KeyValueRecord) => void; onDelete: (record: KeyValueRecord) => void }) {
  const columnDefs = useMemo<ColumnDef<KeyValueRecord>[]>(
    () => [
      {
        accessorKey: "key",
        header: "Key",
        cell: ({ row }) => <code className="text-lime-300">{row.original.key}</code>
      },
      {
        id: "value",
        header: "Value",
        accessorFn: (row) => row.parsed.preview
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => row.parsed.type
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            className="border-0 bg-transparent p-0 text-red-300 hover:bg-transparent hover:text-red-200"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.original);
            }}
          >
            Delete
          </button>
        )
      }
    ],
    [onDelete]
  );
  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { globalFilter: filterText },
    globalFilterFn: (row, _columnId, filterValue) => `${row.original.key} ${row.original.value} ${row.original.parsed.preview}`.toLowerCase().includes(String(filterValue).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });
  if (rows.length === 0) return <p className="p-4 text-sm text-slate-400">No keys found.</p>;
  return (
    <div className="h-full overflow-auto border-b border-slate-800 bg-slate-950">
      <table className="w-full border-collapse text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="sticky top-0 z-10 border-b border-r border-slate-800 bg-slate-900 px-3 py-2 text-left text-[11px] font-black uppercase tracking-normal text-slate-400">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="cursor-pointer odd:bg-slate-950 even:bg-slate-900/35 hover:bg-sky-950/45" onClick={() => onSelect(row.original)}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-800 px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && <p className="p-4 text-sm text-slate-400">No keys match the filter.</p>}
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
