import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterOperator, FilterRule, FilterState } from "../shared/filters";

const ALL_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "ne", label: "≠" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "not contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "regex", label: "regex" },
  { value: "exists", label: "exists" },
  { value: "notExists", label: "not exists" },
  { value: "in", label: "in (csv)" },
  { value: "notIn", label: "not in (csv)" },
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

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    onChange({
      ...state,
      rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const removeRule = (id: string) => {
    onChange({ ...state, rules: state.rules.filter((r) => r.id !== id) });
  };

  const addRule = () => {
    const defaultColumn = columns[0] ?? "value";
    const rule = newRule(defaultColumn);
    onChange({ ...state, rules: [...state.rules, rule] });
    // Focus the value input after render
    setTimeout(() => {
      valueInputRefs.current.get(rule.id)?.focus();
    }, 0);
  };

  const columnOptions = ["key", ...columns];

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b border-border bg-card/60 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="section-label">Filters</span>
        <Select
          value={state.combinator}
          onValueChange={(v) => onChange({ ...state, combinator: v as "and" | "or" })}
        >
          <SelectTrigger size="sm" className="h-5 w-16 rounded-sm text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">AND</SelectItem>
            <SelectItem value="or">OR</SelectItem>
          </SelectContent>
        </Select>
        <Button size="xs" variant="outline" onClick={addRule} className="ml-auto gap-1">
          <Plus className="size-3" />
          Add rule
        </Button>
        <Button size="xs" variant="ghost" onClick={() => onChange({ ...state, rules: [] })}>
          Clear
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Close filters" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>

      {state.rules.length === 0 && (
        <p className="py-0.5 text-[11px] text-muted-foreground">
          No rules. Click <span className="font-medium text-foreground">Add rule</span> to filter rows.
        </p>
      )}

      {state.rules.map((rule) => {
        const hideValue = VALUE_HIDDEN_OPERATORS.includes(rule.operator);
        return (
          <div key={rule.id} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={rule.active}
              onChange={(e) => updateRule(rule.id, { active: e.target.checked })}
              className="size-3 shrink-0 accent-primary"
              title="Enable/disable rule"
            />
            <Select
              value={rule.column}
              onValueChange={(v) => updateRule(rule.id, { column: v })}
            >
              <SelectTrigger size="sm" className="h-6 w-32 shrink-0 rounded-sm font-mono text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((col) => (
                  <SelectItem key={col} value={col} className="font-mono text-[10px]">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={rule.operator}
              onValueChange={(v) => updateRule(rule.id, { operator: v as FilterOperator })}
            >
              <SelectTrigger size="sm" className="h-6 w-28 shrink-0 rounded-sm text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-[10px]">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hideValue && (
              <Input
                ref={(el) => {
                  if (el) valueInputRefs.current.set(rule.id, el);
                  else valueInputRefs.current.delete(rule.id);
                }}
                value={rule.value}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                placeholder={rule.operator === "in" || rule.operator === "notIn" ? "a, b, c" : "value"}
                className="h-6 min-w-0 flex-1 rounded-sm font-mono text-[10px]"
              />
            )}
            {hideValue && <span className="flex-1" />}
            <button
              type="button"
              onClick={() => removeRule(rule.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Remove rule"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
