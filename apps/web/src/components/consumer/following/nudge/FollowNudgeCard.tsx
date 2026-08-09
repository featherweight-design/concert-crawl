'use client'

// The first-watch follow nudge card (native following, PR 10).
//
// ONE card, TWO shells. `inline` stands where the Watch strip stood on event
// detail; `floating` is the same body in a fixed shell for every other route.
// The body is not forked, because the two shells differ in where the card
// sits, not in what it says.
//
// ⚠️ Watching is the SHOW (the eye at the top of this card); following is the
// ARTIST (the button at the bottom). The whole card exists at the one moment a
// user could most easily conflate them, so the two are drawn as two facts with
// a rule between them rather than as one continuous claim.
//
// The eye is authored here rather than imported: no shared eye glyph component
// exists, and the sibling surfaces (ShelfCard, BillFollowBlock) already keep
// their glyphs as local consts for the same reason.
//
// ⚠️ Free tier SEES this card, with the lock on the CTA. It is the pitch, so
// withholding it from the tier being pitched to would be backwards. That is
// also why the locked branch is `locked` on FollowButton and never `hidden`.

import { useId, useState } from 'react'
import type { PickerEntry } from '@concert-crawl/types'

import { FollowButton } from '@/components/consumer/artist-page/FollowButton'
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow'
import { CardArt } from '@/components/consumer/following/ShelfCard'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'

import { FOLLOW_NUDGE_COPY } from './definitions/copy'
import type { FollowNudgeTarget } from './lib/use-first-watch-nudge'

const COPY = FOLLOW_NUDGE_COPY

const EyeGlyph = () => (
  <svg
    data-glyph="eye"
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path d="M1.6 10S4.9 4.4 10 4.4 18.4 10 18.4 10 15.1 15.6 10 15.6 1.6 10 1.6 10Z" />
    <circle cx="10" cy="10" r="2.6" />
  </svg>
)

export interface FollowNudgeCardProps {
  target: FollowNudgeTarget
  /** Where it stands. `inline` replaces the Watch strip; `floating` is fixed. */
  variant: 'inline' | 'floating'
  /** Server-resolved, forwarded to the picker's checkout legal block. */
  scaRegion: boolean
  /**
   * Close it, however it was answered. Dismissing and closing after a follow
   * are the same outcome to the caller: the introduction has been made.
   */
  onAnswer: () => void
}

export const FollowNudgeCard = ({
  target,
  variant,
  scaRegion,
  onAnswer,
}: FollowNudgeCardProps) => {
  const { surface } = useEntitlement('following')
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)

  const labelId = `nf-nudge-title-${useId().replace(/:/g, '')}`

  const onEntitlementRequired = () => setPickerOpen(true)
  // The nudge only fires for a signed-in viewer who just watched, so there is
  // no signed-out branch here; `false` is the settled answer, not a default.
  const follow = useArtistFollow(
    target.artistSlug,
    false,
    onEntitlementRequired,
  )

  // Fails OPEN while the plan is still resolving, matching BillFollowBlock:
  // showing a paying subscriber an upgrade-shaped CTA is the worse of the two
  // wrong answers, and the API enforces regardless.
  const locked = surface !== null && surface !== 'visible-active'

  const pickerEntry: PickerEntry =
    surface === 'tier-picker-on-tap' ? 'logged-out-follow' : 'paywall'

  const body = (
    <>
      {/* The watch this card was born from, confirmed in --accent. The rule
          below it is load-bearing: it separates the show fact from the artist
          question so neither reads as a consequence of the other. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          paddingBottom: 10,
          borderBottom: '1px solid var(--border)',
          color: 'var(--accent)',
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        <EyeGlyph />
        {COPY.watchConfirmed}
      </div>

      <div style={{ display: 'flex', gap: 11, marginTop: 11 }}>
        <div
          style={{
            position: 'relative',
            width: 46,
            height: 46,
            borderRadius: 9,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <CardArt name={target.artist} photoUrl={null} />
        </div>
        {/* No eyebrow above the title — see FOLLOW_NUDGE_COPY. The
            confirmation row already reacted to this tap once. */}
        <div style={{ minWidth: 0 }}>
          <h2
            id={labelId}
            style={{
              fontSize: 16.5,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {COPY.title(target.artist)}
          </h2>
        </div>
      </div>

      <p
        style={{
          marginTop: 8,
          fontSize: 12.5,
          lineHeight: 1.45,
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.body}
      </p>

      <div style={{ marginTop: 12 }}>
        <FollowButton
          name={target.artist}
          following={follow.following}
          signedOut={false}
          locked={locked && !follow.following}
          size="full"
          onToggle={follow.toggle}
          onLockedTap={onEntitlementRequired}
        />
      </div>

      {/* The secondary label swaps rather than the control disappearing: the
          card stays up after a follow so the confirmation is not yanked out
          from under the finger, and "Not right now" would then be answering a
          question that has already been answered. */}
      <button
        type="button"
        onClick={onAnswer}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: 40,
          marginTop: 4,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12.5,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
        }}
      >
        {follow.following ? COPY.close : COPY.dismiss}
      </button>
    </>
  )

  const card = (
    <section
      aria-labelledby={labelId}
      data-testid="follow-nudge"
      data-variant={variant}
      style={{
        position: 'relative',
        borderRadius: 12,
        border: '1px solid var(--signal)',
        background: 'var(--surface-1)',
        padding: 17,
      }}
    >
      {/* Floating only: the fixed shell can be crossed while browsing, so it
          owes an escape at the corner. The inline card cannot be in the way of
          anything — it IS the thing in that slot.

          The glyph is 16px but the button is a full 44x44 (handoff §6 a11y:
          "a real 44px button"). It is pulled to the card edge with a negative
          inset so the target covers the corner rather than floating a padded
          box a third of the way into the copy. */}
      {variant === 'floating' && (
        <button
          type="button"
          aria-label={COPY.dismissAria}
          onClick={onAnswer}
          className="absolute right-1 top-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded text-[16px] leading-none text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          ✕
        </button>
      )}
      {body}
      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry={pickerEntry}
      />
    </section>
  )

  if (variant === 'inline') return card

  // `status`, not `complementary` (handoff §6 a11y). The wrapper only mounts
  // when a target exists, so the live region announces the card exactly once
  // on appear rather than on every browse render. The inline variant does not
  // need it: there it is an in-place state change the user just caused.
  return (
    <div
      role="status"
      aria-label={COPY.ariaLabel}
      className="fixed inset-x-4 bottom-[72px] z-[70] mx-auto max-w-[420px] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]"
    >
      {card}
    </div>
  )
}
