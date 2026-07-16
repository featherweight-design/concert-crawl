/*
 * DOM heuristics module for the UI audit sweep engine.
 *
 * collectHeuristicsScript is a stringified arrow-function expression that runs
 * entirely inside the page context — no imports, no closures over Node modules.
 * The wrapper `collectHeuristics(page, vw)` calls it via
 *
 *   await page.evaluate(`(${collectHeuristicsScript})(${vw})`)
 *
 * (Playwright's typed `evaluate` rejects raw `Function` objects, hence the
 * expression-string form.) jsdom unit tests invoke the same string via
 * `new Function(...)` inside a page-shim harness — see heuristics.test.ts.
 *
 * Heuristics detected:
 *   1. hasHorizontalScroll   — scrollWidth > clientWidth on <html>
 *   2. offscreenElements     — any element whose right edge exceeds the viewport
 *   3. smallTapTargets       — interactive elements smaller than 32×32 px
 *   4. brokenImages          — <img> with naturalWidth === 0 (or data-natural-width="0")
 *   5. overflowingContainers — element content wider than its own box
 *                              (scrollWidth > clientWidth), i.e. container-relative
 *                              overflow that the viewport-anchored checks (1 & 2) miss
 */

import type { Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeuristicSnapshot = {
  hasHorizontalScroll: boolean
  offscreenElements: { selector: string; rightEdgePx: number }[]
  smallTapTargets: { selector: string; widthPx: number; heightPx: number }[]
  brokenImages: { src: string }[]
  overflowingContainers: {
    selector: string
    scrollWidthPx: number
    clientWidthPx: number
  }[]
  contentDensity: {
    mainChildren: number
    bodyElements: number
  }
}

// ---------------------------------------------------------------------------
// Stringified heuristic script (runs inside page context)
// ---------------------------------------------------------------------------

/**
 * A stringified arrow-function expression: `(vw) => { … }`.
 *
 * TypeScript cannot type-check inside a template literal, so be careful:
 *   - Only browser globals are allowed (document, HTMLElement, HTMLImageElement…)
 *   - No imports, no references to variables from this module's outer scope
 *   - The function must return a HeuristicSnapshot-shaped plain object
 */
export const collectHeuristicsScript = `(vw) => {
  var de = document.documentElement

  // --- 1. Horizontal scroll ---
  var hasHorizontalScroll = de.scrollWidth > de.clientWidth

  // --- Selector helper ---
  function selectorFor(el) {
    var tag = el.tagName.toLowerCase()
    var id = el.id
    var firstClass = el.classList && el.classList[0]
    if (id) return tag + '#' + id
    if (firstClass) return tag + '.' + firstClass
    return tag
  }

  // --- 2 & 5. Per-element layout scan (single pass over all elements) ---
  // One walk of the element list feeds two overflow checks so large pages pay
  // the DOM iteration and layout reads only once:
  //   (2) offscreenElements     — right edge past the viewport (rect.right > vw)
  //   (5) overflowingContainers — content wider than the element's OWN box
  //       (scrollWidth > clientWidth). The viewport-anchored checks (1 & 2)
  //       only flag content crossing the viewport's right edge; they miss an
  //       element whose content bleeds past its own box while still inside the
  //       viewport — e.g. a long unbroken string widening a card past its
  //       column, which an ancestor may clip so the document never gains a
  //       scrollbar. Skip for (5): (a) the <html>/<body> roots, whose
  //       document-level overflow is already reported by hasHorizontalScroll
  //       (check 1); (b) intentional scrollers (overflow-x auto/scroll —
  //       carousels, code blocks); (c) zero-box/inline elements (clientWidth 0),
  //       whose scrollWidth is not a meaningful container bound. A small
  //       tolerance absorbs sub-pixel rounding.
  var OVERFLOW_TOLERANCE_PX = 2
  var offscreenElements = []
  var overflowingContainers = []
  var allEls = document.querySelectorAll('*')
  for (var ei = 0; ei < allEls.length; ei++) {
    var el = allEls[ei]
    // Skip elements explicitly hidden via inline display:none
    if (el.style && el.style.display === 'none') continue

    // (2) Offscreen: right edge beyond the viewport.
    var rect = el.getBoundingClientRect()
    if (rect.right > vw) {
      offscreenElements.push({ selector: selectorFor(el), rightEdgePx: rect.right })
    }

    // (5) Container-relative overflow. Skip the roots (that's check 1's job).
    if (el === de || el === document.body) continue
    // Zero-box nodes (head/meta/script/title and other non-rendered elements)
    // can't overflow their own box. rect is already measured above, so this
    // short-circuits the extra clientWidth/scrollWidth layout reads for them
    // before we touch those properties. clientWidth<=0 still filters inline
    // elements, which have a non-zero rect but a zero client box.
    if (rect.width <= 0) continue
    var clientW = el.clientWidth
    if (clientW <= 0) continue
    var scrollW = el.scrollWidth
    if (scrollW <= clientW + OVERFLOW_TOLERANCE_PX) continue
    // Only the small subset that actually overflows reaches getComputedStyle,
    // which is expensive enough to dominate the script on large pages.
    var overflowX = ''
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      overflowX = window.getComputedStyle(el).overflowX || ''
    }
    if (overflowX === 'auto' || overflowX === 'scroll') continue
    overflowingContainers.push({
      selector: selectorFor(el),
      scrollWidthPx: scrollW,
      clientWidthPx: clientW,
    })
  }

  // --- 3. Small tap targets ---
  var tapSelectors = 'button, a, input[type=button], input[type=submit], [role=button]'
  var tapEls = document.querySelectorAll(tapSelectors)
  var smallTapTargets = []
  for (var ti = 0; ti < tapEls.length; ti++) {
    var tapEl = tapEls[ti]
    var tapRect = tapEl.getBoundingClientRect()
    if (tapRect.width < 32 || tapRect.height < 32) {
      smallTapTargets.push({
        selector: selectorFor(tapEl),
        widthPx: tapRect.width,
        heightPx: tapRect.height,
      })
    }
  }

  // --- 4. Broken images ---
  var imgEls = document.querySelectorAll('img')
  var brokenImages = []
  for (var ii = 0; ii < imgEls.length; ii++) {
    var img = imgEls[ii]
    // In a real browser: an image is broken when it has finished loading
    // (complete === true) with zero natural width. Under jsdom images
    // never load, so complete is false and the naturalWidth arm is
    // skipped — jsdom relies solely on the data-natural-width attribute
    // to mark broken fixtures deterministically. This prevents every
    // <img> in a jsdom test from being flagged as broken.
    var completed = img instanceof HTMLImageElement && img.complete
    var isBroken = (completed && img.naturalWidth === 0)
                || img.getAttribute('data-natural-width') === '0'
    if (isBroken) {
      brokenImages.push({ src: img.getAttribute('src') || '' })
    }
  }

  // --- 6. Content density ---
  // mainChildren stays for information, but it is NOT a reliable "did real
  // content render" signal: this app's page content is inconsistently wrapped
  // in <main> (the (main) route-group layout has no <main> landmark, and some
  // consumer detail pages render content as a bare fragment). A venue page can
  // render a full event list with zero <main> descendants. So the sweep's
  // insufficientData gate keys off bodyElements instead, which is markup-
  // agnostic: every rendered element in the document. A 404/blank/bounced
  // render has very few; any genuine route render — even an empty-state — has
  // many. (Body TEXT length is deliberately NOT used: Next.js embeds its RSC
  // hydration payload as inline <script> text, which dwarfs and masks the
  // visible copy, so text length does not measure real content here.)
  var mainEl = document.querySelector('main')
  var mainChildren = mainEl ? mainEl.children.length : 0
  var bodyEl = document.body
  var bodyElements = bodyEl ? bodyEl.querySelectorAll('*').length : 0

  return { hasHorizontalScroll: hasHorizontalScroll, offscreenElements: offscreenElements, smallTapTargets: smallTapTargets, brokenImages: brokenImages, overflowingContainers: overflowingContainers, contentDensity: { mainChildren: mainChildren, bodyElements: bodyElements } }
}`

// ---------------------------------------------------------------------------
// Caller-facing async wrapper
// ---------------------------------------------------------------------------

/**
 * Runs the heuristic script inside the Playwright page and returns the result.
 * Wraps the stringified expression in an immediately-invoked call so the page
 * receives a self-contained IIFE with no module references.
 */
export async function collectHeuristics(
  page: Page,
  viewportWidthPx: number,
): Promise<HeuristicSnapshot> {
  // page.evaluate accepts a JS expression string — wrap the stringified
  // function and call it immediately so the page receives a complete IIFE.
  const result: HeuristicSnapshot = await page.evaluate(
    `(${collectHeuristicsScript})(${viewportWidthPx})`,
  )
  return result
}
