import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULTS, setPrefs, type Prefs, type Theme } from "../shared/prefs";

const UI_FONTS = [
  { label: "Outfit (default)", value: "Outfit, system-ui, sans-serif" },
  { label: "Inter", value: "Inter Variable, system-ui, sans-serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
  { label: "Custom", value: "custom" },
];

const CELL_FONTS = [
  { label: "Monospace (default)", value: "monospace" },
  { label: "Geist Mono", value: "Geist Mono Variable, ui-monospace, monospace" },
  { label: "JetBrains Mono", value: "JetBrains Mono, ui-monospace, monospace" },
  { label: "SF Mono / Menlo", value: "ui-monospace, Menlo, monospace" },
  { label: "Custom", value: "custom" },
];

interface SettingsDialogProps {
  open: boolean;
  prefs: Prefs;
  onOpenChange: (open: boolean) => void;
  onPrefsChange: (next: Prefs) => void;
}

export function SettingsDialog({ open, prefs, onOpenChange, onPrefsChange }: SettingsDialogProps) {
  const [draft, setDraft] = React.useState<Prefs>(prefs);
  const [customUiFont, setCustomUiFont] = React.useState("");
  const [customCellFont, setCustomCellFont] = React.useState("");

  React.useEffect(() => {
    setDraft(prefs);
  }, [prefs]);

  const patch = (p: Partial<Prefs>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    const uiFont = draft.uiFont === "custom" ? customUiFont || DEFAULTS.uiFont : draft.uiFont;
    const cellFont = draft.cellFont === "custom" ? customCellFont || DEFAULTS.cellFont : draft.cellFont;
    const next = await setPrefs({ ...draft, uiFont, cellFont });
    onPrefsChange(next);
    onOpenChange(false);
  };

  const reset = async () => {
    const next = await setPrefs(DEFAULTS);
    onPrefsChange(next);
    setDraft(DEFAULTS);
  };

  const uiFontIsCustom = !UI_FONTS.some((f) => f.value === draft.uiFont) || draft.uiFont === "custom";
  const cellFontIsCustom = !CELL_FONTS.some((f) => f.value === draft.cellFont) || draft.cellFont === "custom";

  const uiFontSelectValue = uiFontIsCustom ? "custom" : draft.uiFont;
  const cellFontSelectValue = cellFontIsCustom ? "custom" : draft.cellFont;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(440px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-md border-border bg-card p-0 text-card-foreground shadow-2xl">
        <DialogHeader className="border-b border-border px-3 py-2.5">
          <DialogTitle className="text-[13px] font-medium tracking-tight">Settings</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Preferences are saved across sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-auto px-3 py-3">
          <section className="space-y-2">
            <h3 className="section-label">Appearance</h3>
            <Row label="Theme">
              <Select value={draft.theme} onValueChange={(v) => patch({ theme: v as Theme })}>
                <SelectTrigger size="sm" className="h-6 w-40 rounded-sm text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="UI font">
              <Select value={uiFontSelectValue} onValueChange={(v) => patch({ uiFont: v })}>
                <SelectTrigger size="sm" className="h-6 w-40 rounded-sm text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UI_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            {(uiFontSelectValue === "custom" || uiFontIsCustom) && (
              <Row label="UI font (custom)">
                <Input
                  className="h-6 flex-1 rounded-sm font-mono text-[10px]"
                  value={customUiFont || (uiFontIsCustom ? draft.uiFont : "")}
                  onChange={(e) => setCustomUiFont(e.target.value)}
                  placeholder="CSS font-family value"
                />
              </Row>
            )}
            <Row label="UI font size">
              <Input
                type="number"
                className="h-6 w-20 rounded-sm font-mono text-[11px]"
                value={draft.uiFontSize}
                min={8}
                max={24}
                onChange={(e) => patch({ uiFontSize: Number(e.target.value) || DEFAULTS.uiFontSize })}
              />
              <span className="text-[11px] text-muted-foreground">px</span>
            </Row>
            <Row label="Cell font">
              <Select value={cellFontSelectValue} onValueChange={(v) => patch({ cellFont: v })}>
                <SelectTrigger size="sm" className="h-6 w-40 rounded-sm text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CELL_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            {(cellFontSelectValue === "custom" || cellFontIsCustom) && (
              <Row label="Cell font (custom)">
                <Input
                  className="h-6 flex-1 rounded-sm font-mono text-[10px]"
                  value={customCellFont || (cellFontIsCustom ? draft.cellFont : "")}
                  onChange={(e) => setCustomCellFont(e.target.value)}
                  placeholder="CSS font-family value"
                />
              </Row>
            )}
            <Row label="Cell font size">
              <Input
                type="number"
                className="h-6 w-20 rounded-sm font-mono text-[11px]"
                value={draft.cellFontSize}
                min={8}
                max={20}
                onChange={(e) => patch({ cellFontSize: Number(e.target.value) || DEFAULTS.cellFontSize })}
              />
              <span className="text-[11px] text-muted-foreground">px</span>
            </Row>
          </section>

          <section className="space-y-2">
            <h3 className="section-label">Behavior</h3>
            <CheckRow
              label="Confirm destructive actions"
              checked={draft.confirmDestructive}
              onChange={(v) => patch({ confirmDestructive: v })}
            />
            <CheckRow
              label="Show system databases"
              checked={draft.showHiddenSystemDbs}
              onChange={(v) => patch({ showHiddenSystemDbs: v })}
            />
          </section>

          <section className="space-y-2">
            <h3 className="section-label">Sidebar</h3>
            <CheckRow
              label="Show row counts and sizes"
              checked={draft.showStoreSizes}
              onChange={(v) => patch({ showStoreSizes: v })}
            />
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
          <Button variant="outline" size="xs" onClick={() => void reset()}>
            Reset defaults
          </Button>
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="xs" onClick={() => void save()}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="shrink-0 text-[11px] text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3 accent-primary"
      />
    </label>
  );
}
