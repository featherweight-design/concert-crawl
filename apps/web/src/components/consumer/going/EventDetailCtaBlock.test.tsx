// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { stubMatchMedia } from '@/test-utils/match-media';
import type { EntitlementResult } from '@/lib/queries/use-entitlement';
import { TIP_CONTENT } from '@/components/ui/cc-tip/definitions/copy';
import { GOING_COPY } from './definitions/copy';
import type { GoingCtaEvent } from './EventDetailCtaBlock';

let entitlement: EntitlementResult = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
};
const mutate = vi.fn();
const refresh = vi.fn();
const push = vi.fn();
const showStampedToast = vi.fn();
const showRemovedToast = vi.fn();
const showAttendanceError = vi.fn();
let isPending = false;
const settled = { going: true, attendingAt: '2026-01-01T00:00:00.000Z' };

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}));
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: null }),
}));
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutateAsync: mutate, isPending }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock('./lib/attendance-toasts', () => ({
  showStampedToast: (arg: unknown) => showStampedToast(arg),
  showRemovedToast: (arg: unknown) => showRemovedToast(arg),
  showAttendanceError: (arg: unknown) => showAttendanceError(arg),
}));
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}));

const { EventDetailCtaBlock } = await import('./EventDetailCtaBlock');

const event = (over: Partial<GoingCtaEvent> = {}): GoingCtaEvent => ({
  id: 'ev1',
  artist: 'Khruangbin',
  // Far future so it never drifts into the past as the suite ages.
  date: '2099-10-14',
  status: 'upcoming',
  attendingAt: null,
  showTime: '20:00:00',
  genre: ['rock'],
  artistPhotoUrl: null,
  venue: {
    timezone: 'America/Denver',
    name: 'Gothic Theatre',
    slug: 'gothic-theatre',
    city: 'Englewood',
  },
  ...over,
});

const renderBlock = (over: Partial<GoingCtaEvent> = {}) =>
  render(<EventDetailCtaBlock event={event(over)} scaRegion={false} />);

const EXPLAINER_LABEL = TIP_CONTENT['going-vs-watch'].label;

// The block renders more than one button — the commitment CTA plus one or two
// tooltip triggers — so every query has to say which one it means.
const goingButton = (): HTMLElement => {
  const found = screen
    .getAllByRole('button')
    .find((btn) => !btn.hasAttribute('aria-expanded'));
  if (found === undefined) throw new Error('no commitment CTA rendered');
  return found;
};

describe('EventDetailCtaBlock', () => {
  beforeEach(() => {
    // The explainer trigger reads useIsMobileViewport; jsdom has no matchMedia.
    stubMatchMedia(false);
    mutate.mockReset();
    mutate.mockResolvedValue(settled);
    refresh.mockReset();
    push.mockReset();
    showStampedToast.mockReset();
    showRemovedToast.mockReset();
    showAttendanceError.mockReset();
    isPending = false;
    entitlement = { isLoading: false, active: true, surface: 'visible-active' };
  });
  afterEach(cleanup);

  it('offers the commitment on an upcoming show the user has not marked', () => {
    renderBlock();
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.default);
  });

  it('reflects the commitment on an upcoming show already marked', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' });
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.going);
  });

  it('shows the attended state on a past show that was marked', () => {
    renderBlock({
      date: '2020-10-14',
      attendingAt: '2020-10-14T00:00:00.000Z',
    });
    expect(goingButton()).toHaveTextContent('You went');
  });

  it('offers "I went" on a past show that was never marked, with the venue stamp line', () => {
    renderBlock({ date: '2020-10-14' });
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.pastNo);
    expect(
      screen.getByText(GOING_COPY.past.hint('Gothic Theatre')),
    ).toBeInTheDocument();
    // The boards draw the ⓘ on a past night too.
    expect(
      screen.getByRole('button', { name: EXPLAINER_LABEL }),
    ).toBeInTheDocument();
  });

  it('stamps the night on an "I went" tap and offers the Passport', async () => {
    renderBlock({ date: '2020-10-14' });
    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenCalledWith({ eventId: 'ev1', going: true });
    await waitFor(() => expect(showStampedToast).toHaveBeenCalled());
    const arg = showStampedToast.mock.calls[0]?.[0] as {
      artist: string;
      onOpenPassport: () => void;
    };
    expect(arg.artist).toBe('Khruangbin');
    arg.onOpenPassport();
    expect(push).toHaveBeenCalledWith('/passport');
  });

  it('stamps a past night even without the entitlement', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBlock({ date: '2020-10-14' });
    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenCalledWith({ eventId: 'ev1', going: true });
    expect(screen.queryByTestId('tier-picker')).toBeNull();
  });

  it('keeps the "I went" pill and raises the error toast when a stamp fails', async () => {
    mutate.mockRejectedValue(new Error('down'));
    renderBlock({ date: '2020-10-14' });
    fireEvent.click(goingButton());
    await waitFor(() =>
      expect(showAttendanceError).toHaveBeenCalledWith('save'),
    );
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.pastNo);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  describe('taking a stamped night back out', () => {
    const stamped = {
      date: '2020-10-14',
      attendingAt: '2020-10-14T00:00:00.000Z',
    };
    const openConfirm = () => {
      renderBlock(stamped);
      fireEvent.click(
        screen.getByRole('button', { name: GOING_COPY.past.removeLink }),
      );
    };

    it('asks first, with the show-page footnote', () => {
      openConfirm();
      expect(
        screen.getAllByText(GOING_COPY.remove.title).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(GOING_COPY.remove.footnoteShowPage),
      ).toBeInTheDocument();
      expect(mutate).not.toHaveBeenCalled();
    });

    it('removes on confirm and offers Undo with the restore token', async () => {
      const restore = { attendingAt: '2020-10-14T00:00:00.000Z', token: 't' };
      mutate.mockResolvedValue({ going: false, attendingAt: null, restore });
      openConfirm();
      fireEvent.click(
        screen.getByRole('button', { name: GOING_COPY.remove.confirm }),
      );
      expect(mutate).toHaveBeenCalledWith({ eventId: 'ev1', going: false });
      await waitFor(() => expect(showRemovedToast).toHaveBeenCalled());
      const arg = showRemovedToast.mock.calls[0]?.[0] as {
        onUndo: (() => void) | null;
      };
      // The pill is back to "I went" before the server agrees.
      expect(goingButton()).toHaveTextContent(GOING_COPY.button.pastNo);
      arg.onUndo?.();
      expect(mutate).toHaveBeenLastCalledWith({
        eventId: 'ev1',
        going: true,
        restore,
      });
    });

    it('offers no Undo when the server sent no restore token', async () => {
      mutate.mockResolvedValue({ going: false, attendingAt: null });
      openConfirm();
      fireEvent.click(
        screen.getByRole('button', { name: GOING_COPY.remove.confirm }),
      );
      await waitFor(() => expect(showRemovedToast).toHaveBeenCalled());
      expect(showRemovedToast.mock.calls[0]?.[0]).toMatchObject({
        onUndo: null,
      });
    });

    it('stays open with a retry when the remove fails', async () => {
      mutate.mockRejectedValue(new Error('down'));
      openConfirm();
      fireEvent.click(
        screen.getByRole('button', { name: GOING_COPY.remove.confirm }),
      );
      expect(
        await screen.findByRole('button', { name: GOING_COPY.remove.retry }),
      ).toBeInTheDocument();
      expect(showRemovedToast).not.toHaveBeenCalled();
    });
  });

  it('renders nothing for a cancelled show', () => {
    const { container } = renderBlock({ status: 'cancelled' });
    expect(container).toBeEmptyDOMElement();
  });

  // Returning nothing while the plan resolved let the watch strip render alone
  // and uncarded, then reparent into the card once it landed — a visible pop-in.
  it('reserves the card while the plan resolves rather than flashing a lock', () => {
    entitlement = { isLoading: true, active: false, surface: null };
    renderBlock();
    const placeholder = screen.getByTestId('going-button-placeholder');
    // Without the sweep the reserved slot reads as an empty box, not as loading.
    expect(placeholder.querySelector('.dl-sweep')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: EXPLAINER_LABEL }),
    ).toBeInTheDocument();
    expect(screen.queryByText(GOING_COPY.button.default)).toBeNull();
    expect(screen.queryByText(GOING_COPY.locked.line)).toBeNull();
  });

  it('commits and refreshes the server-rendered page on tap', () => {
    renderBlock();
    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenCalledWith({ eventId: 'ev1', going: true });
  });

  it('releases the commitment when tapped while going', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' });
    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenCalledWith({ eventId: 'ev1', going: false });
  });

  it('routes a locked tap to the upgrade path instead of mutating', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBlock();
    fireEvent.click(goingButton());
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'paywall',
    );
  });

  it('shows the locked treatment to a user without the entitlement', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBlock();
    // Same label as unlocked, so the control reads as the thing you'd get.
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.default);
    expect(goingButton()).toHaveAttribute('aria-label', GOING_COPY.locked.aria);
    // A disabled control can't sell anything.
    expect(goingButton()).toBeEnabled();
    expect(screen.getByText(GOING_COPY.locked.line)).toBeInTheDocument();
  });

  it('leaves a past show alone even when the entitlement is gone', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBlock({ date: '2020-10-14' });
    expect(goingButton()).toHaveTextContent(GOING_COPY.button.pastNo);
    expect(screen.queryByText(GOING_COPY.locked.line)).toBeNull();
  });

  it('puts the retry in the button and names what survived beneath it', async () => {
    mutate.mockRejectedValue(new Error('down'));
    renderBlock();
    fireEvent.click(goingButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      GOING_COPY.error.survived,
    );
    expect(goingButton()).toHaveTextContent(GOING_COPY.error.retry);
  });

  it('retries the same intent when the failed button is tapped again', async () => {
    mutate.mockRejectedValue(new Error('down'));
    renderBlock();
    fireEvent.click(goingButton());
    await screen.findByRole('alert');
    mutate.mockResolvedValue(settled);
    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenLastCalledWith({ eventId: 'ev1', going: true });
  });

  // The error treatment reports as not-going, so a naive retry would
  // replay `going: true` and quietly no-op instead of releasing.
  it('retries a failed release as a release, not as a fresh commitment', async () => {
    mutate.mockRejectedValue(new Error('down'));
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' });
    fireEvent.click(goingButton());
    await screen.findByRole('alert');
    mutate.mockResolvedValue(settled);
    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenLastCalledWith({ eventId: 'ev1', going: false });
  });

  it('keeps the locked treatment when a failure and a lost entitlement collide', async () => {
    mutate.mockRejectedValue(new Error('down'));
    const { rerender } = render(
      <EventDetailCtaBlock event={event()} scaRegion={false} />,
    );
    fireEvent.click(goingButton());
    await waitFor(() =>
      expect(goingButton()).toHaveTextContent(GOING_COPY.error.retry),
    );

    // The entitlement lapses while the failure is still on screen.
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    rerender(<EventDetailCtaBlock event={event()} scaRegion={false} />);
    expect(goingButton()).toHaveAttribute('aria-label', GOING_COPY.locked.aria);
  });

  it('sends a logged-out tap straight to the picker', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    };
    renderBlock();
    fireEvent.click(goingButton());
    // Not `logged-out-paywall`: this reach is for Concerts, and the
    // entry keys the gate's copy as well as the funnel dimension.
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'logged-out-going',
    );
  });

  // The explainer used to render only in the else-branch beneath the button, so
  // the gate and a failure both silenced it — the two moments someone is most
  // likely to ask what Going even is.
  it.each(['locked', 'error'] as const)(
    'keeps the explainer reachable in the %s treatment',
    async (treatment) => {
      if (treatment === 'locked') {
        entitlement = {
          isLoading: false,
          active: false,
          surface: 'paywall-on-tap',
        };
        renderBlock();
      } else {
        mutate.mockRejectedValue(new Error('down'));
        renderBlock();
        fireEvent.click(goingButton());
        await screen.findByRole('alert');
      }
      expect(
        screen.getByRole('button', { name: EXPLAINER_LABEL }),
      ).toBeInTheDocument();
    },
  );

  it('heads the block with an eyebrow so the tip has a line to sit on', () => {
    renderBlock();
    expect(screen.getByText(GOING_COPY.eyebrow.upcoming)).toBeInTheDocument();
    cleanup();
    renderBlock({ date: '2020-10-14' });
    expect(screen.getByText(GOING_COPY.eyebrow.past)).toBeInTheDocument();
  });

  // The going-vs-watch distinction sits behind a tooltip rather than a standing
  // line, so the CTAs aren't buried under explanatory copy. It reads from the
  // shared registry: the same pair is explained the same way everywhere.
  it('keeps the difference explainer behind a tooltip trigger', () => {
    const tip = TIP_CONTENT['going-vs-watch'];
    if (tip.variant !== 'defs') throw new Error('expected the defs panel');
    renderBlock();
    expect(screen.queryByText(tip.intro)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: EXPLAINER_LABEL }));
    expect(screen.getByText(tip.intro)).toBeInTheDocument();
    expect(screen.getByText(tip.rows[0].title)).toBeInTheDocument();
  });

  // A hand-rolled glyph passed as CCTip's children silently replaces the
  // designed info disc, taking its open state and touch target with it.
  it('uses CCTip’s own trigger rather than a bespoke glyph', () => {
    renderBlock();
    const trigger = screen.getByRole('button', { name: EXPLAINER_LABEL });
    expect(trigger).toHaveTextContent('');
    expect(trigger.querySelector('svg')).not.toBeNull();
  });

  // The gate line sells Concerts, so it carries its own tip; the header
  // tip explains the going/watching distinction, which is a different question.
  it('pairs the locked line with a Concerts tip', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderBlock();
    expect(
      screen.getByRole('button', {
        name: TIP_CONTENT['concert-history'].label,
      }),
    ).toBeInTheDocument();
  });

  // Watching is free and ungated, so a suppressed commitment must never take
  // the strip down with it.
  it('still renders the watch strip when the commitment is suppressed', () => {
    render(
      <EventDetailCtaBlock event={event({ status: 'cancelled' })} scaRegion>
        <div data-testid="watch-strip" />
      </EventDetailCtaBlock>,
    );
    expect(screen.getByTestId('watch-strip')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: EXPLAINER_LABEL })).toBeNull();
  });

  it('drops the watch strip on a past night, as the boards do', () => {
    render(
      <EventDetailCtaBlock event={event({ date: '2020-10-14' })} scaRegion>
        <div data-testid="watch-strip" />
      </EventDetailCtaBlock>,
    );
    expect(screen.queryByTestId('watch-strip')).toBeNull();
  });

  // The mutation only lands in the tree via router.refresh(), so without a
  // local override the button sat unchanged until the server HTML arrived.
  it('shows the committed state immediately, before the server agrees', () => {
    mutate.mockReturnValue(new Promise(() => {}));
    renderBlock();

    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.button.ariaNotGoing }),
    );
    expect(screen.getByText(GOING_COPY.button.going)).toBeInTheDocument();
  });

  // Go, then release before the first refresh lands. When that first refresh
  // finally arrives it carries the now-stale "going" state — the UI has to keep
  // showing the second tap rather than flashing back.
  it('holds the latest tap when a stale refresh arrives', () => {
    mutate.mockReturnValue(new Promise(() => {}));
    const { rerender } = render(
      <EventDetailCtaBlock event={event()} scaRegion={false} />,
    );

    fireEvent.click(goingButton());
    fireEvent.click(goingButton());
    expect(goingButton().getAttribute('aria-label')).toBe(
      GOING_COPY.button.ariaNotGoing,
    );

    rerender(
      <EventDetailCtaBlock
        event={event({ attendingAt: '2099-10-01T00:00:00.000Z' })}
        scaRegion={false}
      />,
    );
    expect(goingButton().getAttribute('aria-label')).toBe(
      GOING_COPY.button.ariaNotGoing,
    );
  });

  it('surfaces a failure without leaving the row silent', async () => {
    mutate.mockRejectedValue(new Error('down'));
    renderBlock();
    fireEvent.click(goingButton());
    expect(
      await screen.findByText(GOING_COPY.error.survived),
    ).toBeInTheDocument();
  });

  it('routes a server-side entitlement 403 to the upgrade path, not the error line', async () => {
    mutate.mockRejectedValue(
      new ApiError(403, 'Upgrade required', 'entitlement_required'),
    );
    renderBlock();
    fireEvent.click(goingButton());
    expect(await screen.findByTestId('tier-picker')).toBeInTheDocument();
    expect(screen.queryByText(GOING_COPY.error.survived)).toBeNull();
  });

  it('refreshes the page after a successful commitment', async () => {
    renderBlock();
    fireEvent.click(goingButton());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    // An upcoming commitment is not a stamp.
    expect(showStampedToast).not.toHaveBeenCalled();
  });

  it('disables the commitment while the toggle is in flight', () => {
    isPending = true;
    renderBlock();
    expect(goingButton()).toBeDisabled();
  });
});
