// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrawlPausedBadge } from './CrawlPausedBadge';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { CRAWL_STATUS_DISPLAY } from '@/components/admin/definitions/crawl-status';

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

  it('never reads as a bare "Paused" or the paused crawl run', () => {
    // A bare "Paused" was the old unpublished venue status; a skipped paused
    // run reads as its own label. The badge names the crawl pause itself.
    const { container } = render(
      <CrawlPausedBadge crawlPausedAt="2026-11-10T18:00:00.000Z" />,
    );
    expect(container.textContent).not.toBe('Paused');
    expect(container.textContent).not.toBe(CRAWL_STATUS_DISPLAY.paused.label);
  });
});
