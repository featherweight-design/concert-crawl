'use client'

// Portals a sheet out of the trigger's inline box and into a full-viewport
// host, so `fixed` positioning and z-index aren't trapped by an ancestor's
// stacking or overflow context. Defaults to document.body.

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  useEffect(() => {
    setNode(host ?? document.body)
  }, [host])

  if (node === null) return null
  return createPortal(children, node)
}
