"use client";

import JSZip from "jszip";
import type { Resume } from "@/lib/schema";
import type { LatexOutput } from "@/lib/templates/latex";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadText(text: string, filename: string, type = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([text], { type }), filename);
}

/** ATS rule B7: Firstname-Lastname-Resume.ext */
export function resumeFilename(r: Resume, ext: string): string {
  const base = r.contact.fullName.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "Resume";
  return `${base}-Resume.${ext}`;
}

export async function downloadLatexZip(out: LatexOutput, r: Resume) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(out.files)) zip.file(name, content);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, resumeFilename(r, "zip"));
}

/**
 * Overleaf's link-based integration: POST to /docs with the source in
 * `encoded_snip` (URL-encoded). No hosting needed — the whole project rides
 * in the form body. https://www.overleaf.com/devs
 */
export function openInOverleaf(out: LatexOutput) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://www.overleaf.com/docs";
  form.target = "_blank";
  form.rel = "noopener";

  const add = (name: string, value: string) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = name;
    i.value = value;
    form.appendChild(i);
  };
  add("encoded_snip", encodeURIComponent(out.files[out.main]));
  add("snip_name", out.main);
  add("engine", out.engine);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
