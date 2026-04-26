import React, { useEffect, useRef } from "react";
import { Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterOperator, FilterRule, FilterState } from "../shared/filters";

const ALL_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Not contains" },
  { value: "eq", label: "Equals" },
  { value: "ne", label: "Not equals" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "regex", label: "Regex" },
  { value: "exists", label: "Exists" },
  { value: "notExists", label: "Not exists" },
  { value: "in", label: "In (csv)" },
  { value: "notIn", label: "Not in (csv)" },
];

const VALUE_HIDDEN_OPERATORS: FilterOperator[] = ["exists", "notExists"];

function newRule(column: string): FilterRule {
  return {
    id: crypto.randomUUID(),
    column,
    operator: "contains",
    value: "",
    active: true,
  };
}

interface FilterBarProps {
  state: FilterState;
  columns: string[];
  onChange: (next: FilterState) => void;
  onClose: () => void;
}

export function FilterBar({ state, columns, onChange, onClose }: FilterBarProps) {
  const valueInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const lastAddedRef = useRef<string | null>(null);

  // TablePlus convention: opening the filter bar drops you straight into a
  // single rule. No empty state.
  useEffect(() => {
    if (state.rules.length === 0) {
      const defaultColumn = columns[0] ?? "value";
      onChange({ ...state, rules: [newRule(defaultColumn)] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus the value input of the just-added rule on the next tick.
  useEffect(() => {
    if (lastAddedRef.current) {
      valueInputRefs.current.get(lastAddedRef.current)?.focus();
      lastAddedRef.current = null;
    }
  }, [state.rules.length]);

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    onChange({
      ...state,
      rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const insertRuleAfter = (id: string) => {
    const defaultColumn = columns[0] ?? "value";
    const rule = newRule(defaultColumn);
    const idx = state.rules.findIndex((r) => r.id === id);
    const next = [...state.rules.slice(0, idx + 1), rule, ...state.rules.slice(idx + 1)];
    lastAddedRef.current = rule.id;
    onChange({ ...state, rules: next });
  };

  const removeRule = (id: string) => {
    const next = state.rules.filter((r) => r.id !== id);
    if (next.length === 0) {
      // TablePlus collapses the bar when the last rule is removed.
      onChange({ ...state, rules: [] });
      onClose();
      return;
    }
    onChange({ ...state, rules: next });
  };

  const clearAll = () => {
    onChange({ ...state, rules: [] });
    onClose();
  };

  const columnOptions = ["key", ...columns];

  return (
    <div className="flex shrink-0 flex-col border-b border-border bg-card/60 text-[11px]">
      {state.rules.map((rule) => {
        const hideValue = VALUE_HIDDEN_OPERATORS.includes(rule.operator);
        return (
          <div
            key={rule.id}
            className="flex items-center gap-1.5 border-b border-[color:var(--hairline)] px-2 py-1 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={rule.active}
              onChange={(e) => updateRule(rule.id, { active: e.target.checked })}
              className="size-3 shrink-0 accent-primary"
              title="Enable / disable rule"
            />
            <Select value={rule.column} onValueChange={(v) => updateRule(rule.id, { column: v })}>
              <SelectTrigger size="sm" className="h-6 w-32 shrink-0 rounded-sm bg-background px-2 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((col) => (
                  <SelectItem key={col} value={col} className="text-[11px]">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rule.operator} onValueChange={(v) => updateRule(rule.id, { operator: v as FilterOperator })}>
              <SelectTrigger size="sm" className="h-6 w-28 shrink-0 rounded-sm bg-background px-2 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-[11px]">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hideValue ? (
              <Input
                ref={(el) => {
                  if (el) valueInputRefs.current.set(rule.id, el);
                  else valueInputRefs.current.delete(rule.id);
                }}
                value={rule.value}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                placeholder={rule.operator === "in" || rule.operator === "notIn" ? "a, b, c" : "Pattern"}
                className="h-6 min-w-0 flex-1 rounded-sm bg-background px-2 text-[11px]"
              />
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              onClick={() => removeRule(rule.id)}
              aria-label="Remove rule"
              className="flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Minus className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => insertRuleAfter(rule.id)}
              aria-label="Add rule"
              className="flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3" />
            </button>
          </div>
        );
      })}

      <div className="flex items-center gap-2 px-2 py-1 text-[10.5px] text-muted-foreground">
        <SlidersHorizontal className="size-3 shrink-0 opacity-70" aria-hidden />
        <button
          type="button"
          onClick={clearAll}
          className="rounded-sm px-1.5 py-0.5 text-[11px] hover:bg-muted hover:text-foreground"
        >
          Clear
        </button>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="flex size-5 items-center justify-center rounded-sm hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
