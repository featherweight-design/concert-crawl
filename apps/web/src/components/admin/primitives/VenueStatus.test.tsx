// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VenueStatus } from './VenueStatus';

const venue = {
  active: true,
  crawlPausedAt: null,
  blockedAt: null,
  consecutiveFailures: 0,
  robotsTxtAllowed: true,
};

afterEach(cleanup);

describe('VenueStatus', () => {
  it('renders on-site then crawling, each with a word', () => {
    render(<VenueStatus venue={venue} />);
    const chips = screen.getByTestId('venue-status').children;
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent('Live');
    expect(chips[1]).toHaveTextContent('Crawling');
  });

  it('keeps a paused venue live: pausing never hides', () => {
    render(
      <VenueStatus
        venue={{ ...venue, crawlPausedAt: '2026-11-10T00:00:00Z' }}
      />,
    );
    expect(screen.getByTestId('venue-status-on-site')).toHaveTextContent(
      'Live',
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Paused',
    );
  });

  it('says a hidden venue is not crawled', () => {
    render(<VenueStatus venue={{ ...venue, active: false }} />);
    expect(screen.getByTestId('venue-status-on-site')).toHaveTextContent(
      'Hidden',
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Not crawled',
    );
  });

  // `A6/22/hidden-venue-menu`: the pause holds once it's shown.
  it('gives a hidden, paused venue the pause chip with its reason', () => {
    render(
      <VenueStatus
        venue={{
          ...venue,
          active: false,
          crawlPausedAt: '2026-10-28T00:00:00Z',
          crawlPauseReason: 'other',
        }}
        crawlingLabel="Paused: off-season"
      />,
    );
    expect(screen.getByTestId('venue-status-on-site')).toHaveTextContent(
      'Hidden',
    );
    const chip = screen.getByTestId('venue-status-crawling');
    expect(chip).toHaveTextContent('Paused: off-season');
    expect(chip).toHaveAttribute('data-tone', 'var(--warning)');
  });

  // A hidden venue's crawl chip follows a live venue's precedence, so it
  // agrees with the ⋯ menu (`A6/22/hidden-venue-menu`).
  it.each([
    ['blocked', { blockedAt: '2026-11-01T00:00:00Z' }, 'Blocked'],
    ['robots-disallowed', { robotsTxtAllowed: false }, 'Paused: robots.txt'],
    [
      'paused and blocked',
      {
        blockedAt: '2026-11-01T00:00:00Z',
        crawlPausedAt: '2026-10-28T00:00:00Z',
        crawlPauseReason: 'other' as const,
      },
      'Blocked',
    ],
  ])('gives a hidden %s venue its crawl chip', (_name, over, label) => {
    render(<VenueStatus venue={{ ...venue, active: false, ...over }} />);
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      label,
    );
  });

  it('names an auto-pause on a hidden venue', () => {
    render(
      <VenueStatus
        venue={{
          ...venue,
          active: false,
          crawlPausedAt: '2026-11-10T00:00:00Z',
          consecutiveFailures: 3,
        }}
      />,
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Auto-paused: 3 failures',
    );
  });

  it('names an auto-pause on a live venue', () => {
    render(
      <VenueStatus
        venue={{
          ...venue,
          crawlPausedAt: '2026-11-10T00:00:00Z',
          consecutiveFailures: 3,
        }}
      />,
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Auto-paused: 3 failures',
    );
  });

  it('takes a caller-named crawl reason', () => {
    render(
      <VenueStatus
        venue={{ ...venue, crawlPausedAt: '2026-11-10T00:00:00Z' }}
        crawlingLabel="Paused: awaiting reply"
      />,
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Paused: awaiting reply',
    );
  });

  it('shortens an auto-pause in list cells only', () => {
    render(
      <VenueStatus
        inList
        venue={{
          ...venue,
          crawlPausedAt: '2026-11-10T00:00:00Z',
          consecutiveFailures: 3,
        }}
      />,
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      /^Auto-paused$/,
    );
  });

  it('reads a robots.txt disallow as a pause', () => {
    render(<VenueStatus venue={{ ...venue, robotsTxtAllowed: false }} />);
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Paused: robots.txt',
    );
  });
});
