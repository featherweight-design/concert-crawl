'use client'

import { useEffect } from 'react'
import { GUIDE_ANCHOR_ID } from './FirstTimerCallout'

/**
 * A cold load of `/venues/x#ft-guide` scrolls to the guide because the browser
 * honours the fragment itself. A client-side navigation from the event page's
 * first-timer chip does not — Next restores the top of the new route and never
 * reads the hash, which left the guide ~700px below the fold on the one journey
 * that exists to land on it.
 *
 * Scrolling on mount covers both paths: on a cold load the element is already
 * in place and this is a no-op re-scroll to the same offset.
 */
export const GuideAnchorScroll = () => {
  useEffect(() => {
    if (window.location.hash !== `#${GUIDE_ANCHOR_ID}`) return
    const target = document.getElementById(GUIDE_ANCHOR_ID)
    if (target === null) return
    // rAF so the scroll runs after the section has been laid out, otherwise the
    // offset is measured against a page that is still growing.
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return null
}
