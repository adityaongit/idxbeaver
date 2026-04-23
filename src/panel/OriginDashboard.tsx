import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import type {
  CookieRecord,
  StorageDiscovery,
  StorageEstimateResult,
  StoreSummary,
  StorageRequest
} from "../shared/types";

function fmtBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function fmtNum(n: number): string {
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
    const hostname = (() => { try { return new URL(discovery.origin).hostname; } catch { return discovery.origin; } })();
    if (nukeInput !== hostname) return;
    const url = discovery.url || discovery.origin;
    setNukeProgress("Clearing cookies…");
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

  const hostname = (() => { try { return new URL(discovery.origin).hostname; } catch { return discovery.origin; } })();

  const stores = discovery.indexedDb.flatMap((db) =>
    db.stores.map((store) => {
      const key = `${db.origin}::${db.name}::v${db.version}::${store.name}`;
      const summary = storeSummaries.get(key);
      return {
        db: db.name, version: db.version, origin: db.origin,
        name: store.name, count: store.count,
        approxBytes: summary && summary !== "loading" ? summary.approxBytes : null,
      };
    })
  );

  const sortedStores = [...stores].sort((a, b) => {
    if (a.approxBytes !== null && b.approxBytes !== null) return b.approxBytes - a.approxBytes;
    if (a.approxBytes !== null) return -1;
    if (b.approxBytes !== null) return 1;
    return (b.count ?? 0) - (a.count ?? 0);
  });

  const idbBytes = stores.reduce((s, r) => s + (r.approxBytes ?? 0), 0);
  const lsBytes = discovery.localStorage.bytes;
  const ssBytes = discovery.sessionStorage.bytes;
  const cookieBytes = discovery.cookies?.bytes ?? 0;
  const knownBytes = idbBytes + lsBytes + ssBytes + cookieBytes;
  const totalBytes = estimate?.usage ?? knownBytes;
  const quota = estimate?.quota ?? null;

  type SurfaceRow = { label: string; bytes: number; detail: string };
  const surfaceRows: SurfaceRow[] = [
    { label: "IndexedDB", bytes: idbBytes, detail: `${discovery.indexedDb.length} db · ${stores.length} stores` },
    { label: "LocalStorage", bytes: lsBytes, detail: `${discovery.localStorage.count} keys` },
    { label: "SessionStorage", bytes: ssBytes, detail: `${discovery.sessionStorage.count} keys` },
    { label: "Cookies", bytes: cookieBytes, detail: `${discovery.cookies?.count ?? 0} cookies` },
    ...(discovery.cacheStorage?.caches.length
      ? [{ label: "Cache", bytes: 0, detail: `${discovery.cacheStorage.caches.length} caches` }]
      : []),
  ];
  const maxBytes = Math.max(...surfaceRows.map((r) => r.bytes), 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="flex flex-col gap-4 p-3">
        {/* Compact stats row */}
        <div className={`grid divide-x divide-border rounded-sm border border-border bg-card text-[11px] ${quota !== null ? "grid-cols-5" : "grid-cols-4"}`}>
          <StatCell label="Total storage" value={fmtBytes(totalBytes)} />
          {quota !== null && <StatCell label="Quota" value={fmtBytes(quota)} />}
          <StatCell label="IndexedDB" value={`${discovery.indexedDb.length}`} sub="databases" />
          <StatCell label="Object stores" value={`${stores.length}`} />
          <StatCell label="Total rows" value={fmtNum(stores.reduce((s, r) => s + (r.count ?? 0), 0))} />
        </div>

        {/* Surface breakdown */}
        <section>
          <h3 className="section-label mb-2">Storage breakdown</h3>
          <div className="rounded-sm border border-border bg-card">
            {surfaceRows.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center gap-3 px-3 py-1.5 text-[11px] ${i > 0 ? "border-t border-border" : ""}`}
              >
                <span className="w-24 shrink-0 text-muted-foreground">{row.label}</span>
                <div className="min-w-0 flex-1">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all"
                      style={{ width: `${row.bytes > 0 ? Math.max(row.bytes / maxBytes * 100, 2) : 0}%` }}
                    />
                  </div>
                </div>
                <span className="w-20 shrink-0 text-right font-mono tabular-nums text-muted-foreground">
                  {row.bytes > 0 ? fmtBytes(row.bytes) : row.detail}
                </span>
                {row.bytes > 0 && (
                  <span className="w-20 shrink-0 text-right text-muted-foreground/60">{row.detail}</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Top stores */}
        <section>
          <h3 className="section-label mb-2">Top stores</h3>
          <div className="rounded-sm border border-border bg-card">
            {sortedStores.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">No object stores found.</p>
            ) : sortedStores.slice(0, 5).map((store, i) => (
              <div
                key={`${store.origin}::${store.db}::v${store.version}::${store.name}`}
                className={`flex items-center justify-between px-3 py-1.5 text-[11px] ${i > 0 ? "border-t border-border" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-3 shrink-0 text-center font-mono text-[10px] text-muted-foreground/40">{i + 1}</span>
                  <span className="truncate font-mono">
                    <span className="text-muted-foreground">{store.db}.</span>
                    <span className="text-foreground">{store.name}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-muted-foreground tabular-nums">
                  {store.count !== null && <span>{fmtNum(store.count)} rows</span>}
                  {store.approxBytes !== null && <span>{fmtBytes(store.approxBytes)}</span>}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Stale data */}
        {staleCookies.length > 0 && (
          <section>
            <h3 className="section-label mb-2 flex items-center gap-1.5">
              <AlertTriangle className="size-3 text-amber-500" />
              Stale cookies
            </h3>
            <div className="rounded-sm border border-amber-500/20 bg-amber-500/5">
              {staleCookies.map((c, i) => (
                <div
                  key={c.name}
                  className={`flex items-center justify-between px-3 py-1.5 text-[11px] ${i > 0 ? "border-t border-amber-500/10" : ""}`}
                >
                  <span className="font-mono text-foreground/80">{c.name}</span>
                  <span className="text-muted-foreground">
                    expired {c.expirationDate ? new Date(c.expirationDate * 1000).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="border-t border-border pt-3">
          <h3 className="section-label mb-2 text-destructive/70">Danger zone</h3>
          <div className="flex items-center justify-between rounded-sm border border-destructive/20 bg-card px-3 py-2 text-[11px]">
            <span className="text-muted-foreground">Permanently delete all storage for this origin</span>
            <Button
              variant="outline"
              size="xs"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setNukeOpen(true)}
            >
              Nuke origin…
            </Button>
          </div>
        </section>
      </div>

      {/* Nuke dialog */}
      <Dialog open={nukeOpen} onOpenChange={(v) => { if (!nukeProgress) setNukeOpen(v); }}>
        <DialogContent className="w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete all storage?</DialogTitle>
            <DialogDescription className="text-[11.5px] leading-relaxed">
              Permanently deletes all cookies, LocalStorage, SessionStorage, IndexedDB
              databases, and Cache Storage for{" "}
              <span className="break-all font-mono text-foreground">{hostname}</span>.
              {" "}Cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {nukeDone ? (
            <p className="py-1 text-center text-[12px] text-muted-foreground">
              Done. Reload the page to confirm.
            </p>
          ) : nukeProgress ? (
            <p className="py-1 text-center text-[12px] text-muted-foreground">{nukeProgress}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[11.5px] text-muted-foreground">
                Type the hostname to confirm:
                <span className="mt-0.5 block break-all font-mono text-[11px] text-foreground">{hostname}</span>
              </p>
              <Input
                ref={nukeInputRef}
                value={nukeInput}
                onChange={(e) => setNukeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && nukeInput === hostname) void handleNuke(); }}
                placeholder={hostname}
                className="font-mono text-[11px]"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={nukeInput !== hostname}
                onClick={() => void handleNuke()}
                className="w-full"
              >
                Delete all data
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <span className="section-label">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <strong className="font-mono text-[16px] font-medium leading-tight tabular-nums">{value}</strong>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}
