import { describe, expect, it } from 'vitest';
import type { ArtistSearchAllResult } from '@concert-crawl/types';
import { artistLine, isSharedName, sharedNames } from './artist-line';

const make = (
  over: Partial<ArtistSearchAllResult> = {},
): ArtistSearchAllResult => ({
  name: 'Clip',
  slug: 'clip',
  photoUrl: null,
  upcomingShowCount: 0,
  nextShow: null,
  following: false,
  mbid: null,
  disambiguation: null,
  area: null,
  type: null,
  hasShows: false,
  ...over,
});

const NEXT = {
  eventId: '11111111-1111-4111-8111-111111111111',
  iso: '2027-09-15',
  venue: 'Hi-Dive',
  venueSlug: 'hi-dive',
  price: null,
  genres: [],
};

describe('sharedNames', () => {
  it('flags names listed more than once, ignoring case and spacing', () => {
    const rows = [
      make(),
      make({ name: ' clip ', slug: 'clip-2' }),
      make({ name: 'Other', slug: 'o' }),
    ];
    const shared = sharedNames(rows);
    expect(isSharedName(shared, rows[0]!)).toBe(true);
    expect(isSharedName(shared, rows[2]!)).toBe(false);
  });
});

describe('artistLine', () => {
  it('kind 1 carries the count and the venue', () => {
    const line = artistLine(
      make({ upcomingShowCount: 3, nextShow: NEXT, hasShows: true }),
      false,
    );
    expect(line.kind).toBe('shows');
    expect(line.text).toMatch(/^Next .* · Hi-Dive$/);
  });

  it('kind 1 swaps the venue for identity when the name is shared', () => {
    const line = artistLine(
      make({
        upcomingShowCount: 1,
        nextShow: NEXT,
        hasShows: true,
        disambiguation: 'UK rapper',
      }),
      true,
    );
    expect(line.text).toMatch(/ · UK rapper$/);
  });

  it('kind 2 distinguishes never played from played before', () => {
    expect(artistLine(make(), false).text).toBe('No Denver dates yet');
    expect(artistLine(make({ hasShows: true }), false).text).toBe(
      'No upcoming Denver dates',
    );
  });

  it('kind 2 shows identity instead when shared', () => {
    expect(artistLine(make({ area: 'Ohio', type: 'person' }), true)).toEqual({
      kind: 'plain',
      text: 'Solo artist · Ohio',
    });
  });

  it('kind 3 uses identity, else the fallback', () => {
    expect(
      artistLine(
        make({ slug: null, mbid: 'm', disambiguation: 'punk', area: 'UK' }),
        false,
      ).text,
    ).toBe('punk · UK');
    expect(artistLine(make({ slug: null, mbid: 'm' }), false).text).toBe(
      'Artist',
    );
  });
});
