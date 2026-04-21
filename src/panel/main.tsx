import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronRight, Copy, Database, Moon, PanelBottom, PanelLeft, PanelRight, Plus, RefreshCw, Search, Sun, Table2, Trash2, X } from "lucide-react";
import { JsonView, collapseAllNested } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "../components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../components/ui/context-menu";
import { parseMongoQuery } from "../shared/query";
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

const QueryEditor = lazy(async () => import("./QueryEditor").then((module) => ({ default: module.QueryEditor })));

type SelectedNode =
  | { kind: "overview" }
  | { kind: "indexeddb"; dbName: string; dbVersion: number; storeName: string; origin: string; frameId: number }
  | { kind: "kv"; surface: "localStorage" | "sessionStorage" };

type Notice = { tone: "success" | "error" | "info"; message: string } | null;
type PendingAction =
  | { kind: "deleteIndexed"; label: string; execute: () => Promise<void> }
  | { kind: "deleteKv"; label: string; execute: () => Promise<void> }
  | { kind: "clearKv"; label: string; execute: () => Promise<void> }
  | { kind: "deleteDatabase"; label: string; execute: () => Promise<void> }
  | { kind: "deleteStore"; label: string; execute: () => Promise<void> }
  | { kind: "clearStore"; label: string; execute: () => Promise<void> }
  | null;

type WorkspaceTab =
  | { id: string; title: string; node: { kind: "indexeddb"; dbName: string; dbVersion: number; storeName: string; origin: string; frameId: number } }
  | { id: string; title: string; node: { kind: "kv"; surface: "localStorage" | "sessionStorage" } };

type QuerySuggestion = {
  label: string;
  insertText: string;
  kind: "store" | "field" | "operator";
};

const extensionRuntime =
  typeof chrome !== "undefined" &&
  Boolean(chrome.runtime?.connect) &&
  Boolean(chrome.devtools?.inspectedWindow);
const tabId = extensionRuntime ? chrome.devtools.inspectedWindow.tabId : 0;

// Composite identity for a database — a tab can contain iframes of different
// origins, and IndexedDB is partitioned per origin. Same-named DBs in different
// frames are distinct, so we key on origin + name + version.
function dbKey(info: { origin: string; name: string; version: number }): string {
  return `${info.origin}::${info.name}::v${info.version}`;
}

function dbKeyFromSelected(node: Extract<SelectedNode, { kind: "indexeddb" }>): string {
  return `${node.origin}::${node.dbName}::v${node.dbVersion}`;
}

function shortOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return url.host || origin;
  } catch {
    return origin;
  }
}

function App() {
  const rpc = useStorageRpc();
  const [discovery, setDiscovery] = useState<StorageDiscovery | null>(null);
  const [selected, setSelected] = useState<SelectedNode>({ kind: "overview" });
  const [tableResult, setTableResult] = useState<TableReadResult | null>(null);
  const [kvResult, setKvResult] = useState<KvReadResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryText, setQueryText] = useState(`{
  "store": "",
  "filter": {},
  "limit": 100
}`);
  const [selectedRecord, setSelectedRecord] = useState<IndexedDbRecord | KeyValueRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [editDraft, setEditDraft] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("{\n  \n}");
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [previewTab, setPreviewTab] = useState<WorkspaceTab | null>(null);
  const [activeTabId, setActiveTabId] = useState("overview");
  const [filterText, setFilterText] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [visibleDbKeys, setVisibleDbKeys] = useState<string[]>([]);
  const [databasePickerOpen, setDatabasePickerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
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

  // Keep visible DBs consistent with discovery, but never auto-select — the user
  // picks which databases to browse.
  useEffect(() => {
    if (!discovery) {
      setVisibleDbKeys([]);
      return;
    }
    const availableKeys = new Set(discovery.indexedDb.map(dbKey));
    setVisibleDbKeys((current) => {
      const retained = current.filter((key) => availableKeys.has(key));
      if (selected.kind === "indexeddb") {
        const selKey = dbKeyFromSelected(selected);
        if (availableKeys.has(selKey) && !retained.includes(selKey)) {
          return [...retained, selKey];
        }
      }
      return retained;
    });
  }, [discovery, selected]);

  const selectedDb = useMemo(() => {
    if (selected.kind !== "indexeddb" || !discovery) return null;
    return discovery.indexedDb.find((db) =>
      db.name === selected.dbName &&
      db.version === selected.dbVersion &&
      db.origin === selected.origin
    ) ?? null;
  }, [discovery, selected]);

  const selectedStore = useMemo(() => {
    if (selected.kind !== "indexeddb" || !selectedDb) return null;
    return selectedDb.stores.find((store) => store.name === selected.storeName) ?? null;
  }, [selected, selectedDb]);

  const visibleDbs = useMemo(
    () => discovery?.indexedDb.filter((db) => visibleDbKeys.includes(dbKey(db))) ?? [],
    [discovery, visibleDbKeys]
  );

  const hiddenDbs = useMemo(
    () => discovery?.indexedDb.filter((db) => !visibleDbKeys.includes(dbKey(db))) ?? [],
    [discovery, visibleDbKeys]
  );

  // Names that appear in more than one row (same name in multiple origins, or
  // same origin at multiple versions). When this is true we show an extra tag.
  const duplicateDbNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const db of discovery?.indexedDb ?? []) counts.set(db.name, (counts.get(db.name) ?? 0) + 1);
    return new Set(Array.from(counts.entries()).filter(([, c]) => c > 1).map(([n]) => n));
  }, [discovery]);

  // Origins that host more than one DB — useful to show an origin badge even
  // when the name isn't duplicated, so the user knows which frame it came from.
  const multiOrigin = useMemo(() => {
    const origins = new Set<string>();
    for (const db of discovery?.indexedDb ?? []) origins.add(db.origin);
    return origins.size > 1;
  }, [discovery]);

  const renderedTabs = useMemo(() => {
    const all = [
      { value: "overview", title: "Origin", closable: false, preview: false },
      { value: "sql", title: "Query", closable: false, preview: false },
      ...tabs.map((tab) => ({ value: tab.id, title: tab.title, closable: true, preview: false }))
    ];
    if (previewTab && !tabs.some((tab) => tab.id === previewTab.id)) {
      all.push({ value: "preview", title: previewTab.title, closable: false, preview: true });
    }
    return all;
  }, [previewTab, tabs]);

  const canToggleBottomPanel = activeTabId !== "sql" && selected.kind !== "overview";
  const pendingActionTitle =
    pendingAction?.kind === "clearKv" ? "Clear all keys?"
    : pendingAction?.kind === "deleteKv" ? "Delete key?"
    : pendingAction?.kind === "deleteIndexed" ? "Delete record?"
    : pendingAction?.kind === "deleteDatabase" ? "Delete database?"
    : pendingAction?.kind === "deleteStore" ? "Delete object store?"
    : pendingAction?.kind === "clearStore" ? "Clear object store?"
    : "Confirm action";

  useEffect(() => {
    if (canToggleBottomPanel) return;
    setBottomPanelCollapsed(false);
  }, [canToggleBottomPanel]);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark", isDark);
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, [theme]);

  const loadIndexedStore = useCallback(
    async (frameId: number, dbName: string, dbVersion: number, storeName: string) => {
      setBusy(true);
      setQueryResult(null);
      setKvResult(null);
      setSelectedRecord(null);
      const response = await rpc({ type: "readIndexedDbStore", tabId, frameId, dbName, dbVersion, storeName, limit: 500 });
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

  const openNode = (node: SelectedNode, options?: { persist?: boolean }) => {
    const persist = options?.persist ?? false;
    setSelected(node);
    setFilterText("");

    if (node.kind === "indexeddb") void loadIndexedStore(node.frameId, node.dbName, node.dbVersion, node.storeName);
    if (node.kind === "kv") void loadKv(node.surface);

    if (node.kind === "overview") {
      setPreviewTab(null);
      setActiveTabId("overview");
      setTableResult(null);
      setKvResult(null);
      setQueryResult(null);
      setSelectedRecord(null);
      return;
    }

    const tab = tabForNode(node);
    if (node.kind === "kv") {
      setPreviewTab(null);
      setTabs((current) => (current.some((item) => item.id === tab.id) ? current : [...current, tab]));
      setActiveTabId(tab.id);
      return;
    }

    if (persist || tabs.some((item) => item.id === tab.id)) {
      setPreviewTab(null);
      setTabs((current) => (current.some((item) => item.id === tab.id) ? current : [...current, tab]));
      setActiveTabId(tab.id);
      return;
    }

    setPreviewTab(tab);
    setActiveTabId("preview");
  };

  const chooseTab = (tab: WorkspaceTab) => {
    openNode(tab.node, { persist: true });
  };

  const closeTab = (tabId: string) => {
    setTabs((current) => current.filter((tab) => tab.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId("overview");
      setSelected({ kind: "overview" });
      setTableResult(null);
      setKvResult(null);
      setQueryResult(null);
      setSelectedRecord(null);
    }
  };

  const promotePreviewTab = useCallback(() => {
    if (!previewTab) return;
    setTabs((current) => (current.some((tab) => tab.id === previewTab.id) ? current : [...current, previewTab]));
    setPreviewTab(null);
    setActiveTabId(previewTab.id);
  }, [previewTab]);

  const runQuery = async () => {
    if (selected.kind !== "indexeddb") {
      setNotice({ tone: "error", message: "Select an IndexedDB store before running a query." });
      return;
    }

    try {
      const query = parseMongoQuery(queryText);
      setBusy(true);
      const response = await rpc({
        type: "runIndexedDbQuery",
        tabId,
        frameId: selected.frameId,
        dbName: selected.dbName,
        dbVersion: selected.dbVersion,
        query
      });
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
      const value = parseAndValidateJson(editDraft);
      setBusy(true);
      const response = await rpc({
        type: "putIndexedDbRecord",
        tabId,
        frameId: selected.frameId,
        dbName: selected.dbName,
        dbVersion: selected.dbVersion,
        storeName: selected.storeName,
        key: selectedRecord.key,
        value
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      await loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName);
      setNotice({ tone: "success", message: "Record saved." });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const addIndexedRecord = async () => {
    if (selected.kind !== "indexeddb") return;
    try {
      const value = parseAndValidateJson(newValue);
      const key = newKey.trim() ? (JSON.parse(newKey) as SerializableValue) : undefined;
      setBusy(true);
      const response = await rpc({
        type: "addIndexedDbRecord",
        tabId,
        frameId: selected.frameId,
        dbName: selected.dbName,
        dbVersion: selected.dbVersion,
        storeName: selected.storeName,
        key,
        value
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      setNewKey("");
      setNewValue("{\n  \n}");
      await loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName);
      await refreshDiscovery();
      setNotice({ tone: "success", message: "Record added." });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const deleteIndexedRecord = async (record: IndexedDbRecord) => {
    if (selected.kind !== "indexeddb") return;
    const sel = selected;
    setPendingAction({
      kind: "deleteIndexed",
      label: `Delete record ${JSON.stringify(record.key)} from ${sel.storeName}`,
      execute: async () => {
        setBusy(true);
        const response = await rpc({
          type: "deleteIndexedDbRecord",
          tabId,
          frameId: sel.frameId,
          dbName: sel.dbName,
          dbVersion: sel.dbVersion,
          storeName: sel.storeName,
          key: record.key
        });
        setBusy(false);
        if (!response.ok) {
          setNotice({ tone: "error", message: response.error });
          return;
        }
        await loadIndexedStore(sel.frameId, sel.dbName, sel.dbVersion, sel.storeName);
        await refreshDiscovery();
        setNotice({ tone: "success", message: "Record deleted." });
      }
    });
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
    setPendingAction({
      kind: "deleteKv",
      label: `Delete key ${record.key} from ${selected.surface}`,
      execute: async () => {
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
      }
    });
  };

  const clearKv = async () => {
    if (selected.kind !== "kv") return;
    setPendingAction({
      kind: "clearKv",
      label: `Clear all keys from ${selected.surface}`,
      execute: async () => {
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
      }
    });
  };

  const requestDeleteDatabase = (db: IndexedDbDatabaseInfo) => {
    setPendingAction({
      kind: "deleteDatabase",
      label: `Permanently delete the database "${db.name}" (v${db.version}) in ${shortOrigin(db.origin)}.`,
      execute: async () => {
        setBusy(true);
        const response = await rpc({ type: "deleteIndexedDbDatabase", tabId, frameId: db.frameId, dbName: db.name });
        setBusy(false);
        if (!response.ok) {
          setNotice({ tone: "error", message: response.error });
          return;
        }
        if (selected.kind === "indexeddb" && selected.dbName === db.name && selected.origin === db.origin) {
          openNode({ kind: "overview" });
        }
        setVisibleDbKeys((current) => current.filter((key) => key !== dbKey(db)));
        await refreshDiscovery();
        setNotice({ tone: "success", message: `Deleted database "${db.name}".` });
      }
    });
  };

  const requestDeleteStore = (db: IndexedDbDatabaseInfo, storeName: string) => {
    setPendingAction({
      kind: "deleteStore",
      label: `Permanently delete object store "${storeName}" from "${db.name}" in ${shortOrigin(db.origin)}.`,
      execute: async () => {
        setBusy(true);
        const response = await rpc({
          type: "deleteIndexedDbStore",
          tabId,
          frameId: db.frameId,
          dbName: db.name,
          dbVersion: db.version,
          storeName
        });
        setBusy(false);
        if (!response.ok) {
          setNotice({ tone: "error", message: response.error });
          return;
        }
        if (selected.kind === "indexeddb" && selected.dbName === db.name && selected.storeName === storeName && selected.origin === db.origin) {
          openNode({ kind: "overview" });
        }
        await refreshDiscovery();
        setNotice({ tone: "success", message: `Deleted store "${storeName}".` });
      }
    });
  };

  const requestClearStore = (db: IndexedDbDatabaseInfo, storeName: string) => {
    setPendingAction({
      kind: "clearStore",
      label: `Delete every record in "${storeName}" (keeps the store).`,
      execute: async () => {
        setBusy(true);
        const response = await rpc({
          type: "clearIndexedDbStore",
          tabId,
          frameId: db.frameId,
          dbName: db.name,
          dbVersion: db.version,
          storeName
        });
        setBusy(false);
        if (!response.ok) {
          setNotice({ tone: "error", message: response.error });
          return;
        }
        if (selected.kind === "indexeddb" && selected.dbName === db.name && selected.storeName === storeName && selected.origin === db.origin) {
          await loadIndexedStore(db.frameId, db.name, db.version, storeName);
        }
        await refreshDiscovery();
        setNotice({ tone: "success", message: `Cleared store "${storeName}".` });
      }
    });
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
    if (rightPanelRef.current?.isCollapsed()) {
      rightPanelRef.current.expand();
    }
    if (activeTabId === "preview") {
      promotePreviewTab();
    }
    setSelectedRecord(record);
    setEditDraft("parsed" in record ? record.value : JSON.stringify(record.value.value, null, 2));
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    await action.execute();
  };

  const updateVisibleDbKeys = useCallback(
    (updater: (current: string[]) => string[]) => {
      setVisibleDbKeys((current) => {
        if (!discovery) return current;
        const availableKeys = new Set(discovery.indexedDb.map(dbKey));
        return updater(current).filter((key) => availableKeys.has(key));
      });
    },
    [discovery]
  );

  const showDatabaseInView = useCallback(
    (key: string) => {
      updateVisibleDbKeys((current) => (current.includes(key) ? current : [...current, key]));
    },
    [updateVisibleDbKeys]
  );

  const hideDatabaseFromView = useCallback(
    (key: string) => {
      updateVisibleDbKeys((current) => current.filter((k) => k !== key));
      if (selected.kind === "indexeddb" && dbKeyFromSelected(selected) === key) {
        openNode({ kind: "overview" });
      }
    },
    [selected, updateVisibleDbKeys]
  );

  const togglePanel = (panel: "left" | "right" | "bottom") => {
    if (panel === "bottom" && !canToggleBottomPanel) return;
    const panelRef =
      panel === "left" ? leftPanelRef.current : panel === "right" ? rightPanelRef.current : bottomPanelRef.current;
    if (!panelRef) return;
    if (panelRef.isCollapsed()) panelRef.expand();
    else panelRef.collapse();
  };

  const querySuggestionPool = useMemo<QuerySuggestion[]>(() => {
    const stores =
      discovery?.indexedDb.flatMap((db) =>
        db.stores.map((store) => ({
          label: store.name,
          insertText: `"${store.name}"`,
          kind: "store" as const
        }))
      ) ?? [];
    const fields =
      tableResult?.columns.map((column) => ({
        label: column,
        insertText: `"${column}"`,
        kind: "field" as const
      })) ?? [];
    const operators: QuerySuggestion[] = [
      "$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$regex", "$exists", "$and", "$or", "$not"
    ].map((op) => ({ label: op, insertText: `"${op}"`, kind: "operator" as const }));

    return Array.from(
      new Map([...stores, ...fields, ...operators].map((item) => [item.insertText, item])).values()
    );
  }, [discovery, tableResult?.columns]);

  return (
    <main className={`${theme} flex h-screen min-w-[1100px] flex-col bg-background text-foreground`}>
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-primary bg-primary text-xs font-black text-primary-foreground">
            SS
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight">IdxBeaver</h1>
            <p className="truncate text-xs text-muted-foreground">{discovery?.origin ?? "Inspecting current tab"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold"
            onClick={() => setDatabasePickerOpen(true)}
          >
            <Database data-icon="inline-start" />
            Open
          </Button>
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
              visibleDbKeys={visibleDbKeys}
              duplicateDbNames={duplicateDbNames}
              multiOrigin={multiOrigin}
              openNode={openNode}
              openSql={() => setActiveTabId("sql")}
              onRequestDeleteDatabase={requestDeleteDatabase}
              onRequestDeleteStore={requestDeleteStore}
              onRequestClearStore={requestClearStore}
              onHideDatabase={hideDatabaseFromView}
            />
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="57%" minSize="520px">
          <section className="flex h-full min-w-0 flex-col bg-background">
            <Tabs
              value={activeTabId}
              onValueChange={(value) => {
                if (value === "overview") {
                  openNode({ kind: "overview" });
                  return;
                }
                if (value === "sql") {
                  setActiveTabId("sql");
                  return;
                }
                if (value === "preview" && previewTab) {
                  openNode(previewTab.node);
                  return;
                }
                const tab = tabs.find((item) => item.id === value);
                if (tab) chooseTab(tab);
              }}
              className="shrink-0 gap-0"
            >
              <TabsList variant="line" className="h-9 w-full justify-start rounded-none border-b border-border bg-card px-2">
                {renderedTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className={`min-w-28 flex-none px-4 ${tab.preview ? "italic text-muted-foreground" : ""}`}>
                    {tab.title}
                    {tab.closable && (
                      <span
                        className="text-base text-muted-foreground hover:text-foreground"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeTab(tab.value);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-normal text-muted-foreground">
                  {activeTabId === "sql" ? "Query editor" : selected.kind === "overview" ? "Origin" : selected.kind === "indexeddb" ? "IndexedDB table" : selected.surface}
                </p>
                <h2 className="truncate text-xl font-black">{activeTabId === "sql" ? "Query" : titleForSelection(selected)}</h2>
                {activeTabId !== "sql" && selected.kind === "indexeddb" && (
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                    <OriginBadge origin={selected.origin} />
                    <span className="inline-flex items-center rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-tight text-muted-foreground">
                      {selected.dbName} · v{selected.dbVersion}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-10 w-64 rounded-xl pl-9"
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
              <div className="shrink-0 border-b border-border px-4 py-2">
                <Alert variant={notice.tone === "error" ? "destructive" : "default"}>
                  <AlertTitle>{notice.tone === "error" ? "Action failed" : notice.tone === "success" ? "Done" : "Notice"}</AlertTitle>
                  <AlertDescription>{notice.message}</AlertDescription>
                </Alert>
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
                <div className="min-h-72 border-b border-border bg-background">
                  <Suspense fallback={<div className="grid min-h-72 place-items-center text-sm text-muted-foreground">Loading query editor…</div>}>
                    <QueryEditor
                      value={queryText}
                      onChange={setQueryText}
                      onRun={() => void runQuery()}
                      suggestions={querySuggestionPool}
                      theme={theme}
                    />
                  </Suspense>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold uppercase tracking-wide">Examples</span>
                    <QueryExampleButton onClick={() => setQueryText(exampleFindActive(selected))}>Active rows</QueryExampleButton>
                    <QueryExampleButton onClick={() => setQueryText(exampleTopByCreated(selected))}>Top 10 by createdAt</QueryExampleButton>
                    <QueryExampleButton onClick={() => setQueryText(exampleRegex(selected))}>Email regex</QueryExampleButton>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{selected.kind === "indexeddb" ? `Context: ${shortOrigin(selected.origin)} · ${selected.dbName} v${selected.dbVersion} · ${selected.storeName}` : "Select a store from the sidebar for query context"}</span>
                    <PrimaryActionButton onClick={runQuery} disabled={busy || selected.kind !== "indexeddb"}>Run ⌘↵</PrimaryActionButton>
                  </div>
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
                  <div className="grid min-h-64 place-items-center p-6 text-sm text-muted-foreground">
                    <div className="max-w-md space-y-2 text-center">
                      <p className="font-semibold text-foreground">Write a MongoDB-style query in JSON.</p>
                      <p>
                        Required: <code className="font-mono">"store"</code>. Optional: <code className="font-mono">"filter"</code>, <code className="font-mono">"sort"</code>, <code className="font-mono">"limit"</code>, <code className="font-mono">"project"</code>.
                      </p>
                      <p>
                        Operators: <code className="font-mono">$eq $ne $gt $gte $lt $lte $in $nin $regex $exists $and $or $not</code>. Nested paths use dots, e.g. <code className="font-mono">"profile.country"</code>.
                      </p>
                    </div>
                  </div>
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
            onCopy={() => {
              if (!selectedRecord) return;
              const value = recordValue(selectedRecord);
              void navigator.clipboard.writeText(JSON.stringify(value, null, 2));
              setNotice({ tone: "success", message: "Copied document JSON." });
            }}
            busy={busy}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={databasePickerOpen} onOpenChange={setDatabasePickerOpen}>
        <DialogContent
          className="max-h-[min(85vh,48rem)] max-w-[min(960px,calc(100vw-2.5rem))] gap-0 overflow-hidden border-border bg-background p-0 text-foreground shadow-2xl sm:max-w-[min(960px,calc(100vw-2.5rem))]"
          showCloseButton={false}
        >
          <DialogHeader className="border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-[1.5rem] font-black tracking-tight">Open databases</DialogTitle>
                <DialogDescription className="max-w-lg text-sm leading-6">
                  Search and choose which IndexedDB databases appear in the left sidebar.
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => setDatabasePickerOpen(false)}>
                Close
              </Button>
            </div>
          </DialogHeader>
          <Command className="rounded-none bg-background p-0">
            <div className="border-b border-border px-5 py-3.5">
              <CommandInput placeholder="Search databases..." className="text-sm" />
            </div>
            <CommandList className="max-h-[min(52vh,24rem)] px-4 py-3">
              <CommandEmpty className="py-10 text-sm text-muted-foreground">No matching databases.</CommandEmpty>
              <CommandGroup heading="In view" className="px-0 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-black **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.08em]">
                {visibleDbs.map((db) => {
                  const key = dbKey(db);
                  return (
                    <CommandItem
                      key={`visible:${key}`}
                      value={`visible ${db.name} ${db.origin}`}
                      onSelect={() => hideDatabaseFromView(key)}
                      className="min-h-11 rounded-lg px-4 text-sm"
                    >
                      <Database className="size-4" />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-semibold">{db.name}</span>
                        {(multiOrigin || duplicateDbNames.has(db.name)) && (
                          <OriginBadge origin={db.origin} />
                        )}
                      </span>
                      <CommandShortcut className="flex items-center gap-2 text-destructive group-data-selected/command-item:text-destructive">
                        <span className="text-xs tracking-normal text-muted-foreground">v{db.version}</span>
                        <X className="size-4" />
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator className="my-3" />
              <CommandGroup heading="Available" className="px-0 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-black **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.08em]">
                {hiddenDbs.map((db) => {
                  const key = dbKey(db);
                  return (
                    <CommandItem
                      key={`hidden:${key}`}
                      value={`available ${db.name} ${db.origin}`}
                      onSelect={() => showDatabaseInView(key)}
                      className="min-h-11 rounded-lg px-4 text-sm"
                    >
                      <Plus className="size-4" />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-semibold">{db.name}</span>
                        {(multiOrigin || duplicateDbNames.has(db.name)) && (
                          <OriginBadge origin={db.origin} />
                        )}
                      </span>
                      <CommandShortcut className="text-xs tracking-normal text-muted-foreground group-data-selected/command-item:text-foreground">
                        v{db.version}
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            <span>
              {visibleDbKeys.length} of {discovery?.indexedDb.length ?? 0} databases visible
            </span>
            <span className="flex items-center gap-2">
              <span>
                scanned {discovery?.frames.length ?? 0} frame{(discovery?.frames.length ?? 0) === 1 ? "" : "s"}
              </span>
              {(discovery?.frames.length ?? 0) > 0 && (
                <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] tracking-tight">
                  {new Set(discovery?.frames.map((f) => f.origin)).size} origins
                </span>
              )}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent
          className="max-w-[min(420px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[22px] border-border bg-card p-0 text-card-foreground shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{pendingActionTitle}</DialogTitle>
            <DialogDescription>{pendingAction?.label}</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="rounded-none border-0 bg-transparent px-5 pt-5 pb-3">
            <div className="space-y-2.5">
              <AlertTitle className="text-[1.75rem] font-black tracking-tight text-foreground">{pendingActionTitle}</AlertTitle>
              <AlertDescription className="text-sm leading-6 text-muted-foreground">
                {pendingAction?.label}
              </AlertDescription>
            </div>
          </Alert>
          <div className="flex items-center justify-end gap-2 border-t border-border/80 bg-card px-5 py-4">
            <Button variant="outline" size="sm" className="min-w-24 rounded-md" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="min-w-28 rounded-md"
              onClick={() => void confirmPendingAction()}
              disabled={busy}
            >
              {busy ? "Working..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function exampleFindActive(selected: SelectedNode) {
  const store = selected.kind === "indexeddb" ? selected.storeName : "store";
  return JSON.stringify({ store, filter: { active: true }, limit: 50 }, null, 2);
}

function exampleTopByCreated(selected: SelectedNode) {
  const store = selected.kind === "indexeddb" ? selected.storeName : "store";
  return JSON.stringify({ store, filter: {}, sort: { createdAt: -1 }, limit: 10 }, null, 2);
}

function exampleRegex(selected: SelectedNode) {
  const store = selected.kind === "indexeddb" ? selected.storeName : "store";
  return JSON.stringify({ store, filter: { email: { $regex: "@example\\.com$" } }, limit: 25 }, null, 2);
}

function QueryExampleButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

function RecordInspector({
  selected,
  selectedRecord,
  editDraft,
  setEditDraft,
  saveRecord,
  onCopy,
  busy
}: {
  selected: SelectedNode;
  selectedRecord: IndexedDbRecord | KeyValueRecord | null;
  editDraft: string;
  setEditDraft: (value: string) => void;
  saveRecord: () => void;
  onCopy: () => void;
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
          <div className="flex items-center justify-between border-b border-border bg-card px-2">
            <TabsList variant="line" className="h-9 justify-start rounded-none border-0 bg-transparent px-0">
              <TabsTrigger value="document">Document</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <SecondaryActionButton onClick={onCopy}>
              <Copy data-icon="inline-start" />
            </SecondaryActionButton>
          </div>
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

function parseAndValidateJson(source: string): SerializableValue {
  const parsed = JSON.parse(source) as SerializableValue;
  const validationError = findSerializableJsonError(parsed);
  if (validationError) throw new Error(validationError);
  return parsed;
}

function findSerializableJsonError(value: SerializableValue, path = "$"): string | null {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? null : `${path} must be a finite number`;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nestedError = findSerializableJsonError(value[index] as SerializableValue, `${path}[${index}]`);
      if (nestedError) return nestedError;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      const nestedError = findSerializableJsonError(nestedValue as SerializableValue, `${path}.${key}`);
      if (nestedError) return nestedError;
    }
    return null;
  }
  return `${path} contains a non-serializable value`;
}

function tabForNode(node: Exclude<SelectedNode, { kind: "overview" }>): WorkspaceTab {
  if (node.kind === "kv") return { id: node.surface, title: node.surface, node };
  return {
    id: `${node.origin}::${node.dbName}::v${node.dbVersion}:${node.storeName}`,
    title: node.storeName,
    node
  };
}

function OriginBadge({ origin }: { origin: string }) {
  return (
    <span
      className="inline-flex max-w-[18rem] min-w-0 items-center rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none tracking-tight text-muted-foreground"
      title={origin}
    >
      <span className="truncate">{shortOrigin(origin)}</span>
    </span>
  );
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
    const disconnectError = chrome.runtime.lastError?.message ?? "IdxBeaver disconnected from the background worker.";
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
            origin: "https://app.example.test",
            frameId: 0,
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
          },
          {
            name: "local_first_app",
            version: 2,
            origin: "https://child.example.test",
            frameId: 1,
            stores: [
              {
                name: "users",
                keyPath: "id",
                autoIncrement: false,
                count: 1,
                indexes: []
              }
            ]
          }
        ],
        frames: [
          { frameId: 0, origin: "https://app.example.test", url: "https://app.example.test/" },
          { frameId: 1, origin: "https://child.example.test", url: "https://child.example.test/iframe" }
        ],
        localStorage: { count: 4, bytes: 2048 },
        sessionStorage: { count: 2, bytes: 420 }
      }
    };
  }

  if (request.type === "readIndexedDbStore" || request.type === "runIndexedDbQuery") {
    const rows = [
      { key: 1, value: { type: "object", preview: "{ id, email, role, active }", value: { id: 1, email: "ada@example.com", role: "admin", active: true } } },
      { key: 2, value: { type: "object", preview: "{ id, email, role, active }", value: { id: 2, email: "grace@example.com", role: "editor", active: true } } },
      { key: 3, value: { type: "object", preview: "{ id, email, role, active }", value: { id: 3, email: "linus@example.com", role: "viewer", active: false } } }
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
  visibleDbKeys,
  duplicateDbNames,
  multiOrigin,
  openNode,
  openSql,
  onRequestDeleteDatabase,
  onRequestDeleteStore,
  onRequestClearStore,
  onHideDatabase
}: {
  discovery: StorageDiscovery | null;
  selected: SelectedNode;
  visibleDbKeys: string[];
  duplicateDbNames: Set<string>;
  multiOrigin: boolean;
  openNode: (node: SelectedNode, options?: { persist?: boolean }) => void;
  openSql: () => void;
  onRequestDeleteDatabase: (db: IndexedDbDatabaseInfo) => void;
  onRequestDeleteStore: (db: IndexedDbDatabaseInfo, storeName: string) => void;
  onRequestClearStore: (db: IndexedDbDatabaseInfo, storeName: string) => void;
  onHideDatabase: (key: string) => void;
}) {
  const [expandedDbKeys, setExpandedDbKeys] = useState<Set<string>>(new Set());

  // Never auto-expand on discovery; the user decides what to open.
  useEffect(() => {
    if (!discovery?.indexedDb.length) {
      setExpandedDbKeys(new Set());
      return;
    }
    if (selected.kind === "indexeddb") {
      const key = dbKeyFromSelected(selected);
      setExpandedDbKeys((current) => new Set([...current, key]));
      return;
    }
    setExpandedDbKeys((current) => {
      const allowed = new Set(discovery.indexedDb.map(dbKey));
      return new Set(Array.from(current).filter((key) => allowed.has(key)));
    });
  }, [discovery, selected]);

  if (!discovery) return <p className="py-4 text-sm text-muted-foreground">Open DevTools on a page and refresh storage.</p>;

  const visibleDbs = discovery.indexedDb.filter((db) => visibleDbKeys.includes(dbKey(db)));

  return (
    <nav className="flex flex-col gap-1">
      <Button variant={selected.kind === "overview" ? "secondary" : "ghost"} className="justify-start" onClick={() => openNode({ kind: "overview" })}>
        Origin dashboard
      </Button>
      <Button variant="outline" className="justify-between" onClick={openSql}>
        Query <span className="text-muted-foreground">⌘↵</span>
      </Button>

      <h3 className="mt-4 text-[11px] font-black uppercase tracking-normal text-muted-foreground">IndexedDB</h3>
      {discovery.indexedDb.length === 0 && <p className="text-sm text-muted-foreground">No IndexedDB databases.</p>}
      {visibleDbs.length === 0 && discovery.indexedDb.length > 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          Click <span className="font-semibold text-foreground">Open</span> above to browse a database.
        </p>
      )}
      {visibleDbs.map((db) => {
        const key = dbKey(db);
        const isExpanded = expandedDbKeys.has(key);
        const isSelectedDb = selected.kind === "indexeddb" && selected.dbName === db.name && selected.dbVersion === db.version && selected.origin === db.origin;
        const showOrigin = multiOrigin || duplicateDbNames.has(db.name);
        return (
          <div key={key} className="flex flex-col gap-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button
                  variant={isSelectedDb ? "secondary" : "ghost"}
                  className={cn(
                    "h-auto justify-between py-1.5",
                    isSelectedDb && "bg-accent text-accent-foreground ring-1 ring-ring/30"
                  )}
                  onClick={() => {
                    setExpandedDbKeys((current) => {
                      const next = new Set(current);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  }}
                  aria-expanded={isExpanded}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <ChevronRight
                      data-icon="inline-start"
                      className={isExpanded ? "rotate-90 transition-transform" : "transition-transform"}
                    />
                    <Database data-icon="inline-start" />
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <span className="truncate">{db.name}</span>
                      {showOrigin && <OriginBadge origin={db.origin} />}
                    </span>
                  </span>
                  <span className={cn("text-xs text-muted-foreground", isSelectedDb && "text-current/75")}>
                    v{db.version}
                  </span>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuItem onSelect={() => onHideDatabase(key)}>Hide from sidebar</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive" onSelect={() => onRequestDeleteDatabase(db)}>
                  Delete database
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            {isExpanded && (
              <div className="ml-4 flex flex-col gap-1 border-l border-border pl-2">
                {db.stores.map((store) => {
                  const isSelectedStore = isSelectedDb && selected.kind === "indexeddb" && selected.storeName === store.name;
                  return (
                    <ContextMenu key={`${key}:${store.name}`}>
                      <ContextMenuTrigger asChild>
                        <Button
                          variant={isSelectedStore ? "secondary" : "ghost"}
                          className={cn(
                            "justify-between",
                            isSelectedStore && "bg-primary text-primary-foreground ring-1 ring-primary/70 shadow-sm hover:bg-primary/90"
                          )}
                          onClick={() => openNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId })}
                          onDoubleClick={() => openNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId }, { persist: true })}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Table2 data-icon="inline-start" />
                            <span className="truncate">{store.name}</span>
                          </span>
                          <span className={cn("text-muted-foreground", isSelectedStore && "text-primary-foreground/80")}>
                            {store.count ?? "?"}
                          </span>
                        </Button>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-52">
                        <ContextMenuItem onSelect={() => openNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId }, { persist: true })}>
                          Open in tab
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => onRequestClearStore(db, store.name)}>
                          Clear store
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem variant="destructive" onSelect={() => onRequestDeleteStore(db, store.name)}>
                          Delete store
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <h3 className="mt-4 text-[11px] font-black uppercase tracking-normal text-muted-foreground">Storage</h3>
      <Button variant={selected.kind === "kv" && selected.surface === "localStorage" ? "secondary" : "ghost"} className="justify-between" onClick={() => openNode({ kind: "kv", surface: "localStorage" }, { persist: true })}>
        LocalStorage <span className="text-muted-foreground">{discovery.localStorage.count}</span>
      </Button>
      <Button variant={selected.kind === "kv" && selected.surface === "sessionStorage" ? "secondary" : "ghost"} className="justify-between" onClick={() => openNode({ kind: "kv", surface: "sessionStorage" }, { persist: true })}>
        SessionStorage <span className="text-muted-foreground">{discovery.sessionStorage.count}</span>
      </Button>
    </nav>
  );
}

function Overview({ discovery }: { discovery: StorageDiscovery | null }) {
  if (!discovery) return <p className="p-4 text-sm text-muted-foreground">No storage metadata loaded yet.</p>;
  const stores = discovery.indexedDb.flatMap((db) => db.stores.map((store) => ({ db: db.name, version: db.version, origin: db.origin, ...store })));
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
          <div className="flex justify-between border-t border-border py-3" key={`${store.origin}::${store.db}:v${store.version}:${store.name}`}>
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

function PrimaryActionButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button size="sm" className={`font-semibold ${className ?? ""}`} {...props} />;
}

function SecondaryActionButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button variant="outline" size="sm" className={`font-semibold ${className ?? ""}`} {...props} />;
}

function DestructiveActionButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button variant="destructive" size="sm" className={`font-semibold ${className ?? ""}`} {...props} />;
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
            size="sm"
            aria-label="Delete record"
            className="h-9 w-full justify-center rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.original);
            }}
          >
            <Trash2 className="size-4" />
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
                <td
                  key={cell.id}
                  className={
                    cell.column.id === "actions"
                      ? "w-16 border-b border-r border-border p-1"
                      : "max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-3 py-1.5"
                  }
                >
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
      { id: "value", header: "Value", accessorFn: (row) => row.parsed.preview },
      { id: "type", header: "Type", accessorFn: (row) => row.parsed.type },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete key"
            className="h-9 w-full justify-center rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row.original);
            }}
          >
            <Trash2 className="size-4" />
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
                <td
                  key={cell.id}
                  className={
                    cell.column.id === "actions"
                      ? "w-16 border-b border-r border-border p-1"
                      : "max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-3 py-1.5"
                  }
                >
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
  return selected.storeName;
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
