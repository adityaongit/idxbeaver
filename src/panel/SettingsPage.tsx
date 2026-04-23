import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
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

interface SettingsPageProps {
  prefs: Prefs;
  onClose: () => void;
  onPrefsChange: (next: Prefs) => void;
}

export function SettingsPage({ prefs, onClose, onPrefsChange }: SettingsPageProps) {
  const [customUiFont, setCustomUiFont] = React.useState("");
  const [customCellFont, setCustomCellFont] = React.useState("");

  const patch = async (p: Partial<Prefs>) => {
    const next = await setPrefs(p);
    onPrefsChange(next);
  };

  const reset = async () => {
    const next = await setPrefs(DEFAULTS);
    onPrefsChange(next);
    setCustomUiFont("");
    setCustomCellFont("");
  };

  const uiFontIsCustom = !UI_FONTS.some((f) => f.value === prefs.uiFont) || prefs.uiFont === "custom";
  const cellFontIsCustom = !CELL_FONTS.some((f) => f.value === prefs.cellFont) || prefs.cellFont === "custom";
  const uiFontSelectValue = uiFontIsCustom ? "custom" : prefs.uiFont;
  const cellFontSelectValue = cellFontIsCustom ? "custom" : prefs.cellFont;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Back">
            <ArrowLeft className="size-3.5" />
          </Button>
          <h2 className="text-[13px] font-medium tracking-tight">Settings</h2>
        </div>
        <Button variant="ghost" size="xs" onClick={() => void reset()} className="text-[11px] text-muted-foreground">
          <RotateCcw className="mr-1.5 size-3" />
          Reset to defaults
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-xl space-y-8 px-6 py-6">

          {/* Appearance */}
          <Section title="Appearance">
            <Row label="Theme">
              <Select value={prefs.theme} onValueChange={(v) => void patch({ theme: v as Theme })}>
                <SelectTrigger size="sm" className="h-7 w-44 rounded-sm text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </Row>

            <Row label="UI font">
              <Select
                value={uiFontSelectValue}
                onValueChange={(v) => {
                  if (v !== "custom") void patch({ uiFont: v });
                  else void patch({ uiFont: customUiFont || DEFAULTS.uiFont });
                }}
              >
                <SelectTrigger size="sm" className="h-7 w-44 rounded-sm text-[11px]">
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
              <Row label="Custom UI font">
                <Input
                  className="h-7 w-64 rounded-sm font-mono text-[10px]"
                  value={customUiFont || (uiFontIsCustom ? prefs.uiFont : "")}
                  onChange={(e) => {
                    setCustomUiFont(e.target.value);
                    void patch({ uiFont: e.target.value || DEFAULTS.uiFont });
                  }}
                  placeholder="CSS font-family value"
                />
              </Row>
            )}

            <Row label="UI font size">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  className="h-7 w-20 rounded-sm font-mono text-[11px]"
                  value={prefs.uiFontSize}
                  min={8}
                  max={24}
                  onChange={(e) => void patch({ uiFontSize: Number(e.target.value) || DEFAULTS.uiFontSize })}
                />
                <span className="text-[11px] text-muted-foreground">px</span>
              </div>
            </Row>

            <Row label="Cell font">
              <Select
                value={cellFontSelectValue}
                onValueChange={(v) => {
                  if (v !== "custom") void patch({ cellFont: v });
                  else void patch({ cellFont: customCellFont || DEFAULTS.cellFont });
                }}
              >
                <SelectTrigger size="sm" className="h-7 w-44 rounded-sm text-[11px]">
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
              <Row label="Custom cell font">
                <Input
                  className="h-7 w-64 rounded-sm font-mono text-[10px]"
                  value={customCellFont || (cellFontIsCustom ? prefs.cellFont : "")}
                  onChange={(e) => {
                    setCustomCellFont(e.target.value);
                    void patch({ cellFont: e.target.value || DEFAULTS.cellFont });
                  }}
                  placeholder="CSS font-family value"
                />
              </Row>
            )}

            <Row label="Cell font size">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  className="h-7 w-20 rounded-sm font-mono text-[11px]"
                  value={prefs.cellFontSize}
                  min={8}
                  max={20}
                  onChange={(e) => void patch({ cellFontSize: Number(e.target.value) || DEFAULTS.cellFontSize })}
                />
                <span className="text-[11px] text-muted-foreground">px</span>
              </div>
            </Row>
          </Section>

          {/* Behavior */}
          <Section title="Behavior">
            <CheckRow
              label="Confirm destructive actions"
              description="Show a confirmation dialog before deleting or clearing stores."
              checked={prefs.confirmDestructive}
              onChange={(v) => void patch({ confirmDestructive: v })}
            />
            <CheckRow
              label="Show system databases"
              description="Include internal browser databases (e.g. IndexedDB created by extensions)."
              checked={prefs.showHiddenSystemDbs}
              onChange={(v) => void patch({ showHiddenSystemDbs: v })}
            />
          </Section>

          {/* Sidebar */}
          <Section title="Sidebar">
            <CheckRow
              label="Show row counts and sizes"
              description="Display estimated row counts and storage sizes next to each store in the sidebar."
              checked={prefs.showStoreSizes}
              onChange={(v) => void patch({ showStoreSizes: v })}
            />
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="section-label mb-3">{title}</h3>
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-[12px] text-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <p className="text-[12px] text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-primary"
      />
    </label>
  );
}
