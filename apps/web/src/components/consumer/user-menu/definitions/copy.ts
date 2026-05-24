// Shown in the account dropdown menu (desktop popover + mobile bottom sheet) accessible from the avatar in the top-right corner of the nav.

export const copy = {
  ariaLabels: {
    accountMenu: 'Account menu',
  },
  identity: {
    badge: 'Beta · founder',
  },
  sections: {
    you: 'You',
    app: 'App',
    operations: 'Operations',
  },
  rows: {
    submittedPrices: 'Submitted prices',
    submittedPricesMeta: (count: number) => `${count} live`,
    theme: 'Theme',
    settings: 'Settings',
    admin: 'Admin',
    signOut: 'Sign out',
  },
} as const
