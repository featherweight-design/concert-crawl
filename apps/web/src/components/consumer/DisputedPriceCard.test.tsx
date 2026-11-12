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
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';

// Stub CounterSubmitSheet — it pulls Clerk auth via a deep import chain
// that needs the full Next.js + Clerk runtime. The pill + anchor logic
// under test lives entirely outside the sheet.
vi.mock('./CounterSubmitSheet', () => ({
  CounterSubmitSheet: () => null,
}));

const getToken = vi.fn(async () => 'test-token');
const refresh = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

import {
  DisputedPriceCard,
  type DisputedPriceCardProps,
} from './DisputedPriceCard';

const NOW = new Date('2026-06-24T12:00:00.000Z');

beforeAll(() => {
  // Only the clock: the withdraw tests await real promises.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
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
  confirmsCount: 2,
  disputer: { handle: 'fan-2' },
  disputeFloor: 40,
  disputedAt: minutesAgo(5),
  viewerAction: 'submit_update',
  viewerCounterId: null,
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

  // The old price, an arrow, then the leading pending update (Hugh, 2026-11-11).
  describe('price display', () => {
    it('shows the current price then the pending one: "$44 → $52?"', () => {
      render(
        <DisputedPriceCard {...buildProps({ floor: 44, disputeFloor: 52 })} />,
      );
      expect(screen.getByTestId('price-check-current').textContent).toBe('$44');
      expect(screen.getByTestId('price-check-pending').textContent).toBe(
        'Pending update: $52?',
      );
    });

    it('draws a pending range when the update has a ceiling', () => {
      render(
        <DisputedPriceCard
          {...buildProps({ disputeFloor: 52, disputeCeiling: 60 })}
        />,
      );
      expect(screen.getByTestId('price-check-pending').textContent).toBe(
        'Pending update: $52–$60?',
      );
    });
  });

  // The footer follows viewerAction alone: no client-side guessing.
  describe('viewerAction', () => {
    it("'submit_update' offers Submit an update and nothing else", () => {
      render(<DisputedPriceCard {...buildProps()} />);
      expect(
        screen.getByRole('button', { name: 'Submit an update' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
    });

    it("'none' (the checked price's submitter) draws no button", () => {
      render(<DisputedPriceCard {...buildProps({ viewerAction: 'none' })} />);
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.getByText('Your price')).toBeTruthy();
      expect(
        screen.getByText(
          'Someone saw a different number. An admin will pick one.',
        ),
      ).toBeTruthy();
    });

    it("'withdraw' offers Withdraw and no Submit an update", () => {
      render(
        <DisputedPriceCard
          {...buildProps({
            viewerAction: 'withdraw',
            viewerCounterId: 'counter-mine',
          })}
        />,
      );
      expect(screen.getByRole('button', { name: 'Withdraw' })).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Submit an update' }),
      ).toBeNull();
      expect(screen.getByText('Waiting on review.')).toBeTruthy();
    });

    it("'withdraw' without a counter id draws no button", () => {
      render(
        <DisputedPriceCard
          {...buildProps({ viewerAction: 'withdraw', viewerCounterId: null })}
        />,
      );
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('withdraw', () => {
    it("DELETEs the viewer's own update by viewerCounterId, then refreshes", async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify({ success: true }))),
      );
      const fetchMock = vi.mocked(global.fetch);
      render(
        <DisputedPriceCard
          {...buildProps({
            viewerAction: 'withdraw',
            viewerCounterId: 'counter-mine',
            counterSubmissionId: 'counter-leading',
          })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

      await waitFor(() => expect(refresh).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(String(url)).toMatch(/\/v1\/submissions\/counter-mine$/);
      expect(init).toMatchObject({
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('shows an error and does not refresh when the DELETE fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(null, { status: 500 })),
      );
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(
        <DisputedPriceCard
          {...buildProps({
            viewerAction: 'withdraw',
            viewerCounterId: 'counter-mine',
          })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
