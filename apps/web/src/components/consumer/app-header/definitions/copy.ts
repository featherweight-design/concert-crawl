// Shown in the top navigation bar on all consumer pages

export const copy = {
  brand: {
    name: 'concert',
    accent: 'crawl.',
  },
  nav: {
    tabs: [
      { label: 'Browse', href: '/events' },
      { label: 'Venues', href: '/venues' },
      { label: 'Watching', href: '/watching' },
    ] as const,
  },
  search: {
    ariaLabel: 'Search',
    placeholder: 'Search artists or venues…',
    keyboardShortcut: '⌘K',
  },
  mobileProfileEntry: {
    loadErrorLog:
      'MobileProfileEntry: could not load profile, showing anonymous avatar',
  },
} as const
