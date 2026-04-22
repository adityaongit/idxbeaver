import type { SerializableValue, SerializedCell } from "./types";
import { uint8ToBase64, WIRE_VERSION } from "./wire";

export { WIRE_VERSION };

// Serialize an arbitrary JS value for cross-message transport and display.
// Uses array-based seen tracking (instead of WeakSet) so circular refs can
// carry a back-ref index for faithful round-tripping.
export function serializeValue(input: unknown, seen: unknown[] = []): SerializedCell {
  const value = normalizeValue(input, seen);
  return { type: inferType(input), preview: previewValue(value), value };
}

export function normalizeValue(input: unknown, seen: unknown[] = []): SerializableValue {
  if (input === null || typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return input;
  }
  if (typeof input === "undefined") return { $type: "Undefined" };
  if (typeof input === "bigint") return { $type: "BigInt", value: input.toString() };
  if (typeof input === "function") return { $type: "Function" };
  if (typeof input !== "object") return String(input);

  const refIdx = seen.indexOf(input);
  if (refIdx !== -1) return { $type: "Circular", ref: refIdx };
  seen.push(input);

  if (input instanceof Date) return { $type: "Date", value: input.toISOString() };
  if (input instanceof RegExp) return { $type: "RegExp", src: input.source, flags: input.flags };
  if (input instanceof Map) {
    return {
      $type: "Map",
      entries: Array.from(input.entries()).map(([k, v]) => [normalizeValue(k, seen), normalizeValue(v, seen)])
    };
  }
  if (input instanceof Set) {
    return { $type: "Set", values: Array.from(input.values()).map((v) => normalizeValue(v, seen)) };
  }
  if (input instanceof ArrayBuffer) {
    return { $type: "ArrayBuffer", bytes: input.byteLength, b64: uint8ToBase64(new Uint8Array(input)) };
  }
  if (ArrayBuffer.isView(input)) {
    const ctor = (input as unknown as { constructor: { name: string } }).constructor.name;
    return {
      $type: ctor,
      bytes: (input as ArrayBufferView).byteLength,
      b64: uint8ToBase64(new Uint8Array((input as ArrayBufferView).buffer))
    };
  }
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return { $type: "Blob", blobId: crypto.randomUUID(), bytes: (input as Blob).size, mime: (input as Blob).type };
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizeValue(item, seen));
  }
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, normalizeValue(v, seen)])
  );
}

function inferType(input: unknown): string {
  if (input === null) return "null";
  if (Array.isArray(input)) return "array";
  if (input instanceof Date) return "Date";
  if (typeof Blob !== "undefined" && input instanceof Blob) return "Blob";
  return typeof input;
}

export function previewValue(value: SerializableValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if ("$type" in value) {
    const v = value as Record<string, unknown>;
    const type = String(v.$type);
    if (typeof v.bytes === "number") return `<${type} ${formatBytes(v.bytes as number)}>`;
    if (typeof v.value === "string") return `<${type} ${v.value as string}>`;
    if (typeof v.src === "string") return `<${type} /${v.src as string}/${(v.flags as string) ?? ""}>`;
    return `<${type}>`;
  }
  const keys = Object.keys(value).filter((k) => !k.startsWith("$"));
  return `{ ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", ..." : ""} }`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
