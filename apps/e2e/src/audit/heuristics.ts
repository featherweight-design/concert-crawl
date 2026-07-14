/*
 * DOM heuristics module for the UI audit sweep engine.
 *
 * collectHeuristicsScript is a stringified arrow-function expression that runs
 * entirely inside the page context — no imports, no closures over Node modules.
 * Task 4 (sweep runner) invokes it via:
 *
 *   await page.evaluate(new Function(`return (${collectHeuristicsScript})(${vw})`))
 *
 * The same `new Function(...)` mechanism lets jsdom unit tests call it against
 * crafted DOM fixtures without loading a real browser.
 *
 * Heuristics detected:
 *   1. hasHorizontalScroll  — scrollWidth > clientWidth on <html>
 *   2. offscreenElements    — any element whose right edge exceeds the viewport
 *   3. smallTapTargets      — interactive elements smaller than 32×32 px
 *   4. brokenImages         — <img> with naturalWidth === 0 (or data-natural-width="0")
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

  // --- 2. Offscreen elements ---
  var offscreenElements = []
  var allEls = document.querySelectorAll('*')
  for (var oi = 0; oi < allEls.length; oi++) {
    var el = allEls[oi]
    // Skip elements explicitly hidden via inline display:none
    if (el.style && el.style.display === 'none') continue
    var rect = el.getBoundingClientRect()
    if (rect.right > vw) {
      offscreenElements.push({ selector: selectorFor(el), rightEdgePx: rect.right })
    }
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
    // naturalWidth === 0 catches real broken images in a live browser.
    // data-natural-width="0" is a test-only fallback because jsdom never
    // paints images so naturalWidth is always 0 for every <img> — the
    // attribute lets tests mark only the intentionally broken ones.
    var isBroken = (img instanceof HTMLImageElement && img.naturalWidth === 0)
                || img.getAttribute('data-natural-width') === '0'
    if (isBroken) {
      brokenImages.push({ src: img.getAttribute('src') || '' })
    }
  }

  return { hasHorizontalScroll: hasHorizontalScroll, offscreenElements: offscreenElements, smallTapTargets: smallTapTargets, brokenImages: brokenImages }
}`

// ---------------------------------------------------------------------------
// Caller-facing async wrapper
// ---------------------------------------------------------------------------

/**
 * Runs the heuristic script inside the Playwright page and returns the result.
 *
 * Uses `new Function(...)` to invoke the stringified expression so the page
 * receives a fully self-contained function with no module references.
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
