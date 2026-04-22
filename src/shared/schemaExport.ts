import type { InferredColumn, InferredType } from "./schemaInfer";
import type { IndexedDbStoreInfo } from "./types";

function tsType(t: InferredType): string {
  switch (t) {
    case "string": return "string";
    case "number":
    case "integer": return "number";
    case "boolean": return "boolean";
    case "null": return "null";
    case "date": return "Date | string";
    case "array": return "unknown[]";
    case "object": return "Record<string, unknown>";
    case "mixed": return "unknown";
  }
}

export function toTypeScript(storeName: string, columns: InferredColumn[]): string {
  const interfaceName = storeName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/^(\d)/, "_$1");
  const fields = columns.map((col) => {
    const optional = col.nullable || col.coverage < 1 ? "?" : "";
    return `  ${col.name}${optional}: ${tsType(col.type)};`;
  });
  return `interface ${interfaceName} {\n${fields.join("\n")}\n}`;
}

export function toDexieSchema(stores: IndexedDbStoreInfo[]): string {
  const lines = stores.map((store) => {
    const parts: string[] = [];
    if (store.autoIncrement && store.keyPath) {
      const kp = Array.isArray(store.keyPath) ? store.keyPath.join("+") : store.keyPath;
      parts.push(`++${kp}`);
    } else if (store.keyPath) {
      const kp = Array.isArray(store.keyPath) ? store.keyPath.join("+") : store.keyPath;
      parts.push(kp);
    } else if (store.autoIncrement) {
      parts.push("++id");
    } else {
      parts.push("");
    }
    for (const idx of store.indexes) {
      const kp = Array.isArray(idx.keyPath) ? idx.keyPath.join("+") : (idx.keyPath ?? "");
      const prefix = idx.unique ? "&" : idx.multiEntry ? "*" : "";
      parts.push(`${prefix}${kp}`);
    }
    return `  ${store.name}: "${parts.join(", ")}"`;
  });
  return `{\n${lines.join(",\n")}\n}`;
}
