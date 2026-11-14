import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * Each admin route's first segment to the title its page draws, so the
 * route-level Couldn't load reads "Couldn't load {page}" (addendum-2 item 10).
 * Every value is the page's own title key, so the two cannot drift.
 */
const PAGE_NAMES = new Map<string, string>([
  ['', ADMIN_COPY.health.title],
  ['needs-you', ADMIN_COPY.needsYou.title],
  ['venues', ADMIN_COPY.venuesList.title],
  ['events', ADMIN_COPY.eventsList.title],
  ['artists', ADMIN_COPY.artists.title],
  ['prices', ADMIN_COPY.pricesPage.title],
  ['people', ADMIN_COPY.peoplePage.title],
  ['users', ADMIN_COPY.peoplePage.title],
  ['invite-codes', ADMIN_COPY.codesPage.title],
  ['feature-flags', ADMIN_COPY.featureFlags.sectionTitle],
  ['crawl', ADMIN_COPY.crawlPage.sectionTitle],
  ['feedback', ADMIN_COPY.feedback.title],
  ['settings', ADMIN_COPY.settings.page.title],
  ['more', ADMIN_COPY.shell.more.title],
]);

/**
 * The page name for an admin pathname, or undefined for a route with no
 * title of its own (Couldn't load then keeps its generic heading).
 */
export const adminPageName = (pathname: string | null): string | undefined => {
  if (pathname === null) return undefined;
  // "/admin/venues/12" → ["", "admin", "venues", "12"]
  const [lead, root, segment = ''] = pathname.split('/');
  if (lead !== '' || root !== 'admin') return undefined;
  return PAGE_NAMES.get(segment);
};
