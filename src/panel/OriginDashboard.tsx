import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Database, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  CookieRecord,
  StorageDiscovery,
  StorageEstimateResult,
  StoreSummary,
  StorageRequest
} from "../shared/types";

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

interface OriginDashboardProps {
  discovery: StorageDiscovery | null;
  storeSummaries: Map<string, StoreSummary | "loading">;
  rpc: (req: StorageRequest) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  tabId: number;
  onNukeComplete: () => void;
}

export function OriginDashboard({ discovery, storeSummaries, rpc, tabId, onNukeComplete }: OriginDashboardProps) {
  const [estimate, setEstimate] = useState<StorageEstimateResult | null>(null);
  const [staleCookies, setStaleCookies] = useState<CookieRecord[]>([]);
  const [nukeOpen, setNukeOpen] = useState(false);
  const [nukeInput, setNukeInput] = useState("");
  const [nukeProgress, setNukeProgress] = useState<string | null>(null);
  const [nukeDone, setNukeDone] = useState(false);
  const nukeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!discovery) return;
    void rpc({ type: "storageEstimate", tabId }).then((r) => {
      if (r.ok) setEstimate(r.data as StorageEstimateResult);
    });
    // Fetch cookies to check for expired ones
    const url = discovery.url || discovery.origin;
    if (url) {
      void rpc({ type: "readCookies", tabId, url }).then((r) => {
        if (!r.ok) return;
        const rows = (r.data as { rows: CookieRecord[] }).rows;
        const now = Date.now() / 1000;
        setStaleCookies(rows.filter((c) => !c.session && c.expirationDate !== undefined && c.expirationDate < now));
      });
    }
  }, [discovery, rpc, tabId]);

  useEffect(() => {
    if (nukeOpen) {
      setNukeInput("");
      setNukeProgress(null);
      setNukeDone(false);
      setTimeout(() => nukeInputRef.current?.focus(), 50);
    }
  }, [nukeOpen]);

  const handleNuke = useCallback(async () => {
    if (!discovery) return;
    const hostname = (() => {
      try { return new URL(discovery.origin).hostname; } catch { return discovery.origin; }
    })();
    if (nukeInput !== hostname) return;
    setNukeProgress("Clearing cookies…");
    const url = discovery.url || discovery.origin;
    await rpc({ type: "clearCookies", tabId, url }).catch(() => null);
    setNukeProgress("Clearing LocalStorage…");
    await rpc({ type: "clearKeyValue", tabId, surface: "localStorage" }).catch(() => null);
    setNukeProgress("Clearing SessionStorage…");
    await rpc({ type: "clearKeyValue", tabId, surface: "sessionStorage" }).catch(() => null);
    setNukeProgress("Deleting IndexedDB databases…");
    for (const db of discovery.indexedDb) {
      await rpc({ type: "deleteIndexedDbDatabase", tabId, frameId: db.frameId, dbName: db.name }).catch(() => null);
    }
    setNukeProgress("Clearing Cache Storage…");
    for (const cache of discovery.cacheStorage?.caches ?? []) {
      await rpc({ type: "clearCache", tabId, frameId: 0, cacheName: cache.name }).catch(() => null);
    }
    setNukeProgress(null);
    setNukeDone(true);
    onNukeComplete();
  }, [discovery, nukeInput, rpc, tabId, onNukeComplete]);

  if (!discovery) {
    return <p className="p-4 text-xs text-muted-foreground">No storage metadata loaded yet.</p>;
  }

  const hostname = (() => {
    try { return new URL(discovery.origin).hostname; } catch { return discovery.origin; }
  })();

  const stores = discovery.indexedDb.flatMap((db) =>
    db.stores.map((store) => {
      const key = `${db.origin}::${db.name}::v${db.version}::${store.name}`;
      const summary = storeSummaries.get(key);
      return {
        db: db.name, version: db.version, origin: db.origin, frameId: db.frameId,
        name: store.name, count: store.count,
        approxBytes: summary && summary !== "loading" ? summary.approxBytes : null,
      };
    })
  );

  // Sort stores by approxBytes if available, else by count
  const sortedStores = [...stores].sort((a, b) => {
    if (a.approxBytes !== null && b.approxBytes !== null) return b.approxBytes - a.approxBytes;
    if (a.approxBytes !== null) return -1;
    if (b.approxBytes !== null) return 1;
    return (b.count ?? 0) - (a.count ?? 0);
  });

  // Per-surface byte estimates (best-effort)
  const idbBytes = stores.reduce((sum, s) => sum + (s.approxBytes ?? 0), 0);
  const lsBytes = discovery.localStorage.bytes;
  const ssBytes = discovery.sessionStorage.bytes;
  const cookieBytes = discovery.cookies?.bytes ?? 0;
  const cacheBytes = 0; // not easily summed without fetching all entries
  const knownBytes = idbBytes + lsBytes + ssBytes + cookieBytes + cacheBytes;
  const totalBytes = estimate?.usage ?? knownBytes;

  const surfaces: { label: string; bytes: number; count: string }[] = [
    { label: "IndexedDB", bytes: idbBytes, count: `${discovery.indexedDb.length} DBs · ${stores.length} stores` },
    { label: "LocalStorage", bytes: lsBytes, count: `${discovery.localStorage.count} keys` },
    { label: "SessionStorage", bytes: ssBytes, count: `${discovery.sessionStorage.count} keys` },
    { label: "Cookies", bytes: cookieBytes, count: `${discovery.cookies?.count ?? 0} cookies` },
    ...(discovery.cacheStorage?.caches.length ? [{ label: "Cache", bytes: cacheBytes, count: `${discovery.cacheStorage.caches.length} caches` }] : []),
  ].filter((s) => s.bytes > 0 || s.count !== "0 keys");

  const maxSurfaceBytes = Math.max(...surfaces.map((s) => s.bytes), 1);

  const hasStaleData = staleCookies.length > 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">Origin</p>
          <h2 className="font-mono text-sm font-medium">{discovery.origin}</h2>
        </div>
        <Button
          variant="destructive"
          size="xs"
          onClick={() => setNukeOpen(true)}
          className="shrink-0 gap-1"
        >
          <Trash2 className="size-3" />
          Nuke origin
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-2">
        {tile("Total storage", estimate?.usage !== undefined && estimate.usage !== null ? formatBytes(estimate.usage) : formatBytes(knownBytes), estimate?.quota ? `of ${formatBytes(estimate.quota)}` : "estimated")}
        {tile("IndexedDB", String(discovery.indexedDb.length), "databases")}
        {tile("Object stores", String(stores.length), "tables")}
        {tile("Rows (IDB)", formatNum(stores.reduce((s, r) => s + (r.count ?? 0), 0)), "across all stores")}
      </div>

      {/* Per-surface breakdown */}
      <article className="rounded-sm border border-border bg-card">
        <header className="border-b border-border px-3 py-1.5">
          <h3 className="section-label">Storage breakdown</h3>
        </header>
        <div className="divide-y divide-border">
          {surfaces.map((surf) => (
            <div key={surf.label} className="flex items-center gap-3 px-3 py-2">
              <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{surf.label}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(surf.bytes / maxSurfaceBytes * 100, surf.bytes > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{surf.count}</span>
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums">
                {surf.bytes > 0 ? formatBytes(surf.bytes) : "—"}
              </span>
            </div>
          ))}
          {surfaces.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">No storage data available.</p>
          )}
        </div>
      </article>

      {/* Top stores */}
      <article className="rounded-sm border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <h3 className="section-label">Top stores</h3>
          <span className="font-mono text-[10px] text-muted-foreground">by size estimate</span>
        </header>
        <div className="divide-y divide-border">
          {sortedStores.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">No object stores found.</p>
          ) : sortedStores.slice(0, 5).map((store, i) => (
            <div
              key={`${store.origin}::${store.db}::v${store.version}::${store.name}`}
              className="flex items-center justify-between px-3 py-1.5 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-3 text-center font-mono text-[10px] text-muted-foreground/50">{i + 1}</span>
                <Database className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono">
                  <span className="text-muted-foreground">{store.db}</span>
                  <span className="text-border">.</span>
                  <span className="text-foreground">{store.name}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted-foreground tabular-nums">
                {store.count !== null ? <span>{formatNum(store.count)} rows</span> : null}
                {store.approxBytes !== null ? <span>{formatBytes(store.approxBytes)}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </article>

      {/* Stale data */}
      {hasStaleData && (
        <article className="rounded-sm border border-amber-500/30 bg-amber-500/5">
          <header className="flex items-center gap-2 border-b border-amber-500/20 px-3 py-1.5">
            <AlertTriangle className="size-3 text-amber-500" />
            <h3 className="section-label text-amber-600 dark:text-amber-400">Stale data detected</h3>
          </header>
          <div className="divide-y divide-border px-3 py-1">
            {staleCookies.map((c) => (
              <p key={c.name} className="py-1 text-[11px] text-muted-foreground">
                Cookie <span className="font-mono text-foreground">{c.name}</span> expired{" "}
                {c.expirationDate ? new Date(c.expirationDate * 1000).toLocaleDateString() : ""}
              </p>
            ))}
          </div>
        </article>
      )}

      {/* Nuke dialog */}
      <Dialog open={nukeOpen} onOpenChange={(v) => { if (!nukeProgress) setNukeOpen(v); }}>
        <DialogContent className="w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Nuke this origin</DialogTitle>
            <DialogDescription className="text-[11.5px] leading-snug">
              This will permanently delete <strong>all</strong> cookies, LocalStorage, SessionStorage,
              IndexedDB databases, and Cache Storage for <strong className="font-mono">{discovery.origin}</strong>.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {nukeDone ? (
            <div className="py-2 text-center text-[12px] text-muted-foreground">
              Origin cleared. Refresh the page to confirm.
            </div>
          ) : nukeProgress ? (
            <div className="py-2 text-center text-[12px] text-muted-foreground">{nukeProgress}</div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[11.5px] text-muted-foreground">
                Type <span className="font-mono font-medium text-foreground">{hostname}</span> to confirm:
              </p>
              <Input
                ref={nukeInputRef}
                value={nukeInput}
                onChange={(e) => setNukeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && nukeInput === hostname) void handleNuke(); }}
                placeholder={hostname}
                className="font-mono text-[12px]"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={nukeInput !== hostname}
                onClick={() => void handleNuke()}
                className="w-full"
              >
                Delete all data for {hostname}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function tile(label: string, value: string, sub: string) {
  return (
    <article className="flex min-h-0 flex-col justify-between rounded-sm border border-border bg-card px-3 py-2.5">
      <p className="section-label">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <strong className="font-mono text-[20px] font-medium leading-none tabular-nums">{value}</strong>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </article>
  );
}
