import React from "react";

type Token = { text: string; className?: string };

const JSON_TOKEN_RE =
  /"(?:\\.|[^"\\])*"(?:\s*:)?|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}\[\],]/g;

function tokenizeJson(input: string): Token[] {
  const out: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  JSON_TOKEN_RE.lastIndex = 0;
  while ((match = JSON_TOKEN_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      out.push({ text: input.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("\"")) {
      // Could be a "key": (ends with colon) or a value string
      if (/:\s*$/.test(raw)) {
        const stringPart = raw.replace(/\s*:\s*$/, "");
        out.push({ text: stringPart, className: "text-json-key" });
        out.push({ text: raw.slice(stringPart.length), className: "text-json-punct" });
      } else {
        out.push({ text: raw, className: "text-json-string" });
      }
    } else if (/^-?\d/.test(raw)) {
      out.push({ text: raw, className: "text-json-number" });
    } else if (raw === "true" || raw === "false") {
      out.push({ text: raw, className: "text-json-boolean" });
    } else if (raw === "null") {
      out.push({ text: raw, className: "text-json-null" });
    } else {
      out.push({ text: raw, className: "text-json-punct" });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < input.length) out.push({ text: input.slice(lastIndex) });
  return out;
}

export function JsonHighlight({ text, className }: { text: string; className?: string }) {
  const tokens = React.useMemo(() => tokenizeJson(text), [text]);
  return (
    <code className={className}>
      {tokens.map((t, i) =>
        t.className ? (
          <span key={i} className={t.className}>
            {t.text}
          </span>
        ) : (
          <React.Fragment key={i}>{t.text}</React.Fragment>
        )
      )}
    </code>
  );
}

const SQL_KEYWORDS = new Set([
  "select", "from", "where", "and", "or", "not", "in", "is", "null", "as",
  "join", "inner", "left", "right", "outer", "on", "group", "by", "order",
  "having", "limit", "offset", "insert", "into", "values", "update", "set",
  "delete", "create", "table", "drop", "alter", "add", "column", "primary",
  "key", "foreign", "references", "distinct", "union", "all", "case", "when",
  "then", "else", "end", "with", "exists", "between", "like", "desc", "asc",
  "true", "false", "count", "sum", "avg", "min", "max", "cast", "int", "int8",
  "text", "jsonb", "timestamptz", "float8", "boolean"
]);

const SQL_TOKEN_RE =
  /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|-?\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[()[\]{},;=<>!+\-*/%|&^~]/g;

function tokenizeSql(input: string): Token[] {
  const out: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  SQL_TOKEN_RE.lastIndex = 0;
  while ((match = SQL_TOKEN_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      out.push({ text: input.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("--") || raw.startsWith("/*")) {
      out.push({ text: raw, className: "text-sql-comment" });
    } else if (raw.startsWith("'") || raw.startsWith("\"")) {
      out.push({ text: raw, className: "text-sql-string" });
    } else if (/^-?\d/.test(raw)) {
      out.push({ text: raw, className: "text-sql-number" });
    } else if (/^[A-Za-z_]/.test(raw)) {
      if (SQL_KEYWORDS.has(raw.toLowerCase())) {
        out.push({ text: raw, className: "text-sql-keyword" });
      } else {
        out.push({ text: raw, className: "text-sql-ident" });
      }
    } else {
      out.push({ text: raw, className: "text-sql-punct" });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < input.length) out.push({ text: input.slice(lastIndex) });
  return out;
}

export function SqlHighlight({ text, className }: { text: string; className?: string }) {
  const tokens = React.useMemo(() => tokenizeSql(text), [text]);
  return (
    <code className={className}>
      {tokens.map((t, i) =>
        t.className ? (
          <span key={i} className={t.className}>
            {t.text}
          </span>
        ) : (
          <React.Fragment key={i}>{t.text}</React.Fragment>
        )
      )}
    </code>
  );
}
