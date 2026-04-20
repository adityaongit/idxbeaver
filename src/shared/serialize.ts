import type { SerializableValue, SerializedCell } from "./types";

export function serializeValue(input: unknown, seen = new WeakSet<object>()): SerializedCell {
  const value = normalizeValue(input, seen);
  return {
    type: inferType(input),
    preview: previewValue(value),
    value
  };
}

export function normalizeValue(input: unknown, seen = new WeakSet<object>()): SerializableValue {
  if (input === null || typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return input;
  }

  if (typeof input === "undefined") return { $type: "Undefined" };
  if (typeof input === "bigint") return { $type: "BigInt", value: input.toString() };
  if (typeof input === "function") return { $type: "Function" };
  if (typeof input !== "object") return String(input);

  if (seen.has(input)) return { $type: "Circular" };
  seen.add(input);

  if (input instanceof Date) {
    return { $type: "Date", value: input.toISOString() };
  }

  if (input instanceof RegExp) {
    return { $type: "RegExp", value: input.toString() };
  }

  if (input instanceof Map) {
    return {
      $type: "Map",
      entries: Array.from(input.entries()).map(([key, value]) => [normalizeValue(key, seen), normalizeValue(value, seen)])
    };
  }

  if (input instanceof Set) {
    return { $type: "Set", values: Array.from(input.values()).map((value) => normalizeValue(value, seen)) };
  }

  if (ArrayBuffer.isView(input)) {
    return { $type: input.constructor.name, bytes: input.byteLength };
  }

  if (input instanceof ArrayBuffer) {
    return { $type: "ArrayBuffer", bytes: input.byteLength };
  }

  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return { $type: "Blob", bytes: input.size, mime: input.type };
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, normalizeValue(value, seen)])
  );
}

function inferType(input: unknown): string {
  if (input === null) return "null";
  if (Array.isArray(input)) return "array";
  if (input instanceof Date) return "Date";
  if (typeof Blob !== "undefined" && input instanceof Blob) return "Blob";
  return typeof input;
}

function previewValue(value: SerializableValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if ("$type" in value) {
    const type = String(value.$type);
    if (typeof value.bytes === "number") return `<${type} ${formatBytes(value.bytes)}>`;
    if (typeof value.value === "string") return `<${type} ${value.value}>`;
    return `<${type}>`;
  }
  return `{ ${Object.keys(value).slice(0, 4).join(", ")}${Object.keys(value).length > 4 ? ", ..." : ""} }`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
