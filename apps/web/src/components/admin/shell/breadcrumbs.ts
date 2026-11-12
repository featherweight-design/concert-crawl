import { NAV, activeNavKey, type NavItem } from './nav';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

export interface Crumb {
  label: string;
  href?: string;
}

const subLabelFor = (item: NavItem, pathname: string): string => {
  if (pathname === '/admin/venues/robots-audit') {
    // The tool's crumb reads from its page title so the two cannot drift.
    return ADMIN_COPY.robotsAudit.page.title;
  }
  if (item.key === 'venues') return ADMIN_COPY.shell.crumbs.editVenue;
  if (pathname === '/admin/invite-codes/posters') {
    return ADMIN_COPY.inviteCodes.poster.tabs.posters;
  }
  if (pathname.startsWith('/admin/invite-codes')) {
    return ADMIN_COPY.shell.crumbs.inviteCodes;
  }
  return ADMIN_COPY.shell.crumbs.details;
};

/** The section root a route lives under, ignoring interim query strings. */
const isSectionRoot = (item: NavItem, pathname: string): boolean => {
  const root = item.href.split('?')[0];
  return (
    pathname === root || (item.key === 'events' && pathname === '/admin/events')
  );
};

/**
 * The topbar crumbs: the section, then the page when it sits below the
 * section. The section links back to its nav href, which carries the Review
 * tab the event editor was opened from (#1083).
 */
export function buildBreadcrumbs(
  pathname: string,
  searchParams?: Pick<URLSearchParams, 'get'> | null,
): Crumb[] {
  if (pathname === '/admin/more')
    return [{ label: ADMIN_COPY.shell.more.title }];
  const key = activeNavKey(pathname, searchParams);
  const item = key ? NAV.find((candidate) => candidate.key === key) : undefined;
  if (!item) return [];
  if (isSectionRoot(item, pathname)) return [{ label: item.label }];
  return [
    { label: item.label, href: item.href },
    { label: subLabelFor(item, pathname) },
  ];
}
