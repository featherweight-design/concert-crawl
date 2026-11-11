'use client';

// "My artists" browse scope chip (native following, PR 4). Four states:
//
//   off     entitled, has follows, scope not applied
//   on      entitled, scope applied — --signal fill, count suffix, ✕ to clear
//   locked  not entitled — dashed border + lock glyph, tap opens the picker
//   absent  entitled with zero follows — renders nothing at all
//
// ⚠️ Precedence is ENTITLEMENT FIRST, THEN COUNT (Gate 1, decision D1). A free
// user with zero follows is `locked`, not `absent`: the chip is how they learn
// the feature exists, and hiding it would make the paywall unreachable from
// browse. `absent` is only ever the entitled-with-nothing-to-filter case.
//
// Like TasteFilterChip, this renders NOTHING until the entitlement resolves —
// a paying user must never see a locked treatment flash. `locked` carries no
// aria-disabled: the control is fully operable, it just opens plans instead of
// filtering (#794's identical-pixels rule means the gate is told in the
// aria-describedby sentence, not in the visible label).

import { useEffect, useState, type CSSProperties } from 'react';
import type { PickerEntry } from '@concert-crawl/types';
import { useEntitlement } from '@/lib/queries/use-entitlement';
import { usePlanState } from '@/lib/queries/use-plan-state';
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy';
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { ChipDivider, SegmentDivider } from './ChipDivider';
import { FOLLOW_CHIP_CLASS, followChipStyle } from './chrome';

const SEGMENT_COPY = CONSUMER_COPY.filterBar.segment;

const GATE_DESCRIPTION_ID = 'follow-scope-chip-gate';

const LockGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect
      x="2.2"
      y="5.4"
      width="7.6"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M4 5.4V4a2 2 0 014 0v1.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

interface FollowFilterChipProps {
  active: boolean;
  onToggle: (next: boolean) => void;
  /**
   * Follows the SERVER counted while rendering the page (Gate 1 D1 requires
   * `absent` be a server decision, so the chip never appears and then vanishes
   * once a client fetch lands).
   *
   * `null` means UNKNOWN — the seed failed or the request was anonymous. It is
   * deliberately NOT zero: treating "we couldn't ask" as "you follow nobody"
   * would delete the chip out from under someone who follows fifty artists.
   */
  followCount: number | null;
  // Server-resolved SCA-region boolean, forwarded to the tier picker's
  // checkout legal block (monetization spec §1.7).
  scaRegion: boolean;
  /**
   * `chip` is the mobile chip row's pill. `segment` is the desktop bar's first
   * segment (B+ B6a): a switch with a MY ARTISTS eyebrow over its state. Both
   * read the same entitlement and drive the same param.
   */
  variant?: 'chip' | 'segment';
}

const eyebrowStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: active ? 'var(--signal)' : 'var(--fg-subtle)',
});

const valueStyle = (muted: boolean): CSSProperties => ({
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: muted ? 'var(--fg-subtle)' : 'var(--fg)',
});

/** The switch's track, drawn rather than a native checkbox so it can lock. */
const SwitchTrack = ({ on, locked }: { on: boolean; locked: boolean }) => (
  <span
    aria-hidden
    className="relative inline-flex shrink-0 items-center"
    style={{
      width: 30,
      height: 18,
      borderRadius: 9,
      background: on ? 'var(--signal)' : 'var(--surface-2)',
      border: locked
        ? '1px dashed var(--border-strong)'
        : `1px solid ${on ? 'var(--signal)' : 'var(--border-strong)'}`,
      color: 'var(--fg-subtle)',
    }}
  >
    {locked ? (
      <span className="mx-auto inline-flex">
        <LockGlyph />
      </span>
    ) : (
      <span
        className="absolute rounded-full transition-[left] duration-[var(--motion-fast)] ease-[var(--motion-ease)]"
        style={{
          top: 2,
          left: on ? 14 : 2,
          width: 12,
          height: 12,
          background: on ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
        }}
      />
    )}
  </span>
);

export const FollowFilterChip = ({
  active,
  onToggle,
  followCount,
  scaRegion,
  variant = 'chip',
}: FollowFilterChipProps) => {
  const isSegment = variant === 'segment';
  const { isLoading, surface } = useEntitlement('following');
  const { data: planState } = usePlanState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerEntry, setPickerEntry] = useState<PickerEntry>('paywall');

  const resolved = !isLoading && surface !== null;
  const usable = resolved && surface === 'visible-active';

  // Entitlement lapsed (downgrade, session change) with filterFollowing=1 still
  // in the URL: the locked chip can't toggle it off and Clear all excludes
  // scopes, so release the param rather than strand the user on a list the API
  // will answer with a 403.
  useEffect(() => {
    if (resolved && !usable && active) onToggle(false);
  }, [resolved, usable, active, onToggle]);

  // Hold rendering while the plan resolves — no locked flash.
  if (!resolved) return null;

  if (usable) {
    // `absent`: entitled, nothing followed, nothing to scope to. Guarded on
    // `!active` so a stale filterFollowing=1 URL can still be cleared — hiding
    // the chip mid-scope would strand the viewer on an unclearable empty list.
    if (followCount === 0 && !active) return null;

    // An unknown count drops the number rather than printing zero. `null` means
    // the SSR seed failed, and "My artists · 0" would tell a viewer who follows
    // fifty artists that they follow none — the exact claim the null-vs-zero
    // split upstream exists to prevent.
    const label =
      active && followCount !== null
        ? FOLLOWING_COPY.chipActive(followCount)
        : FOLLOWING_COPY.chip;

    if (isSegment) {
      const value = !active
        ? SEGMENT_COPY.followOff
        : followCount === null
          ? SEGMENT_COPY.followOn
          : SEGMENT_COPY.followedCount(followCount);
      return (
        <>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={FOLLOWING_COPY.chipAria}
            onClick={() => onToggle(!active)}
            data-testid="follow-scope-chip"
            className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          >
            <SwitchTrack on={active} locked={false} />
            <span className="flex flex-col items-start gap-1">
              <span style={eyebrowStyle(active)}>{FOLLOWING_COPY.chip}</span>
              <span className="whitespace-nowrap" style={valueStyle(false)}>
                {value}
              </span>
            </span>
          </button>
          <SegmentDivider />
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => onToggle(!active)}
          aria-pressed={active}
          aria-label={
            active ? FOLLOWING_COPY.chipActiveAria : FOLLOWING_COPY.chipAria
          }
          data-testid="follow-scope-chip"
          className={`${FOLLOW_CHIP_CLASS} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal`}
          style={followChipStyle(active)}
        >
          <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
          {active && (
            <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
              ✕
            </span>
          )}
        </button>
        <ChipDivider />
      </>
    );
  }

  const onLockedTap = () => {
    // Logged out and free/supporter both land on the picker — following has no
    // intermediate upsell sheet of its own, and inventing one here would put a
    // second explanation of the same gate on the same screen as the artist
    // page's.
    setPickerEntry(
      surface === 'tier-picker-on-tap' ? 'logged-out-paywall' : 'paywall',
    );
    setPickerOpen(true);
  };

  const picker = (
    <TierPickerSheet
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      planState={planState ?? LOGGED_OUT_PLAN_STATE}
      scaRegion={scaRegion}
      entry={pickerEntry}
    />
  );
  const gate = (
    <span id={GATE_DESCRIPTION_ID} className="sr-only">
      {FOLLOWING_COPY.chipGate}
    </span>
  );

  if (isSegment) {
    return (
      <>
        <button
          type="button"
          onClick={onLockedTap}
          aria-label={FOLLOWING_COPY.chipAria}
          aria-describedby={GATE_DESCRIPTION_ID}
          data-testid="follow-scope-chip"
          className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        >
          <SwitchTrack on={false} locked />
          <span className="flex flex-col items-start gap-1">
            <span style={eyebrowStyle(false)}>{FOLLOWING_COPY.chip}</span>
            <span className="whitespace-nowrap" style={valueStyle(true)}>
              {SEGMENT_COPY.followOff}
            </span>
          </span>
        </button>
        {gate}
        <SegmentDivider />
        {picker}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onLockedTap}
        aria-label={FOLLOWING_COPY.chipAria}
        aria-describedby={GATE_DESCRIPTION_ID}
        data-testid="follow-scope-chip"
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 700,
          fontSize: 12,
          background: 'transparent',
          border: '1px dashed var(--border-strong)',
          color: 'var(--fg-subtle)',
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{FOLLOWING_COPY.chip}</span>
        <LockGlyph />
      </button>
      {gate}
      <ChipDivider />
      {picker}
    </>
  );
};
