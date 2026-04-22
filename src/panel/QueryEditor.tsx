import { useEffect, useMemo, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, hoverTooltip, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { bracketMatching, defaultHighlightStyle, foldGutter, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { json } from "@codemirror/lang-json";
import { detectContext, TOP_LEVEL_KEYS, OPERATOR_DESCRIPTIONS } from "./queryCompletions";
import type { InferredColumn } from "../shared/schemaInfer";
import type { IndexedDbDatabaseInfo } from "../shared/types";

type QuerySuggestion = {
  label: string;
  insertText: string;
  kind: "store" | "field" | "operator";
};

type QueryEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  suggestions: QuerySuggestion[];
  theme: "dark" | "light";
  databases?: IndexedDbDatabaseInfo[];
  inferredColumns?: InferredColumn[];
};

const themeCompartment = new Compartment();
const suggestionCompartment = new Compartment();
const hoverCompartment = new Compartment();

function createTheme(mode: "dark" | "light") {
  const isDark = mode === "dark";
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        backgroundColor: "var(--card)",
        color: "var(--foreground)"
      },
      ".cm-scroller": {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineHeight: "24px"
      },
      ".cm-content": { padding: "16px 0", caretColor: "var(--foreground)" },
      ".cm-line": { padding: "0 16px" },
      ".cm-gutters": {
        backgroundColor: "var(--card)",
        color: "var(--muted-foreground)",
        borderRight: "1px solid var(--border)"
      },
      ".cm-activeLineGutter": { color: "var(--foreground)", backgroundColor: "transparent" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
      ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--muted) 50%, transparent)" },
      ".cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "var(--accent)"
      },
      ".cm-tooltip": {
        border: "1px solid var(--border)",
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
        borderRadius: "10px",
        overflow: "hidden"
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: "var(--accent)",
        color: "var(--accent-foreground)"
      },
      ".cm-tooltip.cm-hover-tooltip": {
        padding: "6px 10px",
        fontSize: "11px",
        lineHeight: "1.5",
        maxWidth: "320px",
        borderRadius: "6px"
      },
      ".cm-panels": {
        backgroundColor: "var(--card)",
        color: "var(--foreground)"
      }
    },
    { dark: isDark }
  );
}

function buildCompletionExtension(
  suggestions: QuerySuggestion[],
  databases: IndexedDbDatabaseInfo[],
  inferredColumns: InferredColumn[]
) {
  const storeNames = databases.flatMap((db) => db.stores.map((s) => s.name));
  const columnNames = inferredColumns.map((c) => c.name);
  const operatorNames = Object.keys(OPERATOR_DESCRIPTIONS);

  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/[\w$"]+/);
        if (!context.explicit && !word) return null;
        const prefix = word?.text.replace(/^"/, "").toLowerCase() ?? "";
        const docText = context.state.doc.toString();
        const ctx = detectContext(docText, context.pos);

        let candidates: { label: string; detail?: string; apply: string }[] = [];

        if (ctx.kind === "store-value") {
          candidates = storeNames.map((name) => ({
            label: name,
            detail: "object store",
            apply: `"${name}"`
          }));
        } else if (ctx.kind === "field-name") {
          candidates = columnNames.map((name) => {
            const col = inferredColumns.find((c) => c.name === name);
            return {
              label: name,
              detail: col ? `${col.type} · ${Math.round(col.coverage * 100)}%` : "field",
              apply: `"${name}"`
            };
          });
          if (candidates.length === 0) {
            candidates = suggestions
              .filter((s) => s.kind === "field")
              .map((s) => ({ label: s.label, detail: "field", apply: s.insertText }));
          }
        } else if (ctx.kind === "operator") {
          candidates = operatorNames.map((op) => ({
            label: op,
            detail: OPERATOR_DESCRIPTIONS[op]?.slice(0, 40),
            apply: `"${op}"`
          }));
        } else if (ctx.kind === "top-level") {
          candidates = TOP_LEVEL_KEYS.map((key) => ({
            label: key,
            detail: "query key",
            apply: `"${key}"`
          }));
        } else {
          // fallback — flat pool
          candidates = suggestions.map((s) => ({
            label: s.label,
            detail: s.kind,
            apply: s.insertText
          }));
        }

        const filtered = prefix
          ? candidates.filter((c) => c.label.toLowerCase().startsWith(prefix))
          : candidates;

        if (filtered.length === 0) return null;
        return { from: word ? word.from : context.pos, options: filtered };
      }
    ]
  });
}

function buildHoverExtension(
  databases: IndexedDbDatabaseInfo[],
  inferredColumns: InferredColumn[]
) {
  const storeMap = new Map<string, { count: number | null; keyPath: string | string[] | null; indexes: string[] }>();
  for (const db of databases) {
    for (const store of db.stores) {
      storeMap.set(store.name, {
        count: store.count,
        keyPath: store.keyPath,
        indexes: store.indexes.map((i) => i.name)
      });
    }
  }

  return hoverTooltip((view, pos) => {
    const { from, to, text } = view.state.doc.lineAt(pos);
    const start = text.slice(0, pos - from).search(/[\w$]+$/) + from;
    const end = text.slice(pos - from).search(/[^\w$]/) + (pos - from) + from;
    const word = text.slice(start - from, end - from).replace(/^["']|["']$/g, "");
    if (!word) return null;

    let tooltipText: string | null = null;

    const storeInfo = storeMap.get(word);
    if (storeInfo) {
      const parts = [`${word}`];
      if (storeInfo.count !== null) parts.push(`${storeInfo.count} rows`);
      if (storeInfo.keyPath) parts.push(`keyPath: ${JSON.stringify(storeInfo.keyPath)}`);
      if (storeInfo.indexes.length > 0) parts.push(`indexes: ${storeInfo.indexes.join(", ")}`);
      tooltipText = parts.join(" · ");
    }

    const col = inferredColumns.find((c) => c.name === word);
    if (col) {
      tooltipText = `${word} · ${col.type} · ${Math.round(col.coverage * 100)}% coverage`;
    }

    if (OPERATOR_DESCRIPTIONS[word]) {
      tooltipText = `${word} — ${OPERATOR_DESCRIPTIONS[word]}`;
    }

    if (!tooltipText) return null;

    const finalText = tooltipText;
    return {
      pos: start,
      end: Math.min(end, to),
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-hover-tooltip";
        dom.textContent = finalText;
        return { dom };
      }
    };
  });
}

export function QueryEditor({ value, onChange, onRun, suggestions, theme, databases = [], inferredColumns = [] }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);

  const completionExtension = useMemo(
    () => buildCompletionExtension(suggestions, databases, inferredColumns),
    [suggestions, databases, inferredColumns]
  );

  const hoverExtension = useMemo(
    () => buildHoverExtension(databases, inferredColumns),
    [databases, inferredColumns]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        highlightActiveLine(),
        keymap.of([
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...searchKeymap,
          {
            key: "Mod-Enter",
            run: () => {
              onRun();
              return true;
            }
          }
        ]),
        json(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        suggestionCompartment.of(completionExtension),
        hoverCompartment.of(hoverExtension),
        themeCompartment.of(createTheme(theme)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })
      ]
    });

    const view = new EditorView({ state, parent: containerRef.current });
    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    editorRef.current?.dispatch({ effects: themeCompartment.reconfigure(createTheme(theme)) });
  }, [theme]);

  useEffect(() => {
    editorRef.current?.dispatch({ effects: suggestionCompartment.reconfigure(completionExtension) });
  }, [completionExtension]);

  useEffect(() => {
    editorRef.current?.dispatch({ effects: hoverCompartment.reconfigure(hoverExtension) });
  }, [hoverExtension]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={containerRef} className="h-full min-h-72 w-full" />;
}
