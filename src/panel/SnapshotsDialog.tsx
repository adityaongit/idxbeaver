import React, { useCallback, useEffect, useState } from "react";
import { Camera, ChevronLeft, Clock, Database, RotateCcw, Table2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  appendSnapshotChunk,
  deleteSnapshot,
  getSnapshotRows,
  listSnapshots,
  saveSnapshotManifest,
  type SnapshotManifest,
  type SnapshotScope,
} from "../shared/persisted";
import type { IndexedDbRecord, StorageRequest } from "../shared/types";
import { computeDiff, DiffView, type DiffResult } from "./DiffView";

const CHUNK_SIZE = 5000;

export type SnapshotTarget =
  | { scope: "store"; origin: string; dbName: string; dbVersion: number; storeName: string; frameId: number }
  | { scope: "database"; origin: string; dbName: string; dbVersion: number; frameId: number }
  | { scope: "origin"; origin: string };

interface SnapshotsDialogProps {
  open: boolean;
  target: SnapshotTarget | null;
  rpc: (req: StorageRequest) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  tabId: number;
  onClose: () => void;
  onRestoreComplete?: () => void;
}

type View = "list" | "diff";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function formatBytes(b: number): string {
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

function scopeLabel(m: SnapshotManifest): string {
  if (m.scope === "store" && m.storeName) return m.storeName;
  if (m.scope === "database" && m.dbName) return m.dbName;
  return "origin";
}

async function captureStoreRows(
  rpc: (req: StorageRequest) => Promise<{ ok: boolean; data?: unknown; error?: string }>,
  tabId: number,
  frameId: number,
  dbName: string,
  dbVersion: number,
  storeName: string,
  onProgress: (msg: string) => void
): Promise<IndexedDbRecord[]> {
  const allRows: IndexedDbRecord[] = [];
  let offset = 0;

  while (true) {
    onProgress(`Reading rows ${offset + 1}–${offset + CHUNK_SIZE}…`);
    const res = await rpc({
      type: "readIndexedDbStoreChunk",
      tabId,
      frameId,
      dbName,
      dbVersion,
      storeName,
      offset,
      limit: CHUNK_SIZE,
    });
    if (!res.ok) throw new Error(res.error ?? "Failed to read rows");
    const data = res.data as { rows: IndexedDbRecord[]; total: number | null };
    allRows.push(...data.rows);
    if (data.rows.length < CHUNK_SIZE) break;
    offset += CHUNK_SIZE;
  }
  return allRows;
}

export async function captureSnapshotForStore(
  rpc: (req: StorageRequest) => Promise<{ ok: boolean; data?: unknown; error?: string }>,
  tabId: number,
  target: Extract<SnapshotTarget, { scope: "store" }>,
  label?: string,
  onProgress?: (msg: string) => void
): Promise<SnapshotManifest> {
  const rows = await captureStoreRows(
    rpc, tabId, target.frameId, target.dbName, target.dbVersion, target.storeName,
    onProgress ?? (() => undefined)
  );
  const bytes = JSON.stringify(rows).length * 2;
  const manifest = await saveSnapshotManifest({
    origin: target.origin,
    scope: "store",
    dbName: target.dbName,
    dbVersion: target.dbVersion,
    storeName: target.storeName,
    label,
    bytes,
    entryCount: rows.length,
  });
  let seq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await appendSnapshotChunk(manifest.id, seq++, rows.slice(i, i + CHUNK_SIZE));
  }
  return manifest;
}

export function SnapshotsDialog({ open, target, rpc, tabId, onClose, onRestoreComplete }: SnapshotsDialogProps) {
  const [snapshots, setSnapshots] = useState<SnapshotManifest[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [captureLabel, setCaptureLabel] = useState("");
  const [captureProgress, setCaptureProgress] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffSnapshotId, setDiffSnapshotId] = useState<string | null>(null);

  const origin = target?.origin ?? "";

  const reload = useCallback(async () => {
    if (!origin) return;
    const snaps = await listSnapshots(origin);
    setSnapshots(snaps.filter((s) => {
      if (!target) return true;
      if (target.scope === "store") return s.scope === "store" && s.storeName === target.storeName && s.dbName === target.dbName;
      if (target.scope === "database") return (s.scope === "store" || s.scope === "database") && s.dbName === target.dbName;
      return true;
    }));
  }, [origin, target]);

  useEffect(() => {
    if (open) {
      void reload();
      setView("list");
      setDiffResult(null);
      setError(null);
    }
  }, [open, reload]);

  const handleCapture = async () => {
    if (!target || target.scope !== "store") return;
    setCapturing(true);
    setError(null);
    try {
      await captureSnapshotForStore(rpc, tabId, target, captureLabel.trim() || undefined, setCaptureProgress);
      setCaptureLabel("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCapturing(false);
      setCaptureProgress(null);
    }
  };

  const handleRestore = async (snap: SnapshotManifest) => {
    if (!target || target.scope !== "store" || snap.scope !== "store") return;
    setRestoring(snap.id);
    setError(null);
    try {
      const rows = await getSnapshotRows(snap.id);
      // Clear the store first
      const clearRes = await rpc({
        type: "clearIndexedDbStore",
        tabId,
        frameId: (target as Extract<SnapshotTarget, { scope: "store" }>).frameId,
        dbName: snap.dbName!,
        dbVersion: snap.dbVersion!,
        storeName: snap.storeName!,
      });
      if (!clearRes.ok) throw new Error(clearRes.error ?? "Failed to clear store");
      // Bulk-put rows in chunks
      const tgt = target as Extract<SnapshotTarget, { scope: "store" }>;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const putRes = await rpc({
          type: "bulkPutIndexedDbRows",
          tabId,
          frameId: tgt.frameId,
          dbName: tgt.dbName,
          dbVersion: tgt.dbVersion,
          storeName: tgt.storeName,
          rows: chunk.map((r) => ({ key: r.key, value: r.value.value })),
        });
        if (!putRes.ok) throw new Error(putRes.error ?? "Failed to write rows");
      }
      onRestoreComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestoring(null);
    }
  };

  const handleDiff = async (snap: SnapshotManifest) => {
    if (!target || target.scope !== "store" || snap.scope !== "store") return;
    setError(null);
    try {
      const [snapRows, currentRows] = await Promise.all([
        getSnapshotRows(snap.id),
        captureStoreRows(
          rpc, tabId,
          (target as Extract<SnapshotTarget, { scope: "store" }>).frameId,
          snap.dbName!, snap.dbVersion!, snap.storeName!,
          () => undefined
        ),
      ]);
      setDiffResult(computeDiff(snapRows, currentRows));
      setDiffSnapshotId(snap.id);
      setView("diff");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (snap: SnapshotManifest) => {
    await deleteSnapshot(snap.id);
    if (diffSnapshotId === snap.id) setView("list");
    await reload();
  };

  const diffSnap = snapshots.find((s) => s.id === diffSnapshotId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !capturing && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-[min(680px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-md border-border bg-card p-0 text-card-foreground shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Snapshots</DialogTitle>
          <DialogDescription>Capture, restore, and diff store snapshots.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            {view === "diff" && (
              <Button variant="ghost" size="icon" className="size-6" onClick={() => setView("list")}>
                <ChevronLeft className="size-3.5" />
              </Button>
            )}
            <Camera className="size-4 text-muted-foreground" />
            <span className="text-[13px] font-medium">
              {view === "diff" && diffSnap ? `Diff: ${scopeLabel(diffSnap)}` : "Snapshots"}
            </span>
            {target?.scope === "store" && view === "list" && (
              <span className="text-[11px] text-muted-foreground">
                · {(target as Extract<SnapshotTarget, { scope: "store" }>).storeName}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>

        {view === "diff" && diffResult ? (
          <div className="min-h-0 flex-1">
            <DiffView
              diff={diffResult}
              leftLabel={diffSnap ? formatDate(diffSnap.createdAt) : "Snapshot"}
              rightLabel="Current"
            />
          </div>
        ) : (
          <>
            {/* Capture section (only for store scope) */}
            {target?.scope === "store" && (
              <div className="shrink-0 border-b border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={captureLabel}
                    onChange={(e) => setCaptureLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className="h-7 flex-1 text-[12px]"
                    disabled={capturing}
                    onKeyDown={(e) => { if (e.key === "Enter" && !capturing) void handleCapture(); }}
                  />
                  <Button size="xs" onClick={() => void handleCapture()} disabled={capturing}>
                    <Camera className="size-3" />
                    {capturing ? (captureProgress ?? "Capturing…") : "Capture"}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="shrink-0 border-b border-border bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
                {error}
              </div>
            )}

            {/* Snapshot list */}
            <ScrollArea className="min-h-0 flex-1">
              {snapshots.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-[12px] text-muted-foreground">
                  No snapshots yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {snapshots.map((snap) => (
                    <SnapshotRow
                      key={snap.id}
                      snap={snap}
                      canRestore={target?.scope === "store" && snap.scope === "store"}
                      canDiff={target?.scope === "store" && snap.scope === "store"}
                      restoring={restoring === snap.id}
                      onRestore={() => void handleRestore(snap)}
                      onDiff={() => void handleDiff(snap)}
                      onDelete={() => void handleDelete(snap)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SnapshotRow({
  snap, canRestore, canDiff, restoring,
  onRestore, onDiff, onDelete
}: {
  snap: SnapshotManifest;
  canRestore: boolean;
  canDiff: boolean;
  restoring: boolean;
  onRestore: () => void;
  onDiff: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30">
      <div className="shrink-0 text-muted-foreground">
        {snap.scope === "store" ? <Table2 className="size-3.5" /> : <Database className="size-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-medium">
            {snap.label ?? scopeLabel(snap)}
          </span>
          {snap.label && (
            <span className="truncate text-[11px] text-muted-foreground">({scopeLabel(snap)})</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Clock className="size-2.5" />
            {formatDate(snap.createdAt)}
          </span>
          <span>{snap.entryCount.toLocaleString()} rows</span>
          <span>{formatBytes(snap.bytes)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canDiff && (
          <Button variant="ghost" size="xs" onClick={onDiff} title="Diff vs current">
            Diff
          </Button>
        )}
        {canRestore && (
          <Button variant="ghost" size="xs" onClick={onRestore} disabled={restoring} title="Restore">
            <RotateCcw className="size-3" />
            {restoring ? "…" : "Restore"}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
