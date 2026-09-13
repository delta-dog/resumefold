/**
 * Build the in-browser TeX bundle: `npm run tex:bundle`
 *
 * 1. Download BusyTeX (pdfTeX compiled to WebAssembly, MIT) and its
 *    "texlive-basic" tree, plus the handful of CTAN packages our styles use.
 * 2. Run pdflatex *in Node* on the four sample resumes with `-recorder`, which
 *    lists every file TeX actually opened.
 * 3. Pack only those files into public/tex/bundle.data (+ bundle.json index).
 *
 * Result: ~30 MB engine + a ~15 MB tree, fetched once and cached by the
 * browser. Nothing leaves the user's machine when they compile.
 *
 * Everything is cached under .tex-cache/ so re-runs are fast and offline.
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { writeLsR } from "./lsr.mjs";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CACHE = join(ROOT, ".tex-cache");
const OUT = join(ROOT, "public", "tex");
const TREE = join(CACHE, "tree");
const TEXMF = join(TREE, "texmf-dist");

const BUSYTEX_RELEASE = "https://github.com/busytex/busytex/releases/download/build_wasm_4499aa69fd3cf77ad86a47287d9a5193cf5ad993_7936974349_1";
const TLNET = "https://mirror.ctan.org/systems/texlive/tlnet/archive";
/** TeX Live packages our four styles need beyond texlive-basic. */
const EXTRA_PACKAGES = ["titlesec", "enumitem", "paracol", "xcolor", "microtype", "sourcesans", "lato", "charter", "xkeyval", "fontaxes", "ly1"];
/** Font map files to append to pdftex.map (relative to texmf-dist). */
const EXTRA_MAPS = ["fonts/map/dvips/lato/lato.map", "fonts/map/dvips/sourcesans/SourceSansThree.map"];
/** Files TeX needs at runtime that -recorder doesn't list (config, formats' companions). */
const ALWAYS = ["web2c/texmf.cnf", "texmf-var/fonts/map/pdftex/updmap/pdftex.map"];

const log = (...a) => console.log("[tex-bundle]", ...a);

/** GNU tar reads "C:..." as a remote host; --force-local fixes that. bsdtar has no such flag (or problem). */
const TAR_FLAGS = (() => {
  try {
    return /GNU tar/.test(execFileSync("tar", ["--version"]).toString()) ? ["--force-local"] : [];
  } catch {
    return [];
  }
})();
const fwd = (p) => p.split("\\").join("/"); // MSYS tar eats backslashes
const untar = (args) => execFileSync("tar", [...args.map(fwd), ...TAR_FLAGS], { stdio: "ignore" });

async function download(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) return;
  log("downloading", url.split("/").pop());
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  mkdirSync(dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function fetchSources() {
  mkdirSync(CACHE, { recursive: true });
  await download(`${BUSYTEX_RELEASE}/busytex.js`, join(CACHE, "busytex.js"));
  await download(`${BUSYTEX_RELEASE}/busytex.wasm`, join(CACHE, "busytex.wasm"));
  await download(`${BUSYTEX_RELEASE}/texlive-basic.tar.gz`, join(CACHE, "texlive-basic.tar.gz"));
  for (const p of EXTRA_PACKAGES) await download(`${TLNET}/${p}.tar.xz`, join(CACHE, "pkg", `${p}.tar.xz`));
}

function assembleTree() {
  if (existsSync(join(TEXMF, "ls-R"))) return;
  log("extracting texlive-basic (70 MB, a minute or so)");
  rmSync(TREE, { recursive: true, force: true });
  mkdirSync(TREE, { recursive: true });
  // The tarball is rooted at build/texlive-basic/; strip that.
  try {
    untar(["-xzf", join(CACHE, "texlive-basic.tar.gz"), "-C", TREE, "--strip-components=2"]);
  } catch {
    // The tarball has two symlinks (pdftex.map, psfonts.map) that tar can't create on Windows; everything else extracts.
  }
  if (!existsSync(join(TEXMF, "web2c", "texmf.cnf"))) throw new Error("texlive-basic did not extract as expected");
  // Materialise the symlink targets so the tree works on any OS.
  const links = [
    ["texmf-var/fonts/map/pdftex/updmap/pdftex.map", "pdftex_dl14.map"],
    ["texmf-var/fonts/map/dvips/updmap/psfonts.map", "psfonts_t1.map"],
  ];
  for (const [link, target] of links) {
    const abs = join(TEXMF, link);
    if (!existsSync(abs) || statSync(abs).size === 0) copyFileSync(join(dirname(abs), target), abs);
  }
  for (const p of EXTRA_PACKAGES) {
    untar(["-xJf", join(CACHE, "pkg", `${p}.tar.xz`), "-C", TEXMF, "--exclude=tlpkg", "--exclude=doc", "--exclude=source"]);
  }
  const map = join(TEXMF, "texmf-var/fonts/map/pdftex/updmap/pdftex.map");
  let mapText = readFileSync(map, "utf8");
  for (const m of EXTRA_MAPS) mapText += "\n" + readFileSync(join(TEXMF, m), "utf8");
  writeFileSync(map, mapText);
  for (const d of [TEXMF, join(TEXMF, "texmf-var"), join(TEXMF, "texmf-config")]) if (existsSync(d)) writeLsR(d);
  log("tree ready");
}

/** Load a host directory into Emscripten MEMFS. */
function loadDir(FS, dir, vdir, filter = () => true) {
  FS.mkdirTree(vdir);
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    const v = `${vdir}/${ent.name}`;
    if (ent.isDirectory()) loadDir(FS, p, v, filter);
    else if (ent.isFile() && filter(v)) FS.writeFile(v, readFileSync(p));
  }
}

async function makeEngine(loadFs) {
  const busytex = require(join(CACHE, "busytex.js"));
  let stdout = "";
  const Module = await busytex({
    noInitialRun: true,
    thisProgram: "/bin/busytex",
    locateFile: (p) => join(CACHE, p),
    print: (t) => (stdout += t + "\n"),
    printErr: () => {},
    preRun: [
      (M) => {
        Object.assign(M.ENV, {
          TEXMFDIST: "/texlive/texmf-dist",
          TEXMFVAR: "/texlive/texmf-dist/texmf-var",
          TEXMFCNF: "/texlive/texmf-dist/web2c",
          TEXMFLOG: "/tmp/texmf.log",
        });
        M.FS.mkdirTree("/bin");
        M.FS.writeFile("/bin/busytex", new Uint8Array([0]));
        M.FS.mkdirTree("/tmp");
        M.FS.mkdirTree("/work");
        loadFs(M.FS);
      },
    ],
  });
  return { Module, stdout: () => stdout };
}

const PDFLATEX = ["pdflatex", "--no-shell-escape", "--interaction=nonstopmode", "--halt-on-error", "--output-format=pdf", "--fmt", "/texlive/texmf-dist/texmf-var/web2c/pdftex/pdflatex.fmt"];

async function traceInputs(samplesDir) {
  const needed = new Set(ALWAYS.map((f) => `/texlive/texmf-dist/${f}`));
  for (const name of readdirSync(samplesDir).filter((f) => f.endsWith(".tex"))) {
    const { Module, stdout } = await makeEngine((FS) => {
      loadDir(FS, TEXMF, "/texlive/texmf-dist");
      FS.writeFile("/work/main.tex", readFileSync(join(samplesDir, name)));
    });
    Module.FS.chdir("/work");
    const t0 = Date.now();
    const code = Module.callMain([...PDFLATEX, "-recorder", "main.tex"]);
    const ok = code === 0 && Module.FS.analyzePath("/work/main.pdf").exists;
    log(`${name}: exit ${code}, ${Date.now() - t0} ms, ${ok ? Module.FS.readFile("/work/main.pdf").length + " bytes" : "NO PDF"}`);
    if (!ok) {
      console.error(stdout().split("\n").slice(-25).join("\n"));
      throw new Error(`Sample ${name} failed to compile in the WASM engine`);
    }
    const fls = Module.FS.readFile("/work/main.fls", { encoding: "utf8" });
    for (const line of fls.split("\n")) {
      if (line.startsWith("INPUT ")) {
        const f = line.slice(6).trim();
        if (f.startsWith("/texlive/")) needed.add(f);
      }
    }
  }
  return [...needed].sort();
}

function pack(files) {
  mkdirSync(OUT, { recursive: true });
  const chunks = [];
  const index = [];
  let offset = 0;
  for (const v of files) {
    const host = join(TREE, v.replace(/^\/texlive\//, ""));
    if (!existsSync(host)) {
      log("skip (missing on disk):", v);
      continue;
    }
    const buf = readFileSync(host);
    index.push([v, offset, buf.length]);
    chunks.push(buf);
    offset += buf.length;
  }
  // ls-R databases for the *trimmed* tree (kpathsea trusts the database over the disk)
  for (const [v, text] of Object.entries(lsrForTrimmed(index.map((f) => f[0])))) {
    const buf = Buffer.from(text, "utf8");
    index.push([v, offset, buf.length]);
    chunks.push(buf);
    offset += buf.length;
  }
  const data = Buffer.concat(chunks);
  writeFileSync(join(OUT, "bundle.data"), data);
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
  writeFileSync(join(OUT, "bundle.json"), JSON.stringify({ version: hash, files: index }));
  copyFileSync(join(CACHE, "busytex.js"), join(OUT, "busytex.js"));
  copyFileSync(join(CACHE, "busytex.wasm"), join(OUT, "busytex.wasm"));
  log(`packed ${index.length} files, ${(data.length / 1e6).toFixed(1)} MB data + ${(statSync(join(OUT, "busytex.wasm")).size / 1e6).toFixed(1)} MB engine → public/tex/`);
  return hash;
}

/** The trimmed tree needs its own ls-R (kpathsea trusts the database over the disk). */
function lsrForTrimmed(files) {
  const dirs = new Map(); // dir → Set(entries)
  const add = (dir, entry) => {
    if (!dirs.has(dir)) dirs.set(dir, new Set());
    dirs.get(dir).add(entry);
  };
  for (const f of files) {
    const parts = f.split("/").filter(Boolean);
    for (let i = 1; i < parts.length; i++) add("/" + parts.slice(0, i).join("/"), parts[i]);
  }
  const make = (root) => {
    const lines = ["% ls-R -- filename database for kpathsea; do not change this line."];
    for (const [dir, entries] of [...dirs.entries()].sort()) {
      if (dir !== root && !dir.startsWith(root + "/")) continue;
      const rel = dir === root ? "." : "." + dir.slice(root.length);
      lines.push(`${rel}:`, ...[...entries].sort(), "");
    }
    return lines.join("\n") + "\n";
  };
  return {
    "/texlive/texmf-dist/ls-R": make("/texlive/texmf-dist"),
    "/texlive/texmf-dist/texmf-var/ls-R": make("/texlive/texmf-dist/texmf-var"),
  };
}

async function verifyBundle(samplesDir) {
  const index = JSON.parse(readFileSync(join(OUT, "bundle.json"), "utf8"));
  const data = readFileSync(join(OUT, "bundle.data"));
  for (const name of readdirSync(samplesDir).filter((f) => f.endsWith(".tex"))) {
    const { Module, stdout } = await makeEngine((FS) => {
      for (const [v, start, len] of index.files) {
        FS.mkdirTree(v.slice(0, v.lastIndexOf("/")));
        FS.writeFile(v, data.subarray(start, start + len));
      }
      FS.writeFile("/work/main.tex", readFileSync(join(samplesDir, name)));
    });
    Module.FS.chdir("/work");
    const t0 = Date.now();
    const code = Module.callMain([...PDFLATEX, "main.tex"]);
    const ok = code === 0 && Module.FS.analyzePath("/work/main.pdf").exists;
    log(`verify ${name} from bundle: ${ok ? "OK" : "FAILED"} (${Date.now() - t0} ms)`);
    if (!ok) {
      console.error(stdout().split("\n").slice(-25).join("\n"));
      throw new Error("bundle verification failed");
    }
  }
}

const samplesDir = join(CACHE, "samples");
rmSync(samplesDir, { recursive: true, force: true }); // stale samples from renamed styles would be traced too
mkdirSync(samplesDir, { recursive: true });
execFileSync("npx", ["tsx", join(ROOT, "scripts/tex/samples.mts"), samplesDir], { stdio: "inherit", shell: true });

await fetchSources();
assembleTree();
const files = await traceInputs(samplesDir);
log(`${files.length} files needed`);
pack(files);
await verifyBundle(samplesDir);
log("done");
