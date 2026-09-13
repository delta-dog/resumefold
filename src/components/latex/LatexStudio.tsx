"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LatexEditor, type LatexEditorHandle } from "./LatexEditor";
import { PdfViewer } from "./PdfViewer";
import { useActiveDraft, useActiveResume, useResumeStore } from "@/lib/store";
import { renderLatex } from "@/lib/templates/latex";
import { LATEX_STYLES } from "@/lib/templates";
import { latexForExport } from "@/lib/latex/source";
import { parseLatexLog, type LogEntry } from "@/lib/latex/log";
import { downloadLatexZip, downloadText, openInOverleaf, resumeFilename, downloadBlob } from "@/lib/export/download";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { LatexStyleId } from "@/lib/schema";
import { compileLatex, COMPILE_SERVICE, type Engine } from "@/lib/latex/compile";
import { compileLocal, localTexAvailable, onLocalProgress, warmLocalTex, type LocalProgress } from "@/lib/latex/local";

type Status = { kind: "idle" } | { kind: "compiling" } | { kind: "ok"; ms: number } | { kind: "error"; ms?: number };
type Panel = "files" | "outline" | null;
type Layout = "split" | "editor" | "pdf";

const REMOTE_KEY = "byr:remote-compile";
const MOBILE_QUERY = "(max-width: 1023px)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function preferManualCompile() {
  if (typeof window === "undefined") return false;
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return window.matchMedia(MOBILE_QUERY).matches
    || (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4)
    || (device.deviceMemory !== undefined && device.deviceMemory <= 4)
    || device.connection?.saveData === true;
}

/**
 * Overleaf-shaped studio: icon rail → file tree / outline → editor with
 * toolbar → compiled PDF. Recompile (⌘/Ctrl+Enter) or auto-compile; the log
 * panel lists errors that jump to their line and mark the gutter.
 */
export function LatexStudio() {
  // Mount the editor only after drafts are loaded from storage, so its initial
  // source is the user's draft (and their hand edits), not the built-in sample.
  const hydrated = useResumeStore((s) => s.hydrated);
  if (!hydrated) return <div className="grid h-dvh place-items-center text-sm text-ink-3">Opening your draft…</div>;
  return <Studio />;
}

function Studio() {
  const r = useActiveResume();
  const draft = useActiveDraft();
  const update = useResumeStore((s) => s.update);
  const rename = useResumeStore((s) => s.renameDraft);

  const editor = useRef<LatexEditorHandle>(null);
  const initial = useMemo(() => latexForExport(r).files["resume.tex"], []); // eslint-disable-line react-hooks/exhaustive-deps
  const readme = useMemo(() => renderLatex(r).files["README.md"], [r]);
  const [source, setSource] = useState(initial);
  const [edited, setEdited] = useState(Boolean(r.meta.latexSource));
  const [file, setFile] = useState<"resume.tex" | "README.md">("resume.tex");
  const [engine, setEngine] = useState<Engine>("pdflatex");
  const [auto, setAuto] = useState(() => !preferManualCompile());
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
  const [log, setLog] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [panel, setPanel] = useState<Panel>("files");
  const [layout, setLayout] = useState<Layout>("split");
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
  const [mobileView, setMobileView] = useState<"editor" | "pdf">("editor");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [menu, setMenu] = useState<"compile" | "layout" | "share" | null>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [remoteOk, setRemoteOk] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(REMOTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [remoteDismissed, setRemoteDismissed] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState<LatexStyleId | null>(null);
  // Where compiles run: in this browser (WebAssembly TeX, if the bundle is deployed) or the remote service.
  const [localAvail, setLocalAvail] = useState<boolean | null>(null);
  const [backend, setBackend] = useState<"local" | "remote">("local");
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  useEffect(() => {
    localTexAvailable().then((ok) => {
      setLocalAvail(ok);
      if (!ok) setBackend("remote");
    });
    return onLocalProgress(setProgress);
  }, []);
  const useLocal = backend === "local" && localAvail === true;
  const askRemote = !useLocal && localAvail !== null && !remoteOk && !remoteDismissed;
  const canCompile = useLocal || remoteOk;
  const booted = useRef(false);

  // Persist edits to the draft (debounced)
  useEffect(() => {
    if (!edited) return;
    const t = setTimeout(() => {
      update((d) => {
        d.meta.latexSource = source;
        d.meta.latexSourceStyle = d.meta.latexStyle;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [source, edited, update]);

  const compile = useCallback(
    async (src = source) => {
      if (!useLocal && !remoteOk) {
        setRemoteDismissed(false);
        return;
      }
      setStatus({ kind: "compiling" });
      booted.current = true;
      try {
        const res = useLocal
          ? await compileLocal({ "resume.tex": src }, "resume.tex")
          : await compileLatex({ "resume.tex": src }, "resume.tex", engine);
        setProgress(null);
        if (!res.ok) {
          const parsed = parseLatexLog(res.log);
          setLog(res.log);
          setEntries(parsed);
          editor.current?.setDiagnostics(parsed);
          setShowLog(true);
          setStatus({ kind: "error", ms: res.ms });
          return;
        }
        setPdf(res.pdf);
        setLog("");
        setEntries([]);
        editor.current?.setDiagnostics([]);
        setStatus({ kind: "ok", ms: res.ms });
      } catch (e) {
        const msg = String(e);
        setLog(msg);
        setEntries([{ level: "error", message: msg }]);
        setShowLog(true);
        setStatus({ kind: "error" });
      }
    },
    [source, engine, remoteOk, useLocal],
  );

  useEffect(() => {
    if (auto && useLocal) warmLocalTex().catch(() => setBackend("remote"));
  }, [auto, useLocal]);

  // First compile once we know we can
  useEffect(() => {
    // Wait until we know whether the in-browser engine exists, so the first
    // compile never goes remote by accident. The flag is set inside the timer
    // so StrictMode's mount/unmount/mount in dev doesn't swallow it.
    if (booted.current || !auto || !canCompile || localAvail === null) return;
    const t = setTimeout(() => {
      booted.current = true;
      compile(source);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, canCompile, localAvail]);

  // Auto-compile (debounced) on edit
  useEffect(() => {
    if (!auto || !edited || !canCompile) return;
    const t = setTimeout(() => compile(source), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, auto, engine]);

  // Close menus on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);

  const allowRemote = () => {
    setRemoteOk(true);
    try {
      localStorage.setItem(REMOTE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const regenerate = (style: LatexStyleId) => {
    const next = renderLatex(r, style).files["resume.tex"];
    editor.current?.setValue(next);
    setSource(next);
    setEdited(false);
    update((d) => {
      d.meta.latexStyle = style;
      d.meta.latexSource = "";
      d.meta.latexSourceStyle = undefined;
    });
    setConfirmRegen(null);
    if (canCompile) compile(next);
  };

  const out = () => {
    const gen = renderLatex(r);
    return { ...gen, files: { ...gen.files, "resume.tex": source }, main: "resume.tex" as const };
  };

  const outline = useMemo(() => parseOutline(source), [source]);
  const errorCount = entries.filter((e) => e.level === "error").length;
  const warnCount = entries.length - errorCount;
  const showSource = mobile ? mobileView === "editor" : layout !== "pdf";
  const showPdf = mobile ? mobileView === "pdf" : layout !== "editor";
  const togglePanel = (next: Exclude<Panel, null>) => {
    if (mobile) {
      setMobilePanelOpen(!mobilePanelOpen || panel !== next);
      setPanel(next);
    } else setPanel(panel === next ? null : next);
  };

  return (
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden bg-paper">
      {/* ---------------------------------------------------------------- Top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-1 border-b border-rule/60 px-2 pb-2 pt-[max(8px,env(safe-area-inset-top))] lg:h-14 lg:flex-nowrap lg:gap-2 lg:px-3 lg:py-0">
        <Link href="/build" className="btn btn-ghost btn-sm px-3 lg:px-4" title="Back to the builder" aria-label="Back to the builder">
          <span className="lg:hidden">←</span><span className="hidden lg:inline">← Builder</span>
        </Link>
        <span className="mx-1 hidden h-5 w-px bg-rule lg:block" />

        {/* Recompile split button */}
        <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-r-none pr-3"
            onClick={() => compile()}
            disabled={status.kind === "compiling"}
            title="Ctrl/⌘ + Enter"
          >
            {status.kind === "compiling" ? "Compiling…" : "Recompile"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-l-none border-l border-white/30 px-2"
            aria-haspopup="menu"
            aria-label="Compile options"
            aria-expanded={menu === "compile"}
            onClick={() => setMenu(menu === "compile" ? null : "compile")}
          >
            <Caret />
          </button>
          {menu === "compile" && (
            <Menu>
              <MenuLabel>Auto compile</MenuLabel>
              <MenuCheck checked={auto} onChange={setAuto}>
                Compile as you type
              </MenuCheck>
              <MenuLabel>Compiler</MenuLabel>
              {(["pdflatex", "xelatex", "lualatex"] as Engine[]).map((e) => (
                <MenuRadio key={e} checked={engine === e} onSelect={() => setEngine(e)}>
                  {e === "pdflatex" ? "pdfLaTeX" : e === "xelatex" ? "XeLaTeX" : "LuaLaTeX"}
                </MenuRadio>
              ))}
              <MenuLabel>Runs on</MenuLabel>
              <MenuRadio checked={backend === "local"} onSelect={() => localAvail && setBackend("local")}>
                <span className={localAvail ? "" : "opacity-50"}>This browser {localAvail === false ? "(bundle not deployed)" : "· private, offline"}</span>
              </MenuRadio>
              <MenuRadio checked={backend === "remote"} onSelect={() => setBackend("remote")}>
                {COMPILE_SERVICE.host} · remote
              </MenuRadio>
              {useLocal && (
                <div className="px-3 pb-2 pt-1 text-xs text-ink-3">pdfLaTeX only. XeLaTeX and LuaLaTeX run remotely.</div>
              )}
            </Menu>
          )}
        </div>

        <span className="hidden items-center gap-2 text-xs text-ink-3 md:flex">
          <StatusDot status={status} />
          {status.kind === "ok" && `Compiled in ${(status.ms / 1000).toFixed(1)}s`}
          {status.kind === "error" && `${errorCount} error${errorCount === 1 ? "" : "s"}`}
          {status.kind === "compiling" && (progress?.kind === "download"
            ? `Downloading TeX engine, once: ${(progress.loaded / 1e6).toFixed(0)} / ${(progress.total / 1e6).toFixed(0)} MB`
            : progress?.kind === "status" ? progress.text + "…" : "Compiling…")}
          {status.kind === "idle" && "Not compiled"}
        </span>

        {/* Project name — centred like Overleaf */}
        <div className="order-last flex w-full min-w-0 items-center gap-1 lg:order-none lg:mx-auto lg:w-auto lg:flex-1">
          <input
            aria-label="Project name"
            value={draft?.name ?? ""}
            onChange={(e) => draft && rename(draft.id, e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-pill bg-transparent px-3 py-1 text-base font-medium outline-none hover:bg-paper-3 focus:bg-paper-3 lg:h-auto lg:max-w-[320px] lg:text-center lg:text-sm"
            size={Math.max(12, (draft?.name.length ?? 12) + 2)}
          />
          <div className="shrink-0 lg:hidden"><ThemeToggle compact /></div>
        </div>

        {/* Layout */}
        <div className="relative hidden lg:block" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMenu(menu === "layout" ? null : "layout")} aria-haspopup="menu">
            <LayoutIcon /> Layout <Caret />
          </button>
          {menu === "layout" && (
            <Menu align="right">
              {(
                [
                  ["split", "Editor & PDF"],
                  ["editor", "Editor only"],
                  ["pdf", "PDF only"],
                ] as [Layout, string][]
              ).map(([v, label]) => (
                <MenuRadio key={v} checked={layout === v} onSelect={() => setLayout(v)}>
                  {label}
                </MenuRadio>
              ))}
            </Menu>
          )}
        </div>

        {/* Share / export */}
        <div className="relative ml-auto lg:ml-0" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setMenu(menu === "share" ? null : "share")} aria-haspopup="menu">
            Share <Caret />
          </button>
          {menu === "share" && (
            <Menu align="right">
              <MenuItem onSelect={() => openInOverleaf(out())}>Open in Overleaf</MenuItem>
              <MenuItem onSelect={() => downloadText(source, resumeFilename(r, "tex"), "application/x-tex")}>Download .tex</MenuItem>
              <MenuItem onSelect={() => downloadLatexZip(out(), r)}>Download project .zip</MenuItem>
              <MenuItem
                disabled={!pdf}
                onSelect={() => pdf && downloadBlob(new Blob([pdf], { type: "application/pdf" }), resumeFilename(r, "pdf"))}
              >
                Download PDF
              </MenuItem>
            </Menu>
          )}
        </div>
        <div className="hidden lg:block"><ThemeToggle compact /></div>
      </header>

      {/* ---------------------------------------------------------------- Banners */}
      {askRemote && (
        <div className="flex flex-wrap items-center gap-3 bg-tint-sand px-4 py-2 text-sm">
          <span>
            Compiling runs on <b>{COMPILE_SERVICE.host}</b>, a free, open-source TeX Live service. Each compile sends your .tex there. It isn&rsquo;t
            stored, but it does leave your browser. Rather keep it local? Use <b>Share, then Open in Overleaf</b>, or download the .tex.
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={allowRemote}>
            Compile with {COMPILE_SERVICE.host}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemoteDismissed(true)}>
            Not now
          </button>
        </div>
      )}
      {confirmRegen && (
        <div className="flex flex-wrap items-center gap-3 bg-tint-peach px-4 py-2 text-sm">
          <span>Switching style regenerates the source from your data. Your edits will be discarded.</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => regenerate(confirmRegen)}>
            Regenerate anyway
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(null)}>
            Keep my edits
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- Body */}
      {mobile && (
        <div className="flex shrink-0 items-center gap-2 border-b border-rule/60 px-2 py-1">
          <div role="group" aria-label="Studio view" className="flex flex-1 gap-1">
            <button type="button" aria-pressed={showSource} onClick={() => setMobileView("editor")} className={`btn btn-sm flex-1 ${showSource ? "btn-tonal" : "btn-ghost"}`}>Editor</button>
            <button type="button" aria-pressed={showPdf} onClick={() => setMobileView("pdf")} className={`btn btn-sm flex-1 ${showPdf ? "btn-tonal" : "btn-ghost"}`}>PDF</button>
          </div>
          <span role="status" aria-label={status.kind === "compiling" ? "Compiling" : status.kind === "ok" ? "Compiled" : status.kind === "error" ? "Compile failed" : "Not compiled"}><StatusDot status={status} /></span>
        </div>
      )}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        {/* Icon rail */}
        <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-rule/60 bg-paper-2 py-2" aria-label="Studio panels">
          <RailButton active={panel === "files" && (!mobile || mobilePanelOpen)} label="Files" onClick={() => togglePanel("files")}>
            <FileIcon />
          </RailButton>
          <RailButton active={panel === "outline" && (!mobile || mobilePanelOpen)} label="Outline" onClick={() => togglePanel("outline")}>
            <OutlineIcon />
          </RailButton>
          <RailButton label="Search (Ctrl/⌘+F)" onClick={() => editor.current?.exec("search")}>
            <SearchIcon />
          </RailButton>
          <RailButton active={showLog} label="Logs" onClick={() => setShowLog((s) => !s)} badge={errorCount || undefined}>
            <LogIcon />
          </RailButton>
          <div className="mt-auto" />
          <RailButton label={edited ? "Reset to the generated source" : "Regenerate from your data"} onClick={() => (edited ? setConfirmRegen(r.meta.latexStyle) : regenerate(r.meta.latexStyle))}>
            <WandIcon />
          </RailButton>
        </nav>

        {/* Side panel */}
        {mobile && mobilePanelOpen && <button type="button" aria-label="Close studio panel" onClick={() => setMobilePanelOpen(false)} className="absolute inset-y-0 left-12 right-0 z-10 bg-black/30" />}
        {panel && (!mobile || mobilePanelOpen) && (
          <aside className="absolute inset-y-0 left-12 z-20 flex w-60 max-w-[calc(100%_-_48px)] shrink-0 flex-col overflow-y-auto border-r border-rule/60 bg-paper-2 text-sm shadow-xl lg:static lg:max-w-none lg:shadow-none">
            {mobile && <button type="button" className="btn btn-ghost btn-sm m-2 self-end" onClick={() => setMobilePanelOpen(false)}>Close panel</button>}
            {panel === "files" && (
              <>
                <PanelHead>File tree</PanelHead>
                <ul className="px-2">
                  {(["resume.tex", "README.md"] as const).map((f) => (
                    <li key={f}>
                      <button
                        type="button"
                        onClick={() => { setFile(f); setMobileView("editor"); setMobilePanelOpen(false); }}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left lg:min-h-0 ${file === f ? "bg-signal-soft text-signal-2" : "hover:bg-paper-3"}`}
                      >
                        <FileIcon small /> {f}
                        {f === "resume.tex" && edited && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber" title="Edited" />}
                      </button>
                    </li>
                  ))}
                </ul>
                <PanelHead className="mt-4">Style</PanelHead>
                <ul className="px-2">
                  {LATEX_STYLES.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => (s.id === r.meta.latexStyle ? null : edited ? setConfirmRegen(s.id) : regenerate(s.id))}
                        className={`flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-1.5 text-left lg:min-h-0 ${
                          r.meta.latexStyle === s.id ? "bg-paper-3 font-medium" : "hover:bg-paper-3"
                        }`}
                      >
                        {s.name}
                        {!s.atsSafe && <span className="chip bg-amber-soft text-amber">2-col</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto px-4 py-3 text-xs text-ink-3">
                  {edited ? "This source is hand-edited. Exports use it." : "Generated from your data. Edit freely. Exports will follow."}
                </p>
              </>
            )}
            {panel === "outline" && (
              <>
                <PanelHead>File outline</PanelHead>
                {outline.length ? (
                  <ul className="px-2">
                    {outline.map((o, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => { setFile("resume.tex"); setMobileView("editor"); setMobilePanelOpen(false); requestAnimationFrame(() => editor.current?.goToLine(o.line)); }}
                          className={`min-h-11 w-full truncate rounded-lg px-2 py-1 text-left hover:bg-paper-3 lg:min-h-0 ${o.level > 1 ? "pl-6 text-ink-2" : ""} ${
                            cursorLine >= o.line && (outline[i + 1]?.line ?? Infinity) > cursorLine ? "bg-signal-soft text-signal-2" : ""
                          }`}
                        >
                          {o.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-xs text-ink-3">No \section commands in this file yet.</p>
                )}
              </>
            )}
          </aside>
        )}

        {/* Editor column */}
        <section className={`${showSource ? "flex" : "hidden"} min-w-0 flex-1 flex-col ${!mobile && layout === "split" ? "border-r border-rule/60" : ""}`} aria-label="Source">
            {/* Tabs */}
            <div className="flex shrink-0 flex-wrap items-end gap-1 border-b border-rule/60 bg-paper-2 px-2 lg:h-9 lg:flex-nowrap">
              {(["resume.tex", "README.md"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFile(f)}
                  className={`flex h-11 items-center gap-2 rounded-t-lg px-3 text-xs lg:h-8 ${file === f ? "bg-paper font-medium text-ink" : "text-ink-2 hover:bg-paper-3"}`}
                >
                  <FileIcon small /> {f}
                </button>
              ))}
              {edited && (
                <button type="button" className="btn btn-ghost btn-sm ml-auto mb-0.5" onClick={() => setConfirmRegen(r.meta.latexStyle)}>
                  Reset to generated
                </button>
              )}
            </div>
            {/* Toolbar */}
            {file === "resume.tex" && (
              <div className="flex min-h-11 shrink-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain border-b border-rule/60 px-2 lg:h-10 lg:min-h-0">
                <Tool label="Undo" onClick={() => editor.current?.exec("undo")}>↶</Tool>
                <Tool label="Redo" onClick={() => editor.current?.exec("redo")}>↷</Tool>
                <Sep />
                <Tool label="Insert section" onClick={() => editor.current?.exec("section")}>§</Tool>
                <Tool label="Larger text" onClick={() => editor.current?.exec("bigger")}>A⁺</Tool>
                <Tool label="Smaller text" onClick={() => editor.current?.exec("smaller")}>A⁻</Tool>
                <Sep />
                <Tool label="Bold (Ctrl/⌘+B)" onClick={() => editor.current?.exec("bold")}>
                  <b>B</b>
                </Tool>
                <Tool label="Italic (Ctrl/⌘+I)" onClick={() => editor.current?.exec("italic")}>
                  <i>I</i>
                </Tool>
                <Sep />
                <Tool label="Bullet item" onClick={() => editor.current?.exec("item")}>•</Tool>
                <Tool label="Link" onClick={() => editor.current?.exec("link")}>🔗</Tool>
                <Tool label="Toggle comment" onClick={() => editor.current?.exec("comment")}>%</Tool>
                <div className="ml-auto hidden rounded-pill bg-paper-3 p-0.5 text-xs xl:inline-flex">
                  <span className="rounded-pill bg-paper px-3 py-1 font-medium shadow-[var(--shadow-pop)]">Code</span>
                  <span className="px-3 py-1 text-ink-3" title="Visual editing isn't available yet">
                    Visual
                  </span>
                </div>
              </div>
            )}
            {/* Editor / README */}
            <div className="min-h-0 flex-1">
              <div className={file === "resume.tex" ? "h-full" : "hidden"}>
                <LatexEditor
                  ref={editor}
                  initial={initial}
                  onChange={(v) => {
                    setSource(v);
                    setEdited(true);
                  }}
                  onCompile={() => compile(editor.current?.getValue())}
                  onCursorLine={setCursorLine}
                />
              </div>
              {file === "README.md" && <pre className="h-full overflow-auto scroll-thin p-4 font-mono text-xs text-ink-2">{readme}</pre>}
            </div>
            {/* Log drawer */}
            {showLog && (
              <div className="fade-in flex max-h-64 shrink-0 flex-col border-t border-rule/60 bg-paper-2">
                <div className="flex h-9 shrink-0 items-center gap-2 px-3 text-xs">
                  <StatusDot status={status} />
                  <span className="font-medium">
                    {status.kind === "error"
                      ? `${errorCount} error${errorCount === 1 ? "" : "s"}${warnCount ? `, ${warnCount} warning${warnCount === 1 ? "" : "s"}` : ""}`
                      : status.kind === "ok"
                        ? "Compiled without errors"
                        : "Log"}
                  </span>
                  {(status.kind === "ok" || status.kind === "error") && <span className="chip bg-paper-3 text-ink-2">{useLocal ? "This browser" : COMPILE_SERVICE.host}</span>}
                  <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setShowLog(false)}>
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto scroll-thin border-t border-rule/60">
                  {entries.length > 0 ? (
                    <ul className="divide-y divide-rule/60">
                      {entries.map((e, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="flex w-full items-start gap-3 px-3 py-2 text-left text-xs hover:bg-paper-3"
                            onClick={() => e.line && editor.current?.goToLine(e.line)}
                          >
                            <span className={`chip ${e.level === "error" ? "bg-danger-soft text-danger" : "bg-amber-soft text-amber"}`}>
                              {e.level === "error" ? "Error" : "Warning"}
                            </span>
                            <span className="min-w-0 flex-1 break-words">{e.message}</span>
                            {e.line && <span className="font-mono text-ink-3">line {e.line}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <pre className="whitespace-pre-wrap p-3 font-mono text-[11px] text-ink-2">{log || "No output."}</pre>
                  )}
                  {entries.length > 0 && log && (
                    <details className="border-t border-rule/60 px-3 py-2 text-xs">
                      <summary className="cursor-pointer text-ink-2">Raw log</summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-ink-2">{log.slice(-8000)}</pre>
                    </details>
                  )}
                </div>
              </div>
            )}
          </section>
        {/* PDF column */}
        <section className={`relative ${showPdf ? "flex" : "hidden"} min-w-0 flex-1 flex-col`} aria-label="Compiled PDF">
            {status.kind === "compiling" && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
                <div className="h-full w-1/3 animate-[slide_1s_linear_infinite] bg-signal" />
              </div>
            )}
            <PdfViewer data={pdf} />
          </section>
      </div>
      <style>{`@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(300%)}}`}</style>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function parseOutline(src: string): { title: string; line: number; level: number }[] {
  const out: { title: string; line: number; level: number }[] = [];
  src.split("\n").forEach((l, i) => {
    const m = l.match(/\\(section|subsection|vSection)\*?\{([^}]*)\}/);
    if (m) out.push({ title: m[2].replace(/\\[a-zA-Z]+/g, "").trim() || "(untitled)", line: i + 1, level: m[1] === "subsection" ? 2 : 1 });
  });
  return out;
}

function StatusDot({ status }: { status: Status }) {
  const c = status.kind === "ok" ? "bg-moss" : status.kind === "error" ? "bg-danger" : status.kind === "compiling" ? "bg-amber animate-pulse" : "bg-rule-2";
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

function Menu({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div
      role="menu"
      className={`card fade-in absolute top-full z-30 mt-2 min-w-48 max-w-[calc(100vw_-_24px)] rounded-2xl bg-paper py-1.5 ${align === "right" ? "right-0" : "left-0"}`}
      style={{ boxShadow: "var(--shadow-pop)" }}
    >
      {children}
    </div>
  );
}
const MenuLabel = ({ children }: { children: React.ReactNode }) => <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">{children}</div>;
const MenuItem = ({ children, onSelect, disabled }: { children: React.ReactNode; onSelect: () => void; disabled?: boolean }) => (
  <button type="button" role="menuitem" disabled={disabled} onClick={onSelect} className="block min-h-11 w-full px-3 py-1.5 text-left text-sm hover:bg-paper-3 disabled:opacity-40 lg:min-h-0">
    {children}
  </button>
);
const MenuRadio = ({ children, checked, onSelect }: { children: React.ReactNode; checked: boolean; onSelect: () => void }) => (
  <button type="button" role="menuitemradio" aria-checked={checked} onClick={onSelect} className="flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-paper-3 lg:min-h-0">
    <span className={`h-3.5 w-3.5 rounded-full border ${checked ? "border-[5px] border-signal" : "border-rule-2"}`} />
    {children}
  </button>
);
const MenuCheck = ({ children, checked, onChange }: { children: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-paper-3 lg:min-h-0">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--signal)]" />
    {children}
  </label>
);
const PanelHead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-ink-3 ${className}`}>{children}</div>
);
function RailButton({ children, label, active, onClick, badge }: { children: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`relative grid h-11 w-11 place-items-center rounded-xl lg:h-9 lg:w-9 ${active ? "bg-signal-soft text-signal-2" : "text-ink-2 hover:bg-paper-3 hover:text-ink"}`}
    >
      {children}
      {badge ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] text-white">{badge}</span> : null}
    </button>
  );
}
const Tool = ({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) => (
  <button type="button" title={label} aria-label={label} onClick={onClick} className="grid h-11 min-w-11 shrink-0 place-items-center rounded-md px-1.5 text-sm text-ink-2 hover:bg-paper-3 hover:text-ink lg:h-7 lg:min-w-7">
    {children}
  </button>
);
const Sep = () => <span className="mx-1 h-4 w-px bg-rule" />;
const Caret = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.5l3 3 3-3" />
  </svg>
);
const FileIcon = ({ small }: { small?: boolean }) => (
  <svg width={small ? 14 : 18} height={small ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
);
const OutlineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 6h16M8 12h12M12 18h8" />
  </svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
const LogIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v14H4zM8 10l2 2-2 2M12 14h4" />
  </svg>
);
const WandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 20l10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z" />
  </svg>
);
const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M12 4v16" />
  </svg>
);
