# Browser and device compatibility

The same static build runs on Windows, macOS, iOS/iPadOS and Android. Fonts, PDF workers and the TeX engine are bundled locally. No operating-system detection changes the resume content or typography.

## Supported browser baseline

| Feature | Browser baseline |
| --- | --- |
| Resume editor, TXT/DOCX import, keyword matching and exports | Next.js's baseline: Chrome/Edge/Firefox 111+, Safari 16.4+ |
| PDF text extraction and studio preview | PDF.js's legacy baseline: Chrome/Edge 125+, maintained Firefox ESR/current, Safari 18+ |
| Browser TeX compile | WebAssembly and module workers; manual recompile by default on mobile and devices with limited resources |

Current Chrome on Android and Windows/macOS, current Safari on iPhone/iPad/macOS, and current Edge/Firefox are the intended full-feature targets. ResumeFold also supplies the promise and buffer APIs missing in Safari 16.4–17.3, extending compatibility beyond PDF.js's official baseline. This extension is regression-tested with missing APIs, but has not been verified on a physical device running those Safari versions. DOCX, TXT and pasted text remain alternatives. Native print/save dialogs and file pickers differ across operating systems.

## Compatibility measures

- The official PDF.js legacy reader supplies iterator and other compatibility support, but still assumes native `Promise.withResolvers` and `ArrayBuffer.transferToFixedLength`. An application bootstrap installs these when missing, before importing PDF.js in both the page and the worker. Native implementations are preserved. Worker and compatibility assets use versioned filenames and load only when needed.
- Native `FileReader` reads support cancellation and files chosen from mobile file providers. Unavailable provider files get guidance to download locally. An optional error-details disclosure retains the failure stage and original error; it is not sent anywhere. Pasted resume text uses the same review and analysis flow.
- PDF import consumes `streamTextContent()` using `getReader()` and explicit `read()` calls. It does not call PDF.js's `getTextContent()`, which relies on `ReadableStream` async iteration absent in Safari before 26.4, including Safari 26.3. Text is bounded as chunks arrive; cancelling releases the stream reader and destroys the PDF task. The compact upload card shows file/page progress, then a separate text-review step. Existing drafts and job targets are preserved.
- File reading checks cancellation without requiring `AbortSignal.throwIfAborted`. PDF/file size limits and DOCX decompression limits prevent excessive input processing.
- Blocked, full or malformed browser storage switches drafts to memory. A persistent notice offers a JSON backup. Original unreadable storage is not overwritten; in-memory changes do not survive refreshing or closing the tab.
- PDF documents and render tasks are destroyed on replacement/unmount. Only pages within or near the PDF pane are rendered, and offscreen canvas buffers are released. Resize handling reuses page dimensions.
- Touch controls use at least 44 px targets where compact buttons appear. Fields and the editor use 16 px text on phones and coarse-pointer devices, including tablets.
- Choosing a template advances directly to Basics on phones and coarse-pointer devices, including landscape touch layouts.
- Landscape safe-area insets protect controls from notches. Text size adjustment is stable across rotation; page zoom remains enabled.
- Downloads keep their object URL alive for 30 seconds. Browsers that display a file instead of downloading it open a separate tab, preserving the editor.
- Section scrolling, preview navigation and animations respect reduced-motion preferences.

## Verification

Automated tests cover import validation, bounded DOCX decompression, actual PDF upload extraction without native iterator helpers, promise resolvers, buffer transfers, URL parsing or stream async iteration, plus bootstrap execution in an isolated worker. The stream test first reproduces the failure with the library's old method, then extracts the same file through explicit readers. Tests also cover chunk boundaries, early text limits, cancelling pending reads, native file reads, provider errors, keyword matching, metadata persistence/export separation, blocked/full/corrupt storage and editor hydration with storage access denied.

Local Chromium checks cover phone/tablet/desktop layouts, portrait/landscape sizes, file imports, template selection, section tracking and studio rendering. These checks simulate viewport sizes and missing JavaScript features; they do not substitute for physical iPhone/Android devices or Safari/Firefox engine testing. The current session has no connected Safari, macOS or Android test browser.

## Sources

- [Next.js browser support](https://nextjs.org/docs/architecture/supported-browsers)
- [PDF.js browser support](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-support)
- [WebKit: Safari 18.4 iterator helper support](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)
- [WebKit: Safari 17.4 promise resolvers and buffer transfer support](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/)
- [PDF.js Safari text extraction issue](https://github.com/mozilla/pdf.js/issues/20973)
- [WebKit: Safari 26.4 stream async iteration support](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/)
