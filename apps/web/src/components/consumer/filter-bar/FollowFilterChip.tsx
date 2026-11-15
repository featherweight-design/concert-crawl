'use client';

// "My artists" browse scope chip (native following, PR 4). Four states:
//
//   off     signed in, has follows, scope not applied
//   on      signed in, scope applied — the switch on; tap again to clear
//   locked  signed out — dashed border + locked switch, tap goes to sign-in
//   absent  signed in with zero follows — renders nothing at all
//
// Following is on every plan, so the only thing that locks the chip is having
// no account. A signed-out visitor sees it whatever the count: the chip is how
// they learn the feature exists. `absent` is only ever the signed-in-with-
// nothing-to-filter case.
//
// Like TasteFilterChip, this renders NOTHING until the session resolves, so a
// signed-in fan never sees the locked treatment flash. `locked` carries no
// aria-disabled: the control is fully operable, it just goes to sign-in
// instead of filtering (#794's identical-pixels rule means the gate is told in
// the aria-describedby sentence, not in the visible label).

import { useEffect, useId } from 'react';
import { useEntitlement } from '@/lib/queries/use-entitlement';
import { useSignInRedirect } from '@/lib/auth/use-sign-in-redirect';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { SegmentDivider } from './ChipDivider';
import {
  PHONE_PILL_CLASS,
  SwitchTrack,
  phonePillStyle,
  segmentEyebrowStyle as eyebrowStyle,
  segmentValueStyle as valueStyle,
} from './chrome';

const SEGMENT_COPY = CONSUMER_COPY.filterBar.segment;

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
  /** Unread since the tier picker left this chip; the scaRegion removal
   *  takes it off the filter bar's call sites. */
  scaRegion?: boolean;
  /**
   * `chip` is the phone row's switch pill (B+ B6b). `segment` is the desktop bar's first
   * segment (B+ B6a): a switch with a MY ARTISTS eyebrow over its state. Both
   * read the same entitlement and drive the same param.
   */
  variant?: 'chip' | 'segment';
  /**
   * Whether this instance runs the lapsed-entitlement release below. The bar
   * mounts two instances at once (the phone chip and the desktop segment, CSS
   * showing one per width), so exactly one of them owns it; two owners would
   * release the same stale param twice.
   */
  ownsEffects?: boolean;
}

export const FollowFilterChip = ({
  active,
  onToggle,
  followCount,
  variant = 'chip',
  ownsEffects = true,
}: FollowFilterChipProps) => {
  const isSegment = variant === 'segment';
  // The bar renders both variants (CSS shows one per width), so the gate
  // sentence each points at needs its own id.
  const gateId = useId();
  // Read only to tell signed out from signed in: the matrix answers
  // `tier-picker-on-tap` for a visitor with no account, and every signed-in
  // plan carries following.
  const { isLoading, surface } = useEntitlement('following');
  const goToSignIn = useSignInRedirect();

  // Every cell matched by name, so one nobody handled can never fall through
  // to a working switch: signed in (`visible-active`, or `paywall-on-tap`,
  // which following no longer has but which still names a signed-in plan)
  // works; `tier-picker-on-tap` is signed out; `hidden` renders nothing.
  const resolved = !isLoading && surface !== null;
  const usable = surface === 'visible-active' || surface === 'paywall-on-tap';
  const hidden = surface === 'hidden';

  // Signed out or hidden with filterFollowing=1 still in the URL: the locked
  // chip can't toggle it off, a hidden one isn't there to, and Clear all
  // excludes scopes, so release the param rather than strand the viewer on a
  // list the API will not scope for them. Only the owning instance releases it.
  useEffect(() => {
    if (ownsEffects && resolved && !usable && active) onToggle(false);
  }, [ownsEffects, resolved, usable, active, onToggle]);

  // Hold rendering while the session resolves — no locked flash.
  if (!resolved || hidden) return null;

  if (usable) {
    // `absent`: signed in, nothing followed, nothing to scope to. Guarded on
    // `!active` so a stale filterFollowing=1 URL can still be cleared — hiding
    // the chip mid-scope would strand the viewer on an unclearable empty list.
    if (followCount === 0 && !active) return null;

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

    // The phone pill (`bp-f-filt_m_rest`): the switch and "My artists", no
    // count. The board draws it off only; on, it takes the Filters pill's
    // active edge and tint.
    return (
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={FOLLOWING_COPY.chipAria}
        onClick={() => onToggle(!active)}
        data-testid="follow-scope-chip"
        className={`${PHONE_PILL_CLASS} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal`}
        style={phonePillStyle(active, 'follow')}
      >
        <SwitchTrack on={active} locked={false} />
        {FOLLOWING_COPY.chip}
      </button>
    );
  }

  // Locked is signed out, so the tap goes to sign-in and back here.
  const onLockedTap = () => {
    goToSignIn();
  };

  const gate = (
    <span id={gateId} className="sr-only">
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
          aria-describedby={gateId}
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
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onLockedTap}
        aria-label={FOLLOWING_COPY.chipAria}
        aria-describedby={gateId}
        data-testid="follow-scope-chip"
        className={`${PHONE_PILL_CLASS} cursor-pointer border-dashed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal`}
        style={{ ...phonePillStyle(false, 'follow'), color: 'var(--fg-muted)' }}
      >
        <SwitchTrack on={false} locked />
        {FOLLOWING_COPY.chip}
      </button>
      {gate}
    </>
  );
};
