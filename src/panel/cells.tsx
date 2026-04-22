import React, { useState } from "react";
import type { InferredColumn, InferredType } from "../shared/schemaInfer";
import type { SerializableValue } from "../shared/types";

function formatDate(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return value;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function BlobCell({ value }: { value: { type: string; size?: number; preview?: string } }) {
  const [open, setOpen] = useState(false);
  const size = value.size ?? 0;
  const label = `<Blob ${formatBytes(size)} ${value.type}>`;
  return (
    <>
      <button
        type="button"
        className="font-mono text-[10px] text-muted-foreground underline-offset-2 hover:underline"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] max-w-[80vw] overflow-auto rounded-md border border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {value.type.startsWith("image/") && value.preview ? (
              <img src={value.preview} alt="Blob preview" className="max-h-[70vh] max-w-full" />
            ) : (
              <pre className="font-mono text-[11px] text-foreground">{value.preview ?? label}</pre>
            )}
            <button
              type="button"
              className="mt-3 rounded-sm border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CollapseCell({ value }: { value: SerializableValue }) {
  const [expanded, setExpanded] = useState(false);
  const isArr = Array.isArray(value);
  const preview = isArr
    ? `[${(value as unknown[]).length}]`
    : `{${Object.keys(value as Record<string, unknown>).slice(0, 3).join(", ")}…}`;

  if (expanded) {
    return (
      <button
        type="button"
        className="text-left font-mono text-[10px] text-foreground/80"
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
      >
        {JSON.stringify(value, null, 1)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
      onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
    >
      {preview}
    </button>
  );
}

export function renderCell(col: InferredColumn | undefined, rawValue: unknown): React.ReactNode {
  const type: InferredType = col?.type ?? "mixed";

  if (rawValue === null || rawValue === undefined) {
    return <span className="font-mono text-[11px] italic text-muted-foreground/60">null</span>;
  }

  if (
    type === "number" || type === "integer" ||
    (type === "mixed" && typeof rawValue === "number")
  ) {
    return (
      <span className="font-mono text-[11px] tabular-nums text-right block text-foreground">
        {String(rawValue)}
      </span>
    );
  }

  if (type === "boolean" || (type === "mixed" && typeof rawValue === "boolean")) {
    const bool = rawValue as boolean;
    return (
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0 font-mono text-[10px] font-medium ${
          bool
            ? "bg-green-500/20 text-green-600 dark:text-green-400"
            : "bg-muted/60 text-muted-foreground"
        }`}
      >
        {bool ? "true" : "false"}
      </span>
    );
  }

  if (type === "date" || (type === "mixed" && typeof rawValue === "string" && /^\d{4}-\d{2}-\d{2}/.test(rawValue as string))) {
    return (
      <span title={String(rawValue)} className="font-mono text-[11px] text-foreground">
        {formatDate(String(rawValue))}
      </span>
    );
  }

  if (
    typeof rawValue === "object" &&
    rawValue !== null &&
    "type" in rawValue &&
    ((rawValue as { type: string }).type.startsWith("image/") ||
      (rawValue as { type: string }).type === "blob")
  ) {
    return <BlobCell value={rawValue as { type: string; size?: number; preview?: string }} />;
  }

  if (type === "array" || type === "object" || (typeof rawValue === "object" && rawValue !== null)) {
    return <CollapseCell value={rawValue as SerializableValue} />;
  }

  return (
    <span className="font-mono text-[11px] text-foreground">{String(rawValue)}</span>
  );
}
