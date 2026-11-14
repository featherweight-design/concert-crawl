import { NAV, activeNavKey, type NavItem } from './nav';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

export interface Crumb {
  label: string;
  href?: string;
  /**
   * A view of the page above it (Events / Past), not a page of its own: the
   * phone header keeps the page's title (4b#22).
   */
  view?: true;
}

const subLabelFor = (item: NavItem, pathname: string): string => {
  if (pathname === '/admin/venues/robots-audit') {
    // The tool's crumb reads from its page title so the two cannot drift.
    return ADMIN_COPY.robotsAudit.page.title;
  }
  // A venue's own name replaces this once its page sets the title; until
  // then the slot holds the board's placeholder (`07/loading-venue-page`).
  if (item.key === 'venues') return ADMIN_COPY.shell.crumbs.venuePending;
  if (pathname === '/admin/invite-codes/posters') {
    return ADMIN_COPY.inviteCodes.poster.tabs.posters;
  }

  return ADMIN_COPY.shell.crumbs.details;
};

/** The section root a route lives under, ignoring interim query strings. */
const isSectionRoot = (item: NavItem, pathname: string): boolean => {
  const root = item.href.split('?')[0];
  // The old Review All events tab still sits beside the Events list.
  return (
    pathname === root || (item.key === 'events' && pathname === '/admin/review')
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
  // `06/past-shows`: "Events / Past".
  if (pathname === '/admin/events' && searchParams?.get('when') === 'past') {
    return [
      { label: item.label, href: item.href },
      { label: ADMIN_COPY.eventsList.pastCrumb, view: true },
    ];
  }
  if (isSectionRoot(item, pathname)) return [{ label: item.label }];
  return [
    { label: item.label, href: item.href },
    { label: subLabelFor(item, pathname) },
  ];
}
