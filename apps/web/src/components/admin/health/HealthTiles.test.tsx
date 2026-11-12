// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import {
  HealthHeader,
  HealthTiles,
  type HealthTilesProps,
} from './HealthTiles';

afterEach(cleanup);

const props: HealthTilesProps = {
  crawl: {
    ok: 20,
    total: 21,
    failed: 0,
    finishedAt: '2026-11-12T10:41:00Z',
    shows: 1204,
    added: 38,
  },
  artists: { matched: 1842, soon: 9, toCheck: 23 },
  cost: {
    month: 11,
    mtdUsd: 4.12,
    budgetUsd: 15,
    paceUsd: 10.3,
    state: 'under',
  },
  delivery: {
    lastSentAt: '2026-11-12T15:02:00Z',
    sent: 12,
    failed: 1,
    suppressed: 0,
    other: 0,
    hours: 24,
  },
};

describe('HealthTiles', () => {
  it('draws the On time crawl and the board’s copy', () => {
    render(<HealthTiles {...props} />);
    const crawl = screen.getByTestId('health-tile-crawl-onTime');
    expect(crawl).toHaveTextContent('20 of 21');
    expect(crawl).toHaveTextContent('Finished 3:41 AM · 1,204 shows, 38 new');
    expect(within(crawl).getByText('On time')).toBeInTheDocument();
    expect(screen.getByTestId('health-tile-artists')).toHaveTextContent(
      'Matched to a photo and genre. 9 unsure have shows soon.',
    );
  });

  it('draws N failed', () => {
    render(
      <HealthTiles {...props} crawl={{ ...props.crawl, ok: 17, failed: 4 }} />,
    );
    const crawl = screen.getByTestId('health-tile-crawl-failed');
    expect(within(crawl).getByText('4 failed')).toBeInTheDocument();
  });

  it.each([
    ['under', 'Under budget', 'of $15 budget · on pace for $10.30'],
    ['willGoOver', 'Will go over', 'of $15 budget · on pace for $10.30'],
    ['over', 'Over budget', 'Over the $15 budget. Haiku still runs.'],
  ] satisfies Array<[HealthTilesProps['cost']['state'], string, string]>)(
    'draws the %s cost state',
    (state, pill, detail) => {
      render(<HealthTiles {...props} cost={{ ...props.cost, state }} />);
      const tile = screen.getByTestId(`health-tile-cost-${state}`);
      expect(within(tile).getAllByText(pill).length).toBeGreaterThan(0);
      expect(tile).toHaveTextContent(detail);
      expect(tile).toHaveTextContent('$4.12');
    },
  );

  it('has no pill or budget line when no budget is set (G5)', () => {
    render(
      <HealthTiles
        {...props}
        cost={{ ...props.cost, budgetUsd: null, state: 'noBudget' }}
      />,
    );
    const tile = screen.getByTestId('health-tile-cost-noBudget');
    expect(tile).toHaveTextContent('On pace for $10.30');
    expect(tile).not.toHaveTextContent('budget');
  });

  it('shows email delivery on the site tile, with no pill (G4)', () => {
    render(<HealthTiles {...props} />);
    const tile = screen.getByTestId('health-tile-site');
    expect(tile).toHaveTextContent('12 sent');
    expect(tile).toHaveTextContent(
      'Emails, last 24 h · 1 failed · last sent 8:02 AM',
    );
  });
});

describe('HealthHeader', () => {
  it('summary and button read the same count (G11)', () => {
    render(<HealthHeader needsYou={14} href="/admin/review" />);
    expect(
      screen.getByText(
        "Everything is running. 14 things need you, and they're already in Needs you.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open Needs you · 14/ }),
    ).toHaveAttribute('href', '/admin/review');
  });

  it('drops the count, not the button, when it fails to load', () => {
    render(<HealthHeader needsYou={null} href="/admin/review" />);
    expect(screen.queryByText(/Everything is running/)).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Open Needs you' }),
    ).toBeInTheDocument();
  });
});
