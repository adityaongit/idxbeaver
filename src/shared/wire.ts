// Wire format v2 — stable type tags and version constants.
// All persisted artefacts (snapshots, archive manifests) are stamped with this version.

export const WIRE_VERSION = 2;

// Typed array constructor names that are round-trippable.
export type TypedArrayName =
  | "Int8Array" | "Uint8Array" | "Uint8ClampedArray"
  | "Int16Array" | "Uint16Array"
  | "Int32Array" | "Uint32Array"
  | "Float32Array" | "Float64Array"
  | "BigInt64Array" | "BigUint64Array";

// Union of all wire values. Objects in IDB may themselves be Wire values
// serialized into the $t-tagged envelope.
export type Wire =
  | { $t: "p"; v: string | number | boolean | null }
  | { $t: "u" }
  | { $t: "bi"; v: string }
  | { $t: "d"; v: number }
  | { $t: "r"; src: string; flags: string }
  | { $t: "m"; entries: [Wire, Wire][] }
  | { $t: "s"; values: Wire[] }
  | { $t: "a"; items: Wire[] }
  | { $t: "o"; fields: { k: string; v: Wire }[] }
  | { $t: "tA"; ctor: TypedArrayName; b64: string }
  | { $t: "ab"; b64: string }
  | { $t: "B"; blobId: string; size: number; mime: string }
  | { $t: "circ"; ref: number }
  | { $t: "fn" };

export interface WireEnvelope {
  version: number;
  root: Wire;
  blobs: Record<string, string>;
}

// Convert a Uint8Array to base64 (works in any JS environment).
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Encode a value to Wire format.
export function encode(input: unknown, seen: unknown[] = []): Wire {
  if (input === null || typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return { $t: "p", v: input };
  }
  if (input === undefined) return { $t: "u" };
  if (typeof input === "bigint") return { $t: "bi", v: input.toString() };
  if (typeof input === "function") return { $t: "fn" };
  if (typeof input !== "object") return { $t: "p", v: String(input) };

  const refIdx = seen.indexOf(input);
  if (refIdx !== -1) return { $t: "circ", ref: refIdx };
  seen.push(input);

  if (input instanceof Date) return { $t: "d", v: input.getTime() };
  if (input instanceof RegExp) return { $t: "r", src: input.source, flags: input.flags };
  if (input instanceof Map) {
    return { $t: "m", entries: Array.from(input.entries()).map(([k, v]) => [encode(k, seen), encode(v, seen)]) };
  }
  if (input instanceof Set) {
    return { $t: "s", values: Array.from(input.values()).map((v) => encode(v, seen)) };
  }
  if (input instanceof ArrayBuffer) {
    return { $t: "ab", b64: uint8ToBase64(new Uint8Array(input)) };
  }
  if (ArrayBuffer.isView(input)) {
    const ctor = (input as unknown as { constructor: { name: string } }).constructor.name as TypedArrayName;
    return { $t: "tA", ctor, b64: uint8ToBase64(new Uint8Array((input as ArrayBufferView).buffer)) };
  }
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return { $t: "B", blobId: crypto.randomUUID(), size: (input as Blob).size, mime: (input as Blob).type };
  }
  if (Array.isArray(input)) {
    return { $t: "a", items: input.map((v) => encode(v, seen)) };
  }
  return {
    $t: "o",
    fields: Object.entries(input as Record<string, unknown>).map(([k, v]) => ({ k, v: encode(v, seen) }))
  };
}

// Decode a Wire value back to a JS value.
export function decode(wire: Wire, refs: unknown[] = []): unknown {
  const self = (() => {
    switch (wire.$t) {
      case "p": return wire.v;
      case "u": return undefined;
      case "bi": return BigInt(wire.v);
      case "fn": return () => { /* decoded function placeholder */ };
      case "d": return new Date(wire.v);
      case "r": return new RegExp(wire.src, wire.flags);
      case "m": {
        const m = new Map<unknown, unknown>();
        refs.push(m);
        for (const [k, v] of wire.entries) m.set(decode(k, refs), decode(v, refs));
        return m;
      }
      case "s": {
        const s = new Set<unknown>();
        refs.push(s);
        for (const v of wire.values) s.add(decode(v, refs));
        return s;
      }
      case "a": {
        const arr: unknown[] = [];
        refs.push(arr);
        for (const item of wire.items) arr.push(decode(item, refs));
        return arr;
      }
      case "o": {
        const obj: Record<string, unknown> = {};
        refs.push(obj);
        for (const { k, v } of wire.fields) obj[k] = decode(v, refs);
        return obj;
      }
      case "ab": {
        const bytes = base64ToUint8(wire.b64);
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
      case "tA": {
        const bytes = base64ToUint8(wire.b64);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const TypedArrayCtor = (globalThis as any)[wire.ctor] as (new (buf: ArrayBuffer) => ArrayBufferView) | undefined;
        return TypedArrayCtor ? new TypedArrayCtor(bytes.buffer as ArrayBuffer) : bytes;
      }
      case "B": return null; // Blob placeholder — fetch via fetchBlob RPC on demand
      case "circ": return refs[wire.ref] ?? null;
      default: return null;
    }
  })();
  if (!["a", "o", "m", "s"].includes(wire.$t)) refs.push(self);
  return self;
}
