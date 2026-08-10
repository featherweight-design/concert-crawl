'use client'

// Owns the palette's open state for the whole app shell.
//
// It used to live in AppHeader, which was fine while the header held the only
// two triggers. "Find artists to follow" is a third, and it sits in the page
// body — a sibling of the header, not a descendant — so the state had to move
// above both. Anything that wants the search experience now asks for it here
// rather than routing to /search, which is the same search behind a page load.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SearchPalette } from './SearchPalette'
import { SearchPaletteContext } from './search-palette-context'

export const SearchPaletteProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!((event.metaKey || event.ctrlKey) && event.key === 'k')) return
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
        return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(() => ({ open: () => setOpen(true) }), [])
  const close = useCallback(() => setOpen(false), [])

  return (
    <SearchPaletteContext.Provider value={value}>
      {children}
      <SearchPalette open={open} onClose={close} />
    </SearchPaletteContext.Provider>
  )
}
