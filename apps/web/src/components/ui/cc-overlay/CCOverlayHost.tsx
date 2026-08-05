'use client'

// Portals an overlay — sheet or popover — out of the trigger's inline box and
// into a full-viewport host, so `fixed` positioning and z-index aren't trapped
// by an ancestor's stacking or overflow context.

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Layout effect on the client so the portal mounts before first paint: a plain
// effect costs the overlay a visible frame after the trigger changes state.
// Falls back to useEffect on the server, where useLayoutEffect warns.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

// The consumer theme writes its tokens onto <html>, so anything under the body
// inherits it. The admin theme does not: it is a scoped `[data-admin-theme]`
// wrapper partway down the tree, and a panel portalled past it falls back to
// the consumer's tokens and renders in the wrong theme.
//
// So the admin scope is the preferred host when one is present. It wraps the
// whole admin layout — including the flex container whose `overflow: hidden`
// is what made these panels clip in the first place — and generates no box of
// its own, so hosting there escapes exactly as much as the body would while
// keeping the tokens live through a theme switch.
const THEME_SCOPE = '[data-admin-theme]'

export const CCOverlayHost = ({
  host,
  children,
}: {
  host?: Element | null
  children: ReactNode
}) => {
  const [node, setNode] = useState<Element | null>(null)

  // Resolved in an effect rather than at render so the server pass and the
  // first client pass agree — document doesn't exist during SSR.
  useIsomorphicLayoutEffect(() => {
    setNode(host ?? document.querySelector(THEME_SCOPE) ?? document.body)
  }, [host])

  if (node === null) return null
  return createPortal(children, node)
}
