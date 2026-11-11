// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LandingClientShell from './LandingClientShell';
import type { LandingShow } from '@/components/brand/landing-poster/LandingPoster';
import type { InviteShow, InviteVenue } from './invite-landing';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

const INVITE_SHOWS: InviteShow[] = [
  {
    id: 'invite-1',
    artist: 'Static Dress',
    venue: 'Marquis',
    tonight: true,
    dateShort: 'NOV 11',
    showTime: '6pm',
    genre: 'metal',
    imageUrl: null,
    artistPhotoUrl: null,
  },
  {
    id: 'invite-2',
    artist: 'TOKiMONSTA',
    venue: 'The Church',
    tonight: false,
    dateShort: 'NOV 13',
    showTime: '9pm',
    genre: 'electronic',
    imageUrl: null,
    artistPhotoUrl: null,
  },
];

const INVITE_VENUES: InviteVenue[] = [
  { slug: 'marquis-theater', name: 'Marquis Theater' },
  { slug: 'the-church', name: 'The Church' },
];

const SHOWS: LandingShow[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    artist: 'Amyl and The Sniffers',
    venue: 'Ogden Theatre',
    city: 'Denver, CO',
    date: '2026-09-01',
    dateShort: 'SEP 01',
    showTime: '8pm',
    opener: null,
    state: null,
    href: '/events/aaaaaaaa-0000-4000-8000-000000000001',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    artist: 'Wednesday',
    venue: 'Globe Hall',
    city: 'Denver, CO',
    date: '2026-09-03',
    dateShort: 'SEP 03',
    showTime: '9pm',
    opener: null,
    state: null,
    href: '/events/aaaaaaaa-0000-4000-8000-000000000002',
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('LandingClientShell — public CTAs (#794)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true');
  });

  it('renders Browse shows as the primary CTA pointing at /events', () => {
    render(<LandingClientShell shows={SHOWS} />);
    const browse = screen.getByRole('link', { name: /browse shows/i });
    expect(browse.getAttribute('href')).toBe('/events');
  });

  it('renders Sign up as the secondary CTA pointing at /sign-up', () => {
    render(<LandingClientShell shows={SHOWS} />);
    const signUp = screen.getByRole('link', { name: /^sign up$/i });
    expect(signUp.getAttribute('href')).toBe('/sign-up');
  });

  it('reassures that no account is needed to look around', () => {
    render(<LandingClientShell shows={SHOWS} />);
    expect(screen.getByText(/no account needed to look around/i)).toBeTruthy();
  });

  it('does not render the beta code or waitlist CTAs', () => {
    render(<LandingClientShell shows={SHOWS} />);
    expect(screen.queryByText(/i have a code/i)).toBeNull();
    expect(screen.queryByText(/waitlist/i)).toBeNull();
    expect(screen.queryByText(/private beta/i)).toBeNull();
    expect(document.querySelector('a[href="/auth/code"]')).toBeNull();
  });

  it('renders exactly one Sign in link, in the top bar', () => {
    render(<LandingClientShell shows={SHOWS} />);
    const signIn = screen.getByRole('link', { name: /sign in/i });
    expect(signIn.getAttribute('href')).toBe('/sign-in');
    expect(signIn.closest('header')).not.toBeNull();
  });

  it('links to the full week with the server-supplied count', () => {
    render(<LandingClientShell shows={SHOWS} showCount={214} />);
    const seeAll = screen.getByRole('link', {
      name: /see all 214 shows this week/i,
    });
    expect(seeAll.getAttribute('href')).toBe('/events');
  });

  it('falls back to a countless see-all line when no count is known', () => {
    render(<LandingClientShell shows={SHOWS} showCount={null} />);
    expect(
      screen.getByRole('link', { name: /^see all shows this week/i }),
    ).toBeTruthy();
    expect(screen.queryByText(/see all \d+ shows/i)).toBeNull();
  });
});

describe('LandingClientShell — private-beta invite landing (#794 launch gate)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false');
    mockPush.mockReset();
  });

  const renderBeta = (venues: InviteVenue[] | null = INVITE_VENUES) =>
    render(
      <LandingClientShell
        shows={SHOWS}
        showCount={214}
        inviteShows={INVITE_SHOWS}
        inviteVenues={venues}
      />,
    );

  it('hands a complete code to /auth/code, which still asks to redeem it', () => {
    renderBeta();
    fireEvent.change(screen.getByRole('textbox', { name: /invite code/i }), {
      target: { value: 'beta3f2a9c1e' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redeem/i }));
    expect(mockPush).toHaveBeenCalledWith('/auth/code?code=BETA-3F2A-9C1E');
  });

  it('sends a partial code to the empty code screen', () => {
    renderBeta();
    fireEvent.change(screen.getByRole('textbox', { name: /invite code/i }), {
      target: { value: 'BETA-3F' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redeem/i }));
    expect(mockPush).toHaveBeenCalledWith('/auth/code');
  });

  it('renders the waitlist CTA and the beta pill', () => {
    renderBeta();
    expect(
      screen.getAllByRole('button', { name: /join the waitlist/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/private beta/i)).toBeTruthy();
  });

  it('offers sign-in to existing beta users', () => {
    renderBeta();
    const signIn = screen.getAllByRole('link', { name: /^sign in$/i });
    expect(signIn.length).toBeGreaterThan(0);
    expect(
      signIn.every((link) => link.getAttribute('href') === '/sign-in'),
    ).toBe(true);
  });

  it('shows the fan of shows without linking into a gated browse surface', () => {
    renderBeta();
    expect(screen.getAllByText('Static Dress').length).toBeGreaterThan(0);
    expect(screen.queryByText(/browse shows/i)).toBeNull();
    expect(screen.queryByText(/see all/i)).toBeNull();
    expect(document.querySelector('a[href^="/events"]')).toBeNull();
  });

  it('counts the crawled venues, and drops the row when they could not be read', () => {
    const { unmount } = renderBeta();
    expect(screen.getByText(/2 venues · checked every night/i)).toBeTruthy();
    unmount();
    renderBeta(null);
    expect(screen.queryByText(/checked every night/i)).toBeNull();
  });

  it('treats an unset flag as beta mode', () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', '');
    renderBeta();
    expect(screen.queryByText(/browse shows/i)).toBeNull();
    expect(screen.getByText(/private beta/i)).toBeTruthy();
  });
});
