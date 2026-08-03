// jsdom ships no ResizeObserver, and the row's measure passes construct one on
// mount — without this every test that renders a row throws before asserting.
// The stub never fires, so those passes fall through to their pre-layout
// defaults, which is what a layout-less environment should show.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
