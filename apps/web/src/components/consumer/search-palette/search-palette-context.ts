'use client'

import { createContext, useContext } from 'react'

export interface SearchPaletteState {
  /** Opens the palette over whatever page the viewer is on. */
  open: () => void
}

// `null` rather than an inert default, because every consumer here has a real
// `<Link>` underneath it: absent a provider they navigate to /search instead of
// silently doing nothing. That fallback is also what a middle-click gets.
export const SearchPaletteContext = createContext<SearchPaletteState | null>(
  null,
)

export const useSearchPalette = (): SearchPaletteState | null =>
  useContext(SearchPaletteContext)
