import React from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inferSchema } from "../shared/schemaInfer";
import { toTypeScript, toDexieSchema } from "../shared/schemaExport";
import type { IndexedDbRecord, IndexedDbStoreInfo } from "../shared/types";

type Notice = { tone: "success" | "error" | "info"; message: string } | null;

interface StructureViewProps {
  store: IndexedDbStoreInfo | null;
  rows: IndexedDbRecord[];
  columns: string[];
  onNotice: (notice: Notice) => void;
  onAddColumnFilter?: (column: string) => void;
}

export function StructureView({ store, rows, columns, onNotice, onAddColumnFilter }: StructureViewProps) {
  const inferred = React.useMemo(() => inferSchema(rows), [rows]);

  const copyTs = async () => {
    if (!store) return;
    const text = toTypeScript(store.name, inferred);
    await navigator.clipboard.writeText(text);
    onNotice({ tone: "success", message: "Copied TypeScript interface." });
  };

  const copyDexie = async () => {
    if (!store) return;
    const text = toDexieSchema([store]);
    await navigator.clipboard.writeText(text);
    onNotice({ tone: "success", message: "Copied Dexie schema." });
  };

  if (!store) {
    return <p className="p-3 text-[11px] text-muted-foreground">No store selected.</p>;
  }

  const keyPathDisplay = store.keyPath === null ? "none (out-of-line)" :
    Array.isArray(store.keyPath) ? store.keyPath.join(", ") : store.keyPath;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/50 px-3 py-1.5">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            <span className="text-foreground/60">Primary key:</span>{" "}
            <span className="font-mono text-foreground">{keyPathDisplay}</span>
          </span>
          <span className="h-3 w-px bg-border" />
          <span>
            <span className="text-foreground/60">Auto-increment:</span>{" "}
            <span className="font-mono text-foreground">{String(store.autoIncrement)}</span>
          </span>
          <span className="h-3 w-px bg-border" />
          <span>
            <span className="font-mono tabular-nums text-foreground">{inferred.length}</span>{" "}
            columns
            <span className="text-foreground/60"> · </span>
            <span className="font-mono tabular-nums text-foreground">{store.indexes.length}</span>{" "}
            indexes
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="xs" variant="outline" onClick={() => void copyTs()} className="gap-1">
            <Copy className="size-3" />
            Copy TS
          </Button>
          <Button size="xs" variant="outline" onClick={() => void copyDexie()} className="gap-1">
            <Copy className="size-3" />
            Copy Dexie
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm w-8">#</th>
              <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">column</th>
              <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">type</th>
              <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">nullable</th>
              <th className="sticky top-0 z-10 border-b border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">coverage</th>
            </tr>
          </thead>
          <tbody>
            {inferred.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-2 text-muted-foreground">
                  {rows.length === 0 ? "Load data to infer schema." : "No object-type records found."}
                </td>
              </tr>
            ) : inferred.map((col, i) => (
              <tr
                key={col.name}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => onAddColumnFilter?.(col.name)}
                title={onAddColumnFilter ? "Click to add filter on this column" : undefined}
              >
                <td className="border-b border-r border-border px-2 py-0.5 font-mono tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="border-b border-r border-border px-2 py-0.5 font-mono font-medium text-foreground">{col.name}</td>
                <td className="border-b border-r border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{col.type}</td>
                <td className="border-b border-r border-border px-2 py-0.5 font-mono text-muted-foreground">{col.nullable ? "true" : "false"}</td>
                <td className="border-b border-border px-2 py-0.5 text-muted-foreground">{Math.round(col.coverage * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {store.indexes.length > 0 && (
          <table className="w-full border-collapse border-t border-border text-[11px]">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">index</th>
                <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">on</th>
                <th className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">unique</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm">multiEntry</th>
              </tr>
            </thead>
            <tbody>
              {store.indexes.map((idx) => (
                <tr key={idx.name} className="transition-colors hover:bg-muted/20">
                  <td className="border-b border-r border-border px-2 py-0.5 font-mono text-foreground">{idx.name}</td>
                  <td className="border-b border-r border-border px-2 py-0.5 font-mono text-muted-foreground">
                    {Array.isArray(idx.keyPath) ? idx.keyPath.join(", ") : (idx.keyPath ?? "")}
                  </td>
                  <td className="border-b border-r border-border px-2 py-0.5 font-mono text-muted-foreground">{String(idx.unique)}</td>
                  <td className="border-b border-border px-2 py-0.5 font-mono text-muted-foreground">{String(idx.multiEntry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
