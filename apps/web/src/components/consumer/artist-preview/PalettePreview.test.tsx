// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { PalettePreview } from './PalettePreview';

const follow = vi.hoisted(
  (): {
    state: { following: boolean; slug: string | null; pending: boolean };
  } => ({ state: { following: false, slug: null, pending: false } }),
);

vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: () => ({ ...follow.state, error: null, toggle: vi.fn() }),
  followErrorIsFinal: () => false,
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/search',
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token', isSignedIn: true }),
}));

afterEach(() => {
  cleanup();
  follow.state = { following: false, slug: null, pending: false };
});

const ACT: ArtistSearchAllResult = {
  name: 'Clip',
  slug: null,
  mbid: '22222222-2222-4222-8222-222222222222',
  disambiguation: null,
  area: null,
  type: 'group',
  hasShows: false,
  photoUrl: null,
  upcomingShowCount: 0,
  nextShow: null,
  following: false,
  genre: null,
};

const props = (onFollowed: (mbid: string, slug: string | null) => void) => ({
  artist: ACT,
  query: 'clip',
  isSignedIn: true,
  onBack: vi.fn(),
  onFollowed,
  onOpenPage: vi.fn(),
});

describe('PalettePreview', () => {
  it('reports the slug once followed, then null once unfollowed', () => {
    const onFollowed = vi.fn();
    const view = render(<PalettePreview {...props(onFollowed)} />);
    expect(onFollowed).not.toHaveBeenCalled();

    follow.state = { following: true, slug: 'clip', pending: false };
    view.rerender(<PalettePreview {...props(onFollowed)} />);
    expect(onFollowed).toHaveBeenLastCalledWith(ACT.mbid, 'clip');

    follow.state = { following: false, slug: 'clip', pending: false };
    view.rerender(<PalettePreview {...props(onFollowed)} />);
    expect(onFollowed).toHaveBeenLastCalledWith(ACT.mbid, null);
  });

  it('holds the back row while a follow is in flight', () => {
    follow.state = { following: true, slug: null, pending: true };
    const view = render(<PalettePreview {...props(vi.fn())} />);
    const back = view.getByText(/Results for/).closest('button');
    expect(back?.disabled).toBe(true);
  });
});
