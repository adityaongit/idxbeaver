import { useState, useRef, useEffect } from "react";
import type { QueryTab } from "../shared/types";

interface QueryTabsStripProps {
  tabs: QueryTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  isDirty: (tab: QueryTab) => boolean;
}

export function QueryTabsStrip({ tabs, activeId, onSelect, onClose, onNew, onRename, isDirty }: QueryTabsStripProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (tab: QueryTab) => {
    setEditingId(tab.id);
    setDraftName(tab.name);
  };

  const commitRename = () => {
    if (editingId) {
      const trimmed = draftName.trim();
      if (trimmed) onRename(editingId, trimmed);
      setEditingId(null);
    }
  };

  return (
    <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-border bg-card/40">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const dirty = isDirty(tab);
        return (
          <div
            key={tab.id}
            className={`group relative flex min-w-[120px] max-w-[200px] cursor-pointer items-center gap-1.5 border-r border-border px-3 py-1.5 text-[11px] ${
              active ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:bg-muted/30"
            }`}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => startRename(tab)}
          >
            {dirty && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="unsaved" />}
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate" title={tab.name}>
                {tab.name}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className="ml-1 grid size-4 shrink-0 place-items-center rounded text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
              aria-label={`Close ${tab.name}`}
              title="Close tab (⌘X)"
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        className="grid size-8 shrink-0 place-items-center text-muted-foreground hover:bg-muted/30 hover:text-foreground"
        aria-label="New query tab"
        title="New query tab (⌘J or ⌘E)"
      >
        +
      </button>
    </div>
  );
}
