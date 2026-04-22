import React, { useState } from "react";
import { Pencil, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { deleteSavedQuery, updateSavedQuery, type SavedQuery } from "../shared/persisted";

interface SavedQueriesPanelProps {
  queries: SavedQuery[];
  onLoad: (queryText: string, id: string) => void;
  onMutated: () => void;
}

export function SavedQueriesPanel({ queries, onLoad, onMutated }: SavedQueriesPanelProps) {
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? queries.filter(
        (q) =>
          q.name.toLowerCase().includes(needle) ||
          q.tags.some((t) => t.toLowerCase().includes(needle))
      )
    : queries;

  const handleDelete = async (id: string) => {
    await deleteSavedQuery(id);
    onMutated();
  };

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (name) await updateSavedQuery(id, { name });
    setRenaming(null);
    setRenameValue("");
    onMutated();
  };

  const startRename = (q: SavedQuery) => {
    setRenaming(q.id);
    setRenameValue(q.name);
  };

  if (queries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-[11px] text-muted-foreground">No saved queries. Press ⌘S in the editor to save one.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name or tag…"
          className="h-6 rounded-sm text-[10px]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">No matches.</p>
        )}
        {filtered.map((q) => (
          <ContextMenu key={q.id}>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                onDoubleClick={() => onLoad(q.queryText, q.id)}
                onClick={() => onLoad(q.queryText, q.id)}
                className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left hover:bg-muted/40"
              >
                {renaming === q.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(q.id);
                      else if (e.key === "Escape") { setRenaming(null); }
                    }}
                    onBlur={() => void handleRename(q.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded-sm border border-border bg-background px-1 py-0.5 font-mono text-[11px] text-foreground outline-none ring-1 ring-primary/60"
                  />
                ) : (
                  <span className="truncate text-[11px] font-medium text-foreground">{q.name}</span>
                )}
                {q.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-0">
                    {q.tags.map((tag) => (
                      <span key={tag} className="chip chip--tight">{tag}</span>
                    ))}
                  </div>
                )}
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-44">
              <ContextMenuItem onSelect={() => startRename(q)}>
                <Pencil className="mr-2 size-3" />
                Rename
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive" onSelect={() => void handleDelete(q.id)}>
                <Trash2 className="mr-2 size-3" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
}
