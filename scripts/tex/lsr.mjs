/**
 * Write a kpathsea ls-R database for a texmf tree. kpathsea's `!!` prefix
 * (used by TeX Live's texmf.cnf) means "consult ls-R only", so a tree without
 * one is invisible to the engine.
 */
import { readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function writeLsR(root) {
  const lines = ["% ls-R -- filename database for kpathsea; do not change this line.", "./:", ...top(root), ""];
  walk(root, ".", lines);
  writeFileSync(join(root, "ls-R"), lines.join("\n") + "\n");
}

function top(root) {
  return readdirSync(root).filter((n) => n !== "ls-R");
}

function walk(root, rel, lines) {
  const abs = join(root, rel);
  for (const name of readdirSync(abs)) {
    const r = rel === "." ? name : `${rel}/${name}`;
    if (name === "ls-R") continue;
    if (statSync(join(root, r)).isDirectory()) {
      lines.push(`./${r}:`, ...readdirSync(join(root, r)), "");
      walk(root, r, lines);
    }
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  for (const dir of process.argv.slice(2)) {
    writeLsR(dir);
    console.log("ls-R written for", dir);
  }
}
