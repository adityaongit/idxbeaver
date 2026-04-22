import React from "react";
import { Database, Search, Table2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKeys, SHORTCUTS } from "./shortcuts";
import type { SavedQuery } from "../shared/persisted";
import type { IndexedDbDatabaseInfo } from "../shared/types";

type SelectedNode =
  | { kind: "overview" }
  | { kind: "indexeddb"; dbName: string; dbVersion: number; storeName: string; origin: string; frameId: number }
  | { kind: "kv"; surface: "localStorage" | "sessionStorage" };

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databases: IndexedDbDatabaseInfo[];
  savedQueries: SavedQuery[];
  onOpenNode: (node: SelectedNode, options?: { persist?: boolean }) => void;
  onLoadQuery: (text: string) => void;
  onOpenSettings: () => void;
  onOpenPicker: () => void;
  onToggleFilters: () => void;
  onNewRow: () => void;
  onExport: (format: "json" | "csv") => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  databases,
  savedQueries,
  onOpenNode,
  onLoadQuery,
  onOpenSettings,
  onOpenPicker,
  onToggleFilters,
  onNewRow,
  onExport,
}: CommandPaletteProps) {
  const stores = databases.flatMap((db) =>
    db.stores.map((store) => ({ db, store }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(70vh,36rem)] max-w-[min(580px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground shadow-2xl sm:max-w-[min(580px,calc(100vw-2rem))]"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Search commands, stores, and saved queries.</DialogDescription>
        </DialogHeader>
        <Command className="rounded-none bg-background">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <CommandInput placeholder="Search commands, stores, queries…" className="flex-1 border-0 bg-transparent py-3 text-[13px] outline-none placeholder:text-muted-foreground" />
          </div>
          <CommandList className="max-h-[min(56vh,28rem)] overflow-auto py-1">
            <CommandEmpty className="py-6 text-center text-[12px] text-muted-foreground">
              No results.
            </CommandEmpty>

            {stores.length > 0 && (
              <CommandGroup heading="Object stores">
                {stores.map(({ db, store }) => (
                  <CommandItem
                    key={`${db.origin}::${db.name}::v${db.version}:${store.name}`}
                    value={`store ${db.name} ${store.name} ${db.origin}`}
                    onSelect={() => {
                      onOpenNode({ kind: "indexeddb", dbName: db.name, dbVersion: db.version, storeName: store.name, origin: db.origin, frameId: db.frameId }, { persist: true });
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px]"
                  >
                    <Table2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">
                      <span className="text-muted-foreground">{db.name}</span>
                      <span className="text-foreground/30"> › </span>
                      <span className="font-medium text-foreground">{store.name}</span>
                    </span>
                    {store.count !== null && (
                      <CommandShortcut className="font-mono text-[10px] tabular-nums">{store.count}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {savedQueries.length > 0 && (
              <>
                {stores.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Saved queries">
                  {savedQueries.map((q) => (
                    <CommandItem
                      key={q.id}
                      value={`saved ${q.name} ${q.tags.join(" ")}`}
                      onSelect={() => {
                        onLoadQuery(q.queryText);
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-[12px]"
                    >
                      <Database className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 font-medium">{q.name}</span>
                      {q.tags.length > 0 && (
                        <div className="flex gap-1">
                          {q.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="chip chip--tight">{tag}</span>
                          ))}
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem value="open picker databases" onSelect={() => { onOpenPicker(); onOpenChange(false); }} className="px-3 py-1.5 text-[12px]">
                <Database className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
                Open database picker
                <CommandShortcut>{formatKeys("mod+t")}</CommandShortcut>
              </CommandItem>
              <CommandItem value="filters open" onSelect={() => { onToggleFilters(); onOpenChange(false); }} className="px-3 py-1.5 text-[12px]">
                Open filters
                <CommandShortcut>{formatKeys("mod+f")}</CommandShortcut>
              </CommandItem>
              <CommandItem value="new row inline" onSelect={() => { onNewRow(); onOpenChange(false); }} className="px-3 py-1.5 text-[12px]">
                New inline row
                <CommandShortcut>{formatKeys("mod+n")}</CommandShortcut>
              </CommandItem>
              <CommandItem value="export json" onSelect={() => { onExport("json"); onOpenChange(false); }} className="px-3 py-1.5 text-[12px]">
                Export as JSON
              </CommandItem>
              <CommandItem value="export csv" onSelect={() => { onExport("csv"); onOpenChange(false); }} className="px-3 py-1.5 text-[12px]">
                Export as CSV
              </CommandItem>
              <CommandItem value="settings preferences" onSelect={() => { onOpenSettings(); onOpenChange(false); }} className="px-3 py-1.5 text-[12px]">
                Open settings
                <CommandShortcut>{formatKeys("mod+,")}</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
