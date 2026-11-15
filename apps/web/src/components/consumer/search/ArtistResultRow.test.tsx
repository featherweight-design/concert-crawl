// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ArtistSearchResult } from '@concert-crawl/types';
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
        onToggle,
      }: {
        signedOut: boolean;
        slug?: string;
        onToggle: () => void;
      }) => (
        <button
          data-testid="follow-stub"
          data-signed-out={String(signedOut)}
          data-slug={slug}
          type="button"
          onClick={onToggle}
        />
      ),
    };
  },
);

const { toggle } = vi.hoisted(() => ({ toggle: vi.fn() }));
vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: () => ({
    following: false,
    pending: false,
    toggle,
  }),
}));

import { ArtistResultRow } from './ArtistResultRow';

afterEach(() => {
  cleanup();
  toggle.mockClear();
});

const ARTIST: ArtistSearchResult = {
  name: 'Turnstile',
  slug: 'turnstile',
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

const renderRow = (
  artist: ArtistSearchResult,
  isSignedIn: boolean | undefined = false,
) =>
  render(
    <ArtistResultRow
      artist={artist}
      selected={false}
      itemIdx={0}
      listbox={false}
      onNavigate={() => {}}
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
    const { container } = renderRow({ ...ARTIST, photoUrl: portrait });

    expect(container.querySelector('img')?.getAttribute('src')).toBe(portrait);
  });

  it('renders identity art rather than any photo when there is no portrait', () => {
    const { container } = renderRow(ARTIST);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
