import { describe, it, expect } from 'vitest'
import { collectHeuristicsScript } from './heuristics.js'
import type { HeuristicSnapshot } from './heuristics.js'

// jsdom skips layout — clientWidth/scrollWidth/getBoundingClientRect are
// 0 by default. `runInDom` stubs each from inline styles so the heuristic
// script (which reads real layout metrics in production) sees meaningful
// values. Extract to apps/e2e/src/audit/test-helpers.ts if reused.
const px = (raw: string | undefined) => parseInt(raw ?? '0', 10) || 0
const runInDom = (html: string, vw: number): HeuristicSnapshot => {
  document.body.innerHTML = html
  const de = document.documentElement
  Object.defineProperty(de, 'clientWidth', { value: vw, configurable: true })
  Object.defineProperty(de, 'scrollWidth', {
    configurable: true,
    get: () =>
      Array.from(document.querySelectorAll<HTMLElement>('*')).reduce(
        (max, elem) =>
          Math.max(max, px(elem.style.left) + px(elem.style.width)),
        vw,
      ),
  })
  // Save + restore so per-test prototype mutation doesn't bleed into
  // sibling tests via Vitest's shared JS environment. `this: HTMLElement`
  // typed parameter removes the previous `this as HTMLElement` value
  // cast — all our fixtures use HTMLElements, and jsdom always calls
  // this method with an HTMLElement receiver in our tests.
  const originalRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function (
    this: HTMLElement,
  ): DOMRect {
    const [l, t, w, h] = [
      px(this.style.left),
      px(this.style.top),
      px(this.style.width),
      px(this.style.height),
    ]
    return new DOMRect(l, t, w, h)
  }
  try {
    // eslint-disable-next-line no-new-func
    const result: unknown = new Function(
      `return (${collectHeuristicsScript})(${vw})`,
    )()
    assertHeuristicSnapshot(result)
    return result
  } finally {
    Element.prototype.getBoundingClientRect = originalRect
  }
}

// Runtime shape check for the value coming out of `new Function(...)()`.
// Replaces `as HeuristicSnapshot` on the harness return so a script that
// ever returns an unexpected object fails the test with a clear message
// instead of exploding later on undefined field access.
//
// Uses `in` narrowing (TS 4.9+ refines `value.<key>` to `unknown`) so
// there are no `as` casts — the assertion signature carries the
// structural claim, which is what type guards are for.
function assertHeuristicSnapshot(
  value: unknown,
): asserts value is HeuristicSnapshot {
  if (typeof value !== 'object' || value === null) {
    throw new Error(
      `assertHeuristicSnapshot: expected object, got ${String(value)}`,
    )
  }
  if (
    !('hasHorizontalScroll' in value) ||
    typeof value.hasHorizontalScroll !== 'boolean'
  ) {
    throw new Error('assertHeuristicSnapshot: hasHorizontalScroll not boolean')
  }
  if (
    !('offscreenElements' in value) ||
    !Array.isArray(value.offscreenElements)
  ) {
    throw new Error('assertHeuristicSnapshot: offscreenElements not array')
  }
  if (!('smallTapTargets' in value) || !Array.isArray(value.smallTapTargets)) {
    throw new Error('assertHeuristicSnapshot: smallTapTargets not array')
  }
  if (!('brokenImages' in value) || !Array.isArray(value.brokenImages)) {
    throw new Error('assertHeuristicSnapshot: brokenImages not array')
  }
  if (
    !('contentDensity' in value) ||
    typeof value.contentDensity !== 'object' ||
    value.contentDensity === null ||
    !('mainChildren' in value.contentDensity) ||
    typeof value.contentDensity.mainChildren !== 'number'
  ) {
    throw new Error(
      'assertHeuristicSnapshot: contentDensity.mainChildren not number',
    )
  }
}

describe('collectHeuristicsScript', () => {
  it('flags horizontal overflow', () => {
    const snap = runInDom(
      '<div style="width: 2000px; height: 10px"></div>',
      320,
    )
    expect(snap.hasHorizontalScroll).toBe(true)
  })
  it('lists offscreen elements past the viewport right edge', () => {
    const snap = runInDom(
      '<div id="x" style="position: absolute; left: 500px; width: 100px; height: 100px"></div>',
      320,
    )
    expect(
      snap.offscreenElements.some((entry) => entry.selector.includes('#x')),
    ).toBe(true)
  })
  it('flags tap targets smaller than 32x32', () => {
    const snap = runInDom(
      '<button id="tiny" style="width: 20px; height: 20px"></button>',
      320,
    )
    expect(
      snap.smallTapTargets.some((target) => target.selector.includes('#tiny')),
    ).toBe(true)
  })
  it('does not flag 32x32 or larger tap targets', () => {
    const snap = runInDom(
      '<button id="ok" style="width: 40px; height: 40px"></button>',
      320,
    )
    expect(snap.smallTapTargets).toEqual([])
  })
  it('flags images with naturalWidth 0', () => {
    const snap = runInDom(
      '<img src="broken.png" data-natural-width="0" />',
      320,
    )
    // Test hook: our script reads Element#naturalWidth on <img>; in DOM
    // fixtures we can't paint an image, so the script also honors
    // data-natural-width for testability.
    expect(snap.brokenImages.length).toBeGreaterThanOrEqual(1)
  })
  it('does NOT flag jsdom images without the data-natural-width marker', () => {
    // Regression guard: naturalWidth is 0 for every <img> under jsdom
    // (images never load). Without gating on img.complete the previous
    // implementation flagged every image as broken. This test proves the
    // gate works — a plain <img> with no data attribute must be silent.
    const snap = runInDom('<img src="ok.png" />', 320)
    expect(snap.brokenImages).toEqual([])
  })
  it('counts direct children of <main> for contentDensity', () => {
    const snap = runInDom('<main><div></div><div></div></main>', 320)
    expect(snap.contentDensity.mainChildren).toBe(2)
  })
  it('reports 0 mainChildren when no <main> element exists', () => {
    const snap = runInDom('<div><p>no main here</p></div>', 320)
    expect(snap.contentDensity.mainChildren).toBe(0)
  })
})
