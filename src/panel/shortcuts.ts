export const SHORTCUTS = [
  { id: "cmd-palette",     keys: "mod+k",           label: "Command palette" },
  { id: "new-tab",         keys: "mod+shift+t",     label: "Open database picker" },
  { id: "run-query",       keys: "mod+enter",       label: "Run query" },
  { id: "save-query",      keys: "mod+s",           label: "Save current query" },
  { id: "new-query-tab",   keys: "mod+j",           label: "New query tab" },
  { id: "open-query",      keys: "mod+e",           label: "Open query workspace / new tab" },
  { id: "close-query-tab", keys: "mod+x",           label: "Close active tab" },
  { id: "open-filters",    keys: "mod+shift+f",     label: "Open filters" },
  { id: "new-row",         keys: "mod+shift+n",     label: "New inline row" },
  { id: "export",          keys: "mod+shift+e",     label: "Export current view" },
  { id: "delete-selected", keys: "mod+backspace",   label: "Delete selected row" },
  { id: "commit-cell",     keys: "enter",           label: "Commit cell edit" },
  { id: "cancel",          keys: "escape",          label: "Cancel / close" },
  { id: "settings",        keys: "mod+,",           label: "Open settings" },
  { id: "help",            keys: "?",               label: "Keyboard shortcuts" },
] as const;

export type ShortcutId = typeof SHORTCUTS[number]["id"];

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

export function formatKeys(keys: string): string {
  return keys
    .replace("mod", isMac ? "⌘" : "Ctrl")
    .replace("shift", "⇧")
    .replace("enter", "↵")
    .replace("backspace", "⌫")
    .replace("escape", "Esc")
    .replace("+", "");
}

export function matchesShortcut(event: KeyboardEvent, keys: string): boolean {
  const parts = keys.split("+");
  const needsMod = parts.includes("mod");
  const needsShift = parts.includes("shift");
  const key = parts[parts.length - 1];

  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  if (needsMod && !modPressed) return false;
  if (!needsMod && modPressed) return false;
  if (needsShift && !event.shiftKey) return false;
  if (!needsShift && event.shiftKey && needsMod) return false;

  const eventKey = event.key.toLowerCase();
  const targetKey = key.toLowerCase();

  if (targetKey === "enter" && eventKey !== "enter") return false;
  if (targetKey === "backspace" && eventKey !== "backspace") return false;
  if (targetKey === "escape" && eventKey !== "escape") return false;
  if (targetKey === "," && eventKey !== ",") return false;
  if (targetKey === "k" && eventKey !== "k") return false;
  if (targetKey === "t" && eventKey !== "t") return false;
  if (targetKey === "s" && eventKey !== "s") return false;
  if (targetKey === "f" && eventKey !== "f") return false;
  if (targetKey === "n" && eventKey !== "n") return false;
  if (targetKey === "e" && eventKey !== "e") return false;
  if (targetKey === "w" && eventKey !== "w") return false;
  if (targetKey === "x" && eventKey !== "x") return false;
  if (targetKey === "j" && eventKey !== "j") return false;
  if (targetKey === "?" && eventKey !== "?") return false;

  return true;
}
