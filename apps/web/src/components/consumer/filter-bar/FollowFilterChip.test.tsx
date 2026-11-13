// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { EntitlementResult } from '@/lib/queries/use-entitlement';

const entitlementState: { current: EntitlementResult } = {
  current: { isLoading: true, active: false, surface: null },
};

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlementState.current,
}));

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}));

import { FollowFilterChip } from './FollowFilterChip';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const SEGMENT_COPY = CONSUMER_COPY.filterBar.segment;

const ENTITLED: EntitlementResult = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
};

const renderChip = (
  overrides: Partial<React.ComponentProps<typeof FollowFilterChip>> = {},
) =>
  render(
    <FollowFilterChip
      active={false}
      onToggle={vi.fn()}
      followCount={3}
      scaRegion={false}
      {...overrides}
    />,
  );

describe('FollowFilterChip', () => {
  it('renders nothing while the entitlement is resolving', () => {
    entitlementState.current = {
      isLoading: true,
      active: false,
      surface: null,
    };
    const { container } = renderChip();
    expect(container.innerHTML).toBe('');
  });

  it('off: entitled with follows toggles the scope on', () => {
    entitlementState.current = ENTITLED;
    const onToggle = vi.fn();
    renderChip({ onToggle });
    // The phone pill (`bp-f-filt_m_rest`) is a switch beside "My artists".
    const chip = screen.getByRole('switch', { name: FOLLOWING_COPY.chipAria });
    expect(chip.getAttribute('aria-checked')).toBe('false');
    expect(chip.textContent).toBe(FOLLOWING_COPY.chip);
    expect(chip.querySelector('[data-testid="switch-track"]')).not.toBeNull();
    fireEvent.click(chip);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('on: the switch reads checked and a tap clears it', () => {
    entitlementState.current = ENTITLED;
    const onToggle = vi.fn();
    renderChip({ active: true, followCount: 12, onToggle });
    const chip = screen.getByRole('switch', { name: FOLLOWING_COPY.chipAria });
    expect(chip.getAttribute('aria-checked')).toBe('true');
    // The board's pill draws no count.
    expect(chip.textContent).toBe(FOLLOWING_COPY.chip);
    fireEvent.click(chip);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('absent: entitled with zero follows renders nothing', () => {
    entitlementState.current = ENTITLED;
    const { container } = renderChip({ followCount: 0 });
    expect(container.innerHTML).toBe('');
  });

  it('absent never swallows an applied scope — a stale URL stays clearable', () => {
    entitlementState.current = ENTITLED;
    renderChip({ followCount: 0, active: true });
    expect(screen.getByTestId('follow-scope-chip')).toBeTruthy();
  });

  it('unknown count keeps the chip rather than hiding it', () => {
    entitlementState.current = ENTITLED;
    renderChip({ followCount: null });
    expect(
      screen.getByRole('switch', { name: FOLLOWING_COPY.chipAria }),
    ).toBeTruthy();
  });

  it.each([null, 0, 12])(
    'the active phone pill prints no count, whatever the count (%s)',
    (followCount) => {
      // The board's pill draws "My artists" alone, so neither an unknown
      // count nor a known one, zero included, may reach its label.
      entitlementState.current = ENTITLED;
      renderChip({ followCount, active: true });
      expect(screen.getByTestId('follow-scope-chip').textContent).toBe(
        FOLLOWING_COPY.chip,
      );
    },
  );

  // D1: entitlement is read BEFORE the count, so the paywall is reachable from
  // browse for a free user who has never followed anyone.
  it('locked beats absent for a free viewer with zero follows', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    renderChip({ followCount: 0 });
    const chip = screen.getByRole('button', {
      name: FOLLOWING_COPY.chipAria,
    });
    expect(chip.getAttribute('aria-disabled')).toBeNull();
    expect(chip.getAttribute('aria-pressed')).toBeNull();
    // Locked draws the switch locked, on a dashed edge.
    expect(chip.className).toContain('border-dashed');
    expect(chip.querySelector('[data-testid="switch-track"]')).not.toBeNull();
  });

  it('locked taps open the picker at the paywall entry', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    const onToggle = vi.fn();
    renderChip({ onToggle });
    fireEvent.click(
      screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
    );
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'paywall',
    );
  });

  it('locked (logged out) opens the picker at the logged-out entry', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    };
    renderChip();
    fireEvent.click(
      screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
    );
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'logged-out-paywall',
    );
  });

  it('releases a stale active scope once the entitlement resolves locked', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    const onToggle = vi.fn();
    renderChip({ active: true, onToggle });
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('leaves the release to the owning instance when it does not own effects', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    const onToggle = vi.fn();
    renderChip({ active: true, onToggle, ownsEffects: false });
    expect(onToggle).not.toHaveBeenCalled();
  });

  describe('segment variant (desktop bar)', () => {
    it('is a switch reading Off at rest', () => {
      entitlementState.current = ENTITLED;
      const onToggle = vi.fn();
      renderChip({ variant: 'segment', onToggle });
      const toggle = screen.getByRole('switch', {
        name: FOLLOWING_COPY.chipAria,
      });
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      expect(toggle.textContent).toContain(SEGMENT_COPY.followOff);
      fireEvent.click(toggle);
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('on, it reads the followed count, or On when the count is unknown', () => {
      entitlementState.current = ENTITLED;
      const { unmount } = renderChip({
        variant: 'segment',
        active: true,
        followCount: 271,
      });
      expect(screen.getByRole('switch').textContent).toContain(
        SEGMENT_COPY.followedCount(271),
      );
      unmount();
      renderChip({ variant: 'segment', active: true, followCount: null });
      const text = screen.getByRole('switch').textContent ?? '';
      expect(text).toContain(SEGMENT_COPY.followOn);
      expect(text).not.toContain('0');
    });

    it('absent: entitled with zero follows renders nothing', () => {
      entitlementState.current = ENTITLED;
      const { container } = renderChip({ variant: 'segment', followCount: 0 });
      expect(container.innerHTML).toBe('');
    });

    it('locked opens the picker instead of toggling', () => {
      entitlementState.current = {
        isLoading: false,
        active: false,
        surface: 'paywall-on-tap',
      };
      const onToggle = vi.fn();
      renderChip({ variant: 'segment', onToggle });
      expect(screen.queryByRole('switch')).toBeNull();
      fireEvent.click(
        screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
      );
      expect(onToggle).not.toHaveBeenCalled();
      expect(screen.getByTestId('tier-picker')).toBeTruthy();
    });
  });
});
