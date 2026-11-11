// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrawlPausedBadge } from './CrawlPausedBadge';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CRAWL_STATUS_DISPLAY } from '@/components/admin/definitions/crawl-status';
import { deriveVenueStatus } from '@/lib/admin/venue-status';

const COPY = ADMIN_COPY.crawlPausedBadge;

describe('CrawlPausedBadge', () => {
  it('renders nothing for a venue that is crawling', () => {
    const { container } = render(<CrawlPausedBadge crawlPausedAt={null} />);
    expect(container.textContent).toBe('');
  });

  it('marks a paused venue', () => {
    render(<CrawlPausedBadge crawlPausedAt="2026-11-10T18:00:00.000Z" />);
    expect(screen.getByText(COPY.label)).toBeTruthy();
  });

  it('never reads as the unpublished venue status or the paused crawl run', () => {
    // The venue list and detail header render the status pill as the
    // capitalised `deriveVenueStatus` value; a venue taken off the site reads
    // "Paused" there, and a skipped paused run reads as its own label.
    const unpublished = deriveVenueStatus({
      active: false,
      blockedAt: null,
      consecutiveFailures: 0,
    });
    const statusLabel =
      unpublished.charAt(0).toUpperCase() + unpublished.slice(1);
    const { container } = render(
      <CrawlPausedBadge crawlPausedAt="2026-11-10T18:00:00.000Z" />,
    );
    expect(container.textContent).not.toBe(statusLabel);
    expect(container.textContent).not.toBe(CRAWL_STATUS_DISPLAY.paused.label);
  });
});
