import type { IndexedDbRecord, SerializableValue } from "./types";

export type InferredType =
  | "string" | "number" | "integer" | "boolean" | "null" | "date"
  | "array" | "object" | "mixed";

export interface InferredColumn {
  name: string;
  type: InferredType;
  nullable: boolean;
  sampleCount: number;
  coverage: number;
}

function inferValueType(value: SerializableValue): InferredType {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value) || !Number.isNaN(Date.parse(value)) && value.includes("-")) {
      return "date";
    }
    return "string";
  }
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "mixed";
}

function mergeTypes(a: InferredType, b: InferredType): InferredType {
  if (a === b) return a;
  if (a === "integer" && b === "number") return "number";
  if (a === "number" && b === "integer") return "number";
  if (a === "null") return b;
  if (b === "null") return a;
  return "mixed";
}

export function inferSchema(rows: IndexedDbRecord[]): InferredColumn[] {
  const sample = rows.slice(0, 500);
  const totalSamples = sample.length;
  if (totalSamples === 0) return [];

  const columnMap = new Map<string, { type: InferredType; count: number; nullCount: number }>();

  for (const record of sample) {
    const value = record.value.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [key, fieldValue] of Object.entries(value as Record<string, SerializableValue>)) {
      const t = inferValueType(fieldValue);
      const existing = columnMap.get(key);
      if (!existing) {
        columnMap.set(key, {
          type: t,
          count: 1,
          nullCount: t === "null" ? 1 : 0
        });
      } else {
        columnMap.set(key, {
          type: mergeTypes(existing.type, t),
          count: existing.count + 1,
          nullCount: existing.nullCount + (t === "null" ? 1 : 0)
        });
      }
    }
  }

  return Array.from(columnMap.entries()).map(([name, { type, count, nullCount }]) => ({
    name,
    type,
    nullable: nullCount > 0,
    sampleCount: count,
    coverage: count / totalSamples
  }));
}
