import { describe, expect, it } from "vitest";
import { keyStrategy } from "./indexed";
import type { IndexedDbStoreInfo } from "./types";

function store(overrides: Partial<IndexedDbStoreInfo>): IndexedDbStoreInfo {
  return { name: "s", keyPath: null, autoIncrement: false, count: 0, indexes: [], ...overrides };
}

describe("keyStrategy", () => {
  it("auto: no keyPath, autoIncrement on", () => {
    expect(keyStrategy(store({ keyPath: null, autoIncrement: true }))).toEqual({ kind: "auto" });
  });

  it("outOfLine: no keyPath, no autoIncrement", () => {
    expect(keyStrategy(store({ keyPath: null, autoIncrement: false }))).toEqual({ kind: "outOfLine" });
  });

  it("inlineKeyPath: single keyPath, no autoIncrement", () => {
    expect(keyStrategy(store({ keyPath: "id", autoIncrement: false }))).toEqual({ kind: "inlineKeyPath", path: ["id"] });
  });

  it("autoIncrementInline: keyPath + autoIncrement", () => {
    expect(keyStrategy(store({ keyPath: "id", autoIncrement: true }))).toEqual({ kind: "autoIncrementInline", path: ["id"] });
  });

  it("normalizes a compound keyPath array", () => {
    expect(keyStrategy(store({ keyPath: ["a", "b"], autoIncrement: false }))).toEqual({ kind: "inlineKeyPath", path: ["a", "b"] });
  });
});
