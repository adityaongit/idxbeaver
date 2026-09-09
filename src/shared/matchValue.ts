import { getPathValue } from "./query";

// Canonical, unit-tested Mongo-style value matcher. executeStorageRequest.ts
// carries its own inline copy — it's injected via chrome.scripting.executeScript
// and can't import anything — so keep the two in sync; this is the tested one.

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

// {tags: "x"} also matches a document where tags is an array containing "x".
export function valuesMatch(actual: unknown, expected: unknown): boolean {
  if (deepEqual(actual, expected)) return true;
  if (Array.isArray(actual) && !Array.isArray(expected)) {
    return actual.some((item) => deepEqual(item, expected));
  }
  return false;
}

export function compareScalars(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return Number.NaN;
}

// For `sort`: nullish sorts last regardless of direction, booleans compare
// false < true, and same-typed scalars use compareScalars (so numbers sort
// numerically, not "9" > "10" lexicographically). Mismatched/uncomparable
// types fall back to a stable string comparison.
export function compareForSort(a: unknown, b: unknown): number {
  const aNil = a === null || a === undefined;
  const bNil = b === null || b === undefined;
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  const cmp = compareScalars(a, b);
  if (!Number.isNaN(cmp)) return cmp;
  const as = String(a);
  const bs = String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

export function matchFieldExpr(actual: unknown, expr: unknown): boolean {
  if (expr && typeof expr === "object" && !Array.isArray(expr) && !(expr instanceof RegExp) && Object.keys(expr).some((k) => k.startsWith("$"))) {
    for (const [op, val] of Object.entries(expr as Record<string, unknown>)) {
      switch (op) {
        case "$eq": if (!valuesMatch(actual, val)) return false; break;
        case "$ne": if (valuesMatch(actual, val)) return false; break;
        case "$gt": if (!(compareScalars(actual, val) > 0)) return false; break;
        case "$gte": if (!(compareScalars(actual, val) >= 0)) return false; break;
        case "$lt": if (!(compareScalars(actual, val) < 0)) return false; break;
        case "$lte": if (!(compareScalars(actual, val) <= 0)) return false; break;
        case "$in": if (!Array.isArray(val) || !val.some((v) => valuesMatch(actual, v))) return false; break;
        case "$nin": if (!Array.isArray(val) || val.some((v) => valuesMatch(actual, v))) return false; break;
        case "$exists": if (Boolean(val) !== (actual !== undefined)) return false; break;
        case "$regex": {
          const flags = typeof (expr as Record<string, unknown>).$options === "string" ? (expr as Record<string, string>).$options : "";
          const re = val instanceof RegExp ? val : new RegExp(String(val), flags);
          if (typeof actual !== "string" || !re.test(actual)) return false;
          break;
        }
        case "$options": break;
        case "$not": if (matchFieldExpr(actual, val)) return false; break;
        default: return false;
      }
    }
    return true;
  }
  return valuesMatch(actual, expr);
}

export function matchFilter(doc: unknown, filter: unknown): boolean {
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) return true;
  for (const [key, raw] of Object.entries(filter as Record<string, unknown>)) {
    if (key === "$and") {
      if (!Array.isArray(raw) || !raw.every((sub) => matchFilter(doc, sub))) return false;
      continue;
    }
    if (key === "$or") {
      if (!Array.isArray(raw) || !raw.some((sub) => matchFilter(doc, sub))) return false;
      continue;
    }
    if (key === "$nor") {
      if (!Array.isArray(raw) || raw.some((sub) => matchFilter(doc, sub))) return false;
      continue;
    }
    if (key === "$not") {
      if (matchFilter(doc, raw)) return false;
      continue;
    }
    const actual = getPathValue(doc, key);
    if (!matchFieldExpr(actual, raw)) return false;
  }
  return true;
}
