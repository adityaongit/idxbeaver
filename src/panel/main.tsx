import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronRight, Database, Moon, PanelBottom, PanelLeft, PanelRight, Plus, RefreshCw, Search, Sun, Table2, Trash2, X } from "lucide-react";
import { JsonView, collapseAllNested } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { parseSelectQuery } from "../shared/query";
import type {
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [visibleDbNames, setVisibleDbNames] = useState<string[]>([]);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const leftPanelRef = useRef<PanelImperativeHandle | null>(null);
  const rightPanelRef = useRef<PanelImperativeHandle | null>(null);
  const bottomPanelRef = useRef<PanelImperativeHandle | null>(null);

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

  useEffect(() => {
    if (!discovery) {
      setVisibleDbNames([]);
      return;
    }

    const availableDbNames = new Set(discovery.indexedDb.map((db) => db.name));
    setVisibleDbNames((current) => {
      const retained = current.filter((name) => availableDbNames.has(name));
      if (selected.kind === "indexeddb" && availableDbNames.has(selected.dbName) && !retained.includes(selected.dbName)) {
        return [...retained, selected.dbName];
      }
      if (retained.length > 0) return retained;
      return discovery.indexedDb[0] ? [discovery.indexedDb[0].name] : [];
    });
  }, [discovery, selected]);

  const selectedDb = useMemo(() => {
    if (selected.kind !== "indexeddb" || !discovery) return null;
    return discovery.indexedDb.find((db) => db.name === selected.dbName) ?? null;
  }, [discovery, selected]);

  const selectedStore = useMemo(() => {
    if (selected.kind !== "indexeddb" || !selectedDb) return null;
    return selectedDb.stores.find((store) => store.name === selected.storeName) ?? null;
  }, [selected, selectedDb]);

  const canToggleBottomPanel = activeTabId !== "sql" && selected.kind !== "overview";

  useEffect(() => {
    if (canToggleBottomPanel) return;
    setBottomPanelCollapsed(false);
  }, [canToggleBottomPanel]);

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

  const updateVisibleDbNames = useCallback(
    (updater: (current: string[]) => string[]) => {
      setVisibleDbNames((current) => {
        if (!discovery) return current;
        const availableDbNames = new Set(discovery.indexedDb.map((db) => db.name));
        return updater(current).filter((name) => availableDbNames.has(name));
      });
    },
    [discovery]
  );

  const showDatabaseInView = useCallback(
    (dbName: string) => {
      updateVisibleDbNames((current) => (current.includes(dbName) ? current : [...current, dbName]));
    },
    [updateVisibleDbNames]
  );

  const hideDatabaseFromView = useCallback(
    (dbName: string) => {
      updateVisibleDbNames((current) => current.filter((name) => name !== dbName));
      if (selected.kind === "indexeddb" && selected.dbName === dbName) {
        chooseNode({ kind: "overview" });
      }
    },
    [selected, updateVisibleDbNames]
  );

  const togglePanel = (panel: "left" | "right" | "bottom") => {
    if (panel === "bottom" && !canToggleBottomPanel) return;
    const panelRef =
      panel === "left" ? leftPanelRef.current : panel === "right" ? rightPanelRef.current : bottomPanelRef.current;
    if (!panelRef) return;
    if (panelRef.isCollapsed()) panelRef.expand();
    else panelRef.collapse();
  };

  return (
    <main className={`${theme} flex h-screen min-w-[1100px] flex-col bg-background text-foreground`}>
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-primary bg-primary text-xs font-black text-primary-foreground">
            SS
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight">Storage Studio</h1>
            <p className="truncate text-xs text-muted-foreground">{discovery?.origin ?? "Inspecting current tab"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PanelToggleButton
            active={!leftPanelCollapsed}
            onClick={() => togglePanel("left")}
            label={leftPanelCollapsed ? "Show left panel" : "Hide left panel"}
          >
            <PanelLeft />
          </PanelToggleButton>
          <PanelToggleButton
            active={!bottomPanelCollapsed && canToggleBottomPanel}
            onClick={() => togglePanel("bottom")}
            label={
              canToggleBottomPanel
                ? bottomPanelCollapsed
                  ? "Show bottom panel"
                  : "Hide bottom panel"
                : "Bottom panel unavailable in this view"
            }
            disabled={!canToggleBottomPanel}
          >
            <PanelBottom />
          </PanelToggleButton>
          <PanelToggleButton
            active={!rightPanelCollapsed}
            onClick={() => togglePanel("right")}
            label={rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
          >
            <PanelRight />
          </PanelToggleButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <PrimaryActionButton onClick={refreshDiscovery} disabled={busy}>
            <RefreshCw data-icon="inline-start" className={busy ? "animate-spin" : undefined} />
            {busy ? "Working..." : "Refresh storage"}
          </PrimaryActionButton>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          panelRef={leftPanelRef}
          collapsible
          collapsedSize="0%"
          defaultSize="21%"
          minSize="220px"
          maxSize="380px"
          onResize={(size) => setLeftPanelCollapsed(isCollapsedPanelSize(size))}
        >
          <aside className="h-full overflow-auto border-r border-border bg-card p-3">
            <StorageTree
              discovery={discovery}
              selected={selected}
              visibleDbNames={visibleDbNames}
              chooseNode={chooseNode}
              showDatabaseInView={showDatabaseInView}
              hideDatabaseFromView={hideDatabaseFromView}
              openSql={() => chooseTab(tabs.find((tab) => tab.id === "sql")!)}
            />
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="57%" minSize="520px">
          <section className="flex h-full min-w-0 flex-col bg-background">
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

            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">
                  {activeTabId === "sql" ? "Query editor" : selected.kind === "overview" ? "Origin" : selected.kind === "indexeddb" ? "IndexedDB table" : selected.surface}
                </p>
                <h2 className="truncate text-xl font-black">{activeTabId === "sql" ? "SQL Query" : titleForSelection(selected)}</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="w-64 rounded-full pl-9"
                    value={filterText}
                    onChange={(event) => setFilterText(event.target.value)}
                    placeholder="Search for field or value..."
                  />
                </label>
                <SecondaryActionButton onClick={() => exportVisible("json")} disabled={visibleExportRows.length === 0}>
                  Export JSON
                </SecondaryActionButton>
                <SecondaryActionButton onClick={() => exportVisible("csv")} disabled={visibleExportRows.length === 0}>
                  Export CSV
                </SecondaryActionButton>
              </div>
            </header>

            {notice && (
              <div
                className={`shrink-0 border-b border-border px-4 py-2 text-sm ${
                  notice.tone === "error" ? "bg-destructive/10 text-destructive" : notice.tone === "success" ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {notice.message}
              </div>
            )}

            {activeTabId === "overview" && <Overview discovery={discovery} />}

            {activeTabId !== "sql" && selected.kind === "indexeddb" && (
              <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                <ResizablePanel defaultSize="78%" minSize="260px">
                  <div className="flex h-full min-h-0 flex-col">
                    <section className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-3 text-muted-foreground">
                        <span>{tableResult?.total ?? tableResult?.rows.length ?? 0} rows</span>
                        {selectedStore && (
                          <>
                            <span className="text-border">•</span>
                            <span>key path <code className="font-mono text-foreground">{JSON.stringify(selectedStore.keyPath)}</code></span>
                            <span className="text-border">•</span>
                            <span>auto increment {String(selectedStore.autoIncrement)}</span>
                          </>
                        )}
                      </div>
                    </section>
                    <DataGrid
                      columns={tableResult?.columns ?? []}
                      indexedRows={tableResult?.rows ?? []}
                      filterText={filterText}
                      selectedRecord={selected.kind === "indexeddb" && selectedRecord && !("parsed" in selectedRecord) ? selectedRecord : null}
                      onSelect={selectRecord}
                      onDelete={deleteIndexedRecord}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel
                  panelRef={bottomPanelRef}
                  collapsible
                  collapsedSize="0%"
                  defaultSize="22%"
                  minSize="130px"
                  onResize={(size) => setBottomPanelCollapsed(isCollapsedPanelSize(size))}
                >
                  <section className="grid h-full gap-3 overflow-auto bg-card p-4">
                    <h3 className="text-xs font-black uppercase tracking-normal text-muted-foreground">Add record</h3>
                    <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="Optional key as JSON, e.g. 42 or &quot;id&quot;" />
                    <Textarea className="min-h-24" value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} />
                    <PrimaryActionButton onClick={addIndexedRecord}>Add record</PrimaryActionButton>
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {activeTabId !== "sql" && selected.kind === "kv" && (
              <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                <ResizablePanel defaultSize="72%" minSize="260px">
                  <KvGrid
                    rows={kvResult?.rows ?? []}
                    filterText={filterText}
                    selectedRecord={selected.kind === "kv" && selectedRecord && "parsed" in selectedRecord ? selectedRecord : null}
                    onSelect={selectRecord}
                    onDelete={deleteKv}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel
                  panelRef={bottomPanelRef}
                  collapsible
                  collapsedSize="0%"
                  defaultSize="28%"
                  minSize="130px"
                  onResize={(size) => setBottomPanelCollapsed(isCollapsedPanelSize(size))}
                >
                  <section className="grid h-full gap-3 overflow-auto bg-card p-4">
                    <h3 className="text-xs font-black uppercase tracking-normal text-muted-foreground">Add key</h3>
                    <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="Key" />
                    <Textarea className="min-h-24" value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} />
                    <div className="flex gap-2">
                      <PrimaryActionButton onClick={addKv}>Save key</PrimaryActionButton>
                      <DestructiveActionButton onClick={clearKv}>Clear {selected.surface}</DestructiveActionButton>
                    </div>
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {activeTabId === "sql" && (
              <section className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-72 grid-cols-[42px_minmax(0,1fr)] border-b border-border bg-background">
                  <div className="border-r border-border p-4 text-right font-mono text-sm text-muted-foreground">1</div>
                  <Textarea className="min-h-72 resize-none rounded-none border-0 p-4 focus:ring-0" value={queryText} onChange={(event) => setQueryText(event.target.value)} spellCheck={false} />
                </div>
                <div className="flex items-center justify-end gap-3 border-b border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                  <span>{selected.kind === "indexeddb" ? `Context: ${selected.dbName}.${selected.storeName}` : "Select a table from the sidebar for query context"}</span>
                  <PrimaryActionButton onClick={runQuery} disabled={busy || selected.kind !== "indexeddb"}>Run Current ⌘↵</PrimaryActionButton>
                </div>
                {queryResult ? (
                  <>
                    <p className="border-b border-border px-4 py-2 text-sm text-muted-foreground">{queryResult.plan}</p>
                    <DataGrid
                      columns={queryResult.columns}
                      indexedRows={queryResult.rows.map((row) => ({ key: row.key, value: row.value }))}
                      filterText={filterText}
                      selectedRecord={selected.kind === "indexeddb" && selectedRecord && !("parsed" in selectedRecord) ? selectedRecord : null}
                      onSelect={selectRecord}
                      onDelete={deleteIndexedRecord}
                    />
                  </>
                ) : (
                  <p className="grid min-h-64 place-items-center text-muted-foreground">Write a SELECT query, pick a table for context, and run it.</p>
                )}
              </section>
            )}
          </section>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          panelRef={rightPanelRef}
          collapsible
          collapsedSize="0%"
          defaultSize="22%"
          minSize="240px"
          maxSize="460px"
          onResize={(size) => setRightPanelCollapsed(isCollapsedPanelSize(size))}
        >
          <RecordInspector
            selected={selected}
            selectedRecord={selectedRecord}
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            saveRecord={selected.kind === "kv" ? saveKv : saveIndexedRecord}
            busy={busy}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

function RecordInspector({
  selected,
  selectedRecord,
  editDraft,
  setEditDraft,
  saveRecord,
  busy
}: {
  selected: SelectedNode;
  selectedRecord: IndexedDbRecord | KeyValueRecord | null;
  editDraft: string;
  setEditDraft: (value: string) => void;
  saveRecord: () => void;
  busy: boolean;
}) {
  const inspectedValue = selectedRecord ? recordValue(selectedRecord) : null;
  const inspectedKey = selectedRecord ? recordKey(selectedRecord) : null;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">Inspector</p>
            <h2 className="truncate text-xl font-black">{selectedRecord ? "Selected document" : "No row selected"}</h2>
          </div>
          {selectedRecord && <Badge variant="outline">{selected.kind === "kv" ? "Key value" : "Record"}</Badge>}
        </div>
        {selectedRecord && (
          <div className="mt-3 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">
            <span className="text-muted-foreground">key</span>
            <span className="px-2 text-muted-foreground">=</span>
            <JsonInlineValue value={inspectedKey} />
          </div>
        )}
      </div>

      {selectedRecord && inspectedValue !== null ? (
        <Tabs defaultValue="document" className="min-h-0 flex-1 gap-0">
          <TabsList variant="line" className="h-9 w-full justify-start rounded-none border-b border-border bg-card px-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="document" className="min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <JsonDocumentView value={inspectedValue} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="json" className="min-h-0">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                <Textarea
                  className="min-h-0 flex-1 resize-none rounded-md font-mono text-xs leading-5"
                  value={safePrettyJson(editDraft, inspectedValue)}
                  onChange={(event) => setEditDraft(event.target.value)}
                  spellCheck={false}
                />
                <PrimaryActionButton onClick={saveRecord} disabled={busy}>Save changes</PrimaryActionButton>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">Select a row to inspect its fields, nested values, and raw JSON.</div>
      )}
    </aside>
  );
}

const inspectorJsonStyles = {
  container: "storage-studio-json-tree",
  childFieldsContainer: "storage-studio-json-tree__children",
  basicChildStyle: "storage-studio-json-tree__row",
  label: "storage-studio-json-tree__label",
  clickableLabel: "storage-studio-json-tree__label storage-studio-json-tree__label--clickable",
  collapseIcon: "storage-studio-json-tree__chevron storage-studio-json-tree__chevron--collapse",
  expandIcon: "storage-studio-json-tree__chevron storage-studio-json-tree__chevron--expand",
  collapsedContent: "storage-studio-json-tree__collapsed",
  nullValue: "storage-studio-json-tree__null",
  undefinedValue: "storage-studio-json-tree__null",
  numberValue: "storage-studio-json-tree__number",
  stringValue: "storage-studio-json-tree__string",
  booleanValue: "storage-studio-json-tree__boolean",
  otherValue: "storage-studio-json-tree__other",
  punctuation: "storage-studio-json-tree__punctuation"
} as const;

function JsonDocumentView({ value }: { value: SerializableValue }) {
  if (value === null || typeof value !== "object") {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">
        <JsonInlineValue value={value} />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <JsonView data={value} shouldExpandNode={(level) => level < 1 || collapseAllNested(level)} clickToExpandNode style={inspectorJsonStyles} />
    </div>
  );
}

function JsonInlineValue({ value }: { value: SerializableValue }) {
  if (value === null) return <span className="text-json-null">null</span>;
  if (typeof value === "string") return <span className="text-json-string">"{value}"</span>;
  if (typeof value === "number") return <span className="text-json-number">{value}</span>;
  if (typeof value === "boolean") return <span className="text-json-boolean">{String(value)}</span>;
  if (Array.isArray(value)) return <span className="text-muted-foreground">[{value.length}]</span>;
  return <span className="text-muted-foreground">{"{…}"}</span>;
}

function recordValue(record: IndexedDbRecord | KeyValueRecord): SerializableValue {
  return "parsed" in record ? record.parsed.value : record.value.value;
}

function recordKey(record: IndexedDbRecord | KeyValueRecord): SerializableValue {
  return "parsed" in record ? record.key : record.key;
}

function safePrettyJson(source: string, fallback: SerializableValue) {
  try {
    return JSON.stringify(JSON.parse(source), null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

function tabForNode(node: SelectedNode): WorkspaceTab {
  if (node.kind === "overview") return { id: "overview", title: "Origin", node };
  if (node.kind === "kv") return { id: node.surface, title: node.surface, node };
  return { id: `${node.dbName}:${node.storeName}`, title: node.storeName, node };
}

function isCollapsedPanelSize(size: PanelSize) {
  return size.asPercentage === 0 || size.inPixels === 0;
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
  visibleDbNames,
  chooseNode,
  showDatabaseInView,
  hideDatabaseFromView,
  openSql
}: {
  discovery: StorageDiscovery | null;
  selected: SelectedNode;
  visibleDbNames: string[];
  chooseNode: (node: SelectedNode) => void;
  showDatabaseInView: (dbName: string) => void;
  hideDatabaseFromView: (dbName: string) => void;
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

  if (!discovery) return <p className="py-4 text-sm text-muted-foreground">Open DevTools on a page and refresh storage.</p>;

  const visibleDbs = discovery.indexedDb.filter((db) => visibleDbNames.includes(db.name));
  const hiddenDbs = discovery.indexedDb.filter((db) => !visibleDbNames.includes(db.name));

  return (
    <nav className="flex flex-col gap-1">
      <Button variant={selected.kind === "overview" ? "secondary" : "ghost"} className="justify-start" onClick={() => chooseNode({ kind: "overview" })}>
        Origin dashboard
      </Button>
      <Button variant="outline" className="justify-between" onClick={openSql}>
        SQL Query <span className="text-muted-foreground">⌘↵</span>
      </Button>

      <section className="mt-4 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">IndexedDB view</h3>
            <p className="mt-1 text-xs text-muted-foreground">Only selected databases stay in the navigation tree.</p>
          </div>
          <Badge variant="outline">{visibleDbs.length}/{discovery.indexedDb.length || 0}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleDbs.length === 0 && (
            <span className="text-sm text-muted-foreground">No databases in view.</span>
          )}
          {visibleDbs.map((db) => (
            <button
              key={db.name}
              type="button"
              onClick={() => hideDatabaseFromView(db.name)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted"
              aria-label={`Remove ${db.name} from this view`}
            >
              <Database className="h-3.5 w-3.5" />
              <span className="max-w-28 truncate">{db.name}</span>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {hiddenDbs.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[11px] font-black uppercase tracking-normal text-muted-foreground">Add database</p>
            <div className="flex flex-col gap-1">
              {hiddenDbs.map((db) => (
                <Button key={db.name} variant="ghost" className="justify-between" onClick={() => showDatabaseInView(db.name)}>
                  <span className="flex min-w-0 items-center gap-2">
                    <Plus data-icon="inline-start" />
                    <span className="truncate">{db.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">v{db.version}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>

      <h3 className="mt-4 text-[11px] font-black uppercase tracking-normal text-muted-foreground">IndexedDB</h3>
      {discovery.indexedDb.length === 0 && <p className="text-sm text-muted-foreground">No IndexedDB databases.</p>}
      {visibleDbs.length === 0 && discovery.indexedDb.length > 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          Add a database above to browse its stores.
        </p>
      )}
      {visibleDbs.map((db) => (
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
  if (!discovery) return <p className="p-4 text-sm text-muted-foreground">No storage metadata loaded yet.</p>;
  const stores = discovery.indexedDb.flatMap((db) => db.stores.map((store) => ({ db: db.name, ...store })));
  return (
    <section className="grid grid-cols-4 gap-3 p-4">
      <article className="rounded-lg border border-border bg-card p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">IndexedDB</p>
        <strong className="mt-2 block text-3xl font-black">{discovery.indexedDb.length}</strong>
        <span className="text-muted-foreground">databases</span>
      </article>
      <article className="rounded-lg border border-border bg-card p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">Object stores</p>
        <strong className="mt-2 block text-3xl font-black">{stores.length}</strong>
        <span className="text-muted-foreground">tables</span>
      </article>
      <article className="rounded-lg border border-border bg-card p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">LocalStorage</p>
        <strong className="mt-2 block text-3xl font-black">{discovery.localStorage.count}</strong>
        <span className="text-muted-foreground">{formatBytes(discovery.localStorage.bytes)}</span>
      </article>
      <article className="rounded-lg border border-border bg-card p-4">
        <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">SessionStorage</p>
        <strong className="mt-2 block text-3xl font-black">{discovery.sessionStorage.count}</strong>
        <span className="text-muted-foreground">{formatBytes(discovery.sessionStorage.bytes)}</span>
      </article>
      <section className="col-span-4 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-normal text-muted-foreground">Largest stores</h3>
        {stores.length === 0 ? <p>No object stores found.</p> : stores.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 8).map((store) => (
          <div className="flex justify-between border-t border-border py-3" key={`${store.db}:${store.name}`}>
            <span>{store.db}.{store.name}</span>
            <strong>{store.count ?? "?"} rows</strong>
          </div>
        ))}
      </section>
    </section>
  );
}

function PanelToggleButton({
  active,
  children,
  disabled,
  label,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? "secondary" : "outline"}
      className={active ? "border border-border" : undefined}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PrimaryActionButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="sm"
      className={`font-semibold ${className ?? ""}`}
      {...props}
    />
  );
}

function SecondaryActionButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`font-semibold ${className ?? ""}`}
      {...props}
    />
  );
}

function DestructiveActionButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="destructive"
      size="sm"
      className={`font-semibold ${className ?? ""}`}
      {...props}
    />
  );
}

function DataGrid({
  columns,
  indexedRows,
  filterText,
  selectedRecord,
  onSelect,
  onDelete
}: {
  columns: string[];
  indexedRows: IndexedDbRecord[];
  filterText: string;
  selectedRecord: IndexedDbRecord | null;
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
        cell: ({ getValue }) => <code className="font-mono text-foreground">{String(getValue())}</code>
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
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Delete record"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.original);
            }}
          >
            <Trash2 />
          </Button>
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
  if (indexedRows.length === 0) return <p className="p-4 text-sm text-muted-foreground">No records loaded.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-auto border-b border-border bg-background">
      <table className="w-full border-collapse text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="sticky top-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left text-[11px] font-black uppercase tracking-normal text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`cursor-pointer odd:bg-background even:bg-muted/30 hover:bg-muted ${sameIndexedRecord(selectedRecord, row.original) ? "bg-accent text-accent-foreground" : ""}`}
              onClick={() => onSelect(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-3 py-1.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No rows match the filter.</p>}
    </div>
  );
}

function KvGrid({
  rows,
  filterText,
  selectedRecord,
  onSelect,
  onDelete
}: {
  rows: KeyValueRecord[];
  filterText: string;
  selectedRecord: KeyValueRecord | null;
  onSelect: (record: KeyValueRecord) => void;
  onDelete: (record: KeyValueRecord) => void;
}) {
  const columnDefs = useMemo<ColumnDef<KeyValueRecord>[]>(
    () => [
      {
        accessorKey: "key",
        header: "Key",
        cell: ({ row }) => <code className="font-mono text-foreground">{row.original.key}</code>
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
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Delete key"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.original);
            }}
          >
            <Trash2 />
          </Button>
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
  if (rows.length === 0) return <p className="p-4 text-sm text-muted-foreground">No keys found.</p>;
  return (
    <div className="h-full overflow-auto border-b border-border bg-background">
      <table className="w-full border-collapse text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="sticky top-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left text-[11px] font-black uppercase tracking-normal text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`cursor-pointer odd:bg-background even:bg-muted/30 hover:bg-muted ${selectedRecord?.key === row.original.key ? "bg-accent text-accent-foreground" : ""}`}
              onClick={() => onSelect(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-3 py-1.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No keys match the filter.</p>}
    </div>
  );
}

function renderColumn(record: IndexedDbRecord, column: string) {
  if (column === "value") return record.value.preview;
  const value = record.value.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const cell = (value as Record<string, unknown>)[column];
  if (cell && typeof cell === "object" && "preview" in cell && "value" in cell) {
    return String((cell as { preview: string }).preview);
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

function sameIndexedRecord(left: IndexedDbRecord | null, right: IndexedDbRecord) {
  if (!left) return false;
  return JSON.stringify(left.key) === JSON.stringify(right.key);
}

createRoot(document.getElementById("root")!).render(<App />);
