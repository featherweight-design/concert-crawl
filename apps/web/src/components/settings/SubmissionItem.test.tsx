// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { UserSubmissionItem } from '@concert-crawl/types';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { SubmissionItem } from './SubmissionItem';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
// The slot itself is Panel's to test; here it reports the chain it was handed.
vi.mock('@/components/consumer/image-slot', () => ({
  Panel: (props: {
    artworkUrl: string | null;
    photoUrl: string | null;
    name: string;
  }) => (
    <span
      data-testid="submission-art"
      data-artwork={props.artworkUrl ?? ''}
      data-photo={props.photoUrl ?? ''}
      data-name={props.name}
    />
  ),
}));

const reasons = CONSUMER_COPY.settings.submissionClosedReason;

const row = (overrides: Partial<UserSubmissionItem>): UserSubmissionItem => ({
  id: 's1',
  eventId: 'e1',
  artist: 'Gimme Gimme Disco',
  venue: 'Ogden Theatre',
  venueSlug: 'ogden-theatre',
  date: '2026-10-24',
  priceMin: 2200,
  priceMax: null,
  tier: 'GA',
  corroborationCount: 1,
  submittedAt: '2026-10-20T12:00:00.000Z',
  status: 'confirmed',
  imageUrl: null,
  artistPhotoUrl: null,
  genre: null,
  ...overrides,
});

describe('SubmissionItem art', () => {
  // `more-s-d_submissions`: a 44px photo of the show, ringed in its genre.
  it('hands the event artwork, then the portrait, to the slot', () => {
    render(
      <SubmissionItem
        submission={row({
          imageUrl: 'https://img.example/poster.jpg',
          artistPhotoUrl: 'https://img.example/portrait.jpg',
        })}
      />,
    );

    const art = screen.getByTestId('submission-art');
    expect(art.dataset.artwork).toBe('https://img.example/poster.jpg');
    expect(art.dataset.photo).toBe('https://img.example/portrait.jpg');
    expect(art.dataset.name).toBe('Gimme Gimme Disco');
  });

  it('rings the art in the lead genre, and neutral with none', () => {
    render(<SubmissionItem submission={row({ genre: 'indie rock' })} />);
    expect(screen.getByTestId('submission-art-ring').style.boxShadow).toContain(
      'var(--genre-indie)',
    );
    cleanup();

    render(<SubmissionItem submission={row({ genre: 'rap' })} />);
    expect(screen.getByTestId('submission-art-ring').style.boxShadow).toContain(
      'var(--genre-hip-hop)',
    );
    cleanup();

    render(<SubmissionItem submission={row({ genre: null })} />);
    expect(screen.getByTestId('submission-art-ring').style.boxShadow).toBe(
      '0 0 0 1.25px var(--border-strong)',
    );
  });
});

afterEach(cleanup);

describe('SubmissionItem closed rows', () => {
  it.each([
    ['stale', reasons.stale],
    ['archived', reasons.archived],
    ['not_used', reasons.not_used],
  ] as const)(
    'a %s row says why, mutes the price and drops the fan count',
    (closedReason, text) => {
      render(
        <SubmissionItem submission={row({ status: 'closed', closedReason })} />,
      );

      expect(screen.getByText('closed')).toBeTruthy();
      expect(screen.getByText(text)).toBeTruthy();
      expect(screen.getByText('$22').className).toContain('text-fg-muted');
      // It was corroborated by one fan once; the row no longer claims it stands.
      expect(screen.queryByText(/fan confirmed|fans confirmed/)).toBeNull();
    },
  );

  it('a closed row with no reason still renders, with just the pill and the muted price', () => {
    render(<SubmissionItem submission={row({ status: 'closed' })} />);

    expect(screen.getByText('closed')).toBeTruthy();
    expect(screen.getByText('$22').className).toContain('text-fg-muted');
    expect(screen.queryByText(reasons.stale)).toBeNull();
    expect(screen.queryByText(reasons.archived)).toBeNull();
    expect(screen.queryByText(reasons.not_used)).toBeNull();
  });

  it('a price we did not use says so, never that a newer one replaced it', () => {
    render(
      <SubmissionItem
        submission={row({ status: 'closed', closedReason: 'not_used' })}
      />,
    );

    expect(screen.getByText("We didn't use this price")).toBeTruthy();
    expect(screen.queryByText(reasons.archived)).toBeNull();
  });

  it('a live row keeps its price at full strength and its fan count', () => {
    render(<SubmissionItem submission={row({})} />);

    expect(screen.getByText('$22').className).not.toContain('text-fg-muted');
    expect(screen.getByText(/fan confirmed/)).toBeTruthy();
    expect(screen.queryByText(reasons.stale)).toBeNull();
  });

  // `submitted-prices-m` draws no "+1 cred" tag on a confirmed row.
  it('a confirmed row carries no +1 cred tag', () => {
    render(<SubmissionItem submission={row({ status: 'confirmed' })} />);

    expect(screen.queryByText(/\+1 cred/i)).toBeNull();
  });
});
