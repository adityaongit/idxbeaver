import { describe, expect, it } from "vitest";
import { inferSchema } from "./schemaInfer";
import type { IndexedDbRecord } from "./types";

function record(value: unknown): IndexedDbRecord {
  return { key: "k", value: { type: typeof value, preview: "", value: value as never } } as IndexedDbRecord;
}

describe("inferSchema", () => {
  it("returns nothing for an empty sample", () => {
    expect(inferSchema([])).toEqual([]);
  });

  it("infers scalar types and full coverage", () => {
    const rows = [record({ name: "Ada", age: 30 }), record({ name: "Bob", age: 25 })];
    const cols = inferSchema(rows);
    expect(cols).toEqual(
      expect.arrayContaining([
        { name: "name", type: "string", nullable: false, sampleCount: 2, coverage: 1 },
        { name: "age", type: "integer", nullable: false, sampleCount: 2, coverage: 1 },
      ])
    );
  });

  it("marks a column nullable and partial when some rows omit or null it", () => {
    const rows = [record({ nick: "Ace" }), record({ nick: null }), record({})];
    const cols = inferSchema(rows);
    const nick = cols.find((c) => c.name === "nick")!;
    expect(nick.nullable).toBe(true);
    expect(nick.sampleCount).toBe(2);
    expect(nick.coverage).toBeCloseTo(2 / 3);
  });

  it("merges integer and float samples into number, mixed types into mixed", () => {
    const numeric = inferSchema([record({ x: 1 }), record({ x: 1.5 })]);
    expect(numeric.find((c) => c.name === "x")!.type).toBe("number");

    const mixed = inferSchema([record({ x: 1 }), record({ x: "one" })]);
    expect(mixed.find((c) => c.name === "x")!.type).toBe("mixed");
  });

  it("ignores rows whose value is not a plain object, but still counts them toward the sample total", () => {
    const rows = [record(["a", "b"]), record("scalar"), record({ ok: true })];
    const cols = inferSchema(rows);
    expect(cols).toEqual([
      { name: "ok", type: "boolean", nullable: false, sampleCount: 1, coverage: 1 / 3 },
    ]);
  });

  it("samples only the first 500 rows", () => {
    const rows = Array.from({ length: 600 }, (_, i) => record({ n: i }));
    expect(inferSchema(rows)[0].sampleCount).toBe(500);
  });
});
