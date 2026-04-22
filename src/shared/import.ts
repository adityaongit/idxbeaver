// Format parsers for import (Plan 16).

export type ImportFormat = "json" | "ndjson" | "csv" | "sql" | "zip";

export interface ParsedRows {
  rows: unknown[];
  format: ImportFormat;
}

export function detectFormat(file: File): ImportFormat {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ndjson") || name.endsWith(".jsonl")) return "ndjson";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".sql")) return "sql";
  if (name.endsWith(".zip")) return "zip";
  const mime = file.type.toLowerCase();
  if (mime.includes("ndjson")) return "ndjson";
  if (mime.includes("json")) return "json";
  if (mime.includes("csv")) return "csv";
  if (mime.includes("zip") || mime.includes("octet-stream")) return "zip";
  return "json";
}

export function parseJson(text: string): unknown[] {
  const data = JSON.parse(text) as unknown;
  if (Array.isArray(data)) return data;
  throw new Error("JSON import must be an array of rows.");
}

export function parseNdjson(text: string): unknown[] {
  return text.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cols[i] ?? "";
    }
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(current); current = ""; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseSql(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const insertRe = /INSERT\s+INTO\s+"?[\w\s]+"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*;/gi;
  let match: RegExpExecArray | null;
  while ((match = insertRe.exec(text)) !== null) {
    const cols = match[1].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const vals = parseSqlValueList(match[2]);
    if (cols.length !== vals.length) continue;
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) {
      const v = vals[i];
      row[cols[i]] = v === "NULL" ? null : v;
    }
    rows.push(row);
  }
  return rows;
}

function parseSqlValueList(raw: string): string[] {
  const result: string[] = [];
  let current = "";
  let inStr = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (ch === "'" && raw[i + 1] === "'") { current += "'"; i++; }
      else if (ch === "'") { inStr = false; }
      else current += ch;
    } else {
      if (ch === "'") { inStr = true; }
      else if (ch === ",") { result.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parseFile(file: File): Promise<ParsedRows> {
  const format = detectFormat(file);
  if (format === "zip") {
    return { rows: [], format: "zip" };
  }
  const text = await file.text();
  let rows: unknown[];
  switch (format) {
    case "ndjson": rows = parseNdjson(text); break;
    case "csv": rows = parseCsv(text); break;
    case "sql": rows = parseSql(text); break;
    default: rows = parseJson(text);
  }
  return { rows, format };
}
