/**
 * Polyfill for browser-specific globals in Node.js environment.
 * This is required for some PDF parsing libraries (like pdf.js) to run on Vercel.
 */
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
    static fromFloat32Array() { return new DOMMatrix(); }
    static fromFloat64Array() { return new DOMMatrix(); }
  };
  console.log('[Polyfill] DOMMatrix initialized');
}
