import { describe, expect, it } from "vitest";
import { compareValues, getPathValue, parseSelectQuery } from "./query";

describe("parseSelectQuery", () => {
  it("parses a basic select query with predicate, ordering, and limit", () => {
    expect(parseSelectQuery("SELECT id, email FROM users WHERE email LIKE '%@acme.com' AND active = true ORDER BY id DESC LIMIT 50;")).toMatchObject({
      select: ["id", "email"],
      storeName: "users",
      where: [
        { column: "email", operator: "LIKE", value: "%@acme.com" },
        { column: "active", operator: "=", value: true }
      ],
      orderBy: { column: "id", direction: "DESC" },
      limit: 50
    });
  });

  it("defaults to selecting all rows with a bounded limit", () => {
    expect(parseSelectQuery("SELECT * FROM syncQueue")).toMatchObject({
      select: ["*"],
      storeName: "syncQueue",
      where: [],
      limit: 200
    });
  });

  it("rejects unsupported syntax", () => {
    expect(() => parseSelectQuery("DELETE FROM users")).toThrow("Use SELECT");
  });

  it("rejects unbounded large limits", () => {
    expect(() => parseSelectQuery("SELECT * FROM users LIMIT 100000")).toThrow("LIMIT must be between 1 and 5000");
  });
});

describe("query helpers", () => {
  it("reads dotted paths", () => {
    expect(getPathValue({ profile: { email: "ada@example.com" } }, "profile.email")).toBe("ada@example.com");
  });

  it("matches LIKE conditions with percent wildcards", () => {
    expect(compareValues("ada@example.com", "LIKE", "%@example.com")).toBe(true);
    expect(compareValues("ada@example.com", "LIKE", "%@acme.com")).toBe(false);
  });
});
