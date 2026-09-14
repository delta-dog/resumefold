// Run in both the page and worker before importing PDF.js.
export function installPdfCompatibility() {
  if (typeof Promise.withResolvers !== "function") {
    Object.defineProperty(Promise, "withResolvers", {
      configurable: true, writable: true,
      value: function withResolvers() {
        let resolve, reject;
        const promise = new this((res, rej) => { resolve = res; reject = rej; });
        return { promise, resolve, reject };
      },
    });
  }
  if (typeof ArrayBuffer.prototype.transferToFixedLength !== "function") {
    const byteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
    Object.defineProperty(ArrayBuffer.prototype, "transferToFixedLength", {
      configurable: true, writable: true,
      value: function transferToFixedLength(newLength) {
        const oldLength = byteLength.call(this);
        const number = newLength === undefined ? oldLength : +newLength;
        const length = Number.isNaN(number) ? 0 : Math.trunc(number);
        if (length < 0 || !Number.isSafeInteger(length)) throw new RangeError("Invalid buffer length");
        // Constructing a view also rejects an already-detached buffer.
        new Uint8Array(this);
        const output = new ArrayBuffer(length);
        const moved = structuredClone(this, { transfer: [this] });
        new Uint8Array(output).set(new Uint8Array(moved, 0, Math.min(oldLength, length)));
        return output;
      },
    });
  }
}

export function pdfWorkerFilename(version) {
  return `pdf.worker.${version}.compat-v2.mjs`;
}
