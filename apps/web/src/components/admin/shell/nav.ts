export type NavKind = 'danger' | 'warning'

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

export const NAV: NavItem[] = [
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
    key: 'events',
    label: 'Event review',
    href: '/admin/events',
    iconName: 'CalendarCheck',
    badge: { count: 0, kind: 'warning' },
    section: 'operations',
  },
  {
    key: 'prices',
    label: 'Prices',
    href: '/admin/prices',
    iconName: 'DollarSign',
    section: 'operations',
  },
  {
    key: 'invite-codes',
    label: 'Invite codes',
    href: '/admin/invite-codes',
    iconName: 'Ticket',
    section: 'operations',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    iconName: 'Settings',
    section: 'account',
  },
]
