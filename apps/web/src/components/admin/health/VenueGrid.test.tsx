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
      '/admin/venues/junkyard?tab=runs',
    );
    // OK cells open the Runs tab too.
    expect(
      within(screen.getByTestId('venue-grid-ok')).getAllByRole('link')[0],
    ).toHaveAttribute('href', '/admin/venues/bluebird?tab=runs');
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

  it.each([
    [[], 'Worst first. Every venue opens its own page on the Runs tab.'],
    [
      ['Junkyard'],
      'Worst first. Every venue opens its own page on the Runs tab. Only Junkyard is in Needs you.',
    ],
    [
      ['Junkyard', 'Levitt'],
      'Worst first. Every venue opens its own page on the Runs tab. Junkyard and Levitt are in Needs you.',
    ],
    [
      ['Junkyard', 'Levitt', 'Ogden'],
      'Worst first. Every venue opens its own page on the Runs tab. 3 venues are in Needs you.',
    ],
  ])('footer with %j in Needs you', (inNeedsYou, footer) => {
    render(
      <VenueGrid
        crawlRunsHref="/admin/crawl"
        groups={{ failed: [], paused: [], quiet: [], ok: [cell('Ogden')] }}
        inNeedsYou={inNeedsYou}
      />,
    );
    expect(screen.getByTestId('venue-grid-footer').textContent).toBe(footer);
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
