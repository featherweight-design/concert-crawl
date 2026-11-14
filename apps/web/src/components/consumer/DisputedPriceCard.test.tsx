// @vitest-environment jsdom

import React from 'react';
import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Stub CounterSubmitSheet — it pulls Clerk auth via a deep import chain
// that needs the full Next.js + Clerk runtime. The pill + anchor logic
// under test lives entirely outside the sheet.
vi.mock('./CounterSubmitSheet', () => ({
  CounterSubmitSheet: () => null,
}));

import {
  DisputedPriceCard,
  type DisputedPriceCardProps,
} from './DisputedPriceCard';

const NOW = new Date('2026-06-24T12:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
});

const minutesAgo = (mins: number): string =>
  new Date(NOW.getTime() - mins * 60_000).toISOString();

const buildProps = (
  overrides: Partial<DisputedPriceCardProps> = {},
): DisputedPriceCardProps => ({
  floor: 32,
  tier: 'GA',
  vendor: 'AXS',
  kind: 'community',
  submitter: { handle: 'fan-1' },
  liveSubmittedAt: minutesAgo(60),
  confirmsCount: 2,
  disputer: { handle: 'fan-2' },
  disputeFloor: 40,
  disputedAt: minutesAgo(5),
  eventId: 'evt-1',
  disputedSubmissionId: 'sub-parent',
  ...overrides,
});

describe('DisputedPriceCard', () => {
  describe('admin defer pill', () => {
    it("renders the 'Admin requested more info' pill when lastAdminActionKind === 'defer'", () => {
      render(
        <DisputedPriceCard {...buildProps({ lastAdminActionKind: 'defer' })} />,
      );
      expect(screen.getByText(/admin requested more info/i)).toBeTruthy();
    });

    it('does NOT render the pill when lastAdminActionKind is null', () => {
      render(
        <DisputedPriceCard {...buildProps({ lastAdminActionKind: null })} />,
      );
      expect(screen.queryByText(/admin requested more info/i)).toBeNull();
    });

    it('does NOT render the pill when lastAdminActionKind is omitted', () => {
      render(<DisputedPriceCard {...buildProps()} />);
      expect(screen.queryByText(/admin requested more info/i)).toBeNull();
    });
  });

  // B+ more-st-disputes_board: the headline reads "$32 → $40?", the strip
  // draws the age bare, and the footer follows the server's viewerAction.
  describe('headline and strip (more-st-disputes_board)', () => {
    it('shows the live price, an arrow and the proposed price with a "?"', () => {
      render(<DisputedPriceCard {...buildProps()} />);
      expect(screen.getByText('$32')).toBeTruthy();
      expect(screen.getByTestId('proposed-price').textContent).toBe('$40?');
    });

    it('draws a range on both sides of the arrow', () => {
      render(
        <DisputedPriceCard
          {...buildProps({ ceiling: 50, disputeCeiling: 60 })}
        />,
      );
      expect(screen.getByText('$32–$50')).toBeTruthy();
      expect(screen.getByTestId('proposed-price').textContent).toBe('$40–$60?');
    });

    it('says "saw $40 · 5m" in the strip, with no "ago"', () => {
      render(<DisputedPriceCard {...buildProps()} />);
      const strip = screen.getByText(/@fan-2 saw/);
      expect(strip.textContent).toBe('@fan-2 saw $40 · 5m');
    });
  });

  describe('footer by viewer action', () => {
    it('offers "Submit an update" to anyone else, as the default', () => {
      render(<DisputedPriceCard {...buildProps()} />);
      expect(screen.getByText('Got a different number?')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Submit an update' }),
      ).toBeTruthy();
      expect(screen.queryByText('Withdraw')).toBeNull();
    });

    it('tells the original submitter an admin will pick one, with no action', () => {
      render(<DisputedPriceCard {...buildProps({ viewerAction: 'none' })} />);
      expect(screen.getByText('Your price')).toBeTruthy();
      expect(
        screen.getByText(
          'Someone saw a different number. An admin will pick one.',
        ),
      ).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('lets the fan with an update pending withdraw it', () => {
      const onWithdraw = vi.fn();
      render(
        <DisputedPriceCard
          {...buildProps({ viewerAction: 'withdraw', onWithdraw })}
        />,
      );
      expect(screen.getByText('Your update')).toBeTruthy();
      expect(screen.getByText('Waiting on review.')).toBeTruthy();
      expect(screen.queryByText('Submit an update')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
      expect(onWithdraw).toHaveBeenCalledTimes(1);
    });
  });

  describe('signed-out gate and analytics masking', () => {
    it('announces the sign-up gate on "Submit an update" when signed out', () => {
      render(<DisputedPriceCard {...buildProps({ signedOut: true })} />);
      expect(
        screen.getByRole('button', {
          name: 'Submit an update: sign up to submit a price',
        }),
      ).toBeTruthy();
    });

    it('keeps the updater and submitter names out of analytics', () => {
      const { container } = render(<DisputedPriceCard {...buildProps()} />);
      const masked = Array.from(container.querySelectorAll('.ph-no-capture'));
      const text = masked.map((node) => node.textContent ?? '').join(' ');
      expect(text).toContain('@fan-2');
      expect(text).toContain('@fan-1');
    });
  });

  describe('anchor target for counter pointer', () => {
    it('sets id="counter-<counterSubmissionId>" on the card root', () => {
      const { container } = render(
        <DisputedPriceCard
          {...buildProps({ counterSubmissionId: 'sub-counter-xyz' })}
        />,
      );
      const anchored = container.querySelector('#counter-sub-counter-xyz');
      expect(anchored).not.toBeNull();
    });

    it('falls back to disputedSubmissionId when counterSubmissionId is null', () => {
      const { container } = render(
        <DisputedPriceCard
          {...buildProps({
            counterSubmissionId: null,
            disputedSubmissionId: 'sub-parent-abc',
          })}
        />,
      );
      const anchored = container.querySelector('#counter-sub-parent-abc');
      expect(anchored).not.toBeNull();
    });
  });
});
