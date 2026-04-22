import type { IndexedDbStoreInfo } from "./types";

export type KeyStrategy =
  | { kind: "auto" }
  | { kind: "autoIncrementInline"; path: string[] }
  | { kind: "inlineKeyPath"; path: string[] }
  | { kind: "outOfLine" };

export function keyStrategy(store: IndexedDbStoreInfo): KeyStrategy {
  const { keyPath, autoIncrement } = store;

  if (keyPath === null || keyPath === undefined) {
    return autoIncrement ? { kind: "auto" } : { kind: "outOfLine" };
  }

  const path = Array.isArray(keyPath) ? keyPath : [keyPath];
  return autoIncrement
    ? { kind: "autoIncrementInline", path }
    : { kind: "inlineKeyPath", path };
}
