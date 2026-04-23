import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Database, Moon, PanelBottom, PanelBottomDashed, PanelLeft, PanelLeftDashed, PanelRight, PanelRightDashed, Plus, RefreshCw, Search, Settings, SlidersHorizontal, Sun, Table2, X } from "lucide-react";
import { JsonView, collapseAllNested } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
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
import { Kbd, KbdGroup } from "../components/ui/kbd";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../components/ui/context-menu";
import { parseMongoQuery } from "../shared/query";
import { applyFilters, activeRuleCount, type FilterState, EMPTY_FILTER_STATE } from "../shared/filters";
import { keyStrategy } from "../shared/indexed";
import { getPrefs, setPrefs, watchPrefs, DEFAULTS as PREF_DEFAULTS, type Prefs } from "../shared/prefs";
import { inferSchema } from "../shared/schemaInfer";
import type { InferredColumn } from "../shared/schemaInfer";
import { appendHistory, getHistory, saveQuery, getSavedQueries, clearHistory } from "../shared/persisted";
import type { HistoryEntry, SavedQuery } from "../shared/persisted";
import { matchesShortcut } from "./shortcuts";
import { FilterBar } from "./FilterBar";
import { StructureView } from "./StructureView";
import { SettingsPage } from "./SettingsPage";
import { DestructiveDialog, type DestructivePlan } from "./DestructiveDialog";
import { SnapshotsDialog, captureSnapshotForStore, type SnapshotTarget } from "./SnapshotsDialog";
import { ImportDialog } from "./ImportDialog";
import { toNdjson, toSqlInsert, downloadBlob } from "../shared/export";
import { QueryHistoryPanel } from "./QueryHistoryPanel";
import { SavedQueriesPanel } from "./SavedQueriesPanel";
import { CommandPalette } from "./CommandPalette";
import { DataGrid, type DraftRow } from "./DataGrid";
import { JsonHighlight, SqlHighlight } from "./highlight";
import { CacheView } from "./CacheView";
import { OriginDashboard } from "./OriginDashboard";
import { UndoStack, type UndoCommand } from "../shared/undo";
import { isIdempotent, PortLostError } from "../shared/rpcIds";
import type {
  CacheEntrySummary,
  CookieReadResult,
  CookieRecord,
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
  StoreSummary,
  TableReadResult
} from "../shared/types";
import { CookieGrid } from "./CookieGrid";
import "./styles.css";

const QueryEditor = lazy(async () => import("./QueryEditor").then((module) => ({ default: module.QueryEditor })));

type SelectedNode =
  | { kind: "overview" }
  | { kind: "indexeddb"; dbName: string; dbVersion: number; storeName: string; origin: string; frameId: number }
  | { kind: "kv"; surface: "localStorage" | "sessionStorage" }
  | { kind: "cache"; cacheName: string; frameId: number }
  | { kind: "cookies" };

type Notice = { tone: "success" | "error" | "info"; message: string } | null;
type PendingAction = DestructivePlan | null;

type WorkspaceTab =
  | { id: string; title: string; node: { kind: "indexeddb"; dbName: string; dbVersion: number; storeName: string; origin: string; frameId: number } }
  | { id: string; title: string; node: { kind: "kv"; surface: "localStorage" | "sessionStorage" } }
  | { id: string; title: string; node: { kind: "cache"; cacheName: string; frameId: number } }
  | { id: string; title: string; node: { kind: "cookies" } };

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [prefs, setPrefsState] = useState<Prefs>(PREF_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleDbKeys, setVisibleDbKeys] = useState<string[]>([]);
  const [activeDbKey, setActiveDbKey] = useState<string | null>(null);
  const [databasePickerOpen, setDatabasePickerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER_STATE);
  const [gridView, setGridView] = useState<"data" | "structure">("data");
  const [draftRow, setDraftRow] = useState<DraftRow | null>(null);
  const [queryLimit, setQueryLimit] = useState(300);
  const [queryOffset, setQueryOffset] = useState(0);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const undoStackRef = useRef(new UndoStack());
  const [saveQueryDialogOpen, setSaveQueryDialogOpen] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [saveQueryTags, setSaveQueryTags] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"items" | "queries" | "history">("items");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [cacheEntries, setCacheEntries] = useState<CacheEntrySummary[]>([]);
  const [cookieRows, setCookieRows] = useState<CookieRecord[]>([]);
  const [storeSummaries, setStoreSummaries] = useState<Map<string, StoreSummary | "loading">>(new Map());
  const leftPanelRef = useRef<PanelImperativeHandle | null>(null);
  const rightPanelRef = useRef<PanelImperativeHandle | null>(null);
  const bottomPanelRef = useRef<PanelImperativeHandle | null>(null);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotTarget, setSnapshotTarget] = useState<SnapshotTarget | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const refreshDiscovery = useCallback(async () => {
    setBusy(true);
    const response = await rpc({ type: "discover", tabId });
    setBusy(false);
    if (!response.ok) {
      setNotice({ tone: "error", message: response.error });
      return;
    }
    setDiscovery(response.data as StorageDiscovery);
    setStoreSummaries(new Map());
    setNotice({ tone: "success", message: "Storage refreshed." });
  }, [rpc]);

  useEffect(() => {
    void refreshDiscovery();
  }, [refreshDiscovery]);

  useEffect(() => {
    void getPrefs().then(setPrefsState);
    return watchPrefs(setPrefsState);
  }, []);

  // Resolve prefs.theme → actual dark/light value.
  // "system" defers to chrome.devtools.panels.themeName ("dark" → dark, anything else → light).
  useEffect(() => {
    if (prefs.theme !== "system") {
      setTheme(prefs.theme);
      return;
    }
    const devtools = typeof chrome !== "undefined" ? chrome.devtools?.panels as { themeName?: string } | undefined : undefined;
    const devTheme = devtools?.themeName === "dark" ? "dark" : "light";
    setTheme(devTheme);
  }, [prefs.theme]);

  // Re-discover after service-worker restart so stale state is reconciled.
  useEffect(() => {
    if (!extensionRuntime) return;
    const listener = (message: unknown) => {
      if (message && typeof message === "object" && (message as { type?: string }).type === "PANEL_RESYNC") {
        void refreshDiscovery();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshDiscovery]);

  useEffect(() => {
    // Use the top-level URL's origin when available — discovery.origin may reflect
    // a frame origin rather than the tab origin, which would miss saved queries.
    const origin = (() => {
      if (discovery?.url) { try { return new URL(discovery.url).origin; } catch {} }
      return discovery?.origin;
    })();
    if (!origin) return;
    void getHistory(origin).then(setHistoryEntries);
    void getSavedQueries(origin).then(setSavedQueries);
  }, [discovery?.origin, discovery?.url]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-sans", prefs.uiFont);
    document.documentElement.style.setProperty("--font-mono", prefs.cellFont);
    document.documentElement.style.setProperty("font-size", `${prefs.uiFontSize}px`);
  }, [prefs.uiFont, prefs.cellFont, prefs.uiFontSize]);

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
    const all = tabs.map((tab) => ({ value: tab.id, title: tab.title, closable: true, preview: false }));
    if (previewTab && !tabs.some((tab) => tab.id === previewTab.id)) {
      all.push({ value: "preview", title: previewTab.title, closable: false, preview: true });
    }
    return all;
  }, [previewTab, tabs]);

  const canToggleBottomPanel = activeTabId !== "sql" && selected.kind !== "overview" && selected.kind !== "cache" && selected.kind !== "cookies";
  useEffect(() => {
    if (canToggleBottomPanel) return;
    setBottomPanelCollapsed(true);
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

  const globalShortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    globalShortcutRef.current = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (matchesShortcut(e, "mod+k")) { e.preventDefault(); setCommandPaletteOpen(true); return; }
      if (matchesShortcut(e, "mod+,")) { e.preventDefault(); setSettingsOpen((o) => !o); return; }
      if (matchesShortcut(e, "mod+shift+t")) { e.preventDefault(); setDatabasePickerOpen(true); return; }
      if (matchesShortcut(e, "?")) { e.preventDefault(); setHelpOpen(true); return; }
      if (matchesShortcut(e, "mod+shift+s") && activeTabId === "sql") { e.preventDefault(); setSaveQueryDialogOpen(true); return; }
      if (matchesShortcut(e, "mod+shift+f") && selected.kind === "indexeddb") { e.preventDefault(); setFilterState((prev) => ({ ...prev, open: !prev.open })); return; }
      if (matchesShortcut(e, "mod+shift+n") && selected.kind === "indexeddb") { e.preventDefault(); startDraftRow(); return; }
      if (matchesShortcut(e, "mod+shift+e")) { e.preventDefault(); exportVisible("json"); return; }
      if (matchesShortcut(e, "mod+z") && !e.shiftKey) { e.preventDefault(); void handleUndo(); return; }
      if (matchesShortcut(e, "mod+shift+z")) { e.preventDefault(); void handleRedo(); return; }
    };
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => globalShortcutRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const loadIndexedStore = useCallback(
    async (frameId: number, dbName: string, dbVersion: number, storeName: string, limit?: number) => {
      setBusy(true);
      setQueryResult(null);
      setKvResult(null);
      setSelectedRecord(null);
      const response = await rpc({ type: "readIndexedDbStore", tabId, frameId, dbName, dbVersion, storeName, limit: limit ?? 500 });
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

  const loadCacheEntries = useCallback(
    async (frameId: number, cacheName: string) => {
      setBusy(true);
      setCacheEntries([]);
      const response = await rpc({ type: "readCacheEntries", tabId, frameId, cacheName, limit: 500, offset: 0 });
      setBusy(false);
      if (!response.ok) {
        setNotice({ tone: "error", message: response.error });
        return;
      }
      setCacheEntries(response.data as CacheEntrySummary[]);
      setNotice({ tone: "info", message: `Loaded ${cacheName}.` });
    },
    [rpc]
  );

  const loadCookies = useCallback(
    async (url: string) => {
      setBusy(true);
      setCookieRows([]);
      const response = await rpc({ type: "readCookies", tabId, url });
      setBusy(false);
      if (!response.ok) {
        setNotice({ tone: "error", message: response.error });
        return;
      }
      setCookieRows((response.data as CookieReadResult).rows);
      setNotice({ tone: "info", message: "Loaded cookies." });
    },
    [rpc]
  );

  const invalidateStoreSummary = useCallback((origin: string, dbName: string, dbVersion: number, storeName: string) => {
    const key = `${origin}::${dbName}::v${dbVersion}::${storeName}`;
    setStoreSummaries((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const fetchDbSummaries = useCallback(async (db: IndexedDbDatabaseInfo) => {
    const keys = db.stores.map((s) => `${db.origin}::${db.name}::v${db.version}::${s.name}`);
    setStoreSummaries((prev) => {
      const next = new Map(prev);
      for (const key of keys) {
        if (!next.has(key)) next.set(key, "loading");
      }
      return next;
    });
    await Promise.all(db.stores.map(async (store) => {
      const key = `${db.origin}::${db.name}::v${db.version}::${store.name}`;
      const response = await rpc({ type: "readStoreSummary", tabId, frameId: db.frameId, dbName: db.name, dbVersion: db.version, storeName: store.name });
      if (response.ok) {
        setStoreSummaries((prev) => new Map(prev).set(key, response.data as StoreSummary));
      }
    }));
  }, [rpc]);

  const openNode = (node: SelectedNode, options?: { persist?: boolean }) => {
    const persist = options?.persist ?? false;
    setSelected(node);
    setHiddenColumns(new Set());
    setFilterState(EMPTY_FILTER_STATE);
    setGridView("data");
    setDraftRow(null);
    setQueryOffset(0);

    if (node.kind === "indexeddb") {
      setActiveDbKey(dbKeyFromSelected(node));
      void loadIndexedStore(node.frameId, node.dbName, node.dbVersion, node.storeName);
    }
    if (node.kind === "kv") void loadKv(node.surface);
    if (node.kind === "cache") void loadCacheEntries(node.frameId, node.cacheName);
    if (node.kind === "cookies") void loadCookies(discovery?.url ?? discovery?.origin ?? "");

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
    if (node.kind === "kv" || node.kind === "cache" || node.kind === "cookies") {
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

  const queryDbContext = useMemo(() => {
    if (selected.kind === "indexeddb") {
      return { frameId: selected.frameId, dbName: selected.dbName, dbVersion: selected.dbVersion };
    }
    const candidate =
      (activeDbKey && discovery?.indexedDb.find((db) => dbKey(db) === activeDbKey && visibleDbKeys.includes(activeDbKey))) ||
      (visibleDbs.length === 1 ? visibleDbs[0] : null);
    if (!candidate) return null;
    return { frameId: candidate.frameId, dbName: candidate.name, dbVersion: candidate.version };
  }, [selected, activeDbKey, discovery, visibleDbKeys, visibleDbs]);

  const runQuery = async () => {
    if (!queryDbContext) {
      setNotice({ tone: "error", message: "Open an IndexedDB database before running a query." });
      return;
    }

    const t0 = performance.now();
    const origin = discovery?.origin ?? "";
    let parsedQuery: ReturnType<typeof parseMongoQuery>;
    try {
      parsedQuery = parseMongoQuery(queryText);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
      return;
    }

    try {
      setBusy(true);
      const response = await rpc({
        type: "runIndexedDbQuery",
        tabId,
        frameId: queryDbContext.frameId,
        dbName: queryDbContext.dbName,
        dbVersion: queryDbContext.dbVersion,
        query: parsedQuery
      });
      const durationMs = Math.round(performance.now() - t0);
      setBusy(false);
      const ok = response.ok;
      const rowCount = ok ? (response.data as QueryResult).rows.length : null;
      void appendHistory({
        origin,
        dbName: queryDbContext.dbName,
        storeName: (parsedQuery as { store?: string }).store ?? null,
        queryText,
        ok,
        rowCount,
        durationMs
      }).then(() => void getHistory(origin).then(setHistoryEntries));
      if (!ok) {
        setNotice({ tone: "error", message: response.error });
        return;
      }
      setQueryResult(response.data as QueryResult);
      setTableResult(null);
      setSelectedRecord(null);
      setNotice({ tone: "success", message: `Query completed · ${rowCount} rows · ${durationMs}ms` });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleSaveQuery = async (name: string, tags: string[]) => {
    const origin = discovery?.origin ?? "";
    await saveQuery({ origin, name, queryText, tags });
    const updated = await getSavedQueries(origin);
    setSavedQueries(updated);
    setSaveQueryDialogOpen(false);
    setSaveQueryName("");
    setSaveQueryTags("");
    setNotice({ tone: "success", message: `Saved query "${name}".` });
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

  const saveIndexedCell = async (record: IndexedDbRecord, column: string, rawValue: string) => {
    if (selected.kind !== "indexeddb") return;
    let parsed: SerializableValue;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      parsed = rawValue;
    }
    const baseValue = record.value.value;
    const isPlainObject = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue);
    const nextValue: SerializableValue =
      column === "value" || !isPlainObject
        ? parsed
        : { ...(baseValue as Record<string, SerializableValue>), [column]: parsed };
    try {
      setBusy(true);
      const response = await rpc({
        type: "putIndexedDbRecord",
        tabId,
        frameId: selected.frameId,
        dbName: selected.dbName,
        dbVersion: selected.dbVersion,
        storeName: selected.storeName,
        key: record.key,
        value: nextValue
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      await loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName);
      setNotice({ tone: "success", message: `Saved ${column}.` });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const startDraftRow = (prefill?: Record<string, string>) => {
    if (!selectedStore) return;
    const activeColumn = tableColumns[0] ?? "value";
    const values: Record<string, string> = prefill ?? {};
    setDraftRow({ values, outOfLineKey: "", activeColumn });
  };

  const pushUndo = (cmd: UndoCommand) => {
    if (selected.kind !== "indexeddb") return;
    undoStackRef.current.push({
      ...cmd,
      storeName: selected.storeName,
      dbName: selected.dbName,
      dbVersion: selected.dbVersion,
      frameId: selected.frameId,
    });
  };

  const handleUndo = async () => {
    const cmd = undoStackRef.current.undo();
    if (!cmd) return;
    try {
      setBusy(true);
      const response = await rpc({
        type: "putIndexedDbRecord",
        tabId,
        frameId: cmd.frameId,
        dbName: cmd.dbName,
        dbVersion: cmd.dbVersion,
        storeName: cmd.storeName,
        key: cmd.key,
        value: cmd.before,
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      if (selected.kind === "indexeddb") {
        await loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName);
      }
      setNotice({ tone: "success", message: `Undid: ${cmd.label}` });
    } catch (error) {
      setBusy(false);
      undoStackRef.current.push(cmd);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleRedo = async () => {
    const cmd = undoStackRef.current.redo();
    if (!cmd) return;
    try {
      setBusy(true);
      const response = await rpc({
        type: "putIndexedDbRecord",
        tabId,
        frameId: cmd.frameId,
        dbName: cmd.dbName,
        dbVersion: cmd.dbVersion,
        storeName: cmd.storeName,
        key: cmd.key,
        value: cmd.after,
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      if (selected.kind === "indexeddb") {
        await loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName);
      }
      setNotice({ tone: "success", message: `Redid: ${cmd.label}` });
    } catch (error) {
      setBusy(false);
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleBulkDelete = (records: IndexedDbRecord[]) => {
    if (selected.kind !== "indexeddb") return;
    const sel = selected;
    setPendingAction({
      title: `Delete ${records.length} record${records.length === 1 ? "" : "s"}?`,
      verb: "delete",
      noun: `${records.length} record${records.length === 1 ? "" : "s"} from ${sel.storeName}`,
      confirmText: "",
      preview: [{ label: "Records", value: records.length }],
      execute: async () => {
        setBusy(true);
        for (const record of records) {
          const response = await rpc({
            type: "deleteIndexedDbRecord",
            tabId,
            frameId: sel.frameId,
            dbName: sel.dbName,
            dbVersion: sel.dbVersion,
            storeName: sel.storeName,
            key: record.key,
          });
          if (!response.ok) {
            setNotice({ tone: "error", message: response.error });
            setBusy(false);
            return;
          }
        }
        setBusy(false);
        await loadIndexedStore(sel.frameId, sel.dbName, sel.dbVersion, sel.storeName);
        await refreshDiscovery();
        setNotice({ tone: "success", message: `Deleted ${records.length} records.` });
      },
    });
  };

  const handleDuplicateRow = (record: IndexedDbRecord) => {
    if (!selectedStore) return;
    const strat = keyStrategy(selectedStore);
    // Auto-increment inline keys must be omitted so the store issues a new key.
    const autoKeyPaths = strat.kind === "autoIncrementInline" ? new Set(strat.path) : new Set<string>();
    const value = record.value.value;
    const prefill: Record<string, string> = {};
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (autoKeyPaths.has(k)) continue;
        if (typeof v === "string") prefill[k] = v;
        else if (v !== null && v !== undefined) prefill[k] = JSON.stringify(v);
      }
    }
    startDraftRow(prefill);
  };

  const commitDraftRow = async () => {
    if (selected.kind !== "indexeddb" || !draftRow || !selectedStore) return;
    const strat = keyStrategy(selectedStore);

    if (strat.kind === "inlineKeyPath") {
      const keyCol = strat.path[0];
      const keyVal = draftRow.values[keyCol] ?? "";
      if (!keyVal.trim()) {
        setNotice({ tone: "error", message: `Key path "${keyCol}" is required.` });
        return;
      }
    }

    const valueObj: Record<string, SerializableValue> = {};
    for (const [col, raw] of Object.entries(draftRow.values)) {
      try { valueObj[col] = JSON.parse(raw) as SerializableValue; }
      catch { valueObj[col] = raw; }
    }

    let key: SerializableValue | undefined;
    if (strat.kind === "outOfLine" && draftRow.outOfLineKey.trim()) {
      try { key = JSON.parse(draftRow.outOfLineKey) as SerializableValue; }
      catch { key = draftRow.outOfLineKey; }
    }

    try {
      setBusy(true);
      const response = await rpc({
        type: "addIndexedDbRecord",
        tabId,
        frameId: selected.frameId,
        dbName: selected.dbName,
        dbVersion: selected.dbVersion,
        storeName: selected.storeName,
        key,
        value: Object.keys(valueObj).length > 0 ? valueObj : {}
      });
      setBusy(false);
      if (!response.ok) throw new Error(response.error);
      setDraftRow(null);
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
      title: "Delete record?",
      verb: "delete",
      noun: `record from ${sel.storeName}`,
      confirmText: "",
      preview: [{ label: "Key", value: JSON.stringify(record.key) }],
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
      title: "Delete key?",
      verb: "delete",
      noun: `key "${record.key}" from ${selected.surface}`,
      confirmText: "",
      preview: [{ label: "Key", value: record.key }],
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
      title: `Clear ${selected.surface}?`,
      verb: "clear",
      noun: selected.surface,
      confirmText: selected.surface,
      preview: kvResult ? [{ label: "Keys", value: kvResult.rows.length }] : [],
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
      title: `Delete database "${db.name}"?`,
      verb: "delete",
      noun: `${db.name} v${db.version} in ${shortOrigin(db.origin)}`,
      confirmText: db.name,
      preview: [
        { label: "Object stores", value: db.stores.length },
        { label: "Version", value: db.version },
      ],
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
    const storeTarget: Extract<SnapshotTarget, { scope: "store" }> = {
      scope: "store", origin: db.origin, dbName: db.name, dbVersion: db.version, storeName, frameId: db.frameId
    };
    setPendingAction({
      title: `Delete store "${storeName}"?`,
      verb: "delete",
      noun: `${storeName} from ${db.name}`,
      confirmText: storeName,
      preview: (() => {
        const sKey = `${db.origin}::${db.name}::v${db.version}::${storeName}`;
        const summary = storeSummaries.get(sKey);
        const rows: { label: string; value: string | number }[] = [];
        if (summary && summary !== "loading") {
          if (summary.rowCount !== null) rows.push({ label: "Rows", value: summary.rowCount });
          if (summary.approxBytes !== null) rows.push({ label: "Size", value: formatBytes(summary.approxBytes) });
        }
        return rows;
      })(),
      snapshotOffer: {
        defaultEnabled: true,
        snapshotScope: "store",
        onSnapshot: async () => {
          await captureSnapshotForStore(rpc as Parameters<typeof captureSnapshotForStore>[0], tabId, storeTarget, `before delete ${storeName}`);
        },
      },
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
    const storeTarget: Extract<SnapshotTarget, { scope: "store" }> = {
      scope: "store", origin: db.origin, dbName: db.name, dbVersion: db.version, storeName, frameId: db.frameId
    };
    setPendingAction({
      title: `Clear store "${storeName}"?`,
      verb: "clear",
      noun: storeName,
      confirmText: storeName,
      preview: (() => {
        const sKey = `${db.origin}::${db.name}::v${db.version}::${storeName}`;
        const summary = storeSummaries.get(sKey);
        const rows: { label: string; value: string | number }[] = [];
        if (summary && summary !== "loading") {
          if (summary.rowCount !== null) rows.push({ label: "Rows", value: summary.rowCount });
          if (summary.approxBytes !== null) rows.push({ label: "Size", value: formatBytes(summary.approxBytes) });
        } else if (tableResult && selected.kind === "indexeddb" && selected.storeName === storeName) {
          rows.push({ label: "Rows (loaded)", value: tableResult.rows.length });
        }
        return rows;
      })(),
      snapshotOffer: {
        defaultEnabled: true,
        snapshotScope: "store",
        onSnapshot: async () => {
          await captureSnapshotForStore(rpc as Parameters<typeof captureSnapshotForStore>[0], tabId, storeTarget, `before clear ${storeName}`);
        },
      },
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

  const allTableRows = tableResult?.rows ?? [];
  const filteredTableRows = useMemo(
    () => applyFilters(allTableRows, filterState),
    [allTableRows, filterState]
  );
  const pagedTableRows = useMemo(
    () => filteredTableRows.slice(queryOffset, queryOffset + queryLimit),
    [filteredTableRows, queryOffset, queryLimit]
  );
  const tableColumns = tableResult?.columns ?? [];
  const inferredSchema = useMemo<InferredColumn[]>(() => inferSchema(allTableRows), [allTableRows]);
  const visibleTableColumns = useMemo(
    () => tableColumns.filter((column) => !hiddenColumns.has(column)),
    [tableColumns, hiddenColumns]
  );

  const visibleExportRows = useMemo(() => {
    if (queryResult) return queryResult.rows.map((row) => row.projected);
    if (tableResult) return filteredTableRows.map((row) => row.value.value);
    if (kvResult) return kvResult.rows.map((row) => ({ key: row.key, value: row.value }));
    return [];
  }, [kvResult, queryResult, filteredTableRows, tableResult]);

  const exportVisible = (format: "json" | "csv" | "ndjson" | "sql") => {
    const storeName = selected.kind === "indexeddb" ? selected.storeName : "export";
    let content: string;
    let mimeType: string;
    let ext: string;
    switch (format) {
      case "ndjson":
        content = toNdjson(visibleExportRows);
        mimeType = "application/x-ndjson";
        ext = "ndjson";
        break;
      case "sql":
        content = toSqlInsert(storeName, visibleExportRows);
        mimeType = "text/plain";
        ext = "sql";
        break;
      case "csv":
        content = toCsv(visibleExportRows);
        mimeType = "text/csv";
        ext = "csv";
        break;
      default:
        content = JSON.stringify(visibleExportRows, null, 2);
        mimeType = "application/json";
        ext = "json";
    }
    const fileName = `storage-studio-${Date.now()}.${ext}`;
    downloadBlob(new Blob([content], { type: mimeType }), fileName);
    setNotice({ tone: "success", message: `Exported ${fileName}.` });
  };

  const exportEntireStore = async (format: "json" | "csv" | "ndjson" | "sql") => {
    if (selected.kind !== "indexeddb") return;
    const sel = selected;
    setBusy(true);
    const allRows: IndexedDbRecord[] = [];
    let offset = 0;
    const CHUNK = 5000;
    while (true) {
      const res = await rpc({ type: "readIndexedDbStoreChunk", tabId, frameId: sel.frameId, dbName: sel.dbName, dbVersion: sel.dbVersion, storeName: sel.storeName, offset, limit: CHUNK });
      if (!res.ok) { setNotice({ tone: "error", message: res.error }); setBusy(false); return; }
      const data = res.data as { rows: IndexedDbRecord[] };
      allRows.push(...data.rows);
      if (data.rows.length < CHUNK) break;
      offset += CHUNK;
    }
    setBusy(false);
    const rows = allRows.map((r) => r.value.value);
    let content: string;
    let mimeType: string;
    let ext: string;
    switch (format) {
      case "ndjson": content = toNdjson(rows); mimeType = "application/x-ndjson"; ext = "ndjson"; break;
      case "sql": content = toSqlInsert(sel.storeName, rows); mimeType = "text/plain"; ext = "sql"; break;
      case "csv": content = toCsv(rows); mimeType = "text/csv"; ext = "csv"; break;
      default: content = JSON.stringify(rows, null, 2); mimeType = "application/json"; ext = "json";
    }
    const fileName = `${sel.storeName}-${Date.now()}.${ext}`;
    downloadBlob(new Blob([content], { type: mimeType }), fileName);
    setNotice({ tone: "success", message: `Exported ${fileName} (${allRows.length} rows).` });
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

  const confirmPendingAction = async (plan: DestructivePlan, snapshotFirst: boolean) => {
    setPendingAction(null);
    if (snapshotFirst && plan.snapshotOffer) {
      await plan.snapshotOffer.onSnapshot();
    }
    await plan.execute();
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

  const breadcrumb = useMemo(() => {
    const hostname = (() => {
      try { return new URL(discovery?.url ?? discovery?.origin ?? "").hostname; } catch { return discovery?.origin ?? ""; }
    })();
    if (!hostname) return "No inspected tab";
    const sep = <span className="mx-1.5 opacity-30"> : </span>;
    const parts: React.ReactNode[] = [<span key="host" className="opacity-60">{hostname}</span>];
    if (selected.kind === "indexeddb") {
      parts.push(sep, <span key="db">{selected.dbName}</span>, sep, <span key="store" className="font-medium">{selected.storeName}</span>);
    } else if (selected.kind === "kv") {
      parts.push(sep, <span key="kv" className="font-medium">{selected.surface}</span>);
    } else if (selected.kind === "cookies") {
      parts.push(sep, <span key="cookies" className="font-medium">Cookies</span>);
    } else if (selected.kind === "cache") {
      parts.push(sep, <span key="cache-label" className="opacity-60">Cache</span>, sep, <span key="cache" className="font-medium">{selected.cacheName}</span>);
    }
    return parts;
  }, [discovery, selected]);

  return (
    <main className={`${theme} flex h-screen min-w-[1100px] flex-col bg-background text-foreground`}>
      <header
        className="relative flex shrink-0 items-center gap-2 px-3"
        style={{
          height: "38px",
          backgroundColor: "var(--titlebar-bg)",
          borderBottom: "1px solid var(--hairline)"
        }}
      >
        {/* Left: connection pill */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDatabasePickerOpen(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            title="Open database picker"
          >
            <Database className="size-3.5" style={{ color: "var(--icon-db)" }} />
            <span className="max-w-[160px] truncate font-medium">
              {discovery?.origin ? (() => { try { return new URL(discovery.origin).hostname; } catch { return "origin"; } })() : "origin"}
            </span>
          </button>
          <Button
            size="xs"
            variant={activeTabId === "sql" ? "secondary" : "ghost"}
            onClick={() => setActiveTabId("sql")}
            className="h-6 px-2 text-[11px]"
            title="Open query editor"
          >
            Query
          </Button>
        </div>

        {/* Center: breadcrumb path bar */}
        <div className="flex min-w-0 flex-1 justify-center px-2">
          <button
            className="flex w-full max-w-xl cursor-pointer items-center justify-center rounded-md px-3 py-1 text-center font-mono text-[11px] text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ border: "1px solid var(--hairline)", backgroundColor: "var(--background)" }}
            onClick={() => setDatabasePickerOpen(true)}
            aria-label="Open database picker"
            title="Click to open database picker"
          >
            <span className="flex min-w-0 items-baseline truncate">{breadcrumb}</span>
          </button>
        </div>

        {/* Right: actions + panel toggles */}
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={refreshDiscovery}
            disabled={busy}
            aria-label={busy ? "Refreshing…" : "Refresh"}
            title="Refresh"
          >
            <RefreshCw className={busy ? "animate-spin" : undefined} />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => { const next = theme === "dark" ? "light" : "dark"; void setPrefs({ theme: next }).then(setPrefsState); }}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button
            size="icon-xs"
            variant={settingsOpen ? "secondary" : "ghost"}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label={settingsOpen ? "Close settings" : "Settings"}
            title="Settings"
          >
            <Settings />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <PanelToggleButton
            active={!leftPanelCollapsed}
            onClick={() => togglePanel("left")}
            label={leftPanelCollapsed ? "Show left panel" : "Hide left panel"}
          >
            {leftPanelCollapsed ? <PanelLeftDashed /> : <PanelLeft />}
          </PanelToggleButton>
          <PanelToggleButton
            active={!bottomPanelCollapsed && canToggleBottomPanel}
            onClick={() => togglePanel("bottom")}
            label={
              canToggleBottomPanel
                ? bottomPanelCollapsed ? "Show bottom panel" : "Hide bottom panel"
                : "Bottom panel unavailable in this view"
            }
            disabled={!canToggleBottomPanel}
          >
            {bottomPanelCollapsed || !canToggleBottomPanel ? <PanelBottomDashed /> : <PanelBottom />}
          </PanelToggleButton>
          <PanelToggleButton
            active={!rightPanelCollapsed}
            onClick={() => togglePanel("right")}
            label={rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
          >
            {rightPanelCollapsed ? <PanelRightDashed /> : <PanelRight />}
          </PanelToggleButton>
        </div>
      </header>

      {settingsOpen ? (
        <SettingsPage
          prefs={prefs}
          onClose={() => setSettingsOpen(false)}
          onPrefsChange={setPrefsState}
        />
      ) : (
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
          <aside className="flex h-full" style={{ backgroundColor: "var(--sidebar-inner)" }}>
            {/* Inner panel — Items / Queries / History */}
            <div className="flex min-w-0 flex-1 flex-col" style={{ backgroundColor: "var(--sidebar-inner)" }}>
              {/* Tab bar */}
              <div
                className="flex shrink-0 items-center justify-center gap-1 px-2 py-1.5"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                {(["items", "queries", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSidebarTab(tab)}
                    className={cn(
                      "rounded-sm border px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                      sidebarTab === tab
                        ? "border-border bg-background text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search — Items tab only */}
              {sidebarTab === "items" && (
                <div
                  className="flex shrink-0 items-center gap-1.5 px-2 py-1.5"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                >
                  <Search className="size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="Search for item…"
                    className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setDatabasePickerOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Advanced search"
                    title="Open database picker"
                  >
                    <SlidersHorizontal className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-auto">
                {sidebarTab === "items" && (
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
                    onSnapshotStore={(db, storeName) => {
                      setSnapshotTarget({ scope: "store", origin: db.origin, dbName: db.name, dbVersion: db.version, storeName, frameId: db.frameId });
                      setSnapshotsOpen(true);
                    }}
                    onHideDatabase={hideDatabaseFromView}
                    onActivateDb={setActiveDbKey}
                    activeDbKey={activeDbKey}
                    onOpenPicker={() => setDatabasePickerOpen(true)}
                    storeSummaries={storeSummaries}
                    onExpandDb={fetchDbSummaries}
                    showStoreSizes={prefs.showStoreSizes}
                    searchQuery={sidebarSearch}
                  />
                )}
                {sidebarTab === "queries" && (
                  <SavedQueriesPanel
                    queries={savedQueries}
                    onLoad={(text) => { setQueryText(text); setActiveTabId("sql"); }}
                    onMutated={() => void getSavedQueries(discovery?.origin ?? "").then(setSavedQueries)}
                  />
                )}
                {sidebarTab === "history" && (
                  <QueryHistoryPanel
                    entries={historyEntries}
                    origin={discovery?.origin ?? ""}
                    onLoad={(text) => { setQueryText(text); setActiveTabId("sql"); }}
                    onClear={() => void getHistory(discovery?.origin ?? "").then(setHistoryEntries)}
                  />
                )}
              </div>
            </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="57%" minSize="520px">
          <section className="flex h-full min-w-0 flex-col bg-background">
            {renderedTabs.length > 0 && (
              <div className="flex shrink-0 items-stretch border-b border-border bg-card">
                {renderedTabs.map((tab) => {
                  const isActive = tab.value === activeTabId;
                  const select = () => {
                    if (tab.value === "overview") { openNode({ kind: "overview" }); return; }
                    if (tab.value === "preview" && previewTab) { openNode(previewTab.node); return; }
                    const found = tabs.find((t) => t.id === tab.value);
                    if (found) chooseTab(found);
                  };
                  return (
                    <button
                      key={tab.value}
                      onClick={select}
                      className={[
                        "group flex min-w-0 max-w-[160px] items-center gap-1.5 border-r border-border/50 px-3 py-1.5 text-[11px] transition-colors",
                        tab.preview ? "italic" : "",
                        isActive
                          ? "bg-background text-foreground"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span className="truncate">{tab.title}</span>
                      {tab.closable && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="ml-0.5 shrink-0 text-[13px] leading-none opacity-40 transition-opacity hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); closeTab(tab.value); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); closeTab(tab.value); } }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {notice && (
              <div
                className={`flex shrink-0 items-center gap-2 border-b px-3 py-1 text-[11px] ${
                  notice.tone === "error"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : notice.tone === "success"
                      ? "border-primary/40 bg-primary/20 text-foreground"
                      : "border-border bg-muted/30 text-foreground/70"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  notice.tone === "error" ? "bg-destructive" : notice.tone === "success" ? "bg-primary" : "bg-muted-foreground"
                }`} />
                <span className="font-medium">{notice.tone === "error" ? "Error" : notice.tone === "success" ? "Done" : "Info"}</span>
                <span className="text-muted-foreground">·</span>
                <span className="truncate">{notice.message}</span>
                <button
                  type="button"
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            {activeTabId === "overview" && (
              <OriginDashboard
                discovery={discovery}
                storeSummaries={storeSummaries}
                rpc={rpc as (req: StorageRequest) => Promise<{ ok: boolean; data?: unknown; error?: string }>}
                tabId={tabId}
                onNukeComplete={refreshDiscovery}
              />
            )}

            {activeTabId !== "sql" && selected.kind === "indexeddb" && (
              <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                <ResizablePanel defaultSize="78%" minSize="260px">
                  <div className="flex h-full min-h-0 flex-col">
                    <section className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/40 px-3 py-1 text-[11px]">
                      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        {gridView === "structure" ? (
                          <>
                            <span className="font-mono tabular-nums text-foreground/80">{tableColumns.length}</span>
                            <span>columns</span>
                            <span className="text-border">·</span>
                            <span className="font-mono tabular-nums text-foreground/80">{selectedStore?.indexes.length ?? 0}</span>
                            <span>indexes</span>
                          </>
                        ) : (
                          <>
                            <span className="font-mono tabular-nums text-foreground/80">{filteredTableRows.length}</span>
                            <span>rows</span>
                            {activeRuleCount(filterState) > 0 && (
                              <>
                                <span className="text-border">·</span>
                                <span>filtered from {allTableRows.length}</span>
                              </>
                            )}
                          </>
                        )}
                        {selectedStore && gridView === "data" && (
                          <>
                            <span className="text-border">·</span>
                            <span>key</span>
                            <span className="font-mono text-foreground/80">{JSON.stringify(selectedStore.keyPath)}</span>
                            <span className="text-border">·</span>
                            <span>auto-incr {String(selectedStore.autoIncrement)}</span>
                          </>
                        )}
                      </div>
                    </section>
                    {filterState.open && (
                      <FilterBar
                        state={filterState}
                        columns={tableColumns}
                        onChange={(next) => {
                          setFilterState(next);
                          setQueryOffset(0);
                        }}
                        onClose={() => setFilterState((prev) => ({ ...prev, open: false }))}
                      />
                    )}
                    {gridView === "structure" ? (
                      <StructureView
                        store={selectedStore}
                        rows={tableResult?.rows ?? []}
                        columns={tableColumns}
                        onNotice={setNotice}
                        onAddColumnFilter={(col) => {
                          setGridView("data");
                          setFilterState((prev) => ({
                            ...prev,
                            open: true,
                            rules: [
                              ...prev.rules,
                              { id: crypto.randomUUID(), column: col, operator: "contains", value: "", active: true }
                            ]
                          }));
                        }}
                      />
                    ) : (
                      <DataGrid
                        columns={visibleTableColumns}
                        indexedRows={pagedTableRows}
                        draftRow={draftRow}
                        onDraftChange={setDraftRow}
                        onCommitDraft={() => void commitDraftRow()}
                        onCancelDraft={() => setDraftRow(null)}
                        selectedRecord={selected.kind === "indexeddb" && selectedRecord && !("parsed" in selectedRecord) ? selectedRecord : null}
                        onSelect={selectRecord}
                        onDelete={deleteIndexedRecord}
                        onSaveCell={saveIndexedCell}
                        inferredSchema={inferredSchema}
                        onBulkDelete={handleBulkDelete}
                        onDuplicate={handleDuplicateRow}
                        onPushUndo={pushUndo}
                        storageKey={selected.kind === "indexeddb" ? `${selected.origin}::${selected.dbName}::${selected.storeName}` : undefined}
                      />
                    )}
                    <DataFooter
                      totalRows={filteredTableRows.length}
                      offset={queryOffset}
                      limit={queryLimit}
                      selectedCount={selected.kind === "indexeddb" && selectedRecord && !("parsed" in selectedRecord) ? 1 : 0}
                      onAddRow={startDraftRow}
                      allColumns={tableColumns}
                      hiddenColumns={hiddenColumns}
                      onApplyColumns={setHiddenColumns}
                      filterRuleCount={activeRuleCount(filterState)}
                      filtersOpen={filterState.open}
                      onToggleFilters={() => setFilterState((prev) => ({ ...prev, open: !prev.open }))}
                      view={gridView}
                      onChangeView={setGridView}
                      onExport={(fmt, scope) => scope === "store" ? void exportEntireStore(fmt) : exportVisible(fmt)}
                      onImport={selected.kind === "indexeddb" ? () => setImportOpen(true) : undefined}
                      onApplyPagination={(nextLimit, nextOffset) => {
                        setQueryLimit(nextLimit);
                        setQueryOffset(nextOffset);
                        if (selected.kind === "indexeddb" && nextLimit > (tableResult?.rows.length ?? 0)) {
                          void loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName, Math.max(nextLimit + nextOffset, 500));
                        }
                      }}
                      onPrev={() => setQueryOffset((prev) => Math.max(0, prev - queryLimit))}
                      onNext={() => setQueryOffset((prev) => (prev + queryLimit < filteredTableRows.length ? prev + queryLimit : prev))}
                      canPrev={queryOffset > 0}
                      canNext={queryOffset + queryLimit < filteredTableRows.length}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel
                  panelRef={bottomPanelRef}
                  collapsible
                  collapsedSize="0%"
                  defaultSize="0%"
                  minSize="130px"
                  onResize={(size) => setBottomPanelCollapsed(isCollapsedPanelSize(size))}
                >
                  <section className="flex h-full min-h-0 flex-col" style={{ backgroundColor: "var(--background)" }}>
                    {historyEntries.length === 0 ? (
                      <div className="grid h-full place-items-center p-3 text-center">
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <p className="section-label">History</p>
                          <p>Recent queries and mutations will appear here.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
                          <p className="section-label">History</p>
                          <button
                            type="button"
                            onClick={() => { void clearHistory(discovery?.origin ?? "").then(() => getHistory(discovery?.origin ?? "").then(setHistoryEntries)); }}
                            className="flex size-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Clear history"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto font-mono text-[11px] leading-5">
                          {historyEntries.map((entry, idx) => (
                            <div key={idx} className="px-3 py-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
                              <div className="mb-0.5 text-[10px] text-muted-foreground">
                                -- {new Date(entry.createdAt).toLocaleString()}
                              </div>
                              <button
                                type="button"
                                onClick={() => { setQueryText(entry.queryText); setActiveTabId("sql"); }}
                                className="block w-full text-left font-mono hover:opacity-80"
                              >
                                <pre className="m-0 whitespace-pre-wrap break-all">
                                  {(() => {
                                    const t = entry.queryText.trim();
                                    return t.startsWith("{") || t.startsWith("[")
                                      ? <JsonHighlight text={entry.queryText} />
                                      : <SqlHighlight text={entry.queryText} />;
                                  })()}
                                </pre>
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {activeTabId !== "sql" && selected.kind === "kv" && (
              <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                <ResizablePanel defaultSize="72%" minSize="260px">
                  <KvGrid
                    rows={kvResult?.rows ?? []}
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
                  defaultSize="0%"
                  minSize="130px"
                  onResize={(size) => setBottomPanelCollapsed(isCollapsedPanelSize(size))}
                >
                  <section className="flex h-full flex-col gap-2 overflow-auto bg-card p-3">
                    <h3 className="section-label">Add key</h3>
                    <Input className="h-7 rounded-sm font-mono text-[10px]" value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="key" />
                    <Textarea className="min-h-20 rounded-sm font-mono text-[10px] leading-5" value={newValue} onChange={(event) => setNewValue(event.target.value)} spellCheck={false} placeholder="value" />
                    <div className="flex gap-1.5">
                      <Button size="xs" onClick={addKv}>Save key</Button>
                      <Button size="xs" variant="destructive" onClick={clearKv}>Clear {selected.surface}</Button>
                    </div>
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {activeTabId !== "sql" && selected.kind === "cache" && (
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <CacheView
                  rpc={rpc}
                  cacheName={selected.cacheName}
                  tabId={tabId}
                  frameId={selected.frameId}
                  onNotice={(tone, message) => setNotice({ tone, message })}
                />
              </div>
            )}

            {activeTabId !== "sql" && selected.kind === "cookies" && (
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <CookieGrid
                  rows={cookieRows}
                  onSaveValue={async (record, newValue) => {
                    const url = discovery?.url ?? discovery?.origin ?? "";
                    const resp = await rpc({
                      type: "setCookie",
                      tabId,
                      url,
                      details: { url, name: record.name, value: newValue, domain: record.domain || undefined, path: record.path || "/" },
                    });
                    if (!resp.ok) { setNotice({ tone: "error", message: resp.error }); return; }
                    await loadCookies(url);
                    await refreshDiscovery();
                    setNotice({ tone: "success", message: `Saved cookie "${record.name}".` });
                  }}
                  onDelete={async (record) => {
                    const url = discovery?.url ?? discovery?.origin ?? "";
                    const cookieUrl = `${record.secure ? "https" : "http"}://${record.domain.startsWith(".") ? record.domain.slice(1) : record.domain}${record.path}`;
                    const resp = await rpc({ type: "removeCookie", tabId, url: cookieUrl || url, name: record.name });
                    if (!resp.ok) { setNotice({ tone: "error", message: resp.error }); return; }
                    await loadCookies(url);
                    await refreshDiscovery();
                    setNotice({ tone: "success", message: `Deleted cookie "${record.name}".` });
                  }}
                  onAddRow={async (draft) => {
                    const url = discovery?.url ?? discovery?.origin ?? "";
                    const resp = await rpc({
                      type: "setCookie",
                      tabId,
                      url,
                      details: { url, name: draft.name, value: draft.value, domain: draft.domain || undefined, path: draft.path || "/" },
                    });
                    if (!resp.ok) { setNotice({ tone: "error", message: resp.error }); return; }
                    await loadCookies(url);
                    await refreshDiscovery();
                    setNotice({ tone: "success", message: `Added cookie "${draft.name}".` });
                  }}
                />
              </div>
            )}

            {activeTabId === "sql" && (
              <ResizablePanelGroup orientation="vertical" className="h-full">
                    <ResizablePanel defaultSize="45%" minSize="150px">
                      <div className="flex h-full flex-col">
                        <div className="min-h-0 flex-1 bg-card">
                          <Suspense fallback={<div className="flex min-h-[120px] items-center justify-center text-[11px] text-muted-foreground">Loading editor…</div>}>
                            <QueryEditor
                              value={queryText}
                              onChange={setQueryText}
                              onRun={() => void runQuery()}
                              suggestions={querySuggestionPool}
                              theme={theme}
                              databases={discovery?.indexedDb ?? []}
                              inferredColumns={inferredSchema}
                            />
                          </Suspense>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card/50 px-3 py-1.5 text-[11px] text-muted-foreground">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden">
                            <span className="section-label mr-1">Examples</span>
                            <QueryExampleButton onClick={() => setQueryText(exampleFindActive(selected))}>active</QueryExampleButton>
                            <QueryExampleButton onClick={() => setQueryText(exampleTopByCreated(selected))}>top 10 by createdAt</QueryExampleButton>
                            <QueryExampleButton onClick={() => setQueryText(exampleRegex(selected))}>email regex</QueryExampleButton>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden max-w-[220px] truncate font-mono md:inline">
                              {selected.kind === "indexeddb"
                                ? `${selected.dbName} v${selected.dbVersion} · ${selected.storeName}`
                                : queryDbContext
                                  ? `${queryDbContext.dbName} v${queryDbContext.dbVersion} · any store`
                                  : "no database opened"}
                            </span>
                            <Button size="xs" variant="outline" onClick={() => setSaveQueryDialogOpen(true)}>
                              Save
                              <KbdGroup className="ml-1 opacity-70">
                                <Kbd className="border-current/15 bg-background/20 text-[8px] text-current">⌘</Kbd>
                                <Kbd className="border-current/15 bg-background/20 text-[8px] text-current">S</Kbd>
                              </KbdGroup>
                            </Button>
                            <Button size="xs" onClick={() => void runQuery()} disabled={busy || !queryDbContext}>
                              Run
                              <KbdGroup className="ml-1 opacity-70">
                                <Kbd className="border-current/15 bg-background/20 text-[8px] text-current">⌘</Kbd>
                                <Kbd className="border-current/15 bg-background/20 text-[8px] text-current">↵</Kbd>
                              </KbdGroup>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize="55%" minSize="80px">
                      <div className="flex h-full flex-col overflow-hidden">
                        {queryResult ? (
                          <>
                            <p className="shrink-0 border-b border-border bg-muted/20 px-3 py-1 font-mono text-[10px] text-muted-foreground">{queryResult.plan}</p>
                            <DataGrid
                              columns={queryResult.columns}
                              indexedRows={queryResult.rows.map((row) => ({ key: row.key, value: row.value }))}
                              selectedRecord={selected.kind === "indexeddb" && selectedRecord && !("parsed" in selectedRecord) ? selectedRecord : null}
                              onSelect={selectRecord}
                              onDelete={deleteIndexedRecord}
                              inferredSchema={inferredSchema}
                            />
                          </>
                        ) : (
                          <div className="grid h-full place-items-center p-6">
                            <div className="max-w-sm space-y-1.5 text-center text-[11px] text-muted-foreground">
                              <p className="font-medium text-foreground">MongoDB-style query in JSON</p>
                              <p>Required: <code className="font-mono text-foreground/80">store</code>. Optional: <code className="font-mono text-foreground/80">filter sort limit project</code>.</p>
                              <p className="font-mono text-[10px] leading-relaxed">$eq · $ne · $gt · $gte · $lt · $lte · $in · $nin · $regex · $exists · $and · $or · $not</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </section>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          panelRef={rightPanelRef}
          collapsible
          collapsedSize="0%"
          defaultSize="26%"
          minSize="280px"
          maxSize="560px"
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
      )}

      <Dialog open={databasePickerOpen} onOpenChange={setDatabasePickerOpen}>
        <DialogContent
          className="max-h-[min(80vh,44rem)] max-w-[min(720px,calc(100vw-2.5rem))] gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground shadow-2xl sm:max-w-[min(720px,calc(100vw-2.5rem))]"
          showCloseButton={false}
        >
          <DialogHeader className="space-y-0 border-b border-border px-4 pt-3 pb-2.5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-0.5">
                <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
                  <span className="inline-block size-1.5 rounded-full bg-primary" />
                  Open databases
                </DialogTitle>
                <DialogDescription className="text-[11.5px] leading-snug text-muted-foreground">
                  Pick which IndexedDB databases appear in the sidebar.
                </DialogDescription>
              </div>
              <Button variant="outline" size="xs" className="shrink-0" onClick={() => setDatabasePickerOpen(false)}>
                Close
              </Button>
            </div>
          </DialogHeader>
          <Command className="db-picker rounded-none bg-background p-0">
            <div className="border-b border-border px-3 py-2">
              <CommandInput placeholder="Search databases…" className="text-[12px]" />
            </div>
            <CommandList className="max-h-[min(56vh,26rem)] px-2 py-2">
              <CommandEmpty className="py-8 text-center text-[11.5px] text-muted-foreground">
                No matching databases.
              </CommandEmpty>

              <CommandGroup
                heading={(
                  <span className="flex items-center gap-1.5">
                    <span className="section-label">In view</span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                      {visibleDbs.length}
                    </span>
                  </span>
                ) as unknown as string}
                className="db-picker__group px-0 pt-1 pb-0.5"
              >
                {visibleDbs.length === 0 && (
                  <div className="mx-1 mb-0.5 rounded-md border border-dashed border-border/70 bg-card/40 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
                    <p className="font-medium text-foreground/80">No databases opened yet.</p>
                    <p className="mt-0.5">
                      Pick one from <span className="font-medium text-foreground/80">Available</span> below to start browsing.
                    </p>
                  </div>
                )}
                {visibleDbs.map((db) => {
                  const key = dbKey(db);
                  return (
                    <CommandItem
                      key={`visible:${key}`}
                      value={`visible ${db.name} ${db.origin}`}
                      onSelect={() => hideDatabaseFromView(key)}
                      className="db-picker__row db-picker__row--active group/command-item relative flex h-8 items-center gap-2 pl-3 pr-2 text-[12px]"
                    >
                      <Database className="size-3.5 text-primary/80" />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium text-foreground">{db.name}</span>
                        {(multiOrigin || duplicateDbNames.has(db.name)) && (
                          <OriginBadge origin={db.origin} />
                        )}
                      </span>
                      <CommandShortcut className="flex items-center gap-1.5">
                        <span className="chip chip--tight">v{db.version}</span>
                        <X className="size-3 text-muted-foreground/40 opacity-0 transition-[color,opacity] group-hover/command-item:text-destructive group-hover/command-item:opacity-100 group-data-selected/command-item:text-destructive group-data-selected/command-item:opacity-100" />
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {visibleDbs.length > 0 && hiddenDbs.length > 0 && <div className="h-1" />}

              <CommandGroup
                heading={(
                  <span className="flex items-center gap-1.5">
                    <span className="section-label">Available</span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                      {hiddenDbs.length}
                    </span>
                  </span>
                ) as unknown as string}
                className="db-picker__group px-0 pt-1 pb-0.5"
              >
                {hiddenDbs.map((db) => {
                  const key = dbKey(db);
                  return (
                    <CommandItem
                      key={`hidden:${key}`}
                      value={`available ${db.name} ${db.origin}`}
                      onSelect={() => showDatabaseInView(key)}
                      className="db-picker__row group/command-item flex h-8 items-center gap-2 pl-3 pr-2 text-[12px]"
                    >
                      <Plus className="size-3.5 text-muted-foreground/50 transition-colors group-hover/command-item:text-foreground group-data-selected/command-item:text-foreground" />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium text-foreground/85 transition-colors group-hover/command-item:text-foreground">
                          {db.name}
                        </span>
                        {(multiOrigin || duplicateDbNames.has(db.name)) && (
                          <OriginBadge origin={db.origin} />
                        )}
                      </span>
                      <CommandShortcut>
                        <span className="chip chip--tight">v{db.version}</span>
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex items-center justify-between gap-3 border-t border-border bg-card/40 px-3.5 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-mono tabular-nums text-foreground/85">{visibleDbKeys.length}</span>
              <span>of</span>
              <span className="font-mono tabular-nums">{discovery?.indexedDb.length ?? 0}</span>
              <span>visible</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <span>scanned</span>
                <span className="font-mono tabular-nums text-foreground/85">{discovery?.frames.length ?? 0}</span>
                <span>frame{(discovery?.frames.length ?? 0) === 1 ? "" : "s"}</span>
              </span>
              {(discovery?.frames.length ?? 0) > 0 && (
                <span className="chip chip--tight">
                  {new Set(discovery?.frames.map((f) => f.origin)).size} origin{new Set(discovery?.frames.map((f) => f.origin)).size === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <DestructiveDialog
        plan={pendingAction}
        busy={busy}
        requireTypedConfirm={prefs.confirmDestructive}
        onClose={() => setPendingAction(null)}
        onExecute={(plan, snapshotFirst) => void confirmPendingAction(plan, snapshotFirst)}
      />

      <SnapshotsDialog
        open={snapshotsOpen}
        target={snapshotTarget}
        rpc={rpc as Parameters<typeof SnapshotsDialog>[0]["rpc"]}
        tabId={tabId}
        onClose={() => setSnapshotsOpen(false)}
        onRestoreComplete={async () => {
          if (snapshotTarget?.scope === "store" && selected.kind === "indexeddb") {
            await loadIndexedStore(snapshotTarget.frameId, snapshotTarget.dbName, snapshotTarget.dbVersion, snapshotTarget.storeName);
          }
          await refreshDiscovery();
          setNotice({ tone: "success", message: "Restore complete." });
        }}
      />

      {selected.kind === "indexeddb" && (
        <ImportDialog
          open={importOpen}
          storeName={selected.storeName}
          dbName={selected.dbName}
          dbVersion={selected.dbVersion}
          frameId={selected.frameId}
          tabId={tabId}
          rpc={rpc as Parameters<typeof ImportDialog>[0]["rpc"]}
          hasExistingRows={(tableResult?.rows.length ?? 0) > 0}
          onClose={() => setImportOpen(false)}
          onComplete={async () => {
            if (selected.kind === "indexeddb") {
              await loadIndexedStore(selected.frameId, selected.dbName, selected.dbVersion, selected.storeName);
            }
            await refreshDiscovery();
            setNotice({ tone: "success", message: "Import complete." });
          }}
        />
      )}

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        databases={discovery?.indexedDb ?? []}
        savedQueries={savedQueries}
        onOpenNode={(node, opts) => { openNode(node, opts); setCommandPaletteOpen(false); }}
        onLoadQuery={(text) => { setQueryText(text); setActiveTabId("sql"); setCommandPaletteOpen(false); }}
        onOpenSettings={() => { setSettingsOpen(true); setCommandPaletteOpen(false); }}
        onOpenPicker={() => { setDatabasePickerOpen(true); setCommandPaletteOpen(false); }}
        onToggleFilters={selected.kind === "indexeddb" ? () => { setFilterState((prev) => ({ ...prev, open: !prev.open })); setCommandPaletteOpen(false); } : undefined}
        onNewRow={selected.kind === "indexeddb" ? () => { startDraftRow(); setCommandPaletteOpen(false); } : undefined}
        onExport={(format) => { exportVisible(format); setCommandPaletteOpen(false); }}
      />

      <Dialog open={saveQueryDialogOpen} onOpenChange={setSaveQueryDialogOpen}>
        <DialogContent
          className="max-w-[min(360px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-md border-border bg-card p-0 text-card-foreground shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Save query</DialogTitle>
            <DialogDescription>Give this query a name and optional tags.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 border-b border-border px-3 py-3">
            <p className="text-[13px] font-medium tracking-tight">Save query</p>
            <Input
              autoFocus
              placeholder="Query name…"
              value={saveQueryName}
              onChange={(e) => setSaveQueryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && saveQueryName.trim()) void handleSaveQuery(saveQueryName.trim(), saveQueryTags.split(",").map((t) => t.trim()).filter(Boolean)); }}
              className="h-7 rounded-sm text-[11px]"
            />
            <Input
              placeholder="Tags (comma-separated, optional)…"
              value={saveQueryTags}
              onChange={(e) => setSaveQueryTags(e.target.value)}
              className="h-7 rounded-sm text-[11px]"
            />
          </div>
          <div className="flex items-center justify-end gap-1.5 bg-card px-3 py-2">
            <Button variant="outline" size="xs" onClick={() => setSaveQueryDialogOpen(false)}>Cancel</Button>
            <Button size="xs" onClick={() => void handleSaveQuery(saveQueryName.trim(), saveQueryTags.split(",").map((t) => t.trim()).filter(Boolean))} disabled={!saveQueryName.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          className="max-w-[min(400px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-md border-border bg-card p-0 text-card-foreground shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="border-b border-border px-3 py-2.5">
            <DialogTitle className="text-[13px] font-semibold tracking-tight">Keyboard shortcuts</DialogTitle>
            <DialogDescription className="sr-only">All available keyboard shortcuts.</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border">
            {[
              { keys: "⌘K", label: "Command palette" },
              { keys: "⌘T", label: "Open database picker" },
              { keys: "⌘↵", label: "Run query" },
              { keys: "⌘S", label: "Save current query" },
              { keys: "⌘F", label: "Open filters" },
              { keys: "⌘N", label: "New inline row" },
              { keys: "⌘D", label: "Duplicate selected row" },
              { keys: "⌘Z", label: "Undo last cell edit" },
              { keys: "⌘⇧Z", label: "Redo last cell edit" },
              { keys: "⌘E", label: "Export current view" },
              { keys: "⌘,", label: "Open settings" },
              { keys: "?", label: "Keyboard shortcuts" },
            ].map(({ keys, label }) => (
              <div key={keys} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[11px] text-foreground">{label}</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{keys}</kbd>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-border px-3 py-2">
            <Button variant="outline" size="xs" onClick={() => setHelpOpen(false)}>Close</Button>
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
      className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </button>
  );
}

type InferredType = "string" | "number" | "boolean" | "null" | "object" | "array";

function inferType(value: SerializableValue): InferredType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value as "string" | "number" | "boolean";
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
  const isKv = selected.kind === "kv";
  const [fieldSearch, setFieldSearch] = useState("");

  // For IndexedDB the draft is a JSON document; for KV it's a plain string.
  // `draftValue` is the parsed, structured view that the field editor mutates.
  // Committing back to `editDraft` (the serialized form the parent sends to the
  // RPC) happens on every edit so the existing Save button keeps working.
  const draftValue = useMemo<SerializableValue>(() => {
    if (!selectedRecord) return null;
    if (isKv) {
      try {
        return JSON.parse(editDraft) as SerializableValue;
      } catch {
        return editDraft;
      }
    }
    try {
      return JSON.parse(editDraft) as SerializableValue;
    } catch {
      return inspectedValue;
    }
  }, [editDraft, isKv, inspectedValue, selectedRecord]);

  const writeDraft = useCallback(
    (next: SerializableValue) => {
      if (isKv && typeof next === "string") {
        setEditDraft(next);
      } else {
        setEditDraft(JSON.stringify(next, null, 2));
      }
    },
    [isKv, setEditDraft]
  );

  const dirty = useMemo(() => {
    if (!selectedRecord) return false;
    try {
      return JSON.stringify(draftValue) !== JSON.stringify(inspectedValue);
    } catch {
      return true;
    }
  }, [draftValue, inspectedValue, selectedRecord]);

  return (
    <aside className="flex h-full min-h-0 flex-col" style={{ backgroundColor: "var(--background)", borderLeft: "1px solid var(--hairline)" }}>
      {selectedRecord && draftValue !== null ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--hairline)" }}>
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 w-full rounded-[6px] pl-8 text-[12px] md:text-[12px]"
                value={fieldSearch}
                onChange={(event) => setFieldSearch(event.target.value)}
                placeholder="Search for field…"
              />
            </label>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy JSON"
              className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Copy JSON"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col">
              <FieldEditor
                value={draftValue}
                onChange={writeDraft}
                searchText={fieldSearch.trim().toLowerCase()}
              />
            </div>
          </ScrollArea>
          <div className="shrink-0 border-t border-border bg-card px-2 py-1.5">
            <Button size="sm" onClick={saveRecord} disabled={busy || !dirty} className="h-6 w-full text-[11px] md:text-[11px]">
              {dirty ? "Save changes" : "No changes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex size-8 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground">
            <Search className="size-3.5" />
          </div>
          <p className="text-[11px] text-muted-foreground">Select a row to inspect its fields, nested values, and raw JSON.</p>
        </div>
      )}
    </aside>
  );
}

// Top-level editor: when the document is an object, render one row per key.
// For scalars (edited KV entries that aren't JSON objects, or scalar records),
// render a single row keyed as "value".
function FieldEditor({
  value,
  onChange,
  searchText
}: {
  value: SerializableValue;
  onChange: (next: SerializableValue) => void;
  searchText: string;
}) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, SerializableValue>);
    const filtered = searchText
      ? entries.filter(([k]) => k.toLowerCase().includes(searchText))
      : entries;

    if (entries.length === 0) {
      return <p className="px-3 py-2 text-[11px] text-muted-foreground">No fields. The document is an empty object.</p>;
    }

    return (
      <>
        {filtered.map(([key, fieldValue]) => (
          <FieldRow
            key={key}
            name={key}
            value={fieldValue}
            onChange={(next) => onChange({ ...(value as Record<string, SerializableValue>), [key]: next })}
          />
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">No fields match "{searchText}".</p>
        )}
      </>
    );
  }

  return <FieldRow name="value" value={value} onChange={onChange} />;
}

function FieldRow({
  name,
  value,
  onChange
}: {
  name: string;
  value: SerializableValue;
  onChange: (next: SerializableValue) => void;
}) {
  const type = inferType(value);

  return (
    <div className="px-3 py-1.5 last:pb-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[12px] font-normal text-foreground" title={name}>{name}</span>
        <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{type}</span>
      </div>
      <FieldInput value={value} onChange={onChange} type={type} />
    </div>
  );
}

function JsonFieldInput({
  value,
  onChange
}: {
  value: SerializableValue;
  onChange: (next: SerializableValue) => void;
}) {
  const pretty = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pretty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(pretty);
  }, [pretty, editing]);

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <Textarea
          autoFocus
          className="min-h-24 rounded-[4px] font-mono text-[11px] leading-5 md:text-[11px]"
          value={draft}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            try {
              onChange(JSON.parse(next) as SerializableValue);
              setError(null);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
          onBlur={() => { if (!error) setEditing(false); }}
        />
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="block w-full cursor-text rounded-[4px] border border-border bg-background p-2 text-left font-mono text-[11px] leading-5 hover:border-ring/60"
    >
      <pre className="m-0 whitespace-pre-wrap break-all">
        <JsonHighlight text={pretty} />
      </pre>
    </button>
  );
}

function FieldInput({
  value,
  onChange,
  type
}: {
  value: SerializableValue;
  onChange: (next: SerializableValue) => void;
  type: InferredType;
}) {
  if (type === "boolean") {
    return (
      <Select value={String(value)} onValueChange={(next) => onChange(next === "true")}>
        <SelectTrigger size="sm" className="h-7 w-full rounded-[4px] text-[12px] md:text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-[12px] md:text-[12px]">
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (type === "null") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            className="h-7 w-full cursor-not-allowed rounded-[4px] bg-transparent pr-6 text-[12px] uppercase text-muted-foreground md:text-[12px]"
            value="NULL"
            disabled
            readOnly
          />
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Button variant="outline" size="xs" onClick={() => onChange("")}>Set</Button>
      </div>
    );
  }

  if (type === "number") {
    return (
      <div className="relative">
        <Input
          type="number"
          className="h-7 w-full rounded-[4px] pr-6 text-[12px] md:text-[12px]"
          value={value === null ? "" : String(value)}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") {
              onChange(0);
              return;
            }
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) ? parsed : (value as number));
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }

  if (type === "object" || type === "array") {
    return <JsonFieldInput value={value} onChange={onChange} />;
  }

  // string
  return (
    <div className="relative">
      <Input
        className="h-7 w-full rounded-[4px] pr-6 text-[12px] md:text-[12px]"
        value={value as string}
        onChange={(event) => onChange(event.target.value)}
      />
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
    </div>
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
  if (node.kind === "cache") return { id: `cache::${node.cacheName}`, title: node.cacheName, node };
  if (node.kind === "cookies") return { id: "cookies", title: "Cookies", node };
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

interface PendingRequest {
  resolve: (response: StorageResponse) => void;
  request: StorageRequest;
  idempotent: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function useStorageRpc() {
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const pendingRef = useRef(new Map<string, PendingRequest>());

  useEffect(() => {
    if (!extensionRuntime) return;
    openPort(portRef, pendingRef);
    return () => {
      portRef.current?.disconnect();
      portRef.current = null;
    };
  }, []);

  return useCallback((request: StorageRequest) => {
    if (!extensionRuntime) return Promise.resolve(mockStorageResponse(request));
    const id = crypto.randomUUID();
    return new Promise<StorageResponse>((resolve) => {
      const entry: PendingRequest = { resolve, request, idempotent: isIdempotent(request) };
      pendingRef.current.set(id, entry);
      const port = portRef.current ?? openPort(portRef, pendingRef);
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

function openPort(
  portRef: React.MutableRefObject<chrome.runtime.Port | null>,
  pendingRef: React.MutableRefObject<Map<string, PendingRequest>>
): chrome.runtime.Port {
  const port = chrome.runtime.connect({ name: "storage-studio-panel" });
  portRef.current = port;

  port.onMessage.addListener((reply: PanelReply) => {
    const entry = pendingRef.current.get(reply.id);
    if (!entry) return;
    pendingRef.current.delete(reply.id);
    entry.resolve(reply.response);
  });

  port.onDisconnect.addListener(() => {
    if (portRef.current === port) portRef.current = null;
    void attemptReconnect(portRef, pendingRef, 0);
  });

  return port;
}

async function attemptReconnect(
  portRef: React.MutableRefObject<chrome.runtime.Port | null>,
  pendingRef: React.MutableRefObject<Map<string, PendingRequest>>,
  attempt: number
): Promise<void> {
  if (attempt >= MAX_RECONNECT_ATTEMPTS) {
    for (const entry of pendingRef.current.values()) {
      entry.resolve({ ok: false, error: "Service worker unavailable after reconnect attempts." });
    }
    pendingRef.current.clear();
    return;
  }

  await sleep(BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt));

  try {
    const port = openPort(portRef, pendingRef);
    // Re-send idempotent requests; reject non-idempotent ones immediately.
    for (const [id, entry] of Array.from(pendingRef.current)) {
      if (entry.idempotent) {
        try { port.postMessage({ id, request: entry.request }); } catch { /* handled by next disconnect */ }
      } else {
        pendingRef.current.delete(id);
        entry.resolve({ ok: false, error: new PortLostError().message });
      }
    }
  } catch {
    await attemptReconnect(portRef, pendingRef, attempt + 1);
  }
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
        sessionStorage: { count: 2, bytes: 420 },
        cookies: { count: 0, bytes: 0 },
        cacheStorage: { caches: [{ name: "v1-assets", entryCount: null }, { name: "api-responses", entryCount: null }] },
        url: "https://app.example.test/"
      }
    };
  }

  if (request.type === "readCacheEntries") {
    return {
      ok: true,
      data: [
        { url: "https://app.example.test/bundle.js", method: "GET", status: 200, statusText: "OK", contentType: "application/javascript", contentLength: 102400, dateHeader: "Mon, 01 Jan 2024 00:00:00 GMT" },
        { url: "https://app.example.test/styles.css", method: "GET", status: 200, statusText: "OK", contentType: "text/css", contentLength: 8192, dateHeader: "Mon, 01 Jan 2024 00:00:00 GMT" }
      ]
    };
  }

  if (request.type === "readCacheResponse") {
    return { ok: true, data: { contentType: "application/javascript", kind: "text", preview: "// bundle preview" } };
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
  onSnapshotStore,
  onHideDatabase,
  onActivateDb,
  activeDbKey,
  onOpenPicker,
  storeSummaries,
  onExpandDb,
  showStoreSizes,
  searchQuery = ""
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
  onSnapshotStore: (db: IndexedDbDatabaseInfo, storeName: string) => void;
  onHideDatabase: (key: string) => void;
  onActivateDb: (key: string | null) => void;
  activeDbKey: string | null;
  onOpenPicker: () => void;
  storeSummaries: Map<string, StoreSummary | "loading">;
  onExpandDb: (db: IndexedDbDatabaseInfo) => void;
  showStoreSizes: boolean;
  searchQuery?: string;
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

  if (!discovery) return <p className="px-3 py-3 text-[12px] text-muted-foreground">Open DevTools on a page and refresh storage.</p>;

  const needle = searchQuery.trim().toLowerCase();
  const matchText = (s: string) => !needle || s.toLowerCase().includes(needle);

  let visibleDbs = discovery.indexedDb.filter((db) => visibleDbKeys.includes(dbKey(db)));
  if (needle) {
    visibleDbs = visibleDbs.filter(
      (db) => matchText(db.name) || db.stores.some((s) => matchText(s.name))
    );
  }

  return (
    <nav className="flex flex-col pb-2">
      <TreeSection label="IndexedDB" count={visibleDbs.length}>
        {discovery.indexedDb.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">No databases.</p>
        )}
        {visibleDbs.length === 0 && discovery.indexedDb.length > 0 && (
          <p className="mx-1.5 rounded-sm border border-dashed border-border px-2.5 py-2 text-[11px] text-muted-foreground">
            Click{" "}
            <button
              type="button"
              onClick={onOpenPicker}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Open
            </button>{" "}
            to browse a database.
          </p>
        )}
        {visibleDbs.map((db) => {
          const key = dbKey(db);
          const hasMatch = !needle || matchText(db.name) || db.stores.some((s) => matchText(s.name));
          const isExpanded = expandedDbKeys.has(key) || (needle !== "" && hasMatch);
          const isSelectedDb = selected.kind === "indexeddb" && selected.dbName === db.name && selected.dbVersion === db.version && selected.origin === db.origin;
          const showOrigin = multiOrigin || duplicateDbNames.has(db.name);
          return (
            <div key={key} className="flex flex-col">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "group mx-1 flex h-[22px] items-center gap-1.5 rounded-sm px-2 text-left text-[12px] transition-colors",
                      isSelectedDb || activeDbKey === key
                        ? "font-medium text-foreground"
                        : "text-foreground hover:bg-[var(--sidebar-row-hover)]"
                    )}
                    style={isSelectedDb || activeDbKey === key ? { backgroundColor: "var(--sidebar-row-active)" } : undefined}
                    onClick={() => {
                      onActivateDb(key);
                      setExpandedDbKeys((current) => {
                        const next = new Set(current);
                        if (next.has(key)) {
                          next.delete(key);
                        } else {
                          next.add(key);
                          onExpandDb(db);
                        }
                        return next;
                      });
                    }}
                    aria-expanded={isExpanded}
                  >
                    <ChevronRight
                      className={cn(
                        "size-3 shrink-0 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                      style={{ color: "var(--icon-dim)" }}
                    />
                    <Database className="size-3.5 shrink-0" style={{ color: "var(--icon-db)" }} />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate">{db.name}</span>
                      {showOrigin && <OriginBadge origin={db.origin} />}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">v{db.version}</span>
                  </button>
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
                <div className="flex flex-col">
                  {db.stores.filter((store) => !needle || matchText(store.name) || matchText(db.name)).map((store) => {
                    const isSelectedStore = isSelectedDb && selected.kind === "indexeddb" && selected.storeName === store.name;
                    return (
                      <ContextMenu key={`${key}:${store.name}`}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "mx-1 flex h-[22px] items-center gap-1.5 rounded-sm pr-2 pl-7 text-left text-[12px] transition-colors",
                              isSelectedStore
                                ? "font-medium text-foreground"
                                : "text-foreground hover:bg-[var(--sidebar-row-hover)]"
                            )}
                            style={isSelectedStore ? { backgroundColor: "var(--sidebar-row-active)" } : undefined}
                            onClick={() => openNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId })}
                            onDoubleClick={() => openNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId }, { persist: true })}
                          >
                            <Table2 className="size-3.5 shrink-0" style={{ color: "var(--icon-store)" }} />
                            <span className="flex-1 truncate">{store.name}</span>
                            {(() => {
                              if (!showStoreSizes) return <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{store.count ?? "?"}</span>;
                              const sKey = `${db.origin}::${db.name}::v${db.version}::${store.name}`;
                              const summary = storeSummaries.get(sKey);
                              if (summary === "loading") return <span className="font-mono text-[11px] text-muted-foreground/50">…</span>;
                              if (summary) {
                                const bytes = summary.approxBytes;
                                const bStr = bytes !== null ? (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)}M` : bytes >= 1024 ? `${(bytes / 1024).toFixed(0)}K` : `${bytes}B`) : null;
                                return (
                                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                                    <span>{summary.rowCount?.toLocaleString() ?? "?"}</span>
                                    {bStr && <span className="text-muted-foreground/50">·{bStr}</span>}
                                  </span>
                                );
                              }
                              return <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{store.count ?? "?"}</span>;
                            })()}
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-52">
                          <ContextMenuItem onSelect={() => openNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId }, { persist: true })}>
                            Open in tab
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => onSnapshotStore(db, store.name)}>
                            Snapshot…
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
      </TreeSection>

      {(!needle || matchText("LocalStorage") || matchText("SessionStorage") || matchText("Cookies")) && (
        <TreeSection label="Storage" count={2}>
          {matchText("LocalStorage") && (
            <TreeItem
              active={selected.kind === "kv" && selected.surface === "localStorage"}
              onClick={() => openNode({ kind: "kv", surface: "localStorage" }, { persist: true })}
              icon={<Database className="size-3.5" style={{ color: "var(--icon-db)" }} />}
              label="LocalStorage"
              trailing={<span className="font-mono text-[11px] text-muted-foreground tabular-nums">{discovery.localStorage.count}</span>}
            />
          )}
          {matchText("SessionStorage") && (
            <TreeItem
              active={selected.kind === "kv" && selected.surface === "sessionStorage"}
              onClick={() => openNode({ kind: "kv", surface: "sessionStorage" }, { persist: true })}
              icon={<Database className="size-3.5" style={{ color: "var(--icon-db)" }} />}
              label="SessionStorage"
              trailing={<span className="font-mono text-[11px] text-muted-foreground tabular-nums">{discovery.sessionStorage.count}</span>}
            />
          )}
          {matchText("Cookies") && (
            <TreeItem
              active={selected.kind === "cookies"}
              onClick={() => openNode({ kind: "cookies" }, { persist: true })}
              icon={<Database className="size-3.5" style={{ color: "var(--icon-db)" }} />}
              label="Cookies"
              trailing={<span className="font-mono text-[11px] text-muted-foreground tabular-nums">{discovery.cookies?.count ?? 0}</span>}
            />
          )}
        </TreeSection>
      )}

      {discovery.cacheStorage && discovery.cacheStorage.caches.length > 0 && (
        <TreeSection label="Cache Storage" count={discovery.cacheStorage.caches.length}>
          {discovery.cacheStorage.caches.filter((cache) => matchText(cache.name)).map((cache) => (
            <TreeItem
              key={cache.name}
              active={selected.kind === "cache" && selected.cacheName === cache.name}
              onClick={() => openNode({ kind: "cache", cacheName: cache.name, frameId: 0 }, { persist: true })}
              icon={<Database className="size-3.5" style={{ color: "var(--icon-db)" }} />}
              label={cache.name}
              trailing={
                cache.entryCount !== null
                  ? <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{cache.entryCount}</span>
                  : undefined
              }
            />
          ))}
        </TreeSection>
      )}
    </nav>
  );
}

function TreeSection({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="pt-2 pb-0.5" style={{ borderTop: "1px solid var(--hairline)" }}>
      <header className="flex h-[22px] items-center justify-between px-3">
        <h3 className="section-label">{label}</h3>
        {typeof count === "number" && (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{count}</span>
        )}
      </header>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function TreeItem({
  active,
  onClick,
  icon,
  label,
  trailing
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mx-1 flex h-[22px] items-center gap-1.5 rounded-sm px-2 text-left text-[12px] transition-colors",
        active
          ? "font-medium text-foreground"
          : "text-foreground hover:bg-[var(--sidebar-row-hover)]"
      )}
      style={active ? { backgroundColor: "var(--sidebar-row-active)" } : undefined}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {trailing && <span className="flex shrink-0 items-center leading-none">{trailing}</span>}
    </button>
  );
}

function Overview({ discovery }: { discovery: StorageDiscovery | null }) {
  if (!discovery) return <p className="p-4 text-xs text-muted-foreground">No storage metadata loaded yet.</p>;
  const stores = discovery.indexedDb.flatMap((db) => db.stores.map((store) => ({ db: db.name, version: db.version, origin: db.origin, ...store })));
  const totalRows = stores.reduce((sum, s) => sum + (s.count ?? 0), 0);

  const tile = (label: string, value: React.ReactNode, sub: string) => (
    <article className="flex min-h-0 flex-col justify-between rounded-sm border border-border bg-card px-3 py-2.5">
      <p className="section-label">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <strong className="font-mono text-[20px] font-medium leading-none tabular-nums">{value}</strong>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </article>
  );

  return (
    <section className="grid min-h-0 grid-cols-4 gap-2 overflow-auto p-3">
      {tile("IndexedDB", discovery.indexedDb.length, "databases")}
      {tile("Object stores", stores.length, "tables")}
      {tile("LocalStorage", discovery.localStorage.count, formatBytes(discovery.localStorage.bytes))}
      {tile("SessionStorage", discovery.sessionStorage.count, formatBytes(discovery.sessionStorage.bytes))}

      <section className="col-span-4 rounded-sm border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <h3 className="section-label">Largest stores</h3>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{totalRows} rows total</span>
        </header>
        <div className="divide-y divide-border">
          {stores.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">No object stores found.</p>
          ) : stores.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 12).map((store) => (
            <div
              className="flex items-center justify-between px-3 py-1.5 text-[11px]"
              key={`${store.origin}::${store.db}:v${store.version}:${store.name}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Table2 className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono">
                  <span className="text-muted-foreground">{store.db}</span>
                  <span className="text-foreground/30">.</span>
                  <span className="text-foreground">{store.name}</span>
                </span>
              </span>
              <span className="font-mono text-muted-foreground tabular-nums">{store.count ?? "?"}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

type PopoverKind = "columns" | "pagination" | "export" | null;

function DataFooter({
  totalRows,
  offset,
  limit,
  selectedCount,
  onAddRow,
  allColumns,
  hiddenColumns,
  onApplyColumns,
  filterRuleCount,
  filtersOpen,
  onToggleFilters,
  view,
  onChangeView,
  onExport,
  onImport,
  onApplyPagination,
  onPrev,
  onNext,
  canPrev,
  canNext
}: {
  totalRows: number;
  offset: number;
  limit: number;
  selectedCount: number;
  onAddRow: () => void;
  allColumns: string[];
  hiddenColumns: Set<string>;
  onApplyColumns: (next: Set<string>) => void;
  filterRuleCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  view: "data" | "structure";
  onChangeView: (v: "data" | "structure") => void;
  onExport: (format: "json" | "csv" | "ndjson" | "sql", scope: "view" | "store") => void;
  onImport?: () => void;
  onApplyPagination: (nextLimit: number, nextOffset: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openPopover) return;
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpenPopover(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openPopover]);

  const visibleRangeStart = totalRows === 0 ? 0 : offset + 1;
  const visibleRangeEnd = Math.min(offset + limit, totalRows);
  const rowStatus =
    selectedCount > 0
      ? `${selectedCount} of ${totalRows} rows selected`
      : totalRows === 0
        ? "0 rows"
        : `${visibleRangeStart}–${visibleRangeEnd} of ${totalRows} rows`;

  return (
    <footer ref={wrapperRef} className="relative flex shrink-0 items-center gap-1.5 border-t border-border bg-card/60 px-2 py-1 text-[11px]">
      <button
        type="button"
        onClick={() => onChangeView("data")}
        className={cn(
          "rounded-sm border px-2 py-0.5 text-[11px] font-medium",
          view === "data"
            ? "border-border bg-background text-foreground shadow-sm"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={view === "data"}
      >
        Data
      </button>
      <button
        type="button"
        onClick={() => onChangeView("structure")}
        className={cn(
          "rounded-sm border px-2 py-0.5 text-[11px] font-medium",
          view === "structure"
            ? "border-border bg-background text-foreground shadow-sm"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={view === "structure"}
      >
        Structure
      </button>
      {view === "data" && (
        <button
          type="button"
          onClick={onAddRow}
          className="flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted/60"
        >
          <Plus className="size-3" />
          Row
        </button>
      )}
      <span className="ml-2 flex-1 truncate text-muted-foreground">{rowStatus}</span>

      {view === "data" && (
        <>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPopover((prev) => (prev === "columns" ? null : "columns"))}
              disabled={allColumns.length === 0}
              className={cn(
                "rounded-sm border border-border bg-background px-2 py-0.5 text-[11px] font-medium disabled:opacity-40",
                openPopover === "columns" ? "text-foreground shadow-sm" : "text-foreground hover:bg-muted/60"
              )}
            >
              Columns{hiddenColumns.size > 0 ? ` (${allColumns.length - hiddenColumns.size}/${allColumns.length})` : ""}
            </button>
            {openPopover === "columns" && (
              <ColumnsPopover
                allColumns={allColumns}
                hiddenColumns={hiddenColumns}
                onApply={(next) => {
                  onApplyColumns(next);
                  setOpenPopover(null);
                }}
                onClose={() => setOpenPopover(null)}
              />
            )}
          </div>

          <button
            type="button"
            onClick={onToggleFilters}
            className={cn(
              "rounded-sm border border-border bg-background px-2 py-0.5 text-[11px] font-medium",
              filtersOpen ? "text-foreground shadow-sm" : "text-foreground hover:bg-muted/60"
            )}
          >
            Filters{filterRuleCount > 0 ? ` (${filterRuleCount})` : ""}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPopover((prev) => (prev === "export" ? null : "export"))}
              className={cn(
                "flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 text-[11px] font-medium",
                openPopover === "export" ? "text-foreground shadow-sm" : "text-foreground hover:bg-muted/60"
              )}
            >
              Export
              <ChevronDown className="size-3" />
            </button>
            {openPopover === "export" && (
              <div
                role="menu"
                className="absolute bottom-[calc(100%+6px)] right-0 z-40 w-48 overflow-hidden rounded-md border border-border bg-card text-[11px] shadow-xl"
              >
                <div className="border-b border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Current view</div>
                {(["json", "csv", "ndjson", "sql"] as const).map((fmt) => (
                  <button key={fmt} type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/60"
                    onClick={() => { onExport(fmt, "view"); setOpenPopover(null); }}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
                <div className="border-b border-t border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Entire store</div>
                {(["json", "csv", "ndjson", "sql"] as const).map((fmt) => (
                  <button key={`store-${fmt}`} type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/60"
                    onClick={() => { onExport(fmt, "store"); setOpenPopover(null); }}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
                {onImport && (
                  <>
                    <div className="border-t border-border" />
                    <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/60"
                      onClick={() => { onImport(); setOpenPopover(null); }}>
                      Import…
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mx-0.5 h-4 w-px bg-border" />
      <div className="relative flex items-center rounded-sm border border-border">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="grid h-[22px] w-6 place-items-center text-foreground/80 disabled:text-muted-foreground/40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3" />
        </button>
        <span className="h-[18px] w-px bg-border" />
        <button
          type="button"
          onClick={() => setOpenPopover((prev) => (prev === "pagination" ? null : "pagination"))}
          className={cn(
            "grid h-[22px] w-6 place-items-center",
            openPopover === "pagination" ? "bg-secondary text-foreground" : "text-foreground/80"
          )}
          aria-label="Pagination settings"
        >
          <SlidersHorizontal className="size-3" />
        </button>
        <span className="h-[18px] w-px bg-border" />
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="grid h-[22px] w-6 place-items-center text-foreground/80 disabled:text-muted-foreground/40"
          aria-label="Next page"
        >
          <ChevronRight className="size-3" />
        </button>
        {openPopover === "pagination" && (
          <PaginationPopover
            initialLimit={limit}
            initialOffset={offset}
            onApply={(nextLimit, nextOffset) => {
              onApplyPagination(nextLimit, nextOffset);
              setOpenPopover(null);
            }}
            onClose={() => setOpenPopover(null)}
          />
        )}
      </div>
    </footer>
  );
}

function ColumnsPopover({
  allColumns,
  hiddenColumns,
  onApply,
  onClose
}: {
  allColumns: string[];
  hiddenColumns: Set<string>;
  onApply: (next: Set<string>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(hiddenColumns));
  const [search, setSearch] = useState("");
  const toggle = (column: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  };
  const needle = search.trim().toLowerCase();
  const filtered = needle ? allColumns.filter((column) => column.toLowerCase().includes(needle)) : allColumns;
  return (
    <div
      role="dialog"
      className="absolute bottom-[calc(100%+6px)] right-0 z-40 w-64 rounded-md border border-border bg-card p-2 text-[11px] shadow-xl"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="section-label">Visible columns</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-3" />
        </button>
      </div>
      <label className="relative mb-1.5 block">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search columns…"
          className="h-6 rounded-sm pl-6 text-[11px]"
          autoFocus
        />
      </label>
      <div className="max-h-56 space-y-1 overflow-auto rounded-sm border border-border bg-background p-1.5">
        {allColumns.length === 0 ? (
          <p className="px-1 py-0.5 text-muted-foreground">No columns available.</p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-0.5 text-muted-foreground">No matches.</p>
        ) : (
          filtered.map((column) => {
            const isVisible = !draft.has(column);
            return (
              <label key={column} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 hover:bg-muted/60">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggle(column)}
                  className="size-3 accent-primary"
                />
                <span className="truncate font-mono">{column}</span>
              </label>
            );
          })
        )}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <Button size="xs" variant="outline" onClick={() => setDraft(new Set())}>Show all</Button>
        <Button size="xs" onClick={() => onApply(draft)}>Apply</Button>
      </div>
    </div>
  );
}

function PaginationPopover({
  initialLimit,
  initialOffset,
  onApply,
  onClose
}: {
  initialLimit: number;
  initialOffset: number;
  onApply: (nextLimit: number, nextOffset: number) => void;
  onClose: () => void;
}) {
  const [limitInput, setLimitInput] = useState(String(initialLimit));
  const [offsetInput, setOffsetInput] = useState(String(initialOffset));
  const submit = () => {
    const parsedLimit = Math.max(1, Number.parseInt(limitInput, 10) || initialLimit);
    const parsedOffset = Math.max(0, Number.parseInt(offsetInput, 10) || 0);
    onApply(parsedLimit, parsedOffset);
  };
  return (
    <div
      role="dialog"
      className="absolute bottom-[calc(100%+6px)] right-0 z-40 w-56 rounded-md border border-border bg-card p-2 text-[11px] shadow-xl"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="section-label">Page</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2">
          <span className="w-12 text-muted-foreground">Limit</span>
          <Input
            className="h-6 flex-1 rounded-sm font-mono text-[11px]"
            value={limitInput}
            onChange={(event) => setLimitInput(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-12 text-muted-foreground">Offset</span>
          <Input
            className="h-6 flex-1 rounded-sm font-mono text-[11px]"
            value={offsetInput}
            onChange={(event) => setOffsetInput(event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </label>
      </div>
      <div className="mt-2 flex items-center justify-end">
        <Button size="xs" onClick={submit}>Go</Button>
      </div>
    </div>
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
      size="icon-xs"
      variant={active ? "secondary" : "outline"}
      className={cn(
        "border border-border",
        active ? "border-primary/60 text-primary" : "text-muted-foreground"
      )}
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


function KvGrid({
  rows,
  selectedRecord,
  onSelect,
  onDelete
}: {
  rows: KeyValueRecord[];
  selectedRecord: KeyValueRecord | null;
  onSelect: (record: KeyValueRecord) => void;
  onDelete: (record: KeyValueRecord) => void;
}) {
  const columnDefs = useMemo<ColumnDef<KeyValueRecord>[]>(
    () => [
      {
        accessorKey: "key",
        header: "key",
        cell: ({ row }) => <span className="font-mono text-foreground">{row.original.key}</span>
      },
      { id: "value", header: "value", accessorFn: (row) => row.parsed.preview, cell: ({ getValue }) => <span className="font-mono text-foreground/85">{String(getValue() ?? "")}</span> },
      { id: "type", header: "type", accessorFn: (row) => row.parsed.type, cell: ({ getValue }) => <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{String(getValue() ?? "")}</span> }
    ],
    []
  );
  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel()
  });
  if (rows.length === 0) return <p className="p-3 text-[11px] text-muted-foreground">No keys found.</p>;
  return (
    <div className="h-full overflow-auto bg-background">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm last:border-r-0"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => {
            const isSelected = selectedRecord?.key === row.original.key;
            return (
              <ContextMenu key={row.id}>
                <ContextMenuTrigger asChild>
                  <tr
                    className={cn(
                      "group/datarow cursor-default transition-colors",
                      rowIndex % 2 === 1 && !isSelected && "bg-muted/20",
                      isSelected ? "bg-primary/25" : "hover:bg-muted/60"
                    )}
                    onClick={() => onSelect(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-2 py-0.5 leading-5 last:border-r-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-40">
                  <ContextMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                    Delete key
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && <p className="p-3 text-[11px] text-muted-foreground">No keys match the filter.</p>}
    </div>
  );
}


function titleForSelection(selected: SelectedNode) {
  if (selected.kind === "overview") return "Origin dashboard";
  if (selected.kind === "kv") return selected.surface;
  if (selected.kind === "cache") return selected.cacheName;
  if (selected.kind === "cookies") return "Cookies";
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


createRoot(document.getElementById("root")!).render(<App />);
