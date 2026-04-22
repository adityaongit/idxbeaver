// Context-aware completions for the MongoDB-style query editor.
// Detects where in the JSON document the cursor is and suggests accordingly.

export type CompletionContext =
  | { kind: "top-level" }
  | { kind: "store-value" }
  | { kind: "field-name" }
  | { kind: "operator" }
  | { kind: "unknown" };

// Walk the text up to `pos` and detect the cursor's JSON context.
export function detectContext(text: string, pos: number): CompletionContext {
  const slice = text.slice(0, pos);

  // Detect if we're typing a value for "store": ...
  // Pattern: "store": "<cursor>"
  if (/["']store["']\s*:\s*["'][^"']*$/.test(slice)) {
    return { kind: "store-value" };
  }

  // Detect if we're inside filter/sort/project object typing a field name
  if (/["'](filter|sort|project)["']\s*:\s*\{[^}]*["'][^"']*$/.test(slice)) {
    return { kind: "field-name" };
  }

  // Detect operator position — inside a nested object after a field name
  if (/["'][^"']+["']\s*:\s*\{[^}]*["'][^"']*$/.test(slice)) {
    return { kind: "operator" };
  }

  // Top-level key (outside any nested object, inside outer braces)
  const depth = countBraceDepth(slice);
  if (depth === 1) {
    // We're at the root level of the query object
    if (/["'][^"']*$/.test(slice)) {
      return { kind: "top-level" };
    }
  }

  return { kind: "unknown" };
}

function countBraceDepth(text: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  return depth;
}

export const TOP_LEVEL_KEYS = ["store", "filter", "sort", "limit", "project"];

export const OPERATOR_DESCRIPTIONS: Record<string, string> = {
  "$eq": "Matches values equal to a specified value.",
  "$ne": "Matches values not equal to a specified value.",
  "$gt": "Matches values greater than a specified value.",
  "$gte": "Matches values greater than or equal to a specified value.",
  "$lt": "Matches values less than a specified value.",
  "$lte": "Matches values less than or equal to a specified value.",
  "$in": "Matches any value in an array.",
  "$nin": "Matches none of the values in an array.",
  "$regex": "Matches string values against a RegExp pattern.",
  "$exists": "Matches records that have (or lack) the specified field.",
  "$and": "Joins query clauses with a logical AND.",
  "$or": "Joins query clauses with a logical OR.",
  "$not": "Inverts the effect of a query expression.",
};
