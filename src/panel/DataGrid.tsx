import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../components/ui/context-menu";
import { Pin, PinOff, X } from "lucide-react";
import type { IndexedDbRecord, SerializableValue } from "../shared/types";
import type { InferredColumn } from "../shared/schemaInfer";
import type { UndoCommand } from "../shared/undo";
import { renderCell } from "./cells";

export type DraftRow = {
  values: Record<string, string>;
  outOfLineKey: string;
  activeColumn: string;
  prefill?: Record<string, string>;
};

const KEY_COL_WIDTH = 80;
const DEFAULT_COL_WIDTH = 140;
const MIN_COL_WIDTH = 50;
const ROW_HEIGHT = 24;

function cellEditInitial(record: IndexedDbRecord, column: string): string {
  if (column === "value") {
    const value = record.value.value;
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }
  const value = record.value.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const cell = (value as Record<string, unknown>)[column];
  if (cell === undefined || cell === null) return "";
  if (typeof cell === "string") return cell;
  if (typeof cell === "number" || typeof cell === "boolean") return String(cell);
  return JSON.stringify(cell);
}

function renderColumn(record: IndexedDbRecord, column: string): string {
  if (column === "value") return record.value.preview;
  const value = record.value.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const cell = (value as Record<string, unknown>)[column];
  if (cell && typeof cell === "object" && "preview" in cell && "value" in cell) {
    return String((cell as { preview: string }).preview);
  }
  if (cell === null || typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") return String(cell ?? "");
  if (typeof cell === "undefined") return "";
  return JSON.stringify(cell);
}

function getCellRawValue(record: IndexedDbRecord, column: string): unknown {
  if (column === "value") return record.value.value;
  const value = record.value.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>)[column];
}

function sameIndexedRecord(left: IndexedDbRecord | null, right: IndexedDbRecord): boolean {
  if (!left) return false;
  return JSON.stringify(left.key) === JSON.stringify(right.key);
}

function CellEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  onTabNext,
  onTabPrev,
}: {
  value: string;
  onChange: (next: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onTabNext?: () => void;
  onTabPrev?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
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
          else if (e.key === "Tab") {
            e.preventDefault();
            if (e.shiftKey) onTabPrev?.();
            else onTabNext?.();
          }
        }}
        className="h-5 min-w-0 flex-1 rounded-[2px] border-0 bg-transparent px-1 font-mono text-[11px] text-foreground outline-none ring-1 ring-primary/60 focus:ring-primary"
      />
      <button
        type="button"
        onClick={onCommit}
        className="rounded-[2px] bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
        aria-label="Save cell"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-[2px] px-1 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        aria-label="Cancel edit"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export interface DataGridProps {
  columns: string[];
  indexedRows: IndexedDbRecord[];
  draftRow?: DraftRow | null;
  onDraftChange?: (draft: DraftRow) => void;
  onCommitDraft?: () => void;
  onCancelDraft?: () => void;
  selectedRecord: IndexedDbRecord | null;
  onSelect: (record: IndexedDbRecord) => void;
  onDelete: (record: IndexedDbRecord) => void;
  onSaveCell?: (record: IndexedDbRecord, column: string, rawValue: string) => void | Promise<void>;
  inferredSchema?: InferredColumn[];
  onBulkDelete?: (records: IndexedDbRecord[]) => void;
  onDuplicate?: (record: IndexedDbRecord) => void;
  onPushUndo?: (cmd: UndoCommand) => void;
  storageKey?: string;
}

export function DataGrid({
  columns,
  indexedRows,
  draftRow,
  onDraftChange,
  onCommitDraft,
  onCancelDraft,
  selectedRecord,
  onSelect,
  onDelete,
  onSaveCell,
  inferredSchema,
  onBulkDelete,
  onDuplicate,
  onPushUndo,
  storageKey,
}: DataGridProps) {
  const visibleColumns = columns.length > 0 ? columns : ["value"];

  // Edit state
  const [editing, setEditing] = useState<{ rowKey: string; column: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Bulk selection: Set of JSON.stringify(record.key)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const lastClickedKey = useRef<string | null>(null);

  // Column ops state
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: ["key"] });
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

  // Drag state for column reorder
  const dragColRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Column resize drag
  const resizingCol = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  // Scroll container ref for virtualizer
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: indexedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const schemaMap = useMemo(() => {
    const map = new Map<string, InferredColumn>();
    for (const col of inferredSchema ?? []) map.set(col.name, col);
    return map;
  }, [inferredSchema]);

  // Persist column widths
  useEffect(() => {
    if (!storageKey) return;
    const key = `colwidths:${storageKey}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(key, (result) => {
        const saved = result[key] as Record<string, number> | undefined;
        if (saved) setColumnSizing(saved);
      });
    }
  }, [storageKey]);

  const persistColumnWidths = useCallback(
    (sizing: Record<string, number>) => {
      if (!storageKey || typeof chrome === "undefined" || !chrome.storage?.local) return;
      const key = `colwidths:${storageKey}`;
      chrome.storage.local.set({ [key]: sizing });
    },
    [storageKey]
  );

  // Column resize handlers — currentWidth is read from DOM offsetWidth at drag start
  const startResize = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = { id: colId, startX: e.clientX, startWidth: currentWidth };

    const onMove = (moveEvent: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = moveEvent.clientX - resizingCol.current.startX;
      const newWidth = Math.max(MIN_COL_WIDTH, resizingCol.current.startWidth + delta);
      setColumnSizing((prev) => {
        const next = { ...prev, [resizingCol.current!.id]: newWidth };
        persistColumnWidths(next);
        return next;
      });
    };

    const onUp = () => {
      resizingCol.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Edit helpers
  const beginEdit = (record: IndexedDbRecord, colId: string) => {
    if (!onSaveCell) return;
    setEditing({ rowKey: JSON.stringify(record.key), column: colId });
    setEditDraft(cellEditInitial(record, colId));
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditDraft("");
  };

  const commitEdit = async (record: IndexedDbRecord) => {
    if (!editing || !onSaveCell) return;
    const colId = editing.column;
    const before = getCellRawValue(record, colId) as SerializableValue;
    setEditing(null);
    await onSaveCell(record, colId, editDraft);

    let parsedAfter: SerializableValue;
    try { parsedAfter = JSON.parse(editDraft) as SerializableValue; }
    catch { parsedAfter = editDraft; }

    if (onPushUndo) {
      onPushUndo({
        kind: "putRecord",
        label: `edit ${colId}`,
        key: record.key,
        before,
        after: parsedAfter,
        storeName: "",
        dbName: "",
        dbVersion: 0,
        frameId: 0,
      });
    }
    setEditDraft("");
  };

  const moveEditFocus = async (record: IndexedDbRecord, direction: "next" | "prev") => {
    if (!editing) return;
    const colIdx = visibleColumns.indexOf(editing.column);
    if (colIdx === -1) return;

    await commitEdit(record);

    let nextColIdx: number;
    if (direction === "next") {
      nextColIdx = (colIdx + 1) % visibleColumns.length;
    } else {
      nextColIdx = ((colIdx - 1) + visibleColumns.length) % visibleColumns.length;
    }

    const nextCol = visibleColumns[nextColIdx];
    if (!nextCol) return;
    setEditing({ rowKey: JSON.stringify(record.key), column: nextCol });
    setEditDraft(cellEditInitial(record, nextCol));
  };

  // Bulk selection helpers
  const toggleKey = (key: string, record: IndexedDbRecord, event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      lastClickedKey.current = key;
      return;
    }

    if (event.shiftKey && lastClickedKey.current) {
      const lastIdx = indexedRows.findIndex((r) => JSON.stringify(r.key) === lastClickedKey.current);
      const currIdx = indexedRows.findIndex((r) => JSON.stringify(r.key) === key);
      if (lastIdx !== -1 && currIdx !== -1) {
        const lo = Math.min(lastIdx, currIdx);
        const hi = Math.max(lastIdx, currIdx);
        const rangeKeys = new Set(indexedRows.slice(lo, hi + 1).map((r) => JSON.stringify(r.key)));
        setSelectedKeys(rangeKeys);
        return;
      }
    }

    setSelectedKeys(new Set([key]));
    lastClickedKey.current = key;
    onSelect(record);
  };

  // Keyboard handler for delete/duplicate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedKeys.size === 0) return;
        const selected = indexedRows.filter((r) => selectedKeys.has(JSON.stringify(r.key)));
        onBulkDelete?.(selected);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        if (selectedRecord) onDuplicate?.(selectedRecord);
      }
    };
    const el = scrollRef.current;
    el?.addEventListener("keydown", handler);
    return () => el?.removeEventListener("keydown", handler);
  }, [selectedKeys, indexedRows, onBulkDelete, selectedRecord, onDuplicate]);

  // Column defs — no size here; minWidth is applied via columnSizing in style props
  const columnDefs = useMemo<ColumnDef<IndexedDbRecord>[]>(
    () => [
      {
        id: "key",
        header: "key",
        accessorFn: (row) => JSON.stringify(row.key),
        cell: ({ getValue }) => (
          <span className="font-mono text-muted-foreground tabular-nums">{String(getValue())}</span>
        ),
      },
      ...visibleColumns.map<ColumnDef<IndexedDbRecord>>((col) => ({
        id: col,
        header: col,
        accessorFn: (row) => renderColumn(row, col),
        cell: ({ row }) => {
          const rawValue = getCellRawValue(row.original, col);
          const schemaDef = schemaMap.get(col);
          return renderCell(schemaDef, rawValue);
        },
      })),
    ],
    [visibleColumns, schemaMap]
  );

  const allColIds = useMemo(() => ["key", ...visibleColumns], [visibleColumns]);

  const table = useReactTable({
    data: indexedRows,
    columns: columnDefs,
    state: {
      columnOrder: columnOrder.length > 0 ? columnOrder : allColIds,
      columnPinning,
    },
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = totalHeight - (virtualRows.at(-1)?.end ?? 0);

  const orderedHeaders = table.getHeaderGroups()[0]?.headers ?? [];

  if (indexedRows.length === 0 && !draftRow) {
    return <p className="p-3 text-[11px] text-muted-foreground">No records loaded.</p>;
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto bg-background"
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {orderedHeaders.map((header) => {
              const colId = header.column.id;
              const isPinned = columnPinning.left?.includes(colId);
              const isKey = colId === "key";
              return (
                <ContextMenu key={header.id}>
                  <ContextMenuTrigger asChild>
                    <th
                      className={cn(
                        "group/th sticky top-0 border-b border-r border-border bg-card/95 px-2 py-1 text-left text-[10px] font-medium lowercase tracking-wide text-muted-foreground backdrop-blur-sm last:border-r-0",
                        isPinned && "z-20",
                        !isPinned && "z-10",
                        dragOverCol === colId && "bg-primary/20"
                      )}
                      style={{
                        left: isPinned ? 0 : undefined,
                        position: isPinned ? "sticky" : undefined,
                        minWidth: columnSizing[colId] ?? undefined,
                        whiteSpace: "nowrap",
                      }}
                      draggable={!isKey}
                      onDragStart={(e) => {
                        if ((e.target as HTMLElement).dataset.resizeHandle) { e.preventDefault(); return; }
                        dragColRef.current = colId;
                      }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(colId); }}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={() => {
                        setDragOverCol(null);
                        const src = dragColRef.current;
                        dragColRef.current = null;
                        if (!src || src === colId) return;
                        const order = table.getAllLeafColumns().map((c) => c.id);
                        const srcIdx = order.indexOf(src);
                        const dstIdx = order.indexOf(colId);
                        if (srcIdx === -1 || dstIdx === -1) return;
                        order.splice(srcIdx, 1);
                        order.splice(dstIdx, 0, src);
                        setColumnOrder(order);
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 select-none">
                        <span className="truncate">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {!isKey && (
                          <div
                            data-resize-handle="1"
                            className="cursor-col-resize rounded-full bg-primary/60 opacity-0 transition-opacity group-hover/th:opacity-100"
                            onMouseDown={(e) => startResize(e, colId, (e.currentTarget.closest("th") as HTMLElement).offsetWidth)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ height: 12, minWidth: 3, width: 3 }}
                          />
                        )}
                      </div>
                    </th>
                  </ContextMenuTrigger>
                  {!isKey && (
                    <ContextMenuContent className="w-40">
                      {isPinned ? (
                        <ContextMenuItem
                          onSelect={() => setColumnPinning((prev) => ({
                            ...prev,
                            left: (prev.left ?? []).filter((id) => id !== colId)
                          }))}
                        >
                          <PinOff className="mr-2 size-3" />
                          Unpin column
                        </ContextMenuItem>
                      ) : (
                        <ContextMenuItem
                          onSelect={() => setColumnPinning((prev) => ({
                            ...prev,
                            left: [...(prev.left ?? []), colId]
                          }))}
                        >
                          <Pin className="mr-2 size-3" />
                          Pin column
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* Draft row: always visible, not virtualized */}
          {draftRow && onDraftChange && onCommitDraft && onCancelDraft && (
            <tr className="border-b border-border bg-primary/10 ring-1 ring-inset ring-primary/30">
              <td className="border-r border-border px-2 py-0.5 sticky left-0 bg-primary/10 z-[2]">
                <span className="font-mono text-[10px] text-primary">+</span>
              </td>
              {visibleColumns.map((col) => (
                <td key={col} className="border-r border-border p-0 last:border-r-0">
                  <input
                    autoFocus={col === visibleColumns[0]}
                    value={draftRow.values[col] ?? ""}
                    onChange={(e) => onDraftChange({ ...draftRow, values: { ...draftRow.values, [col]: e.target.value } })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); onCommitDraft(); }
                      else if (e.key === "Escape") { e.preventDefault(); onCancelDraft(); }
                      else if (e.key === "Tab") {
                        e.preventDefault();
                        const colIdx = visibleColumns.indexOf(col);
                        const nextCol = e.shiftKey
                          ? visibleColumns[((colIdx - 1) + visibleColumns.length) % visibleColumns.length]
                          : visibleColumns[(colIdx + 1) % visibleColumns.length];
                        if (nextCol) onDraftChange({ ...draftRow, activeColumn: nextCol });
                      }
                    }}
                    placeholder={col}
                    className="h-5 w-full border-0 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none ring-1 ring-inset ring-primary/40 focus:ring-primary"
                  />
                </td>
              ))}
            </tr>
          )}

          {/* Top padding */}
          {paddingTop > 0 && (
            <tr style={{ height: paddingTop }}>
              <td colSpan={orderedHeaders.length} />
            </tr>
          )}

          {virtualRows.map((vRow) => {
            const row = table.getRowModel().rows[vRow.index];
            if (!row) return null;
            const record = row.original;
            const rowKey = JSON.stringify(record.key);
            const isSelected = sameIndexedRecord(selectedRecord, record);
            const isBulkSelected = selectedKeys.has(rowKey);
            const rowIdx = vRow.index;

            return (
              <ContextMenu key={row.id}>
                <ContextMenuTrigger asChild>
                  <tr
                    style={{ height: ROW_HEIGHT }}
                    className={cn(
                      "group/datarow cursor-default transition-colors",
                      rowIdx % 2 === 1 && !isSelected && !isBulkSelected && "bg-muted/20",
                      isBulkSelected && "bg-primary/15",
                      isSelected && "bg-primary/25",
                      !isSelected && !isBulkSelected && "hover:bg-muted/60"
                    )}
                    onClick={(e) => toggleKey(rowKey, record, e)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const colId = cell.column.id;
                      const isPinned = columnPinning.left?.includes(colId);
                      const isEditing = editing?.rowKey === rowKey && editing.column === colId;
                      const isEditable = Boolean(onSaveCell) && colId !== "key";

                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "overflow-hidden whitespace-nowrap border-b border-r border-border leading-5 last:border-r-0",
                            isEditing ? "p-0" : "text-ellipsis px-2 py-0.5",
                            isPinned && "sticky left-0 z-[2]",
                            isPinned && (isSelected ? "bg-primary/25" : isBulkSelected ? "bg-primary/15" : rowIdx % 2 === 1 ? "bg-muted/20" : "bg-background")
                          )}
                          style={{
                            left: isPinned ? 0 : undefined,
                            minWidth: columnSizing[colId] ?? undefined,
                          }}
                          onDoubleClick={(e) => {
                            if (!isEditable) return;
                            e.stopPropagation();
                            beginEdit(record, colId);
                          }}
                        >
                          {isEditing ? (
                            <CellEditor
                              value={editDraft}
                              onChange={setEditDraft}
                              onCommit={() => void commitEdit(record)}
                              onCancel={cancelEdit}
                              onTabNext={() => void moveEditFocus(record, "next")}
                              onTabPrev={() => void moveEditFocus(record, "prev")}
                            />
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  <ContextMenuItem onSelect={() => onSelect(record)}>
                    Inspect record
                  </ContextMenuItem>
                  {onDuplicate && (
                    <ContextMenuItem onSelect={() => onDuplicate(record)}>
                      Duplicate row
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘D</span>
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                  <ContextMenuItem variant="destructive" onSelect={() => onDelete(record)}>
                    Delete record
                  </ContextMenuItem>
                  {selectedKeys.size > 1 && onBulkDelete && (
                    <ContextMenuItem
                      variant="destructive"
                      onSelect={() => {
                        const recs = indexedRows.filter((r) => selectedKeys.has(JSON.stringify(r.key)));
                        onBulkDelete(recs);
                      }}
                    >
                      Delete {selectedKeys.size} selected
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {/* Bottom padding */}
          {paddingBottom > 0 && (
            <tr style={{ height: paddingBottom }}>
              <td colSpan={orderedHeaders.length} />
            </tr>
          )}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && !draftRow && (
        <p className="p-3 text-[11px] text-muted-foreground">No rows match the filter.</p>
      )}
    </div>
  );
}
