import React, { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../components/ui/context-menu";
import { X } from "lucide-react";
import { Button } from "../components/ui/button";
import type { CookieRecord } from "../shared/types";

const ROW_HEIGHT = 24;

const COLUMNS: { id: keyof CookieRecord | "expires"; label: string; width: number }[] = [
  { id: "name", label: "name", width: 160 },
  { id: "value", label: "value", width: 200 },
  { id: "domain", label: "domain", width: 140 },
  { id: "path", label: "path", width: 80 },
  { id: "expires", label: "expires", width: 140 },
  { id: "httpOnly", label: "httpOnly", width: 70 },
  { id: "secure", label: "secure", width: 60 },
  { id: "sameSite", label: "sameSite", width: 80 },
];

function formatExpiry(record: CookieRecord): string {
  if (record.session || record.expirationDate === undefined) return "Session";
  return new Date(record.expirationDate * 1000).toISOString();
}

function renderCell(record: CookieRecord, colId: string): React.ReactNode {
  if (colId === "httpOnly" || colId === "secure") {
    const val = record[colId as "httpOnly" | "secure"];
    return (
      <input
        type="checkbox"
        checked={val}
        readOnly
        className="cursor-default accent-primary"
        onClick={(e) => e.preventDefault()}
      />
    );
  }
  if (colId === "expires") return formatExpiry(record);
  const val = record[colId as keyof CookieRecord];
  return String(val ?? "");
}

type DraftCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

function CellEditor({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (next: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="flex items-center gap-1 bg-background px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onCommit(); }
          else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        className="h-5 min-w-0 flex-1 rounded-[2px] border-0 bg-transparent px-1 font-mono text-[11px] text-foreground outline-none ring-1 ring-primary/60 focus:ring-primary"
      />
      <button
        type="button"
        onClick={onCommit}
        className="rounded-[2px] bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-[2px] px-1 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export interface CookieGridProps {
  rows: CookieRecord[];
  onSaveValue: (record: CookieRecord, newValue: string) => void | Promise<void>;
  onDelete: (record: CookieRecord) => void | Promise<void>;
  onAddRow: (draft: DraftCookie) => void | Promise<void>;
}

export function CookieGrid({ rows, onSaveValue, onDelete, onAddRow }: CookieGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState<{ rowIdx: number; colId: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [draft, setDraft] = useState<DraftCookie>({ name: "", value: "", domain: "", path: "/" });

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = totalHeight - (virtualRows.at(-1)?.end ?? 0);

  const beginEdit = (rowIdx: number, colId: string) => {
    if (colId !== "value") return; // only value is editable
    setEditing({ rowIdx, colId });
    setEditDraft(rows[rowIdx]?.value ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditDraft("");
  };

  const commitEdit = async () => {
    if (!editing) return;
    const record = rows[editing.rowIdx];
    if (!record) return;
    setEditing(null);
    await onSaveValue(record, editDraft);
    setEditDraft("");
  };

  const commitDraft = async () => {
    if (!draft.name.trim()) return;
    await onAddRow(draft);
    setDraft({ name: "", value: "", domain: "", path: "/" });
    setShowDraft(false);
  };

  if (rows.length === 0 && !showDraft) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-muted-foreground">No cookies found for this URL.</p>
        </div>
        <CookieFooter count={0} onAddRow={() => setShowDraft(true)} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto bg-background"
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.id}
                  className="sticky top-0 z-10 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm last:border-r-0"
                  style={{ minWidth: col.width, whiteSpace: "nowrap" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Draft row */}
            {showDraft && (
              <tr className="border-b border-border bg-primary/10 ring-1 ring-inset ring-primary/30">
                <td className="border-r border-border p-0">
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitDraft();
                      else if (e.key === "Escape") { setShowDraft(false); setDraft({ name: "", value: "", domain: "", path: "/" }); }
                    }}
                    placeholder="name"
                    className="h-5 w-full border-0 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none ring-1 ring-inset ring-primary/40 focus:ring-primary"
                  />
                </td>
                <td className="border-r border-border p-0">
                  <input
                    value={draft.value}
                    onChange={(e) => setDraft((prev) => ({ ...prev, value: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitDraft();
                      else if (e.key === "Escape") { setShowDraft(false); setDraft({ name: "", value: "", domain: "", path: "/" }); }
                    }}
                    placeholder="value"
                    className="h-5 w-full border-0 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none ring-1 ring-inset ring-primary/40 focus:ring-primary"
                  />
                </td>
                <td className="border-r border-border p-0">
                  <input
                    value={draft.domain}
                    onChange={(e) => setDraft((prev) => ({ ...prev, domain: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitDraft();
                      else if (e.key === "Escape") { setShowDraft(false); setDraft({ name: "", value: "", domain: "", path: "/" }); }
                    }}
                    placeholder="domain (optional)"
                    className="h-5 w-full border-0 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none ring-1 ring-inset ring-primary/40 focus:ring-primary"
                  />
                </td>
                <td className="border-r border-border p-0">
                  <input
                    value={draft.path}
                    onChange={(e) => setDraft((prev) => ({ ...prev, path: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitDraft();
                      else if (e.key === "Escape") { setShowDraft(false); setDraft({ name: "", value: "", domain: "", path: "/" }); }
                    }}
                    placeholder="/"
                    className="h-5 w-full border-0 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none ring-1 ring-inset ring-primary/40 focus:ring-primary"
                  />
                </td>
                {/* expires, httpOnly, secure, sameSite — not editable in draft */}
                {COLUMNS.slice(4).map((col) => (
                  <td key={col.id} className="border-r border-border px-2 py-0.5 last:border-r-0 text-muted-foreground" />
                ))}
              </tr>
            )}

            {/* Top padding */}
            {paddingTop > 0 && (
              <tr style={{ height: paddingTop }}>
                <td colSpan={COLUMNS.length} />
              </tr>
            )}

            {virtualRows.map((vRow) => {
              const record = rows[vRow.index];
              if (!record) return null;
              const rowIdx = vRow.index;

              return (
                <ContextMenu key={rowIdx}>
                  <ContextMenuTrigger asChild>
                    <tr
                      style={{ height: ROW_HEIGHT }}
                      className={cn(
                        "group/cookierow cursor-default transition-colors",
                        rowIdx % 2 === 1 ? "bg-muted/20" : "",
                        "hover:bg-muted/60"
                      )}
                    >
                      {COLUMNS.map((col) => {
                        const isEditing = editing?.rowIdx === rowIdx && editing.colId === col.id;
                        const isEditable = col.id === "value";

                        return (
                          <td
                            key={col.id}
                            className={cn(
                              "overflow-hidden whitespace-nowrap border-b border-r border-border leading-5 last:border-r-0",
                              isEditing ? "p-0" : "text-ellipsis px-2 py-0.5",
                            )}
                            style={{ minWidth: col.width }}
                            onDoubleClick={() => {
                              if (!isEditable) return;
                              beginEdit(rowIdx, col.id);
                            }}
                          >
                            {isEditing ? (
                              <CellEditor
                                value={editDraft}
                                onChange={setEditDraft}
                                onCommit={() => void commitEdit()}
                                onCancel={cancelEdit}
                              />
                            ) : (
                              renderCell(record, col.id)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuItem onSelect={() => void navigator.clipboard.writeText(record.name)}>
                      Copy name
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => void navigator.clipboard.writeText(record.value)}>
                      Copy value
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem variant="destructive" onSelect={() => void onDelete(record)}>
                      Delete cookie
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

            {/* Bottom padding */}
            {paddingBottom > 0 && (
              <tr style={{ height: paddingBottom }}>
                <td colSpan={COLUMNS.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <CookieFooter count={rows.length} onAddRow={() => setShowDraft(true)} />
    </div>
  );
}

function CookieFooter({ count, onAddRow }: { count: number; onAddRow: () => void }) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card/60 px-3 py-1 text-[11px]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="font-mono tabular-nums text-foreground/80">{count}</span>
        <span>cookies</span>
      </div>
      <Button size="xs" variant="outline" onClick={onAddRow}>
        + Row
      </Button>
    </footer>
  );
}
