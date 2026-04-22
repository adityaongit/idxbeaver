import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { detectFormat, parseFile, type ImportFormat } from "../shared/import";
import type { StorageRequest, SerializableValue } from "../shared/types";

type ConflictMode = "merge" | "replace" | "cancel";

const CHUNK_SIZE = 500;

interface ImportDialogProps {
  open: boolean;
  storeName: string;
  dbName: string;
  dbVersion: number;
  frameId: number;
  tabId: number;
  rpc: (req: StorageRequest) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  hasExistingRows: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function formatLabel(f: ImportFormat): string {
  switch (f) {
    case "json": return "JSON";
    case "ndjson": return "NDJSON";
    case "csv": return "CSV";
    case "sql": return "SQL";
    case "zip": return "ZIP Archive";
  }
}

export function ImportDialog({
  open, storeName, dbName, dbVersion, frameId, tabId, rpc,
  hasExistingRows, onClose, onComplete
}: ImportDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<unknown[] | null>(null);
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [fileName, setFileName] = useState("");
  const [conflict, setConflict] = useState<ConflictMode>("merge");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetFile = () => {
    setParsedRows(null);
    setFormat(null);
    setFileName("");
    setError(null);
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const result = await parseFile(file);
      setFormat(result.format);
      setFileName(file.name);
      if (result.format === "zip") {
        setError("ZIP archive import is not yet supported for single-store imports.");
        return;
      }
      setParsedRows(result.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleExecute = async () => {
    if (!parsedRows) return;
    setImporting(true);
    setError(null);
    try {
      if (conflict === "replace") {
        setProgress("Clearing store…");
        const clearRes = await rpc({ type: "clearIndexedDbStore", tabId, frameId, dbName, dbVersion, storeName });
        if (!clearRes.ok) throw new Error(clearRes.error ?? "Failed to clear store");
      }

      for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
        setProgress(`Writing rows ${i + 1}–${Math.min(i + CHUNK_SIZE, parsedRows.length)} of ${parsedRows.length}…`);
        const rows = chunk.map((row) => {
          const obj = row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : { value: row };
          const key = "key" in obj ? (obj.key as SerializableValue) : null;
          const value = "value" in obj ? (obj.value as SerializableValue) : (obj as SerializableValue);
          return { key, value };
        });
        const putRes = await rpc({
          type: "bulkPutIndexedDbRows",
          tabId,
          frameId,
          dbName,
          dbVersion,
          storeName,
          rows,
        });
        if (!putRes.ok) throw new Error(putRes.error ?? "Failed to write rows");
      }

      onComplete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !importing && onClose()}>
      <DialogContent className="max-w-[min(420px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-md border-border bg-card p-0 text-card-foreground shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Import into {storeName}</DialogTitle>
          <DialogDescription>Import rows from a file into the {storeName} object store.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-muted-foreground" />
            <span className="text-[13px] font-medium">Import into {storeName}</span>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={onClose} disabled={importing}>
            <X className="size-3.5" />
          </Button>
        </div>

        <div className="space-y-3 p-3">
          {/* Drop zone */}
          {!parsedRows ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/30"
              )}
            >
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">
                Drop a file or click to browse
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                JSON · NDJSON · CSV · SQL
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".json,.ndjson,.jsonl,.csv,.sql"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
              <div>
                <p className="text-[12px] font-medium">{fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatLabel(format!)} · {parsedRows.length.toLocaleString()} rows
                </p>
              </div>
              <Button variant="ghost" size="icon" className="size-6" onClick={resetFile}>
                <X className="size-3" />
              </Button>
            </div>
          )}

          {/* Conflict resolution (only shown if store has existing rows and file loaded) */}
          {parsedRows && hasExistingRows && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Conflict with existing data:</p>
              <div className="flex gap-1.5">
                {(["merge", "replace", "cancel"] as ConflictMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setConflict(mode)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium capitalize transition-colors",
                      conflict === mode
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {conflict === "merge" && "Rows with matching keys are overwritten; others preserved."}
                {conflict === "replace" && "Store is cleared before import."}
                {conflict === "cancel" && "Import cancelled — no changes made."}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
              {error}
            </p>
          )}

          {progress && (
            <p className="text-[11px] text-muted-foreground">{progress}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-1.5 border-t border-border px-3 py-2">
          <Button variant="outline" size="xs" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={() => void handleExecute()}
            disabled={!parsedRows || conflict === "cancel" || importing}
          >
            {importing ? (progress ?? "Importing…") : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
