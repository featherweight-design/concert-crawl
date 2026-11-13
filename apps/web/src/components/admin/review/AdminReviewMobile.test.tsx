// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub the All events surface: it needs a QueryClient and Clerk. The shell
// under test only has to mount it.
vi.mock('./_tabs/AllEventsTabContent', () => ({
  AllEventsTabContent: () => (
    <div data-testid="all-events-content">all events body</div>
  ),
}));

import { AdminReviewMobile } from './AdminReviewMobile';

describe('AdminReviewMobile', () => {
  it('mounts the All events surface directly, with no tab switcher', () => {
    render(<AdminReviewMobile />);
    expect(screen.getByTestId('all-events-content')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('carries no price coverage or submissions surface', () => {
    render(<AdminReviewMobile />);
    expect(screen.queryByText('Needs price')).toBeNull();
    expect(screen.queryByText(/Submissions/)).toBeNull();
  });
});
