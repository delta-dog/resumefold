/**
 * Parse a LaTeX log into something a person can act on. Handles both TeX's
 * native "! Error" + "l.NN" form and the -file-line-error / latexonline form
 * "main.tex:NN: error: …". Warnings are collected too, but demoted.
 */
export type LogEntry = { level: "error" | "warning"; line?: number; message: string };

export function parseLatexLog(log: string): LogEntry[] {
  const out: LogEntry[] = [];
  const lines = log.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m: RegExpMatchArray | null;

    // main.tex:12: error: Undefined control sequence
    if ((m = l.match(/^(?:\.\/)?(?:.*?[\\/])?[\w.-]+\.tex:(\d+):\s*(?:error:\s*)?(.+)$/i))) {
      const raw = m[2].trim();
      if (/^(==>|Emergency stop)/.test(raw)) continue;
      const isWarning = /^warning:/i.test(raw);
      const message = raw.replace(/^warning:\s*/i, "");
      if (isWarning) out.push({ level: "warning", line: Number(m[1]), message });
      else out.push({ level: "error", line: Number(m[1]), message });
      continue;
    }
    // ! Undefined control sequence.   ...   l.12 \foo
    if (l.startsWith("!")) {
      const message = l.slice(1).trim();
      // TeX's wrap-up lines add nothing the real error didn't already say.
      if (/^(==>|Emergency stop)/.test(message)) continue;
      let line: number | undefined;
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const lm = lines[j].match(/^l\.(\d+)/);
        if (lm) {
          line = Number(lm[1]);
          break;
        }
      }
      out.push({ level: "error", line, message });
      continue;
    }
    // LaTeX Warning: … on input line 34.
    if ((m = l.match(/^(?:LaTeX|Package \w+) Warning:\s*(.+?)(?:\s+on input line (\d+))?\.?$/))) {
      out.push({ level: "warning", line: m[2] ? Number(m[2]) : undefined, message: m[1] });
      continue;
    }
    if ((m = l.match(/^Overfull \\hbox \(([\d.]+pt) too wide\).*?lines? (\d+)/))) {
      out.push({ level: "warning", line: Number(m[2]), message: `Overfull line (${m[1]} too wide)` });
    }
  }
  // De-duplicate identical consecutive entries
  return out.filter((e, i) => i === 0 || e.message !== out[i - 1].message || e.line !== out[i - 1].line);
}
