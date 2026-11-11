// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrawlPausedBadge } from './CrawlPausedBadge';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

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

  it('never reads as the unpublished venue status', () => {
    // "Paused" already means a venue taken off the site.
    expect(COPY.label).not.toBe('Paused');
  });
});
