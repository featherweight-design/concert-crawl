'use client'

// Viewport-relative geometry for a popover that has been portalled away from
// its trigger. Once the panel lives on document.body it can no longer inherit
// the trigger's inline box, so the offsets the popover used to express as
// `calc(100% + 11px)` have to be measured against the anchor instead.
//
// Alongside that it does the three things the inline version could not: flip to
// the side with more room, clamp into the viewport horizontally, and cap its
// own height so a tall tip scrolls rather than running off the screen.

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { OverlayAlign, OverlayPlacement } from '../definitions/types'

const GAP = 11
// Matches the popover's old `left: -10` overhang, so a start/end aligned panel
// still sits slightly outside its trigger rather than flush with it.
const OVERHANG = 10
const EDGE = 8
// Below this a flip is worth more than honouring the requested side.
const MIN_USABLE = 160
// Keeps the arrow inside the panel's rounded corners.
const ARROW_INSET = 14

export interface AnchoredPosition {
  placement: OverlayPlacement
  style: { left: number; top?: number; bottom?: number; maxHeight: number }
  arrowLeft: number
}

const measure = (
  anchor: HTMLElement,
  placement: OverlayPlacement,
  align: OverlayAlign,
  width: number,
): AnchoredPosition => {
  const rect = anchor.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight

  const spaceAbove = rect.top - GAP - EDGE
  const spaceBelow = viewportHeight - rect.bottom - GAP - EDGE
  // Only flip when the requested side is genuinely unusable and the other side
  // is better. A cramped panel that scrolls beats one that flips on every
  // scroll tick.
  const requested = placement === 'top' ? spaceAbove : spaceBelow
  const alternate = placement === 'top' ? spaceBelow : spaceAbove
  const resolved =
    requested < MIN_USABLE && alternate > requested
      ? placement === 'top'
        ? 'bottom'
        : 'top'
      : placement

  const unclamped =
    align === 'start'
      ? rect.left - OVERHANG
      : align === 'end'
        ? rect.right + OVERHANG - width
        : rect.left + rect.width / 2 - width / 2
  const left = Math.max(
    EDGE,
    Math.min(unclamped, Math.max(EDGE, viewportWidth - width - EDGE)),
  )

  // The arrow tracks the trigger, not the panel: clamping the panel into the
  // viewport would otherwise leave the arrow pointing at empty space.
  const arrowLeft = Math.max(
    ARROW_INSET,
    Math.min(rect.left + rect.width / 2 - left, width - ARROW_INSET),
  )

  return {
    placement: resolved,
    arrowLeft,
    style:
      resolved === 'bottom'
        ? {
            left,
            top: rect.bottom + GAP,
            // The measured space, never a floor: a panel taller than the gap it
            // sits in runs off the screen, which is the bug this hook exists to
            // stop. Below MIN_USABLE it shrinks and scrolls instead.
            maxHeight: Math.max(0, spaceBelow),
          }
        : {
            left,
            bottom: viewportHeight - rect.top + GAP,
            maxHeight: Math.max(0, spaceAbove),
          },
  }
}

// jsdom reports every rect as zero, so layout assertions belong in Playwright.
// This exists so the hook has something coherent to render before its first
// measurement lands.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export const useAnchoredPosition = (
  anchor: HTMLElement | null,
  placement: OverlayPlacement,
  align: OverlayAlign,
  width: number,
): AnchoredPosition | null => {
  const [position, setPosition] = useState<AnchoredPosition | null>(null)

  const reposition = useCallback(() => {
    if (anchor === null) return
    setPosition(measure(anchor, placement, align, width))
  }, [anchor, placement, align, width])

  useIsomorphicLayoutEffect(reposition, [reposition])

  useEffect(() => {
    if (anchor === null) return
    // Coalesced to one measurement per frame: a capture-phase scroll listener
    // fires far more often than the browser paints, and each raw call is a
    // React render.
    let frame: number | null = null
    const schedule = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        reposition()
      })
    }
    // Capture phase so a scroll inside any ancestor moves the panel too, not
    // just a scroll of the document.
    const options = { capture: true, passive: true } as const
    window.addEventListener('scroll', schedule, options)
    window.addEventListener('resize', schedule)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, options)
      window.removeEventListener('resize', schedule)
    }
  }, [anchor, reposition])

  return position
}
