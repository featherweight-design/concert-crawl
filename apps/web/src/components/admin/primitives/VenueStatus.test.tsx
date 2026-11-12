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

  it('names an auto-pause and a hidden venue', () => {
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
    expect(screen.getByTestId('venue-status-on-site')).toHaveTextContent(
      'Hidden',
    );
    expect(screen.getByTestId('venue-status-crawling')).toHaveTextContent(
      'Not crawled',
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
