export type NavKind = 'danger' | 'warning' | 'signal';

/** What the sidebar and bottom bar badge, keyed by the nav item's key. */
export interface AdminBadgeCounts {
  crawl: number;
  review: number;
  feedback: number;
  /** Artists with an open wrong-artist report. */
  artists: number;
}

export const badgeCountFor = (
  key: string,
  counts: AdminBadgeCounts | undefined,
): number => {
  if (!counts) return 0;
  if (key === 'crawl') return counts.crawl;
  if (key === 'review') return counts.review;
  if (key === 'artists') return counts.artists;
  if (key === 'feedback') return counts.feedback;
  return 0;
};

export interface NavItem {
  key: string;
  label: string;
  href: string;
  iconName: string;
  badge?: {
    count: number;
    kind: NavKind;
  };
  section: 'operations' | 'account';
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
    badge: { count: 0, kind: 'warning' },
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
];

/** @deprecated Use NAV_V2 */
export const NAV = NAV_V2;
