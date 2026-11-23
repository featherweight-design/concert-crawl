// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { ArtistPreview } from './ArtistPreview';

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
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token', isSignedIn: true }),
}));

afterEach(cleanup);

const ACT: ArtistSearchAllResult = {
  name: 'Clip',
  slug: null,
  mbid: '22222222-2222-4222-8222-222222222222',
  disambiguation: 'Ohio hardcore band',
  area: 'Ohio',
  type: 'group',
  hasShows: false,
  photoUrl: null,
  upcomingShowCount: 0,
  nextShow: null,
  following: false,
  genre: null,
};

const base = {
  artist: ACT,
  following: false,
  signedOut: false,
  onToggle: vi.fn(),
  pageHref: null,
};

describe('ArtistPreview', () => {
  it('reads the identity line, the type and the origin from the row', () => {
    render(<ArtistPreview {...base} />);
    expect(screen.getByText('Clip')).toBeTruthy();
    expect(screen.getByText('Ohio hardcore band · Ohio')).toBeTruthy();
    expect(screen.getByText('Band')).toBeTruthy();
  });

  it('drops the About rows an act has no data for', () => {
    render(
      <ArtistPreview
        {...base}
        artist={{ ...ACT, type: null, area: null, disambiguation: null }}
      />,
    );
    expect(screen.queryByText('Type')).toBeNull();
    expect(screen.queryByText('From')).toBeNull();
  });

  it('draws Open their page only once followed and the slug is known', () => {
    const { rerender } = render(<ArtistPreview {...base} following />);
    expect(screen.queryByText('Open their page')).toBeNull();
    rerender(<ArtistPreview {...base} following pageHref="/artists/clip" />);
    const link = screen.getByText('Open their page').closest('a');
    expect(link?.getAttribute('href')).toBe('/artists/clip');
  });

  it('a refusal replaces the pitch line', () => {
    render(<ArtistPreview {...base} error={{ kind: 'unavailable' }} />);
    expect(document.querySelector('[data-follow-pitch]')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('fires onOpenPage when the link is taken', () => {
    const onOpenPage = vi.fn();
    render(
      <ArtistPreview
        {...base}
        following
        pageHref="/artists/clip"
        onOpenPage={onOpenPage}
      />,
    );
    fireEvent.click(screen.getByText('Open their page'));
    expect(onOpenPage).toHaveBeenCalledTimes(1);
  });
});
