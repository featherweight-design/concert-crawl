// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { CorroborationSheet } from './CorroborationSheet';

let isSignedIn = true;
let isLoaded = true;

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn(async () => null), isLoaded, isSignedIn }),
}));

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ entry }: { entry: string }) => (
    <div data-testid="tier-picker" data-entry={entry} />
  ),
}));

const submission = {
  floor: 42,
  tier: 'GA',
  vendor: 'AXS',
  kind: 'community' as const,
  submitter: { handle: 'someone', url: '' },
  submittedAt: new Date().toISOString(),
  confirms: 1,
  needed: 3,
  submissionId: 'sub-1',
};

const renderSheet = () =>
  render(
    <CorroborationSheet
      submission={submission}
      open
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      onSubmitUpdate={vi.fn()}
    />,
  );

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
});

afterEach(() => {
  isSignedIn = true;
  isLoaded = true;
  vi.clearAllMocks();
});

describe('CorroborationSheet signed-out gate (#1247)', () => {
  it('offers an account instead of a verify flow the API will reject', () => {
    isSignedIn = false;
    renderSheet();

    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'logged-out-price',
    );
  });

  it('still shows the verify flow while Clerk is resolving', () => {
    isLoaded = false;
    isSignedIn = false;
    renderSheet();

    expect(screen.queryByTestId('tier-picker')).toBeNull();
    expect(
      screen.getByRole('radiogroup', { name: /verification method/i }),
    ).toBeInTheDocument();
  });

  it('renders the verify flow when signed in', () => {
    renderSheet();

    expect(screen.queryByTestId('tier-picker')).toBeNull();
    expect(
      screen.getByRole('radiogroup', { name: /verification method/i }),
    ).toBeInTheDocument();
  });
});

// Regression: a resale submission reached the sheet as community and showed
// the Community pill (addendum 4 item 5, the shared TrustPill).
describe('CorroborationSheet trust pill', () => {
  beforeEach(cleanup);

  it('shows the Resale pill for a resale submission', () => {
    render(
      <CorroborationSheet
        submission={{ ...submission, vendor: 'StubHub', kind: 'resale' }}
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onSubmitUpdate={vi.fn()}
      />,
    );

    expect(screen.getByTestId('trust-pill-resale')).toBeInTheDocument();
    expect(screen.queryByTestId('trust-pill-community')).toBeNull();
  });
});
