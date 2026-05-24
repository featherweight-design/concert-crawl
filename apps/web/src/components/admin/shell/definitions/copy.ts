// Shown in the admin sidebar navigation and top bar

export const COPY = {
  sidebar: {
    adminBadge: 'ADMIN',
    sectionOperations: 'Operations',
    sectionAccount: 'Account',
    userRoleLabel: 'admin',
    userMenuLabel: 'User menu',
    signOut: 'Sign out',
    collapse: 'Collapse',
    toggleTitles: {
      toRail: 'Switch to rail',
      toAuto: 'Switch to auto',
      toFull: 'Switch to full',
    },
  },
  appSwitcher: {
    ariaLabel: 'App context',
    userApp: 'User app',
    userAppTitle: 'Open the consumer app in this tab',
    admin: 'Admin',
    adminTitle: 'You are here',
  },
  topbar: {
    breadcrumbAriaLabel: 'Breadcrumb',
  },
  mobileDrawer: {
    closeMenuAriaLabel: 'Close menu',
    sectionOperations: 'Operations',
    sectionAccount: 'Account',
    userRoleLabel: 'admin',
    signOutAriaLabel: 'Sign out',
    signOutTitle: 'Sign out',
  },
  mobileBottomBar: {
    navAriaLabel: 'Main navigation',
  },
} as const
