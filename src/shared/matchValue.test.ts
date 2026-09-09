import { describe, expect, it } from "vitest";
import { compareForSort, compareScalars, deepEqual, matchFieldExpr, matchFilter, valuesMatch } from "./matchValue";

describe("valuesMatch", () => {
  it("matches identical scalars and objects", () => {
    expect(valuesMatch("x", "x")).toBe(true);
    expect(valuesMatch({ a: 1 }, { a: 1 })).toBe(true);
  });

  it("matches an array field against a scalar it contains (Mongo semantics)", () => {
    expect(valuesMatch(["x", "y"], "x")).toBe(true);
    expect(valuesMatch(["x", "y"], "z")).toBe(false);
  });

  it("does not match a scalar field against an array", () => {
    expect(valuesMatch("x", ["x", "y"])).toBe(false);
  });

  it("still requires exact array equality when expected is also an array", () => {
    expect(valuesMatch(["x", "y"], ["x", "y"])).toBe(true);
    expect(valuesMatch(["x", "y"], ["x"])).toBe(false);
  });
});

describe("matchFieldExpr", () => {
  it("$eq/$ne/$in/$nin honor array-contains semantics", () => {
    expect(matchFieldExpr(["a", "b"], { $eq: "a" })).toBe(true);
    expect(matchFieldExpr(["a", "b"], { $ne: "a" })).toBe(false);
    expect(matchFieldExpr(["a", "b"], { $in: ["a", "c"] })).toBe(true);
    expect(matchFieldExpr(["a", "b"], { $nin: ["a", "c"] })).toBe(false);
  });

  it("$exists checks presence, not nullishness", () => {
    expect(matchFieldExpr(null, { $exists: true })).toBe(true);
    expect(matchFieldExpr(undefined, { $exists: true })).toBe(false);
    expect(matchFieldExpr(undefined, { $exists: false })).toBe(true);
  });

  it("$regex matches strings only", () => {
    expect(matchFieldExpr("hello", { $regex: "^he" })).toBe(true);
    expect(matchFieldExpr(42, { $regex: "^he" })).toBe(false);
  });
});

describe("matchFilter", () => {
  it("supports $and/$or/$not/$nor", () => {
    const doc = { age: 20, name: "Ada" };
    expect(matchFilter(doc, { $and: [{ age: { $gte: 18 } }, { name: "Ada" }] })).toBe(true);
    expect(matchFilter(doc, { $or: [{ age: { $lt: 18 } }, { name: "Ada" }] })).toBe(true);
    expect(matchFilter(doc, { $not: { name: "Ada" } })).toBe(false);
    expect(matchFilter(doc, { $nor: [{ name: "Ada" }, { age: 20 }] })).toBe(false);
    expect(matchFilter(doc, { $nor: [{ name: "Bob" }] })).toBe(true);
  });

  it("matches array-contains fields through a plain equality filter", () => {
    expect(matchFilter({ tags: ["red", "blue"] }, { tags: "red" })).toBe(true);
    expect(matchFilter({ tags: ["red", "blue"] }, { tags: "green" })).toBe(false);
  });

  it("resolves dotted paths", () => {
    expect(matchFilter({ profile: { country: "IN" } }, { "profile.country": "IN" })).toBe(true);
  });
});

describe("compareScalars", () => {
  it("compares numbers, strings, and dates", () => {
    expect(compareScalars(1, 2)).toBeLessThan(0);
    expect(compareScalars("b", "a")).toBeGreaterThan(0);
    expect(compareScalars(new Date(0), new Date(1))).toBeLessThan(0);
  });

  it("is NaN for mismatched types", () => {
    expect(Number.isNaN(compareScalars(1, "1"))).toBe(true);
  });
});

describe("deepEqual", () => {
  it("does not consider an array equal to a scalar it contains", () => {
    expect(deepEqual(["x"], "x")).toBe(false);
  });
});

describe("compareForSort", () => {
  it("sorts numbers numerically, not lexicographically", () => {
    expect([10, 9, 2].sort(compareForSort)).toEqual([2, 9, 10]);
  });

  it("sorts nullish values last regardless of direction", () => {
    expect([2, null, 1, undefined].sort(compareForSort)).toEqual([1, 2, null, undefined]);
  });

  it("sorts booleans false before true", () => {
    expect([true, false].sort(compareForSort)).toEqual([false, true]);
  });

  it("falls back to string comparison for mismatched types", () => {
    expect(compareForSort(1, "a")).toBeLessThan(0);
  });
});
