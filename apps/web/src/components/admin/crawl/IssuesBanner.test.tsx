// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { IssuesBanner } from './IssuesBanner';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const venue = (venueId: string) => ({
  venueId,
  venueName: `Venue ${venueId}`,
  status: 'blocked',
  consecutiveFailures: 3,
  blockedAt: '2026-11-10T10:00:00.000Z',
});

describe('IssuesBanner', () => {
  afterEach(() => {
    cleanup();
    mockPush.mockReset();
  });

  it('jumps to the first venue’s Runs tab, not the redirecting crawl URL', () => {
    render(<IssuesBanner blockedVenues={[venue('v-1'), venue('v-2')]} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.crawl.issuesBanner.jumpToIssues,
      }),
    );
    expect(mockPush).toHaveBeenCalledWith('/admin/venues/v-1?tab=runs');
  });

  it('draws nothing with no issues', () => {
    const { container } = render(<IssuesBanner blockedVenues={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
