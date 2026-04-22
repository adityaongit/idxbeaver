import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { IndexedDbRecord, SerializableValue } from "../shared/types";

export interface DiffRow {
  key: string;
  keyValue: SerializableValue;
  status: "added" | "removed" | "changed";
  left: IndexedDbRecord | null;
  right: IndexedDbRecord | null;
  changedColumns: string[];
}

export interface DiffResult {
  added: DiffRow[];
  removed: DiffRow[];
  changed: DiffRow[];
}

export function computeDiff(left: IndexedDbRecord[], right: IndexedDbRecord[]): DiffResult {
  const leftMap = new Map(left.map((r) => [JSON.stringify(r.key), r]));
  const rightMap = new Map(right.map((r) => [JSON.stringify(r.key), r]));

  const added: DiffRow[] = [];
  const removed: DiffRow[] = [];
  const changed: DiffRow[] = [];

  for (const [k, r] of rightMap) {
    if (!leftMap.has(k)) {
      added.push({ key: k, keyValue: r.key, status: "added", left: null, right: r, changedColumns: [] });
    } else {
      const l = leftMap.get(k)!;
      if (JSON.stringify(l.value.value) !== JSON.stringify(r.value.value)) {
        const lv = l.value.value;
        const rv = r.value.value;
        const changedColumns: string[] = [];
        if (lv && rv && typeof lv === "object" && typeof rv === "object" && !Array.isArray(lv) && !Array.isArray(rv)) {
          const allKeys = new Set([...Object.keys(lv as Record<string, unknown>), ...Object.keys(rv as Record<string, unknown>)]);
          for (const col of allKeys) {
            if (JSON.stringify((lv as Record<string, unknown>)[col]) !== JSON.stringify((rv as Record<string, unknown>)[col])) {
              changedColumns.push(col);
            }
          }
        } else {
          changedColumns.push("value");
        }
        changed.push({ key: k, keyValue: r.key, status: "changed", left: l, right: r, changedColumns });
      }
    }
  }

  for (const [k, l] of leftMap) {
    if (!rightMap.has(k)) {
      removed.push({ key: k, keyValue: l.key, status: "removed", left: l, right: null, changedColumns: [] });
    }
  }

  return { added, removed, changed };
}

type DiffFilter = "all" | "added" | "removed" | "changed";

interface DiffViewProps {
  diff: DiffResult;
  leftLabel: string;
  rightLabel: string;
}

function cellStr(v: SerializableValue | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function truncate(s: string, n = 60): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function DiffView({ diff, leftLabel, rightLabel }: DiffViewProps) {
  const [filter, setFilter] = useState<DiffFilter>("all");

  const rows = useMemo((): DiffRow[] => {
    if (filter === "added") return diff.added;
    if (filter === "removed") return diff.removed;
    if (filter === "changed") return diff.changed;
    return [...diff.removed, ...diff.changed, ...diff.added];
  }, [diff, filter]);

  const total = diff.added.length + diff.removed.length + diff.changed.length;

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
        No differences found — snapshots are identical.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-[12px]">
      {/* Summary bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
        <FilterPill label="All" count={total} active={filter === "all"} onClick={() => setFilter("all")} />
        {diff.added.length > 0 && (
          <FilterPill label="Added" count={diff.added.length} active={filter === "added"} onClick={() => setFilter("added")} color="green" />
        )}
        {diff.removed.length > 0 && (
          <FilterPill label="Removed" count={diff.removed.length} active={filter === "removed"} onClick={() => setFilter("removed")} color="red" />
        )}
        {diff.changed.length > 0 && (
          <FilterPill label="Changed" count={diff.changed.length} active={filter === "changed"} onClick={() => setFilter("changed")} color="amber" />
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {leftLabel} ← → {rightLabel}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid shrink-0 grid-cols-[1fr_1fr_1fr] gap-0 border-b border-border bg-muted/30">
        <div className="px-2 py-1 font-medium text-muted-foreground">Key</div>
        <div className="border-l border-border px-2 py-1 font-medium text-muted-foreground">{leftLabel}</div>
        <div className="border-l border-border px-2 py-1 font-medium text-muted-foreground">{rightLabel}</div>
      </div>

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.map((row) => (
          <DiffRowItem key={row.key} row={row} />
        ))}
      </div>
    </div>
  );
}

function FilterPill({ label, count, active, onClick, color }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: "green" | "red" | "amber";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] tabular-nums transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
        color === "green" && "text-green-500",
        color === "red" && "text-red-500",
        color === "amber" && "text-amber-500"
      )}
    >
      {label} <span className="font-mono">{count}</span>
    </button>
  );
}

function DiffRowItem({ row }: { row: DiffRow }) {
  const bg =
    row.status === "added" ? "bg-green-500/10"
    : row.status === "removed" ? "bg-red-500/10"
    : "bg-amber-500/10";

  const leftVal = row.left ? truncate(cellStr(row.left.value.value)) : "";
  const rightVal = row.right ? truncate(cellStr(row.right.value.value)) : "";
  const keyStr = truncate(typeof row.keyValue === "string" ? row.keyValue : JSON.stringify(row.keyValue), 40);

  return (
    <div className={cn("grid grid-cols-[1fr_1fr_1fr] border-b border-border/50 font-mono text-[11px]", bg)}>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-foreground/70">
        {keyStr}
      </div>
      <div className={cn(
        "overflow-hidden text-ellipsis whitespace-nowrap border-l border-border/50 px-2 py-1",
        row.status === "removed" ? "text-red-400" : "text-muted-foreground"
      )}>
        {row.status === "added" ? <span className="italic text-muted-foreground/40">—</span> : leftVal}
      </div>
      <div className={cn(
        "overflow-hidden text-ellipsis whitespace-nowrap border-l border-border/50 px-2 py-1",
        row.status === "added" ? "text-green-400" : row.status === "changed" ? "text-amber-400" : "text-muted-foreground"
      )}>
        {row.status === "removed" ? <span className="italic text-muted-foreground/40">—</span> : rightVal}
      </div>
    </div>
  );
}
