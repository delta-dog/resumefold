// Copies pdf.js's worker into /public so the viewer can load it as a plain URL.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pdfWorkerFilename } from "../src/lib/pdf-compat.mjs";
mkdirSync("public/vendor", { recursive: true });
const { version } = JSON.parse(readFileSync("node_modules/pdfjs-dist/package.json", "utf8"));
copyFileSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", `public/vendor/pdf.worker.${version}.legacy.min.mjs`);
copyFileSync("src/lib/pdf-compat.mjs", "public/vendor/pdf-compat-v2.mjs");
writeFileSync(`public/vendor/${pdfWorkerFilename(version)}`, `import { installPdfCompatibility } from "./pdf-compat-v2.mjs";
installPdfCompatibility();
const { WorkerMessageHandler } = await import("./pdf.worker.${version}.legacy.min.mjs");
export { WorkerMessageHandler };
`);
