import { describe, expect, it } from "vitest";
import { isIdempotent } from "./rpcIds";
import type { StorageRequest } from "./types";

function req(type: StorageRequest["type"]): StorageRequest {
  return { type } as StorageRequest;
}

describe("isIdempotent", () => {
  it("treats read-only request types as idempotent", () => {
    expect(isIdempotent(req("discover"))).toBe(true);
    expect(isIdempotent(req("runIndexedDbQuery"))).toBe(true);
  });

  it("treats mutating request types as non-idempotent", () => {
    expect(isIdempotent(req("putIndexedDbRecord"))).toBe(false);
    expect(isIdempotent(req("addIndexedDbRecord"))).toBe(false);
  });
});
