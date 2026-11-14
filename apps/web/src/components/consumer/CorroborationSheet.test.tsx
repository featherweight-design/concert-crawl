// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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

// B+ restyle of the confirm sheet (bp-s-confirm_price_m, bp-s-confirm_self_m,
// more-p-check_m). The selected option's and the CTA's accent is HELD FOR
// DESIGN (08 pink vs 06 green), so nothing here pins it.
describe('CorroborationSheet rail and body', () => {
  beforeEach(cleanup);

  it('draws the rail: mark, name, pending count and a close tile', () => {
    const onClose = vi.fn();
    render(
      <CorroborationSheet
        submission={submission}
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        onSubmitUpdate={vi.fn()}
      />,
    );
    const rail = screen.getByTestId('confirm-rail');
    expect(rail).toHaveTextContent('Confirm price');
    expect(screen.getByTestId('price-rail-mark')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-rail-status')).toHaveTextContent(
      'PENDING · 1/3',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('draws the radio as a ring with an inner dot, not a check disc', () => {
    renderSheet();
    expect(screen.queryByTestId('verify-radio-dot')).toBeNull();
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    expect(screen.getByTestId('verify-radio-dot')).toBeInTheDocument();
  });

  it('lists vendor, by and when as hairline rows', () => {
    renderSheet();
    const text = document.body.textContent ?? '';
    expect(text.indexOf('VENDOR')).toBeLessThan(text.indexOf('BY'));
    expect(text.indexOf('BY')).toBeLessThan(text.indexOf('WHEN'));
    expect(screen.getByText('AXS')).toBeInTheDocument();
    expect(screen.getByText('@someone')).toBeInTheDocument();
  });

  it('splits the escape line: a muted question and a signal action', () => {
    const onSubmitUpdate = vi.fn();
    render(
      <CorroborationSheet
        submission={submission}
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onSubmitUpdate={onSubmitUpdate}
      />,
    );
    const action = screen.getByText('Submit an update instead.');
    expect(action).toHaveStyle({ fontWeight: '800' });
    fireEvent.click(action);
    expect(onSubmitUpdate).toHaveBeenCalled();
  });

  it('keeps the honesty line as plain centred text, not a box', () => {
    renderSheet();
    const line = screen.getByText(/Only confirm if you actually checked/);
    expect(line.tagName).toBe('P');
    expect(line).toHaveStyle({ textAlign: 'center' });
    // No border or ground of its own, unlike the old bordered box.
    expect(line.style.background).toBe('');
    expect(line.getAttribute('style')).not.toMatch(/border|padding/);
  });

  // One Tab stop for the group, arrows move within it (radiogroup pattern).
  it('is one Tab stop, and the arrow keys move the choice', () => {
    renderSheet();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
    ]);
    (radios[0] as HTMLElement).focus();
    fireEvent.keyDown(radios[0] as HTMLElement, { key: 'ArrowDown' });
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('tabindex', '0');
    expect(radios[0]).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(radios[1] as HTMLElement, { key: 'ArrowUp' });
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
  });
});

describe('CorroborationSheet self-locked state (confirm_self_m)', () => {
  beforeEach(cleanup);

  const renderSelf = (over: Partial<typeof submission> = {}) => {
    const handlers = {
      onWithdraw: vi.fn(),
      onEdit: vi.fn(),
      onSubmitUpdate: vi.fn(),
    };
    render(
      <CorroborationSheet
        submission={{ ...submission, floor: 45, ...over }}
        open
        isSelfLocked
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        {...handlers}
      />,
    );
    return handlers;
  };

  it('says Your $45 is pending, tags the rail YOURS, and offers no confirm', () => {
    renderSelf();
    expect(
      screen.getByRole('heading', { name: 'Your $45 is pending.' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('confirm-rail-status')).toHaveTextContent(
      'YOURS',
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByText(/Confirm: same number/)).toBeNull();
  });

  it('counts the other fans needed from the data, not a fixed two', () => {
    renderSelf({ confirms: 1, needed: 2 });
    expect(screen.getByTestId('self-locked-notice')).toHaveTextContent(
      "You can't confirm your own price, but 1 other fan can.",
    );
    cleanup();
    renderSelf({ confirms: 1, needed: 3 });
    expect(screen.getByTestId('self-locked-notice')).toHaveTextContent(
      '2 other fans can.',
    );
  });

  it('says so when the confirms it needs are already in', () => {
    renderSelf({ confirms: 2, needed: 2 });
    expect(screen.getByTestId('self-locked-notice')).toHaveTextContent(
      'the confirms it needs are in.',
    );
  });

  // A button with no handler is not drawn: a Withdraw that only closed the
  // sheet would look like it worked.
  it('draws no Edit or Withdraw it has no handler for', () => {
    render(
      <CorroborationSheet
        submission={submission}
        open
        isSelfLocked
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onSubmitUpdate={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Edit submission' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
  });

  it('wires Edit and Withdraw to their own handlers', () => {
    const handlers = renderSelf();
    fireEvent.click(screen.getByRole('button', { name: 'Edit submission' }));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onSubmitUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(handlers.onWithdraw).toHaveBeenCalledTimes(1);
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
