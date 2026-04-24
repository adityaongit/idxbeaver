export type Theme = "dark" | "light" | "system";

export type Prefs = {
  theme: Theme;
  uiFont: string;
  cellFont: string;
  tableFont: string;
  cellFontSize: number;
  uiFontSize: number;
  showHiddenSystemDbs: boolean;
  confirmDestructive: boolean;
  showStoreSizes: boolean;
};

export const DEFAULTS: Prefs = {
  theme: "system",
  uiFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
  cellFont: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  tableFont: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  cellFontSize: 18,
  uiFontSize: 18,
  showHiddenSystemDbs: false,
  confirmDestructive: true,
  showStoreSizes: true,
};

const STORAGE_KEY = "prefs.v1";

function mergeWithDefaults(raw: Partial<Prefs>): Prefs {
  return { ...DEFAULTS, ...raw };
}

export async function getPrefs(): Promise<Prefs> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return DEFAULTS;
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const raw = result[STORAGE_KEY] as Partial<Prefs> | undefined;
      resolve(raw ? mergeWithDefaults(raw) : DEFAULTS);
    });
  });
}

export async function setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const current = await getPrefs();
  const next = mergeWithDefaults({ ...current, ...patch });
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: next }, resolve);
    });
  }
  return next;
}

export function watchPrefs(cb: (p: Prefs) => void): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return () => {};
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local" || !(STORAGE_KEY in changes)) return;
    const raw = changes[STORAGE_KEY].newValue as Partial<Prefs> | undefined;
    cb(raw ? mergeWithDefaults(raw) : DEFAULTS);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
