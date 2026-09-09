import { describe, expect, it } from "vitest";
import { detectFormat, parseCsv, parseFile, parseJson, parseNdjson, parseSql } from "./import";

function file(name: string, content: string, type = ""): File {
  return new File([content], name, { type });
}

describe("detectFormat", () => {
  it("detects by extension first", () => {
    expect(detectFormat(file("rows.ndjson", ""))).toBe("ndjson");
    expect(detectFormat(file("rows.jsonl", ""))).toBe("ndjson");
    expect(detectFormat(file("rows.json", ""))).toBe("json");
    expect(detectFormat(file("rows.csv", ""))).toBe("csv");
    expect(detectFormat(file("rows.sql", ""))).toBe("sql");
    expect(detectFormat(file("rows.zip", ""))).toBe("zip");
  });

  it("falls back to MIME type when the extension is unknown", () => {
    expect(detectFormat(file("upload", "", "application/json"))).toBe("json");
    expect(detectFormat(file("upload", "", "text/csv"))).toBe("csv");
    expect(detectFormat(file("upload", "", "application/zip"))).toBe("zip");
  });

  it("defaults to json when nothing matches", () => {
    expect(detectFormat(file("mystery", "", "application/octet-stream"))).toBe("zip");
    expect(detectFormat(file("mystery", ""))).toBe("json");
  });
});

describe("parseJson", () => {
  it("parses a JSON array", () => {
    expect(parseJson('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it("rejects a non-array top level", () => {
    expect(() => parseJson('{"a":1}')).toThrow(/array of rows/);
  });
});

describe("parseNdjson", () => {
  it("parses one JSON value per non-blank line", () => {
    expect(parseNdjson('{"a":1}\n\n{"a":2}\n')).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe("parseCsv", () => {
  it("maps headers to values, handling quoted fields with embedded commas and quotes", () => {
    const csv = 'name,note\n"Ada, Lovelace","said ""hi"""\nBob,plain';
    expect(parseCsv(csv)).toEqual([
      { name: "Ada, Lovelace", note: 'said "hi"' },
      { name: "Bob", note: "plain" },
    ]);
  });

  it("returns no rows without a header + data line", () => {
    expect(parseCsv("onlyheader")).toEqual([]);
  });

  it("fills missing trailing columns with empty string", () => {
    expect(parseCsv("a,b,c\n1,2")).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});

describe("parseSql", () => {
  it("extracts columns and values from INSERT statements", () => {
    const sql = `INSERT INTO "users" ("name", "age", "note") VALUES ('O''Brien', 30, NULL);`;
    expect(parseSql(sql)).toEqual([{ name: "O'Brien", age: "30", note: null }]);
  });

  it("skips a statement whose column and value counts mismatch", () => {
    const sql = `INSERT INTO "users" ("a", "b") VALUES ('only-one');`;
    expect(parseSql(sql)).toEqual([]);
  });
});

describe("parseFile", () => {
  it("round-trips a json file through detectFormat + parseJson", async () => {
    const result = await parseFile(file("data.json", '[{"a":1}]'));
    expect(result).toEqual({ rows: [{ a: 1 }], format: "json" });
  });

  it("returns an empty row set for zip without attempting to read it as text", async () => {
    const result = await parseFile(file("data.zip", "not-real-zip-bytes"));
    expect(result).toEqual({ rows: [], format: "zip" });
  });
});
