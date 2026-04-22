import { describe, expect, it } from "vitest";
import { serializeValue, normalizeValue, previewValue } from "./serialize";
import { decode, encode } from "./wire";

describe("serializeValue", () => {
  it("serializes plain objects for table display", () => {
    expect(serializeValue({ id: 1, name: "Ada" })).toEqual({
      type: "object",
      preview: "{ id, name }",
      value: { id: 1, name: "Ada" }
    });
  });

  it("preserves Date as tagged JSON", () => {
    expect(serializeValue(new Date("2026-04-20T00:00:00.000Z"))).toEqual({
      type: "Date",
      preview: "<Date 2026-04-20T00:00:00.000Z>",
      value: { $type: "Date", value: "2026-04-20T00:00:00.000Z" }
    });
  });

  it("preserves RegExp with separate src/flags fields", () => {
    const r = serializeValue(/foo/gi);
    expect(r.value).toEqual({ $type: "RegExp", src: "foo", flags: "gi" });
    expect(r.preview).toBe("<RegExp /foo/gi>");
  });

  it("marks circular references with back-ref index", () => {
    const value: { self?: unknown } = {};
    value.self = value;
    expect(serializeValue(value).value).toEqual({ self: { $type: "Circular", ref: 0 } });
  });

  it("serializes Map entries", () => {
    const m = new Map([["a", 1], ["b", 2]]);
    const result = serializeValue(m);
    expect(result.value).toEqual({ $type: "Map", entries: [["a", 1], ["b", 2]] });
    expect(result.preview).toBe("<Map>");
  });

  it("serializes Set values", () => {
    const s = new Set([1, 2, 3]);
    const result = serializeValue(s);
    expect(result.value).toEqual({ $type: "Set", values: [1, 2, 3] });
    expect(result.preview).toBe("<Set>");
  });

  it("serializes Uint8Array with base64 and byte count", () => {
    const arr = new Uint8Array([1, 2, 3]);
    const result = serializeValue(arr);
    expect((result.value as Record<string, unknown>).$type).toBe("Uint8Array");
    expect((result.value as Record<string, unknown>).bytes).toBe(3);
    expect(typeof (result.value as Record<string, unknown>).b64).toBe("string");
    expect(result.preview).toBe("<Uint8Array 3 B>");
  });

  it("serializes ArrayBuffer with base64", () => {
    const buf = new Uint8Array([0xff, 0x00]).buffer;
    const result = serializeValue(buf);
    expect((result.value as Record<string, unknown>).$type).toBe("ArrayBuffer");
    expect((result.value as Record<string, unknown>).bytes).toBe(2);
    expect(typeof (result.value as Record<string, unknown>).b64).toBe("string");
  });

  it("excludes $-prefixed keys from plain object preview", () => {
    // Objects without $type use key listing; internal $-keys should be hidden
    const result = previewValue({ $internal: "hidden", realKey: "bar" });
    expect(result).toBe("{ realKey }");
  });
});

describe("wire encode/decode round-trips", () => {
  const roundTrip = (input: unknown) => decode(encode(input));

  it("round-trips null", () => expect(roundTrip(null)).toBeNull());
  it("round-trips string", () => expect(roundTrip("hello")).toBe("hello"));
  it("round-trips number", () => expect(roundTrip(42)).toBe(42));
  it("round-trips boolean", () => expect(roundTrip(true)).toBe(true));
  it("round-trips undefined", () => expect(roundTrip(undefined)).toBeUndefined());
  it("round-trips bigint", () => expect(roundTrip(BigInt("9007199254740993"))).toBe(BigInt("9007199254740993")));

  it("round-trips Date", () => {
    const d = new Date("2026-04-20T12:00:00.000Z");
    expect((roundTrip(d) as Date).toISOString()).toBe(d.toISOString());
  });

  it("round-trips RegExp", () => {
    const r = /hello/gi;
    const decoded = roundTrip(r) as RegExp;
    expect(decoded.source).toBe(r.source);
    expect(decoded.flags).toBe(r.flags);
  });

  it("round-trips Map", () => {
    const m = new Map([["x", 1], ["y", 2]]);
    const decoded = roundTrip(m) as Map<string, number>;
    expect(decoded instanceof Map).toBe(true);
    expect(decoded.get("x")).toBe(1);
    expect(decoded.get("y")).toBe(2);
  });

  it("round-trips Set", () => {
    const s = new Set([10, 20, 30]);
    const decoded = roundTrip(s) as Set<number>;
    expect(decoded instanceof Set).toBe(true);
    expect(decoded.has(20)).toBe(true);
  });

  it("round-trips Uint8Array", () => {
    const arr = new Uint8Array([1, 2, 3, 255]);
    const decoded = roundTrip(arr) as Uint8Array;
    expect(decoded instanceof Uint8Array).toBe(true);
    expect(Array.from(decoded)).toEqual([1, 2, 3, 255]);
  });

  it("round-trips ArrayBuffer", () => {
    const buf = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
    const decoded = roundTrip(buf) as ArrayBuffer;
    expect(decoded instanceof ArrayBuffer).toBe(true);
    expect(new Uint8Array(decoded)[0]).toBe(0xde);
    expect(new Uint8Array(decoded)[3]).toBe(0xef);
  });

  it("round-trips nested object", () => {
    const obj = { a: 1, b: { c: "deep" } };
    expect(roundTrip(obj)).toEqual(obj);
  });

  it("round-trips array", () => {
    const arr = [1, "two", null, true];
    expect(roundTrip(arr)).toEqual(arr);
  });

  it("handles circular references via circ tag", () => {
    const arr: unknown[] = [];
    arr.push(arr);
    const wire = encode(arr);
    expect(wire.$t).toBe("a");
  });
});

describe("normalizeValue", () => {
  it("returns primitive values unchanged", () => {
    expect(normalizeValue(42)).toBe(42);
    expect(normalizeValue("text")).toBe("text");
    expect(normalizeValue(null)).toBeNull();
    expect(normalizeValue(true)).toBe(true);
  });

  it("wraps undefined", () => {
    expect(normalizeValue(undefined)).toEqual({ $type: "Undefined" });
  });

  it("wraps bigint", () => {
    expect(normalizeValue(BigInt(123))).toEqual({ $type: "BigInt", value: "123" });
  });
});
