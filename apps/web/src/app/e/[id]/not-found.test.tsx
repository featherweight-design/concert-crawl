// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY.publicEvent;

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const loadNotFound = async () => (await import('./not-found')).default;

describe('/e/[id] not-found (#72)', () => {
  it('sends a pre-launch visitor to the landing page, not /events', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false');
    const NotFound = await loadNotFound();

    render(<NotFound />);

    // /events is gated before launch, so linking it here would bounce the
    // visitor to /sign-in — a second dead end on top of the missing show.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe(copy.notFoundHomeButton);
    expect(links[0]?.getAttribute('href')).toBe('/');
  });

  it('leads a post-launch visitor to the browse list, with home second', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true');
    const NotFound = await loadNotFound();

    render(<NotFound />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/events',
      '/',
    ]);
    expect(links[0]?.textContent).toBe(copy.notFoundBrowseButton);
    expect(links[1]?.textContent).toBe(copy.notFoundHomeButton);
  });

  it('renders the gone state: the 404 tile, eyebrow, heading and body', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true');
    const NotFound = await loadNotFound();

    render(<NotFound />);

    // The tile is decoration; the heading says it in words.
    const tile = screen.getByTestId('not-found-tile');
    expect(tile.getAttribute('aria-hidden')).toBe('true');
    expect(tile.textContent).toBe(copy.notFoundCode);
    expect(screen.getByText(copy.notFoundEyebrow)).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 1, name: copy.notFoundHeading }),
    ).toBeDefined();
    expect(screen.getByText(copy.notFoundBody)).toBeDefined();
  });
});
