export type NavKind = 'danger' | 'warning' | 'signal' | 'neutral'

export interface NavItem {
  key: string
  label: string
  href: string
  iconName: string
  badge?: { kind: NavKind }
}

export const NAV: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    iconName: 'LayoutDashboard',
  },
  { key: 'venues', label: 'Venues', href: '/admin/venues', iconName: 'MapPin' },
  {
    key: 'crawl',
    label: 'Crawl',
    href: '/admin/crawl',
    iconName: 'RefreshCw',
    badge: { kind: 'danger' },
  },
  {
    key: 'events',
    label: 'Event review',
    href: '/admin/events',
    iconName: 'CalendarCheck',
    badge: { kind: 'warning' },
  },
  {
    key: 'prices',
    label: 'Prices',
    href: '/admin/prices',
    iconName: 'DollarSign',
  },
  {
    key: 'invite-codes',
    label: 'Invite codes',
    href: '/admin/invite-codes',
    iconName: 'Ticket',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    iconName: 'Settings',
  },
]
