// The bill, as follow rows.
//
// `supportingArtists` and `supportingArtistSlugs` are positionally aligned by
// contract (see EventDetailResponse) — index i of one is index i of the other
// — so they zip. A null slug means the `artists` projection has no row for
// that name, which is ordinary: the follow endpoints are keyed by slug, so
// such a name is simply not followable and is dropped rather than rendered as
// a control that cannot write.

import type { EventDetailResponse, FollowedArtist } from '@concert-crawl/types';

export interface BillArtist {
  /** Never null — a slug-less name is dropped upstream, not rendered inert. */
  slug: string;
  name: string;
  following: boolean;
  /**
   * Set only when the bill lists more than one headliner row, so today's
   * single-headliner events carry no tag. Null otherwise.
   */
  role: 'headliner' | 'support' | null;
}

/** The fields of an event detail response the bill block actually reads. */
export type BillSource = Pick<
  EventDetailResponse,
  | 'artist'
  | 'artistSlug'
  | 'supportingArtists'
  | 'supportingArtistSlugs'
  | 'headliners'
>;

/**
 * Slugs the viewer already follows, from whatever source. `undefined` means
 * the seed failed and is treated as "we do not know", which renders as not
 * following — the row is then a live Follow whose write is idempotent, rather
 * than a Following pill we cannot back up.
 */
export const followedSlugSet = (
  follows: FollowedArtist[] | undefined,
): ReadonlySet<string> => {
  const slugs = new Set<string>();
  for (const follow of follows ?? []) {
    if (follow.slug !== null) slugs.add(follow.slug);
  }
  return slugs;
};

/**
 * Every headliner in billing order (a co-headline night lists each act), then
 * the support in billed order. A row with no `headliners` list (the ladder
 * never ran, or found none) falls back to the single `artist`. Deduped by slug: a
 * co-headliner listed in both fields is one artist and must not draw two
 * buttons that disagree with each other the moment one is tapped.
 */
export const billArtists = (
  event: BillSource,
  followedSlugs: ReadonlySet<string>,
): BillArtist[] => {
  const supporting = event.supportingArtists ?? [];
  const supportingSlugs = event.supportingArtistSlugs ?? [];

  const headliners =
    event.headliners !== null && event.headliners.length > 0
      ? event.headliners
      : [{ name: event.artist, slug: event.artistSlug }];

  const candidates: Array<{
    name: string;
    slug: string | null;
    role: 'headliner' | 'support';
  }> = [
    ...headliners.map((act) => ({ ...act, role: 'headliner' as const })),
    ...supporting.map((name, index) => ({
      name,
      slug: supportingSlugs[index] ?? null,
      role: 'support' as const,
    })),
  ];

  const seen = new Set<string>();
  const rows: BillArtist[] = [];
  for (const candidate of candidates) {
    const { slug } = candidate;
    if (slug === null || seen.has(slug)) continue;
    seen.add(slug);
    rows.push({
      slug,
      name: candidate.name,
      following: followedSlugs.has(slug),
      role: candidate.role,
    });
  }
  // The tag only earns its place on a co-headline bill.
  const coBilled = rows.filter((row) => row.role === 'headliner').length > 1;
  return coBilled ? rows : rows.map((row) => ({ ...row, role: null }));
};
