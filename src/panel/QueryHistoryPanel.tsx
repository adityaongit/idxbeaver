import React from "react";
import { Button } from "@/components/ui/button";
import { clearHistory, type HistoryEntry } from "../shared/persisted";
import { JsonHighlight, SqlHighlight } from "./highlight";

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

function queryPreview(text: string): string {
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.store) parts.push(`store: ${String(obj.store)}`);
    if (obj.filter && Object.keys(obj.filter as object).length > 0) parts.push("filter: {…}");
    if (obj.limit) parts.push(`limit: ${String(obj.limit)}`);
    return parts.join(" · ") || text.slice(0, 60);
  } catch {
    return text.slice(0, 60);
  }
}

interface QueryHistoryPanelProps {
  entries: HistoryEntry[];
  origin: string;
  onLoad: (queryText: string) => void;
  onClear: () => void;
}

export function QueryHistoryPanel({ entries, origin, onLoad, onClear }: QueryHistoryPanelProps) {
  const handleClear = async () => {
    await clearHistory(origin);
    onClear();
  };

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-[11px] text-muted-foreground">No history yet. Run a query to start recording.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onLoad(entry.queryText)}
            className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left hover:bg-muted/40"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${entry.ok ? "bg-primary" : "bg-destructive"}`} />
              <span className="min-w-0 flex-1 truncate font-mono text-[10px]">
                {looksLikeJson(entry.queryText) ? (
                  <JsonHighlight text={queryPreview(entry.queryText)} />
                ) : (
                  <SqlHighlight text={queryPreview(entry.queryText)} />
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 pl-3.5 text-[10px] text-muted-foreground">
              <span>{formatRelativeTime(entry.createdAt)}</span>
              {entry.rowCount !== null && <span>· {entry.rowCount} rows</span>}
              {entry.durationMs !== null && <span>· {entry.durationMs}ms</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="shrink-0 border-t border-border px-3 py-1.5">
        <Button size="xs" variant="outline" onClick={() => void handleClear()} className="w-full">
          Clear history
        </Button>
      </div>
    </div>
  );
}
