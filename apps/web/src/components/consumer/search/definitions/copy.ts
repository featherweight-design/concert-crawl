// Shown in the search bar and search result states across the app

export const copy = {
  // SearchBar
  searchPlaceholder: 'Search artists, venues…',
  backAriaLabel: 'Back',
  clearSearchAriaLabel: 'Clear search',

  // SearchPalette
  paletteSearchPlaceholder: 'Search artists or venues…',
  paletteClearAriaLabel: 'Clear',
  paletteEscHint: 'esc',
  paletteNavigateHint: 'navigate',
  paletteOpenHint: 'open',

  // SearchDefaultState section headers
  recentSectionLabel: 'Recent',
  popularSectionLabel: 'Popular this week',

  // SearchDefaultState price fallback
  priceNotAnnounced: 'TBA',

  // SearchResultsState section headers (count appended at runtime)
  artistsSectionPrefix: 'Artists',
  venuesSectionPrefix: 'Venues',

  // SearchResultsState venue sub-label
  upcomingShowSingular: 'upcoming show',
  upcomingShowPlural: 'upcoming shows',
} as const
