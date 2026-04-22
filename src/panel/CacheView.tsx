import React, { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";
import { Button } from "../components/ui/button";
import type { CacheEntrySummary, CacheResponseBody, StorageRequest, StorageResponse } from "../shared/types";

const ROW_HEIGHT = 28;

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 200 && status < 300
      ? "bg-green-500/20 text-green-400"
      : status >= 300 && status < 400
        ? "bg-blue-500/20 text-blue-400"
        : status >= 400
          ? "bg-red-500/20 text-red-400"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums", color)}>
      {status}
    </span>
  );
}

export interface CacheViewProps {
  rpc: (request: StorageRequest) => Promise<StorageResponse>;
  cacheName: string;
  tabId: number;
  frameId: number;
  onNotice?: (tone: "success" | "error" | "info", message: string) => void;
}

export function CacheView({ rpc, cacheName, tabId, frameId, onNotice }: CacheViewProps) {
  const [entries, setEntries] = useState<CacheEntrySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CacheEntrySummary | null>(null);
  const [responseBody, setResponseBody] = useState<CacheResponseBody | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const resp = await rpc({
      type: "readCacheEntries",
      tabId,
      frameId,
      cacheName,
      limit: 500,
      offset: 0
    });
    setLoading(false);
    if (!resp.ok) {
      onNotice?.("error", resp.error);
      return;
    }
    setEntries(resp.data as CacheEntrySummary[]);
  }, [rpc, tabId, frameId, cacheName, onNotice]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const selectEntry = async (entry: CacheEntrySummary) => {
    setSelectedEntry(entry);
    setResponseBody(null);
    setBodyLoading(true);
    const resp = await rpc({
      type: "readCacheResponse",
      tabId,
      frameId,
      cacheName,
      url: entry.url,
      requestMethod: entry.method
    });
    setBodyLoading(false);
    if (!resp.ok) {
      onNotice?.("error", resp.error);
      return;
    }
    setResponseBody(resp.data as CacheResponseBody);
  };

  const deleteEntry = async (entry: CacheEntrySummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const resp = await rpc({
      type: "deleteCacheEntry",
      tabId,
      frameId,
      cacheName,
      url: entry.url,
      requestMethod: entry.method
    });
    if (!resp.ok) {
      onNotice?.("error", resp.error);
      return;
    }
    setEntries((prev) => prev.filter((item) => !(item.url === entry.url && item.method === entry.method)));
    if (selectedEntry?.url === entry.url && selectedEntry?.method === entry.method) {
      setSelectedEntry(null);
      setResponseBody(null);
    }
    onNotice?.("success", "Entry deleted.");
  };

  const clearCache = async () => {
    const resp = await rpc({ type: "clearCache", tabId, frameId, cacheName });
    if (!resp.ok) {
      onNotice?.("error", resp.error);
      return;
    }
    setEntries([]);
    setSelectedEntry(null);
    setResponseBody(null);
    onNotice?.("success", `Cache "${cacheName}" cleared.`);
  };

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = totalHeight - (virtualRows.at(-1)?.end ?? 0);

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-[11px] text-muted-foreground">
        Loading cache entries…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/40 px-3 py-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground/80">{entries.length}</span>
          <span>entries</span>
          <span className="text-border">·</span>
          <span className="truncate font-mono text-foreground/60">{cacheName}</span>
        </div>
        <Button size="xs" variant="destructive" onClick={() => void clearCache()} disabled={entries.length === 0}>
          <Trash2 className="mr-1 size-3" />
          Clear cache
        </Button>
      </div>

      {/* Content: table + optional preview pane */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Entries table */}
        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 overflow-auto bg-background",
            selectedEntry ? "w-1/2" : "flex-1"
          )}
        >
          {entries.length === 0 ? (
            <p className="p-4 text-[11px] text-muted-foreground">No entries in this cache.</p>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  {["URL", "Method", "Status", "Type", "Size", "Date", ""].map((h) => (
                    <th
                      key={h}
                      className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr style={{ height: paddingTop }}>
                    <td colSpan={7} />
                  </tr>
                )}

                {virtualRows.map((vRow) => {
                  const entry = entries[vRow.index];
                  if (!entry) return null;
                  const isSelected = selectedEntry?.url === entry.url && selectedEntry?.method === entry.method;
                  return (
                    <tr
                      key={`${entry.method}:${entry.url}`}
                      style={{ height: ROW_HEIGHT }}
                      className={cn(
                        "cursor-default transition-colors",
                        vRow.index % 2 === 1 && !isSelected && "bg-muted/20",
                        isSelected ? "bg-primary/25" : "hover:bg-muted/60"
                      )}
                      onClick={() => void selectEntry(entry)}
                    >
                      <td className="max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-2 py-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground" title={entry.url}>
                          {entry.url.replace(/^https?:\/\/[^/]+/, "")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {entry.method}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-2 py-0.5">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {entry.contentType || "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatBytes(entry.contentLength)}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {entry.dateHeader ?? "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-border px-1 py-0.5">
                        <button
                          type="button"
                          aria-label="Delete entry"
                          onClick={(e) => void deleteEntry(entry, e)}
                          className="flex size-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-destructive/15 hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {paddingBottom > 0 && (
                  <tr style={{ height: paddingBottom }}>
                    <td colSpan={7} />
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Response body preview */}
        {selectedEntry && (
          <div className="flex w-1/2 min-h-0 flex-col border-l border-border bg-card">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] text-foreground/80" title={selectedEntry.url}>
                  {selectedEntry.method} {selectedEntry.url}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={selectedEntry.status} />
                  <span className="text-[10px] text-muted-foreground">{selectedEntry.statusText}</span>
                  {selectedEntry.contentType && (
                    <span className="text-[10px] text-muted-foreground">{selectedEntry.contentType}</span>
                  )}
                  {selectedEntry.dateHeader && (
                    <span className="text-[10px] text-muted-foreground">{selectedEntry.dateHeader}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => { setSelectedEntry(null); setResponseBody(null); }}
                className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {bodyLoading ? (
                <p className="text-[11px] text-muted-foreground">Loading response body…</p>
              ) : !responseBody ? null : responseBody.kind === "image" ? (
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[10px] text-muted-foreground">{responseBody.contentType}</span>
                  {responseBody.preview.startsWith("data:") && !responseBody.preview.includes("(too large") ? (
                    <img
                      src={responseBody.preview}
                      alt="Cache response preview"
                      className="max-h-64 max-w-full rounded border border-border object-contain"
                    />
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{responseBody.preview}</p>
                  )}
                </div>
              ) : responseBody.kind === "json" ? (
                <pre className="overflow-auto rounded border border-border bg-background px-3 py-2 font-mono text-[10px] leading-5 text-foreground">
                  {responseBody.preview}
                </pre>
              ) : responseBody.kind === "text" ? (
                <pre className="overflow-auto whitespace-pre-wrap rounded border border-border bg-background px-3 py-2 font-mono text-[10px] leading-5 text-foreground">
                  {responseBody.preview}
                </pre>
              ) : (
                <p className="text-[11px] text-muted-foreground">{responseBody.preview}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
