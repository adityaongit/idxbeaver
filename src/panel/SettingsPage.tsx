import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Palette, Sliders, PanelLeft } from "lucide-react";
import { DEFAULTS, setPrefs, type Prefs, type Theme } from "../shared/prefs";

const UI_FONTS = [
  { label: "System (default)", value: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif" },
  { label: "Inter", value: "Inter Variable, system-ui, sans-serif" },
  { label: "Outfit", value: "Outfit, system-ui, sans-serif" },
  { label: "Custom", value: "custom" },
];

const CELL_FONTS = [
  { label: "SF Mono / Menlo (default)", value: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
  { label: "System Sans", value: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif" },
  { label: "Geist Mono", value: "Geist Mono Variable, ui-monospace, monospace" },
  { label: "JetBrains Mono", value: "JetBrains Mono, ui-monospace, monospace" },
  { label: "Inter", value: "Inter Variable, system-ui, sans-serif" },
  { label: "Custom", value: "custom" },
];

interface SettingsPageProps {
  prefs: Prefs;
  onClose: () => void;
  onPrefsChange: (next: Prefs) => void;
}

type SectionId = "appearance" | "behavior" | "sidebar";

const SECTIONS: {
  id: SectionId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "appearance", label: "Appearance", description: "Theme, fonts, and sizing.", icon: Palette },
  { id: "behavior", label: "Behavior", description: "Confirmations and discovery rules.", icon: Sliders },
  { id: "sidebar", label: "Sidebar", description: "Density and metadata.", icon: PanelLeft },
];

export function SettingsPage({ prefs, onClose, onPrefsChange }: SettingsPageProps) {
  const [customUiFont, setCustomUiFont] = React.useState("");
  const [customCellFont, setCustomCellFont] = React.useState("");
  const [active, setActive] = React.useState<SectionId>("appearance");

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

  const activeSection = SECTIONS.find((s) => s.id === active)!;

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
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void reset()}
          className="h-6 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Reset to defaults
        </Button>
      </div>

      {/* Two-column body */}
      <div className="flex min-h-0 flex-1">
        {/* Left rail navigation */}
        <nav
          aria-label="Settings sections"
          className="flex w-[200px] shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar px-2 py-3"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={
                  "group relative flex h-7 items-center gap-2 rounded-md px-2 text-left text-[12px] transition-colors " +
                  (isActive
                    ? "bg-[color:var(--sidebar-row-hover)] text-foreground"
                    : "text-muted-foreground hover:bg-[color:var(--sidebar-row-hover)] hover:text-foreground")
                }
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-r-full transition-opacity"
                  style={{
                    backgroundColor: "var(--brand-accent)",
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <Icon className="size-3.5 shrink-0 opacity-80" />
                <span className="font-medium tracking-tight">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active section content */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[640px] px-6 py-5">
            <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-[color:var(--hairline)] pb-2.5">
              <h3 className="section-label">{activeSection.label}</h3>
              <p className="text-[11px] text-muted-foreground">{activeSection.description}</p>
            </header>

            {active === "appearance" && (
              <>
                <Row label="Theme">
                  <Select value={prefs.theme} onValueChange={(v) => void patch({ theme: v as Theme })}>
                    <SelectTrigger size="sm" className="settings-control h-7 w-44 text-[11.5px]">
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
                    <SelectTrigger size="sm" className="settings-control h-7 w-44 text-[11.5px]">
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
                      className="settings-control h-7 w-64 font-mono text-[10.5px]"
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
                  <NumberInput
                    value={prefs.uiFontSize}
                    min={8}
                    max={24}
                    unit="px"
                    onChange={(n) => void patch({ uiFontSize: n })}
                  />
                </Row>

                <Row label="Cell font">
                  <Select
                    value={cellFontSelectValue}
                    onValueChange={(v) => {
                      if (v !== "custom") void patch({ cellFont: v });
                      else void patch({ cellFont: customCellFont || DEFAULTS.cellFont });
                    }}
                  >
                    <SelectTrigger size="sm" className="settings-control h-7 w-44 text-[11.5px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CELL_FONTS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>

                <Row label="Data table font">
                  <Select
                    value={CELL_FONTS.some((f) => f.value === prefs.tableFont) ? prefs.tableFont : "custom"}
                    onValueChange={(v) => {
                      if (v !== "custom") void patch({ tableFont: v });
                    }}
                  >
                    <SelectTrigger size="sm" className="settings-control h-7 w-44 text-[11.5px]">
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
                      className="settings-control h-7 w-64 font-mono text-[10.5px]"
                      value={customCellFont || (cellFontIsCustom ? prefs.cellFont : "")}
                      onChange={(e) => {
                        setCustomCellFont(e.target.value);
                        void patch({ cellFont: e.target.value || DEFAULTS.cellFont });
                      }}
                      placeholder="CSS font-family value"
                    />
                  </Row>
                )}

                <Row label="Cell font size" last>
                  <NumberInput
                    value={prefs.cellFontSize}
                    min={8}
                    max={20}
                    unit="px"
                    onChange={(n) => void patch({ cellFontSize: n })}
                  />
                </Row>
              </>
            )}

            {active === "behavior" && (
              <>
                <ToggleRow
                  label="Confirm destructive actions"
                  description="Show a confirmation dialog before deleting or clearing stores."
                  checked={prefs.confirmDestructive}
                  onChange={(v) => void patch({ confirmDestructive: v })}
                />
                <ToggleRow
                  label="Show system databases"
                  description="Include internal browser databases (e.g. IndexedDB created by extensions)."
                  checked={prefs.showHiddenSystemDbs}
                  onChange={(v) => void patch({ showHiddenSystemDbs: v })}
                  last
                />
              </>
            )}

            {active === "sidebar" && (
              <ToggleRow
                label="Show row counts and sizes"
                description="Display estimated row counts and storage sizes next to each store in the sidebar."
                checked={prefs.showStoreSizes}
                onChange={(v) => void patch({ showStoreSizes: v })}
                last
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-4 py-2 " +
        (last ? "" : "border-b border-[color:var(--hairline)]")
      }
    >
      <span className="text-[12px] text-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  last,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <label
      className={
        "flex cursor-pointer items-center justify-between gap-6 py-2.5 " +
        (last ? "" : "border-b border-[color:var(--hairline)]")
      }
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-[12px] text-foreground">{label}</p>
        {description && (
          <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-[16px] w-[28px] shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
        (checked ? "bg-primary" : "bg-[color:var(--toolbar-input-bg)]")
      }
      style={{ border: checked ? "1px solid transparent" : "1px solid var(--toolbar-input-border)" }}
    >
      <span
        className="block size-[12px] rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? "translateX(13px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function NumberInput({
  value,
  min,
  max,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        className="settings-control h-7 w-[72px] text-right font-mono text-[11.5px] tabular-nums"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || min)}
      />
      {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
    </div>
  );
}
