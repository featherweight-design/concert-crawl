export type NavKind = 'danger' | 'warning' | 'signal'

export interface NavItem {
  key: string
  label: string
  href: string
  iconName: string
  badge?: {
    count: number
    kind: NavKind
  }
  section: 'operations' | 'account'
}

export const NAV_V2: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    iconName: 'LayoutDashboard',
    section: 'operations',
  },
  {
    key: 'venues',
    label: 'Venues',
    href: '/admin/venues',
    iconName: 'MapPin',
    section: 'operations',
  },
  {
    key: 'crawl',
    label: 'Crawl',
    href: '/admin/crawl',
    iconName: 'RefreshCw',
    badge: { count: 0, kind: 'danger' },
    section: 'operations',
  },
  {
    key: 'review',
    label: 'Review',
    href: '/admin/review',
    iconName: 'CalendarCheck',
    badge: { count: 0, kind: 'warning' },
    section: 'operations',
  },
  {
    key: 'artists',
    label: 'Artists',
    href: '/admin/artists',
    iconName: 'Music',
    section: 'operations',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    href: '/admin/feedback',
    iconName: 'Inbox',
    badge: { count: 0, kind: 'signal' },
    section: 'operations',
  },
  {
    key: 'founder-window',
    label: 'Founder window',
    href: '/admin/founder-window',
    iconName: 'Rocket',
    section: 'account',
  },
  {
    key: 'feature-flags',
    label: 'Feature flags',
    href: '/admin/feature-flags',
    iconName: 'ToggleLeft',
    section: 'account',
  },
  {
    key: 'users',
    label: 'Users',
    href: '/admin/users',
    iconName: 'Users',
    section: 'account',
  },
  {
    key: 'invite-codes',
    label: 'Invite codes',
    href: '/admin/invite-codes',
    iconName: 'Key',
    section: 'account',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    iconName: 'Settings',
    section: 'account',
  },
]

/** @deprecated Use NAV_V2 */
export const NAV = NAV_V2
