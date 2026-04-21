import { useEffect, useMemo, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { bracketMatching, defaultHighlightStyle, foldGutter, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { json } from "@codemirror/lang-json";

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
};

const themeCompartment = new Compartment();
const suggestionCompartment = new Compartment();

function createTheme(mode: "dark" | "light") {
  const isDark = mode === "dark";
  // Drive colors from the app's CSS variables so the editor blends with the
  // rest of the panel (bg-card, borders, foreground) instead of clashing on
  // pure black.
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
      ".cm-panels": {
        backgroundColor: "var(--card)",
        color: "var(--foreground)"
      }
    },
    { dark: isDark }
  );
}

export function QueryEditor({ value, onChange, onRun, suggestions, theme }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);

  const completionExtension = useMemo(
    () =>
      autocompletion({
        override: [
          (context) => {
            const word = context.matchBefore(/[\w$"]+/);
            if (!context.explicit && !word) return null;
            const prefix = word?.text.replace(/^"/, "").toLowerCase() ?? "";

            const options = suggestions
              .filter((item) => !prefix || item.insertText.toLowerCase().startsWith(prefix))
              .map((item) => ({
                label: item.label,
                type: item.kind === "store" ? "class" : item.kind === "operator" ? "keyword" : "property",
                detail:
                  item.kind === "store"
                    ? "object store"
                    : item.kind === "operator"
                      ? "mongo operator"
                      : "record field",
                apply: item.insertText
              }));

            if (options.length === 0) return null;

            return {
              from: word ? word.from : context.pos,
              options
            };
          }
        ]
      }),
    [suggestions]
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
    const view = editorRef.current;
    if (!view) return;
    view.dispatch({ effects: themeCompartment.reconfigure(createTheme(theme)) });
  }, [theme]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    view.dispatch({ effects: suggestionCompartment.reconfigure(completionExtension) });
  }, [completionExtension]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={containerRef} className="h-full min-h-72 w-full" />;
}
