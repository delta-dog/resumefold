import { installPdfCompatibility, pdfWorkerFilename } from "./pdf-compat.mjs";

let loading: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | undefined;

export function loadPdfJs() {
  if (!loading) {
    installPdfCompatibility();
    loading = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/vendor/${pdfWorkerFilename(pdfjs.version)}`;
      return pdfjs;
    }).catch((error) => { loading = undefined; throw error; });
  }
  return loading;
}
