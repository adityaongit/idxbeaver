import type { IndexedDbRecord, SerializableValue } from "./types";

export type FilterOperator =
  | "eq" | "ne"
  | "lt" | "lte" | "gt" | "gte"
  | "contains" | "notContains"
  | "startsWith" | "endsWith"
  | "regex"
  | "exists" | "notExists"
  | "in" | "notIn";

export type FilterRule = {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
  active: boolean;
};

export type FilterState = {
  open: boolean;
  combinator: "and" | "or";
  rules: FilterRule[];
};

export const EMPTY_FILTER_STATE: FilterState = {
  open: false,
  combinator: "and",
  rules: []
};

function getCellValue(record: IndexedDbRecord, column: string): SerializableValue {
  if (column === "key") return record.key;
  const v = record.value.value;
  if (column === "value") return v;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return (v as Record<string, SerializableValue>)[column] ?? null;
}

function coerce(raw: string): SerializableValue {
  try {
    return JSON.parse(raw) as SerializableValue;
  } catch {
    return raw;
  }
}

function asString(v: SerializableValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function asNumber(v: SerializableValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
}

function evalRule(rule: FilterRule, record: IndexedDbRecord): boolean {
  const cellValue = getCellValue(record, rule.column);
  const exists = cellValue !== null;
  const op = rule.operator;

  if (op === "exists") return exists;
  if (op === "notExists") return !exists;

  const parsedRule = coerce(rule.value);
  const cellStr = asString(cellValue);
  const ruleStr = asString(parsedRule);

  switch (op) {
    case "eq":
      return typeof parsedRule === typeof cellValue ? cellValue === parsedRule : cellStr === ruleStr;
    case "ne":
      return typeof parsedRule === typeof cellValue ? cellValue !== parsedRule : cellStr !== ruleStr;
    case "lt": {
      const cn = asNumber(cellValue);
      const rn = asNumber(parsedRule);
      return !Number.isNaN(cn) && !Number.isNaN(rn) ? cn < rn : cellStr < ruleStr;
    }
    case "lte": {
      const cn = asNumber(cellValue);
      const rn = asNumber(parsedRule);
      return !Number.isNaN(cn) && !Number.isNaN(rn) ? cn <= rn : cellStr <= ruleStr;
    }
    case "gt": {
      const cn = asNumber(cellValue);
      const rn = asNumber(parsedRule);
      return !Number.isNaN(cn) && !Number.isNaN(rn) ? cn > rn : cellStr > ruleStr;
    }
    case "gte": {
      const cn = asNumber(cellValue);
      const rn = asNumber(parsedRule);
      return !Number.isNaN(cn) && !Number.isNaN(rn) ? cn >= rn : cellStr >= ruleStr;
    }
    case "contains":
      return cellStr.toLowerCase().includes(ruleStr.toLowerCase());
    case "notContains":
      return !cellStr.toLowerCase().includes(ruleStr.toLowerCase());
    case "startsWith":
      return cellStr.toLowerCase().startsWith(ruleStr.toLowerCase());
    case "endsWith":
      return cellStr.toLowerCase().endsWith(ruleStr.toLowerCase());
    case "regex": {
      try {
        return new RegExp(rule.value).test(cellStr);
      } catch {
        return false;
      }
    }
    case "in": {
      const parts = rule.value.split(",").map((s) => s.trim());
      return parts.some((part) => {
        const parsed = coerce(part);
        return cellValue === parsed || cellStr === asString(parsed);
      });
    }
    case "notIn": {
      const parts = rule.value.split(",").map((s) => s.trim());
      return !parts.some((part) => {
        const parsed = coerce(part);
        return cellValue === parsed || cellStr === asString(parsed);
      });
    }
    default:
      return true;
  }
}

function isEffectiveRule(rule: FilterRule): boolean {
  return rule.active && (
    rule.operator === "exists" ||
    rule.operator === "notExists" ||
    rule.value.trim() !== ""
  );
}

export function applyFilters(rows: IndexedDbRecord[], state: FilterState): IndexedDbRecord[] {
  const effectiveRules = state.rules.filter(isEffectiveRule);
  if (effectiveRules.length === 0) return rows;
  return rows.filter((record) => {
    const results = effectiveRules.map((rule) => evalRule(rule, record));
    return state.combinator === "and" ? results.every(Boolean) : results.some(Boolean);
  });
}

export function activeRuleCount(state: FilterState): number {
  return state.rules.filter(isEffectiveRule).length;
}
