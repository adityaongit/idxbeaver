import { describe, expect, it } from "vitest";
import { getPathValue, parseMongoQuery } from "./query";

describe("parseMongoQuery", () => {
  it("parses a filter with operators, sort, limit, and projection", () => {
    const input = JSON.stringify({
      store: "users",
      filter: { age: { $gte: 18 }, "profile.country": "IN" },
      sort: { createdAt: -1 },
      limit: 50,
      project: ["id", "email"]
    });
    expect(parseMongoQuery(input)).toEqual({
      store: "users",
      filter: { age: { $gte: 18 }, "profile.country": "IN" },
      sort: { createdAt: -1 },
      limit: 50,
      project: ["id", "email"]
    });
  });

  it("defaults filter to {} and limit to 200", () => {
    expect(parseMongoQuery(JSON.stringify({ store: "users" }))).toMatchObject({
      store: "users",
      filter: {},
      limit: 200
    });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseMongoQuery("{ not json")).toThrow(/Invalid JSON/);
  });

  it("requires a store name", () => {
    expect(() => parseMongoQuery(JSON.stringify({ filter: {} }))).toThrow(/store/);
  });

  it("rejects out-of-range limits", () => {
    expect(() => parseMongoQuery(JSON.stringify({ store: "users", limit: 99999 }))).toThrow(/limit/i);
  });

  it("rejects non-1/-1 sort values", () => {
    expect(() => parseMongoQuery(JSON.stringify({ store: "users", sort: { x: 2 } }))).toThrow(/sort/i);
  });
});

describe("query helpers", () => {
  it("reads dotted paths", () => {
    expect(getPathValue({ profile: { email: "ada@example.com" } }, "profile.email")).toBe("ada@example.com");
  });
});
