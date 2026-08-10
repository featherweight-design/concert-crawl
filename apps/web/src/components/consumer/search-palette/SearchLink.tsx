'use client'

// A "go find something" affordance that opens the palette in place rather than
// navigating to /search. Two searches that look and behave differently is one
// search too many, and the page load was the only difference between them.
//
// Still a real `<Link>`: the href is what a middle-click, a copied address and
// a render outside the provider all get. The palette is an enhancement over
// that, not a replacement for it.

import Link from 'next/link'
import { SEARCH_HREF } from './definitions/constants'
import { useSearchPalette } from './search-palette-context'

interface SearchLinkProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const SearchLink = ({ children, className, style }: SearchLinkProps) => {
  const palette = useSearchPalette()

  return (
    <Link
      href={SEARCH_HREF}
      className={className}
      style={style}
      onClick={(event) => {
        if (palette === null) return
        // Leave the modified clicks alone: they mean "somewhere else", and the
        // palette has no somewhere else to open in.
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return
        event.preventDefault()
        palette.open()
      }}
    >
      {children}
    </Link>
  )
}
