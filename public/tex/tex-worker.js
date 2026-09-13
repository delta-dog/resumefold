/*
 * In-browser pdfLaTeX. Runs BusyTeX (pdfTeX compiled to WebAssembly, MIT) in a
 * Web Worker against the trimmed TeX tree built by scripts/tex/build-bundle.mjs.
 * Nothing leaves the machine.
 *
 * Protocol (postMessage):
 *   → { type: "init" }                       ⇐ { type: "progress", ... } … { type: "ready", version }
 *   → { type: "compile", id, files, main }   ⇐ { type: "result", id, ok, pdf?, log }
 *
 * The 43 MB of engine + tree are fetched once and kept in the Cache API.
 */
/* global busytex, importScripts, caches */

const BASE = self.location.href.replace(/[^/]*$/, ""); // …/tex/
const CACHE_NAME = "vellum-tex-v1";

let wasmModule = null; // compiled WebAssembly.Module, reused across compiles
let bundle = null; // { version, files: [[path, start, len]...] }
let data = null; // Uint8Array of bundle.data
let ready = false;

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      await init();
      post({ type: "ready", version: bundle.version });
    } else if (msg.type === "compile") {
      if (!ready) await init();
      const result = await compile(msg.files, msg.main);
      post({ type: "result", id: msg.id, ...result }, result.pdf ? [result.pdf.buffer] : []);
    }
  } catch (err) {
    post({ type: "error", id: msg.id, message: String(err && err.message ? err.message : err) });
  }
};

function post(m, transfer) {
  self.postMessage(m, transfer || []);
}

/** Fetch through the Cache API, reporting progress for the big files. */
async function fetchCached(name, expectBytes) {
  const url = BASE + name;
  let cache = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit;
  } catch {
    /* Cache API unavailable (private mode etc.) — just fetch */
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download ${name} (${res.status})`);
  const total = Number(res.headers.get("content-length")) || expectBytes || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    post({ type: "progress", file: name, loaded, total });
  }
  const blob = new Blob(chunks);
  const out = new Response(blob, { headers: { "Content-Type": res.headers.get("content-type") || "application/octet-stream" } });
  if (cache) {
    try {
      await cache.put(url, out.clone());
    } catch {
      /* quota exceeded; fine */
    }
  }
  return out;
}

async function init() {
  if (ready) return;
  post({ type: "status", text: "Loading TeX engine" });
  importScripts(BASE + "busytex.js");

  const [wasmRes, jsonRes, dataRes] = await Promise.all([
    fetchCached("busytex.wasm", 30_363_063),
    fetchCached("bundle.json"),
    fetchCached("bundle.data", 12_848_280),
  ]);
  bundle = await jsonRes.json();
  data = new Uint8Array(await dataRes.arrayBuffer());
  post({ type: "status", text: "Compiling WebAssembly" });
  wasmModule = await WebAssembly.compile(await wasmRes.arrayBuffer());
  ready = true;
}

async function makeModule(files, main) {
  let stdout = "";
  const Module = await busytex({
    noInitialRun: true,
    thisProgram: "/bin/busytex",
    instantiateWasm(imports, done) {
      WebAssembly.instantiate(wasmModule, imports).then((inst) => done(inst));
      return {};
    },
    print: (t) => (stdout += t + "\n"),
    printErr: (t) => (stdout += t + "\n"),
    preRun: [
      (M) => {
        Object.assign(M.ENV, {
          TEXMFDIST: "/texlive/texmf-dist",
          TEXMFVAR: "/texlive/texmf-dist/texmf-var",
          TEXMFCNF: "/texlive/texmf-dist/web2c",
          TEXMFLOG: "/tmp/texmf.log",
        });
        const FS = M.FS;
        FS.mkdirTree("/bin");
        FS.writeFile("/bin/busytex", new Uint8Array([0]));
        FS.mkdirTree("/tmp");
        FS.mkdirTree("/work");
        const made = new Set();
        for (const [path, start, len] of bundle.files) {
          const dir = path.slice(0, path.lastIndexOf("/"));
          if (!made.has(dir)) {
            FS.mkdirTree(dir);
            made.add(dir);
          }
          FS.writeFile(path, data.subarray(start, start + len));
        }
        for (const [name, content] of Object.entries(files)) {
          if (name.includes("/")) FS.mkdirTree("/work/" + name.slice(0, name.lastIndexOf("/")));
          FS.writeFile("/work/" + name, content);
        }
      },
    ],
  });
  Module.FS.chdir("/work");
  return { Module, stdout: () => stdout, main };
}

async function compile(files, main) {
  post({ type: "status", text: "Running pdflatex" });
  const { Module, stdout } = await makeModule(files, main);
  const base = main.replace(/\.tex$/, "");
  const args = [
    "pdflatex",
    "--no-shell-escape",
    "--interaction=nonstopmode",
    "--halt-on-error",
    "--file-line-error",
    "--output-format=pdf",
    "--fmt",
    "/texlive/texmf-dist/texmf-var/web2c/pdftex/pdflatex.fmt",
    main,
  ];
  let code;
  try {
    code = Module.callMain(args);
  } catch {
    code = -1;
  }
  const FS = Module.FS;
  const logPath = `/work/${base}.log`;
  const log = FS.analyzePath(logPath).exists ? FS.readFile(logPath, { encoding: "utf8" }) : stdout();
  const pdfPath = `/work/${base}.pdf`;
  if (code === 0 && FS.analyzePath(pdfPath).exists) {
    const pdf = FS.readFile(pdfPath); // Uint8Array (copy)
    return { ok: true, pdf: new Uint8Array(pdf), log };
  }
  return { ok: false, log: log || stdout() };
}
