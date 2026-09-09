import { describe, expect, it } from "vitest";
import { makeZip, toNdjson, toSqlInsert } from "./export";

describe("toNdjson", () => {
  it("emits one JSON line per row", () => {
    expect(toNdjson([{ a: 1 }, { a: 2 }])).toBe('{"a":1}\n{"a":2}');
  });
});

describe("toSqlInsert", () => {
  it("emits a comment for an empty table", () => {
    expect(toSqlInsert("users", [])).toBe('-- No rows in "users"\n');
  });

  it("quotes strings and escapes embedded quotes, leaves numbers/booleans bare, NULL for null", () => {
    const sql = toSqlInsert("users", [{ name: "O'Brien", age: 30, active: true, note: null }]);
    expect(sql).toContain(`INSERT INTO "users" ("name", "age", "active", "note") VALUES ('O''Brien', 30, true, NULL);`);
  });

  it("wraps a bare scalar row in a value column", () => {
    const sql = toSqlInsert("tags", ["red"]);
    expect(sql).toContain(`INSERT INTO "tags" ("value") VALUES ('red');`);
  });
});

describe("makeZip", () => {
  it("produces a buffer starting with a local file header signature per entry", () => {
    const zip = makeZip([{ name: "a.txt", data: new TextEncoder().encode("hello") }]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
  });

  it("ends with the end-of-central-directory signature", () => {
    const zip = makeZip([{ name: "a.txt", data: new TextEncoder().encode("hi") }]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
  });

  it("stores file bytes uncompressed and unmodified", () => {
    const payload = new TextEncoder().encode("payload-bytes");
    const zip = makeZip([{ name: "f.bin", data: payload }]);
    // local header (30 bytes) + filename ("f.bin" = 5 bytes) precedes the stored data.
    const dataStart = 30 + "f.bin".length;
    expect(zip.slice(dataStart, dataStart + payload.length)).toEqual(payload);
  });

  it("handles zero files without throwing", () => {
    expect(() => makeZip([])).not.toThrow();
  });
});
