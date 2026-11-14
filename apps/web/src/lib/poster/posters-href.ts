import type { PosterLook } from '@/components/admin/invite-codes/PosterSheet';

/** The Codes tab, which lives under People (5b). */
export const INVITE_CODES_HREF = '/admin/people/invite-codes';

/** The Posters tab, beside Codes under People. */
export const POSTERS_PATH = `${INVITE_CODES_HREF}/posters`;

/**
 * `path` with a page's search params written back on, every key and repeat
 * kept, for the redirects that forward the old `/admin/invite-codes` URLs.
 */
export const withSearchParams = (
  path: string,
  query: Record<string, string | string[] | undefined>,
): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(key, item);
    }
  }
  const rendered = search.toString();
  return rendered ? `${path}?${rendered}` : path;
};

/** What the Posters tab has picked: a code, a look and the tabs switch. */
export interface PosterSelection {
  code: string | null;
  look: PosterLook;
  tabs: boolean;
}

/**
 * The Posters tab's URL for a selection. Night without tabs is the default,
 * so neither is restated by callers or written into the query.
 */
export const postersHref = ({
  code = null,
  look = 'night',
  tabs = false,
}: Partial<PosterSelection> = {}): string => {
  const query = new URLSearchParams();
  if (code) query.set('code', code);
  if (look === 'paper') query.set('look', 'paper');
  if (tabs) query.set('tabs', '1');
  const search = query.toString();
  return `${POSTERS_PATH}${search ? `?${search}` : ''}`;
};

/** Reads `?code`, `?look=paper` and `?tabs=1`; any other value is the default. */
export const readSelection = (
  query: Record<string, string | string[] | undefined>,
): PosterSelection => ({
  code: typeof query.code === 'string' && query.code ? query.code : null,
  look: query.look === 'paper' ? 'paper' : 'night',
  tabs: query.tabs === '1',
});
