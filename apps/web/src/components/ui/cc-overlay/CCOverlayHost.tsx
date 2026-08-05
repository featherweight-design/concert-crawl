'use client'

// Portals an overlay — sheet or popover — out of the trigger's inline box and
// into a full-viewport host, so `fixed` positioning and z-index aren't trapped
// by an ancestor's stacking or overflow context. Defaults to document.body.

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Layout effect on the client so the portal mounts before first paint: a plain
// effect costs the overlay a visible frame after the trigger changes state.
// Falls back to useEffect on the server, where useLayoutEffect warns.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

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
    setNode(host ?? document.body)
  }, [host])

  if (node === null) return null
  return createPortal(children, node)
}
