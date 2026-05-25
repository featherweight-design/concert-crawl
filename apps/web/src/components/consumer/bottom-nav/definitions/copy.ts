// Shown in the mobile bottom navigation bar

export const COPY = {
  nav: {
    ariaLabel: 'Main navigation',
    tabs: [
      { key: 'browse', label: 'browse', href: '/events' },
      { key: 'venues', label: 'venues', href: '/venues' },
      { key: 'watching', label: 'watching', href: '/watching' },
    ] as const,
    profileAriaLabel: 'Profile',
  },
} as const
