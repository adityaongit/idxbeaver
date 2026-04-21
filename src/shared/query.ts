import type { NoSqlQuery } from "./types";

export function parseMongoQuery(input: string): NoSqlQuery {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Query is empty. Provide a JSON object with at least a \"store\" field.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Query must be a JSON object, e.g. { \"store\": \"users\", \"filter\": {} }.");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.store !== "string" || !obj.store.trim()) {
    throw new Error("Query must include a non-empty \"store\" string.");
  }

  if (obj.filter !== undefined && (obj.filter === null || typeof obj.filter !== "object" || Array.isArray(obj.filter))) {
    throw new Error("\"filter\" must be an object.");
  }

  if (obj.sort !== undefined) {
    if (!obj.sort || typeof obj.sort !== "object" || Array.isArray(obj.sort)) {
      throw new Error("\"sort\" must be an object mapping fields to 1 or -1.");
    }
    for (const value of Object.values(obj.sort as Record<string, unknown>)) {
      if (value !== 1 && value !== -1) {
        throw new Error("\"sort\" values must be 1 (asc) or -1 (desc).");
      }
    }
  }

  if (obj.limit !== undefined) {
    if (typeof obj.limit !== "number" || !Number.isInteger(obj.limit) || obj.limit < 1 || obj.limit > 5000) {
      throw new Error("\"limit\" must be an integer between 1 and 5000.");
    }
  }

  if (obj.project !== undefined) {
    if (!Array.isArray(obj.project) || !obj.project.every((item) => typeof item === "string")) {
      throw new Error("\"project\" must be an array of field-path strings.");
    }
  }

  return {
    store: obj.store,
    filter: (obj.filter as Record<string, unknown> | undefined) ?? {},
    sort: obj.sort as NoSqlQuery["sort"],
    limit: (obj.limit as number | undefined) ?? 200,
    project: obj.project as string[] | undefined
  };
}

export function getPathValue(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);
}
