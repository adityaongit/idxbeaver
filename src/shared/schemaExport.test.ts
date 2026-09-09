import { describe, expect, it } from "vitest";
import { toDexieSchema, toTypeScript } from "./schemaExport";
import type { InferredColumn } from "./schemaInfer";
import type { IndexedDbStoreInfo } from "./types";

describe("toTypeScript", () => {
  it("emits required fields for full-coverage non-nullable columns", () => {
    const columns: InferredColumn[] = [
      { name: "id", type: "integer", nullable: false, sampleCount: 2, coverage: 1 },
      { name: "email", type: "string", nullable: false, sampleCount: 2, coverage: 1 },
    ];
    expect(toTypeScript("users", columns)).toBe(
      "interface users {\n  id: number;\n  email: string;\n}"
    );
  });

  it("marks nullable or partial-coverage columns optional", () => {
    const columns: InferredColumn[] = [
      { name: "nick", type: "string", nullable: true, sampleCount: 1, coverage: 0.5 },
    ];
    expect(toTypeScript("users", columns)).toContain("nick?: string;");
  });

  it("sanitizes store names that aren't valid identifiers", () => {
    expect(toTypeScript("my-store 2024", [])).toContain("interface my_store_2024 {");
  });
});

describe("toDexieSchema", () => {
  it("marks an auto-incrementing keyPath with ++", () => {
    const stores: IndexedDbStoreInfo[] = [
      { name: "users", keyPath: "id", autoIncrement: true, count: 0, indexes: [] },
    ];
    expect(toDexieSchema(stores)).toBe('{\n  users: "++id"\n}');
  });

  it("marks a unique index with & and a multiEntry index with *", () => {
    const stores: IndexedDbStoreInfo[] = [
      {
        name: "users",
        keyPath: "id",
        autoIncrement: false,
        count: 0,
        indexes: [
          { name: "byEmail", keyPath: "email", unique: true, multiEntry: false },
          { name: "byTag", keyPath: "tags", unique: false, multiEntry: true },
        ],
      },
    ];
    expect(toDexieSchema(stores)).toBe('{\n  users: "id, &email, *tags"\n}');
  });

  it("falls back to a bare ++id for out-of-line auto-increment stores", () => {
    const stores: IndexedDbStoreInfo[] = [
      { name: "logs", keyPath: null, autoIncrement: true, count: 0, indexes: [] },
    ];
    expect(toDexieSchema(stores)).toBe('{\n  logs: "++id"\n}');
  });
});
