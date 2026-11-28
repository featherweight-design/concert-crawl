// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ArtistSearchAllResult } from '@concert-crawl/types';
import type { FollowError } from '@/components/consumer/artist-page/lib/use-artist-follow';
import type * as FollowButtonModule from '@/components/consumer/artist-page/FollowButton';

// The stub reports what the row hands the real button: whether it would send
// a tap to sign-in (and which artist the sign-in replays), and what a
// signed-in tap calls. The rest of the module stays real.
vi.mock(
  '@/components/consumer/artist-page/FollowButton',
  async (importOriginal) => {
    const actual = await importOriginal<typeof FollowButtonModule>();
    return {
      ...actual,
      FollowButton: ({
        signedOut,
        slug,
        disabled,
        onToggle,
      }: {
        signedOut: boolean;
        slug?: string;
        disabled?: boolean;
        onToggle: () => void;
      }) => (
        <button
          data-testid="follow-stub"
          disabled={disabled}
          data-signed-out={String(signedOut)}
          data-slug={slug}
          type="button"
          onClick={onToggle}
        />
      ),
    };
  },
);

const { toggle, follow } = vi.hoisted(
  (): { toggle: Mock; follow: { error: FollowError | null } } => ({
    toggle: vi.fn(),
    follow: { error: null },
  }),
);
vi.mock(
  '@/components/consumer/artist-page/lib/use-artist-follow',
  async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useArtistFollow: () => ({
      following: false,
      pending: false,
      error: follow.error,
      slug: null,
      toggle,
    }),
  }),
);

import { stubMatchMedia } from '@/test-utils/match-media';
import { ARTIST_PREVIEW_COPY } from '@/components/consumer/artist-preview/definitions/copy';
import { ArtistResultRow } from './ArtistResultRow';

// The row reads the desktop breakpoint to size its preview; jsdom has none.
beforeEach(() => {
  stubMatchMedia(false);
});

afterEach(() => {
  cleanup();
  toggle.mockClear();
  follow.error = null;
});

const ARTIST: ArtistSearchAllResult = {
  name: 'Turnstile',
  slug: 'turnstile',
  mbid: null,
  disambiguation: null,
  area: null,
  type: null,
  hasShows: true,
  photoUrl: null,
  upcomingShowCount: 2,
  // Paired with the count: ArtistSearchResult says null means zero upcoming,
  // so a fixture with both would be a payload the API cannot produce.
  nextShow: {
    eventId: '11111111-1111-4111-8111-111111111111',
    iso: '2027-09-15',
    venue: 'Hi-Dive',
    venueSlug: 'hi-dive',
    price: null,
    genres: [],
  },
  following: false,
};

// No default: a default parameter would swallow an explicit `undefined`, the
// unresolved-Clerk case the tests below need.
const renderRow = (
  artist: ArtistSearchAllResult,
  isSignedIn: boolean | undefined,
  options: { sharedName?: boolean; navigable?: boolean } = {},
) =>
  render(
    <ArtistResultRow
      artist={artist}
      sharedName={options.sharedName ?? false}
      selected={false}
      itemIdx={0}
      listbox={false}
      {...(options.navigable === false ? {} : { onNavigate: () => {} })}
      isSignedIn={isSignedIn}
      size="rowWide"
      iconOnly={false}
    />,
  );

// Clerk resolves after mount. A tap in that window must neither write a
// follow (no token yet) nor send a viewer who may be signed in to sign-in,
// matching the follow shelf.
describe('<ArtistResultRow /> follow while auth resolves', () => {
  it('does nothing on a tap before Clerk answers', () => {
    renderRow(ARTIST, undefined);
    const button = screen.getByTestId('follow-stub');
    expect(button.getAttribute('data-signed-out')).toBe('false');
    fireEvent.click(button);
    expect(toggle).not.toHaveBeenCalled();
  });

  it('toggles once Clerk says signed in', () => {
    renderRow(ARTIST, true);
    fireEvent.click(screen.getByTestId('follow-stub'));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('hands a signed-out tap to sign-in, carrying the artist to replay', () => {
    renderRow(ARTIST, false);
    const button = screen.getByTestId('follow-stub');
    expect(button.getAttribute('data-signed-out')).toBe('true');
    expect(button.getAttribute('data-slug')).toBe('turnstile');
  });
});

// #1525 — an artist surface resolves portrait, then the generated mark. It
// never reaches an event's artwork, so there is no second source to pass.
describe('<ArtistResultRow /> imagery', () => {
  it('renders the portrait when the artist has one', () => {
    const portrait = 'https://example.test/artist.jpg';
    const { container } = renderRow({ ...ARTIST, photoUrl: portrait }, false);

    expect(container.querySelector('img')?.getAttribute('src')).toBe(portrait);
  });

  it('renders identity art rather than any photo when there is no portrait', () => {
    const { container } = renderRow(ARTIST, false);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('<ArtistResultRow /> follow refusals', () => {
  it('replaces the second line with the refusal and greys a final one', () => {
    follow.error = { kind: 'name_held' };
    const { container } = renderRow(ARTIST, true);
    expect(
      screen.getByText("Can't follow: another act we list has this name."),
    ).toBeTruthy();
    expect(screen.queryByText(/Hi-Dive/)).toBeNull();
    expect(
      container.querySelector('[data-follow-error="name_held"]'),
    ).toBeTruthy();
    expect(screen.getByTestId('follow-stub').hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('keeps Follow live on a retryable refusal', () => {
    follow.error = { kind: 'unavailable' };
    renderRow(ARTIST, true);
    expect(screen.getByTestId('follow-stub').hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('names a rate-limited wait as a clock time', () => {
    follow.error = {
      kind: 'rate_limited',
      retryAt: new Date('2027-01-01T21:15:00Z'),
    };
    renderRow(ARTIST, true);
    expect(screen.getByRole('status').textContent).toMatch(
      /Lots of follows this hour\. Try again at \d{1,2}:\d{2}/,
    );
  });
});

describe('<ArtistResultRow /> kinds', () => {
  it('kind 1 shows the N SHOWS marker and the next show line', () => {
    renderRow(ARTIST, true);
    expect(screen.getByText('2 shows')).toBeTruthy();
    expect(screen.getByText(/Next .* · Hi-Dive/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Turnstile/ })).toBeTruthy();
  });

  it('kind 2 says there are no Denver dates yet', () => {
    renderRow(
      { ...ARTIST, upcomingShowCount: 0, nextShow: null, hasShows: false },
      true,
    );
    expect(screen.getByText('No Denver dates yet')).toBeTruthy();
    expect(screen.queryByText(/shows?$/)).toBeNull();
  });

  it('kind 3 reads its identity line and its name opens the preview', () => {
    renderRow(
      {
        ...ARTIST,
        slug: null,
        mbid: '22222222-2222-4222-8222-222222222222',
        upcomingShowCount: 0,
        nextShow: null,
        hasShows: false,
        type: 'group',
        area: 'Baltimore',
      },
      true,
      { navigable: false },
    );
    expect(screen.getByText('Band · Baltimore')).toBeTruthy();
    expect(screen.getByTestId('follow-stub')).toBeTruthy();
    stubMatchMedia(false);
    fireEvent.click(screen.getByRole('button', { name: /Turnstile/ }));
    expect(screen.getByText(ARTIST_PREVIEW_COPY.notOnABillLead)).toBeTruthy();
  });

  it('a shared name swaps the venue for the identity line', () => {
    renderRow({ ...ARTIST, disambiguation: 'hardcore band' }, true, {
      sharedName: true,
    });
    expect(screen.getByText(/Next .* · hardcore band/)).toBeTruthy();
    expect(screen.queryByText(/Hi-Dive/)).toBeNull();
  });
});
