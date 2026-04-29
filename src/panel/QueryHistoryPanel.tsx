import React, { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearHistory, type HistoryEntry } from "../shared/persisted";
import { JsonHighlight, SqlHighlight } from "./highlight";

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(ms: number): string {
  const today = new Date();
  const d = new Date(ms);
  const isSameDay = d.toDateString() === today.toDateString();
  if (isSameDay) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
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
  const sorted = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt), [entries]);
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; createdAt: number; entries: HistoryEntry[] }>();
    for (const entry of sorted) {
      const key = dayKey(entry.createdAt);
      const bucket = map.get(key);
      if (bucket) {
        bucket.entries.push(entry);
      } else {
        map.set(key, { label: formatDayLabel(entry.createdAt), createdAt: entry.createdAt, entries: [entry] });
      }
    }
    return Array.from(map.entries());
  }, [sorted]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleClear = async () => {
    await clearHistory(origin);
    onClear();
  };

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-[11px] text-muted-foreground">No history yet. Run a query to start recording.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {groups.map(([key, group]) => {
          const isCollapsed = collapsed.has(key);
          return (
            <div key={key} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(key)}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-medium text-foreground hover:bg-muted/30"
              >
                <ChevronRight className={`size-3 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                <span className="flex-1">{group.label}</span>
                <span className="text-[10px] font-normal text-muted-foreground">{group.entries.length}</span>
              </button>
              {!isCollapsed && (
                <div>
                  {group.entries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onLoad(entry.queryText)}
                      className="flex w-full flex-col gap-0.5 border-t border-border/50 px-5 py-1.5 text-left hover:bg-muted/40"
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
                        <span>{formatTime(entry.createdAt)}</span>
                        {entry.rowCount !== null && <span>· {entry.rowCount} rows</span>}
                        {entry.durationMs !== null && <span>· {entry.durationMs}ms</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-border px-3 py-1.5">
        <Button size="xs" variant="outline" onClick={() => void handleClear()} className="w-full">
          Clear history
        </Button>
      </div>
    </div>
  );
}
