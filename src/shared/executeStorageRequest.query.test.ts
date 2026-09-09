import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { executeStorageRequest } from "./executeStorageRequest";
import type { NoSqlQuery, QueryResult } from "./types";

let dbCounter = 0;

function seedDb(rows: Array<Record<string, unknown>>): Promise<string> {
  const dbName = `test-db-${dbCounter++}`;
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(dbName, 1);
    openRequest.onupgradeneeded = () => {
      const store = openRequest.result.createObjectStore("users", { keyPath: "id" });
      store.createIndex("age", "age");
    };
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const tx = db.transaction("users", "readwrite");
      for (const row of rows) tx.objectStore("users").put(row);
      tx.oncomplete = () => { db.close(); resolve(dbName); };
      tx.onerror = () => reject(tx.error);
    };
    openRequest.onerror = () => reject(openRequest.error);
  });
}

async function runQuery(dbName: string, query: NoSqlQuery): Promise<QueryResult> {
  const response = await executeStorageRequest({
    type: "runIndexedDbQuery",
    tabId: 0,
    frameId: 0,
    dbName,
    dbVersion: 1,
    query,
  });
  if (!response.ok) throw new Error(response.error);
  return response.data as QueryResult;
}

const USERS = [
  { id: 1, name: "Ada", age: 30, tags: ["admin", "eng"], profile: { country: "UK" } },
  { id: 2, name: "Bob", age: 25, tags: ["eng"], profile: { country: "US" } },
  { id: 3, name: "Cy", age: 40, tags: ["ops"], profile: { country: "UK" } },
];

describe("runIndexedDbQuery against a real IndexedDB", () => {
  let dbName: string;

  beforeEach(async () => {
    dbName = await seedDb(USERS);
  });

  it("matches everything with an empty filter", async () => {
    const result = await runQuery(dbName, { store: "users" });
    expect(result.rows.map((r) => r.key)).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it("uses the index for an equality filter on an indexed field", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { age: 30 } });
    expect(result.rows.map((r) => r.key)).toEqual([1]);
    expect(result.plan).toContain('Used index "age"');
  });

  it("uses the index for a $gte/$lte range filter", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { age: { $gte: 25, $lte: 30 } } });
    expect(result.rows.map((r) => r.key).sort()).toEqual([1, 2]);
    expect(result.plan).toContain('Used index "age"');
  });

  it("falls back to a full scan for a non-indexed field", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { name: "Bob" } });
    expect(result.rows.map((r) => r.key)).toEqual([2]);
    expect(result.plan).toContain("Full object-store scan");
  });

  it("matches an array field against a scalar with plain equality", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { tags: "eng" } });
    expect(result.rows.map((r) => r.key).sort()).toEqual([1, 2]);
  });

  it("resolves dotted paths into nested objects", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { "profile.country": "UK" } });
    expect(result.rows.map((r) => r.key).sort()).toEqual([1, 3]);
  });

  it("combines multiple operators with $and", async () => {
    const result = await runQuery(dbName, {
      store: "users",
      filter: { $and: [{ age: { $gte: 30 } }, { "profile.country": "UK" }] },
    });
    expect(result.rows.map((r) => r.key).sort()).toEqual([1, 3]);
  });

  it("supports $or across unrelated fields", async () => {
    const result = await runQuery(dbName, {
      store: "users",
      filter: { $or: [{ name: "Bob" }, { age: 40 }] },
    });
    expect(result.rows.map((r) => r.key).sort()).toEqual([2, 3]);
  });

  it("excludes matches with $nor", async () => {
    const result = await runQuery(dbName, {
      store: "users",
      filter: { $nor: [{ name: "Bob" }, { name: "Cy" }] },
    });
    expect(result.rows.map((r) => r.key)).toEqual([1]);
  });

  it("matches with $regex", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { name: { $regex: "^A" } } });
    expect(result.rows.map((r) => r.key)).toEqual([1]);
  });

  it("sorts ascending and descending in memory", async () => {
    const asc = await runQuery(dbName, { store: "users", sort: { age: 1 } });
    expect(asc.rows.map((r) => r.key)).toEqual([2, 1, 3]);

    const desc = await runQuery(dbName, { store: "users", sort: { age: -1 } });
    expect(desc.rows.map((r) => r.key)).toEqual([3, 1, 2]);
  });

  it("sorts numbers numerically, not lexicographically (9 before 10)", async () => {
    const scoreDb = await seedDb([
      { id: 1, score: 9 },
      { id: 2, score: 10 },
      { id: 3, score: 2 },
    ]);
    const result = await runQuery(scoreDb, { store: "users", sort: { score: 1 } });
    expect(result.rows.map((r) => r.key)).toEqual([3, 1, 2]);
  });

  it("applies limit after matching", async () => {
    const result = await runQuery(dbName, { store: "users", limit: 2 });
    expect(result.rows).toHaveLength(2);
  });

  it("projects only the requested fields", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { id: 1 }, project: ["name"] });
    expect(result.columns).toEqual(["name"]);
    expect(result.rows[0].projected).toEqual({ name: { type: "string", preview: "Ada", value: "Ada" } });
  });

  it("returns no rows when nothing matches", async () => {
    const result = await runQuery(dbName, { store: "users", filter: { name: "Nobody" } });
    expect(result.rows).toEqual([]);
  });
});
