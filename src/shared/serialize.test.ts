import { describe, expect, it } from "vitest";
import { serializeValue } from "./serialize";

describe("serializeValue", () => {
  it("serializes plain objects for table display", () => {
    expect(serializeValue({ id: 1, name: "Ada" })).toEqual({
      type: "object",
      preview: "{ id, name }",
      value: { id: 1, name: "Ada" }
    });
  });

  it("preserves special values as tagged JSON", () => {
    expect(serializeValue(new Date("2026-04-20T00:00:00.000Z"))).toEqual({
      type: "Date",
      preview: "<Date 2026-04-20T00:00:00.000Z>",
      value: { $type: "Date", value: "2026-04-20T00:00:00.000Z" }
    });
  });

  it("marks circular references without throwing", () => {
    const value: { self?: unknown } = {};
    value.self = value;
    expect(serializeValue(value).value).toEqual({ self: { $type: "Circular" } });
  });
});
