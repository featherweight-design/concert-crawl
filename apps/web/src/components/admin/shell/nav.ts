import {
  Activity,
  Calendar,
  Flag,
  Inbox,
  Lock,
  MapPin,
  Music,
  RefreshCw,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * At or below this width the shell swaps the sidebar for the 4-tab bar. The 640
 * column of every admin inventory therefore shows the phone shell on purpose:
 * a 232px sidebar would leave 408px for tables (plan decision 16).
 */
export const MOBILE_BREAKPOINT = 720;

/** The one badge in admin: decisions waiting in Needs you (plan decision 13). */
export interface AdminBadgeCounts {
  needsYou: number;
}

export type NavGroup = 'primary' | 'manage' | 'system';

export type NavKey =
  | 'needs-you'
  | 'health'
  | 'venues'
  | 'events'
  | 'artists'
  | 'prices'
  | 'people'
  | 'feature-flags'
  | 'invite-codes'
  | 'crawl-runs'
  | 'operations';

export interface NavItem {
  key: NavKey;
  label: string;
  /**
   * Interim hrefs until each page's phase lands (plan decision 14). Labels and
   * order are final.
   */
  href: string;
  icon: LucideIcon;
  group: NavGroup;
}

const navCopy = ADMIN_COPY.shell.nav;

export const NAV: NavItem[] = [
  {
    key: 'needs-you',
    label: navCopy.needsYou,
    href: '/admin/review',
    icon: Inbox,
    group: 'primary',
  },
  {
    key: 'health',
    label: navCopy.health,
    href: '/admin',
    icon: Activity,
    group: 'primary',
  },
  {
    key: 'venues',
    label: navCopy.venues,
    href: '/admin/venues',
    icon: MapPin,
    group: 'manage',
  },
  {
    key: 'events',
    label: navCopy.events,
    href: '/admin/review?tab=all-events',
    icon: Calendar,
    group: 'manage',
  },
  {
    key: 'artists',
    label: navCopy.artists,
    href: '/admin/artists',
    icon: Music,
    group: 'manage',
  },
  {
    key: 'prices',
    label: navCopy.prices,
    href: '/admin/review?tab=prices',
    icon: Tag,
    group: 'manage',
  },
  {
    key: 'people',
    label: navCopy.people,
    href: '/admin/people',
    icon: Users,
    group: 'manage',
  },
  {
    // Interim row from 0a until 5b makes Invite codes a tab inside People
    // (#178 item 8, `desktop-sidebar-interim`): after People, lock icon, no
    // badge.
    key: 'invite-codes',
    label: navCopy.inviteCodes,
    href: '/admin/invite-codes',
    icon: Lock,
    group: 'manage',
  },
  {
    key: 'feature-flags',
    label: navCopy.featureFlags,
    href: '/admin/feature-flags',
    icon: Flag,
    group: 'manage',
  },
  {
    key: 'crawl-runs',
    label: navCopy.crawlRuns,
    href: '/admin/crawl',
    icon: RefreshCw,
    group: 'system',
  },
  {
    key: 'operations',
    label: navCopy.operations,
    href: '/admin/feedback',
    icon: Wrench,
    group: 'system',
  },
];

export const NAV_GROUPS: NavGroup[] = ['primary', 'manage', 'system'];

export const navItem = (key: NavKey): NavItem => {
  const item = NAV.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`Unknown admin nav key: ${key}`);
  return item;
};

/** Only Needs you carries a badge. */
export const badgeCountFor = (
  key: NavKey,
  counts: AdminBadgeCounts | undefined,
): number => (key === 'needs-you' ? (counts?.needsYou ?? 0) : 0);

/** The first three tabs of the phone tab bar; More covers the rest. */
export const TAB_BAR: Array<NavKey | 'more'> = [
  'needs-you',
  'venues',
  'events',
  'more',
];

export const MORE_HREF = '/admin/more';

const REVIEW_TAB_TO_KEY: Record<string, NavKey> = {
  'all-events': 'events',
  prices: 'prices',
  submissions: 'prices',
};

/**
 * Review's tabs are split across Needs you, Events and Prices until 2b, 4b
 * and 4d move them. The event editor carries `?from=<review tab>`, so it
 * follows the tab it was opened from and defaults to Events.
 */
const keyForReviewTab = (tab: string | null, fallback: NavKey): NavKey => {
  if (tab === null) return fallback;
  return REVIEW_TAB_TO_KEY[tab] ?? 'needs-you';
};

const PREFIXES: Array<[string, NavKey]> = [
  ['/admin/venues', 'venues'],
  ['/admin/artists', 'artists'],
  ['/admin/prices', 'prices'],
  ['/admin/users', 'people'],
  ['/admin/people', 'people'],
  ['/admin/feature-flags', 'feature-flags'],
  ['/admin/invite-codes', 'invite-codes'],
  ['/admin/crawl', 'crawl-runs'],
  ['/admin/feedback', 'operations'],
  ['/admin/operations', 'operations'],
  ['/admin/settings', 'operations'],
  ['/admin/needs-you', 'needs-you'],
];

const matchesPrefix = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The nav item that owns a route, or null for More and unknown paths. */
export const activeNavKey = (
  pathname: string,
  searchParams?: Pick<URLSearchParams, 'get'> | null,
): NavKey | null => {
  if (pathname === '/admin') return 'health';
  if (matchesPrefix(pathname, '/admin/review')) {
    if (pathname !== '/admin/review') return 'needs-you';
    return keyForReviewTab(searchParams?.get('tab') ?? null, 'needs-you');
  }
  if (matchesPrefix(pathname, '/admin/events')) {
    return keyForReviewTab(searchParams?.get('from') ?? null, 'events');
  }
  const match = PREFIXES.find(([prefix]) => matchesPrefix(pathname, prefix));
  return match ? match[1] : null;
};

/** The phone tab bar's active tab: More owns every route but the first three. */
export const activeTabKey = (
  pathname: string,
  searchParams?: Pick<URLSearchParams, 'get'> | null,
): NavKey | 'more' => {
  const key = activeNavKey(pathname, searchParams);
  return key !== null && TAB_BAR.includes(key) ? key : 'more';
};
