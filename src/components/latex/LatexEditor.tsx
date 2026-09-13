"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, toggleLineComment } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from "@codemirror/search";
import { StreamLanguage, syntaxHighlighting, HighlightStyle, bracketMatching, indentUnit } from "@codemirror/language";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, type CompletionContext } from "@codemirror/autocomplete";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { tags as t } from "@lezer/highlight";
import type { LogEntry } from "@/lib/latex/log";

export type EditorCommand =
  | "undo"
  | "redo"
  | "bold"
  | "italic"
  | "section"
  | "item"
  | "link"
  | "comment"
  | "search"
  | "bigger"
  | "smaller";

export type LatexEditorHandle = {
  getValue: () => string;
  setValue: (v: string) => void;
  goToLine: (n: number) => void;
  focus: () => void;
  exec: (cmd: EditorCommand) => void;
  setDiagnostics: (entries: LogEntry[]) => void;
};

/** Theme built from the app's CSS variables so it follows light/dark automatically. */
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--paper)", color: "var(--ink)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  ".cm-content": { padding: "10px 0", caretColor: "var(--signal)" },
  ".cm-gutters": { backgroundColor: "var(--paper)", color: "var(--ink-3)", border: "none", paddingLeft: "4px" },
  ".cm-activeLineGutter": { backgroundColor: "var(--paper-2)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--paper-2) 70%, transparent)" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "var(--signal)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "var(--signal-soft) !important" },
  ".cm-matchingBracket": { backgroundColor: "var(--signal-soft)", outline: "1px solid var(--signal)" },
  ".cm-selectionMatch": { backgroundColor: "var(--paper-3)" },
  ".cm-lintRange-error": { backgroundImage: "none", borderBottom: "2px wavy var(--danger)", textDecoration: "none" },
  ".cm-lintRange-warning": { backgroundImage: "none", borderBottom: "2px wavy var(--amber)" },
  ".cm-gutter-lint .cm-gutterElement": { padding: "0 2px" },
  ".cm-lint-marker-error": { content: "none" },
  ".cm-tooltip": { backgroundColor: "var(--paper)", border: "1px solid var(--rule)", borderRadius: "10px", boxShadow: "var(--shadow-pop)", fontFamily: "var(--font-sans)" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", fontSize: "12px" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--signal-soft)", color: "var(--ink)" },
  ".cm-panels": { backgroundColor: "var(--paper-2)", color: "var(--ink)", borderColor: "var(--rule)" },
  ".cm-panel.cm-search input, .cm-panel.cm-search button": { fontFamily: "var(--font-sans)", fontSize: "12px" },
});

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--signal)" },
  { tag: t.tagName, color: "var(--signal)" },
  { tag: t.atom, color: "#8430ce" },
  { tag: t.bracket, color: "var(--ink-2)" },
  { tag: t.comment, color: "var(--ink-3)", fontStyle: "italic" },
  { tag: t.string, color: "var(--moss)" },
  { tag: t.number, color: "var(--amber)" },
  { tag: t.variableName, color: "var(--ink)" },
]);

/* A small, useful LaTeX completion list for resume documents. */
const COMMANDS = [
  "section", "subsection", "textbf", "textit", "emph", "href", "url", "item", "begin", "end", "vspace", "hspace",
  "newcommand", "usepackage", "documentclass", "color", "textcolor", "small", "large", "Large", "footnotesize",
  "noindent", "par", "hrule", "rule", "titleformat", "titlespacing", "setlength", "textwidth", "linewidth", "raggedright",
  "scshape", "bfseries", "itshape", "MakeUppercase", "input", "resumeItem", "vEntry", "vEntryOne", "vBullets", "vEntries", "vLine", "vSection",
].map((label) => ({ label: "\\" + label, type: "keyword" as const }));
const ENVS = ["itemize", "enumerate", "tabular*", "center", "vBullets", "vEntries", "paracol", "document"];

function latexCompletions(ctx: CompletionContext) {
  const cmd = ctx.matchBefore(/\\[a-zA-Z]*/);
  if (cmd && (cmd.text.length > 1 || ctx.explicit)) return { from: cmd.from, options: COMMANDS, validFor: /^\\[a-zA-Z]*$/ };
  const env = ctx.matchBefore(/\\(?:begin|end)\{[a-zA-Z*]*/);
  if (env) {
    const from = env.from + env.text.indexOf("{") + 1;
    return { from, options: ENVS.map((e) => ({ label: e, type: "type" as const, apply: e + "}" })), validFor: /^[a-zA-Z*]*$/ };
  }
  return null;
}

export const LatexEditor = forwardRef<
  LatexEditorHandle,
  { initial: string; onChange: (v: string) => void; onCompile: () => void; onCursorLine?: (n: number) => void }
>(function LatexEditor({ initial, onChange, onCompile, onCursorLine }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCompileRef = useRef(onCompile);
  const onCursorRef = useRef(onCursorLine);
  onChangeRef.current = onChange;
  onCompileRef.current = onCompile;
  onCursorRef.current = onCursorLine;

  useEffect(() => {
    if (!host.current) return;
    const compileKey = keymap.of([
      { key: "Mod-Enter", run: () => (onCompileRef.current(), true) },
      { key: "Mod-s", run: () => (onCompileRef.current(), true) },
      { key: "Mod-b", run: (v) => wrap(v, "\\textbf{", "}") },
      { key: "Mod-i", run: (v) => wrap(v, "\\textit{", "}") },
    ]);
    const state = EditorState.create({
      doc: initial,
      extensions: [
        lineNumbers(),
        lintGutter(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        autocompletion({ override: [latexCompletions], icons: false }),
        StreamLanguage.define(stex),
        syntaxHighlighting(highlight),
        indentUnit.of("  "),
        theme,
        EditorView.lineWrapping,
        compileKey,
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap, indentWithTab]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          if (u.selectionSet || u.docChanged) onCursorRef.current?.(u.state.doc.lineAt(u.state.selection.main.head).number);
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getValue: () => view.current?.state.doc.toString() ?? "",
    setValue: (v) => {
      const cm = view.current;
      if (!cm) return;
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: v } });
    },
    goToLine: (n) => {
      const cm = view.current;
      if (!cm) return;
      const line = cm.state.doc.line(Math.max(1, Math.min(n, cm.state.doc.lines)));
      cm.dispatch({ selection: { anchor: line.from }, effects: EditorView.scrollIntoView(line.from, { y: "center" }) });
      cm.focus();
    },
    focus: () => view.current?.focus(),
    exec: (cmd) => {
      const cm = view.current;
      if (!cm) return;
      switch (cmd) {
        case "undo":
          undo(cm);
          break;
        case "redo":
          redo(cm);
          break;
        case "bold":
          wrap(cm, "\\textbf{", "}");
          break;
        case "italic":
          wrap(cm, "\\textit{", "}");
          break;
        case "section":
          insertLine(cm, "\\section{Section}");
          break;
        case "item":
          insertLine(cm, "\\item ");
          break;
        case "link":
          wrap(cm, "\\href{https://}{", "}");
          break;
        case "comment":
          toggleLineComment(cm);
          break;
        case "search":
          openSearchPanel(cm);
          break;
        case "bigger":
          wrap(cm, "{\\large ", "}");
          break;
        case "smaller":
          wrap(cm, "{\\small ", "}");
          break;
      }
      cm.focus();
    },
    setDiagnostics: (entries) => {
      const cm = view.current;
      if (!cm) return;
      const diags: Diagnostic[] = [];
      for (const e of entries) {
        if (!e.line || e.line < 1 || e.line > cm.state.doc.lines) continue;
        const line = cm.state.doc.line(e.line);
        diags.push({ from: line.from, to: line.to, severity: e.level === "error" ? "error" : "warning", message: e.message });
      }
      cm.dispatch(setDiagnostics(cm.state, diags));
    },
  }));

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
});

function wrap(cm: EditorView, before: string, after: string): boolean {
  const { from, to } = cm.state.selection.main;
  const sel = cm.state.sliceDoc(from, to);
  cm.dispatch({
    changes: { from, to, insert: before + sel + after },
    selection: { anchor: from + before.length, head: from + before.length + sel.length },
  });
  return true;
}

function insertLine(cm: EditorView, text: string) {
  const line = cm.state.doc.lineAt(cm.state.selection.main.head);
  const insert = (line.length ? "\n" : "") + text;
  cm.dispatch({ changes: { from: line.to, insert }, selection: { anchor: line.to + insert.length } });
}
