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
vi.mock('@/components/consumer/venue-glyph', () => ({
  VenueTile: () => null,
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
  ...overrides,
});

afterEach(cleanup);

describe('SubmissionItem closed rows', () => {
  it.each([
    ['stale', reasons.stale],
    ['archived', reasons.archived],
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
