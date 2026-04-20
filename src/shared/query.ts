import type { ComparisonOperator, QueryCondition, QueryPlan, SerializedCell } from "./types";

const queryPattern =
  /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_$.-]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_$.]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?\s*;?$/i;

const conditionPattern =
  /^\s*([a-zA-Z0-9_$.]+)\s*(=|!=|<=|>=|<|>|LIKE)\s*(null|true|false|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*$/i;

export function parseSelectQuery(input: string): QueryPlan {
  const trimmed = input.trim();
  const match = queryPattern.exec(trimmed);
  if (!match) {
    throw new Error("Use SELECT columns FROM store WHERE field = value ORDER BY field LIMIT n.");
  }

  const [, rawColumns, storeName, rawWhere, orderColumn, orderDirection, rawLimit] = match;
  const select = rawColumns.trim() === "*" ? ["*"] : rawColumns.split(",").map((column) => column.trim()).filter(Boolean);
  if (select.length === 0) {
    throw new Error("Select at least one column or use *.");
  }

  const where = rawWhere ? parseWhere(rawWhere) : [];
  const limit = rawLimit ? Number(rawLimit) : 200;
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) {
    throw new Error("LIMIT must be between 1 and 5000.");
  }

  return {
    select,
    storeName,
    where,
    orderBy: orderColumn
      ? { column: orderColumn, direction: orderDirection?.toUpperCase() === "DESC" ? "DESC" : "ASC" }
      : undefined,
    limit,
    explain: buildExplain(where, orderColumn, limit)
  };
}

function parseWhere(rawWhere: string): QueryCondition[] {
  return rawWhere.split(/\s+AND\s+/i).map((rawCondition) => {
    const match = conditionPattern.exec(rawCondition);
    if (!match) {
      throw new Error(`Unsupported WHERE condition: ${rawCondition.trim()}`);
    }

    const [, column, operator, rawValue] = match;
    return {
      column,
      operator: operator.toUpperCase() as ComparisonOperator,
      value: parseLiteral(rawValue)
    };
  });
}

function parseLiteral(rawValue: string): string | number | boolean | null {
  if (/^null$/i.test(rawValue)) return null;
  if (/^true$/i.test(rawValue)) return true;
  if (/^false$/i.test(rawValue)) return false;
  if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) return Number(rawValue);
  return rawValue.slice(1, -1);
}

function buildExplain(where: QueryCondition[], orderColumn: string | undefined, limit: number): string {
  const predicates = where.length === 0 ? "no predicates" : `${where.length} predicate${where.length === 1 ? "" : "s"}`;
  const ordering = orderColumn ? `, order by ${orderColumn}` : "";
  return `SELECT scan with ${predicates}${ordering}, limit ${limit}. Indexed fast path is used when the first predicate matches an object-store index.`;
}

export function getPathValue(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);
}

export function compareValues(actual: unknown, operator: ComparisonOperator, expected: unknown): boolean {
  if (operator === "LIKE") {
    const pattern = String(expected).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
    return new RegExp(`^${pattern}$`, "i").test(String(actual ?? ""));
  }

  if (operator === "=") return actual === expected;
  if (operator === "!=") return actual !== expected;

  if (typeof actual !== "number" && typeof actual !== "string") return false;
  if (typeof expected !== "number" && typeof expected !== "string") return false;

  if (operator === "<") return actual < expected;
  if (operator === "<=") return actual <= expected;
  if (operator === ">") return actual > expected;
  if (operator === ">=") return actual >= expected;
  return false;
}

export function serializedPreview(cell: SerializedCell): string {
  return cell.preview || String(cell.value ?? "");
}
