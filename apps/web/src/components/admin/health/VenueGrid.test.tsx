// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { VenueGrid } from './VenueGrid';

afterEach(cleanup);

const cell = (name: string, failures = 0, autoPaused = false) => ({
  id: name.toLowerCase(),
  name,
  failures,
  autoPaused,
});

describe('VenueGrid', () => {
  it('draws the Crawl runs chevron and label on one line, desktop only', () => {
    render(
      <VenueGrid
        crawlRunsHref="/admin/crawl"
        groups={{ failed: [], paused: [], quiet: [], ok: [cell('Ogden')] }}
      />,
    );
    const link = screen.getByRole('link', { name: /Crawl runs/ });
    expect(link.style.display).toBe('inline-flex');
    expect(link.style.alignItems).toBe('center');
    expect(link.parentElement).toHaveClass('health-desk');
  });

  it('draws each group with its count, line and link', () => {
    render(
      <VenueGrid
        crawlRunsHref="/admin/crawl"
        groups={{
          failed: [cell('Junkyard', 3, true)],
          paused: [cell('Levitt')],
          quiet: [cell('Ball Arena')],
          ok: [cell('Bluebird'), cell('Ogden')],
        }}
      />,
    );
    const failed = screen.getByTestId('venue-grid-failed');
    expect(failed).toHaveTextContent('Failed1');
    expect(failed).toHaveTextContent('3rd failure · auto-paused');
    expect(within(failed).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/venues/junkyard',
    );
    expect(screen.getByTestId('venue-grid-paused')).toHaveTextContent(
      'LevittPaused',
    );
    expect(screen.getByTestId('venue-grid-quiet')).toHaveTextContent(
      'Page unchanged',
    );
    expect(
      within(screen.getByTestId('venue-grid-ok')).getAllByRole('link'),
    ).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Crawl runs' })).toHaveAttribute(
      'href',
      '/admin/crawl',
    );
  });

  it('skips empty groups', () => {
    render(
      <VenueGrid
        crawlRunsHref="/admin/crawl"
        groups={{ failed: [], paused: [], quiet: [], ok: [cell('Ogden')] }}
      />,
    );
    expect(screen.queryByTestId('venue-grid-failed')).toBeNull();
    expect(screen.getByTestId('venue-grid-ok')).toBeInTheDocument();
  });
});
