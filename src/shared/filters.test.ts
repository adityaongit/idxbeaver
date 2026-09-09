import { describe, expect, it } from "vitest";
import { applyFilters, EMPTY_FILTER_STATE, type FilterRule } from "./filters";
import type { IndexedDbRecord } from "./types";

function record(key: string, value: unknown): IndexedDbRecord {
  return { key, value: { type: typeof value, preview: "", value: value as never } } as IndexedDbRecord;
}

function rule(overrides: Partial<FilterRule>): FilterRule {
  return { id: "r1", column: "tags", operator: "eq", value: "", active: true, ...overrides };
}

describe("applyFilters eq/ne", () => {
  it("matches an array field against a scalar it contains", () => {
    const rows = [record("a", { tags: ["red", "blue"] }), record("b", { tags: ["green"] })];
    const state = { ...EMPTY_FILTER_STATE, rules: [rule({ value: "red" })] };
    expect(applyFilters(rows, state).map((r) => r.key)).toEqual(["a"]);
  });

  it("still allows lenient cross-type scalar comparison", () => {
    const rows = [record("a", { count: "42" })];
    const state = { ...EMPTY_FILTER_STATE, rules: [rule({ column: "count", value: "42" })] };
    expect(applyFilters(rows, state).map((r) => r.key)).toEqual(["a"]);
  });
});

describe("applyFilters exists/notExists", () => {
  it("treats an explicit null field as existing", () => {
    const rows = [record("a", { note: null }), record("b", {})];
    const state = { ...EMPTY_FILTER_STATE, rules: [rule({ column: "note", operator: "exists" })] };
    expect(applyFilters(rows, state).map((r) => r.key)).toEqual(["a"]);
  });

  it("notExists only matches a truly missing field", () => {
    const rows = [record("a", { note: null }), record("b", {})];
    const state = { ...EMPTY_FILTER_STATE, rules: [rule({ column: "note", operator: "notExists" })] };
    expect(applyFilters(rows, state).map((r) => r.key)).toEqual(["b"]);
  });
});
