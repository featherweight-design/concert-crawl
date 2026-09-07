'use client'

import React, { useId, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'

import { ARTIST_COPY } from './definitions/copy'
import { NF_FOLLOW_SIZES, NF_TAP_MIN } from './definitions/constants'

export interface FollowButtonProps {
  /** Artist name — used only to build the accessible name. */
  name: string
  following: boolean
  signedOut: boolean
  /**
   * Signed in, the plan does not carry `following`, and there is no existing
   * follow to undo. Never `disabled` — a locked tap is how the upgrade gets
   * offered, so the control keeps its place in the tab order and calls
   * `onLockedTap`. Computed by the parent with `nfLocked(planState)` from
   * @concert-crawl/entitlements, never by testing a tier string here, and
   * never while `following` is true (a downgraded user must be able to
   * unfollow — eng spec §3.2).
   */
  locked?: boolean
  /**
   * A key of `NF_FOLLOW_SIZES`, so the size table stays the only place a
   * density is defined. The keys name placement: `primary` is the artist
   * page's hero bar, `rowWide` a desktop row, `row` every mobile row and the
   * sticky sub-header, `badge` the label-less circle on art.
   */
  size?: 'badge' | 'row' | 'rowWide' | 'primary'
  /**
   * Visual weight. `quiet` is an outline; `loud` is the filled `--signal`
   * pill, and there is at most ONE of those per screen (R3 rule 1). Quiet is
   * the default precisely so a new call site cannot add a second one by
   * omission.
   */
  tone?: 'quiet' | 'loud'
  /** Stretch to the container's width. Independent of `size`. */
  full?: boolean
  /**
   * Drop the label and render a square glyph button. Permitted only in the
   * narrow breakpoint the spec names (under 360px); the accessible name still
   * carries the artist, so nothing is lost to a screen reader.
   */
  iconOnly?: boolean
  /**
   * Signed-in activation. Never called while signed out or locked. The caller
   * owns optimism — `useArtistFollow` flips its own state before the request
   * and reconciles to the server's answer, which it has to, because unfollow
   * can legitimately come back still-following when a Spotify sync also holds
   * the row. A second override in here could not see that and would strand.
   */
  onToggle: () => void
  /**
   * Locked activation — opens the parent's TierPickerSheet. Required, not
   * optional: `locked` is a runtime boolean, so a missing handler would make a
   * focusable control that looks live and does nothing on the one surface
   * where the upgrade gets offered. The upcoming search, bill-block and shelf
   * call sites are why this is a type error rather than a convention.
   */
  onLockedTap: () => void
}

/**
 * ONE affordance for the artist relationship. A show is WATCHED (an eye); an
 * artist is FOLLOWED — this control, and nothing else. There is no third,
 * softer "like" gesture in this product, and no glyph for one.
 *
 * THREE states, not four: `idle`, `following`, `locked`. There is no `pending`
 * skin — the flip is instant, so a spinner would only ever flash. This control
 * is presentational: it renders `following` and reports taps. The optimism the
 * spec requires lives in `useArtistFollow`, in one place. And no `unavailable`: an artist row exists only because a
 * crawl found them on a bill, so a zero-show artist cannot be reached.
 *
 * #794 §3.10: the signed-out control is pixel-identical to signed-in-and-not-
 * following. A different visible label would leak auth state back into the
 * layout, so the honesty lives in the accessible name and in the fact that
 * activation opens a dialog instead of writing a follow. The locked control
 * takes the same deal one step further: same label, different skin, and the
 * gate is told in an sr-only sentence rather than in the pixels.
 */
export const FollowButton = ({
  name,
  following,
  signedOut,
  locked = false,
  size = 'row',
  tone = 'quiet',
  full = false,
  iconOnly = false,
  onToggle,
  onLockedTap,
}: FollowButtonProps) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // useId, not a module counter: a bill can put four of these on one screen,
  // and a colliding id would aim every gate sentence at one node. The colons
  // React emits are legal in an id but not in a CSS selector, so they go.
  const gateId = `nf-gate-${useId().replace(/:/g, '')}`

  // The query is part of where they were, so the hand-back returns them to the
  // state they left rather than to the bare route.
  const returnTo = useMemo(() => {
    const search = searchParams.toString()
    return search ? `${pathname}?${search}` : pathname
  }, [pathname, searchParams])

  const signUpHref = useMemo(() => {
    const tour = new URLSearchParams({ return: returnTo, label: name })
    return `/sign-up?redirect_url=${encodeURIComponent(`/onboarding?${tour.toString()}`)}`
  }, [returnTo, name])

  // Signed out we draw the at-rest skin, never the following one — there is no
  // relationship to render for a visitor who has no account. Locked likewise:
  // a plan that cannot follow cannot be following.
  const active = !signedOut && !locked && following

  const onClick = () => {
    if (signedOut) {
      setPickerOpen(true)
      return
    }
    if (locked) {
      onLockedTap()
      return
    }
    onToggle()
  }

  const geometry = NF_FOLLOW_SIZES[size]
  // `badge` has no label to drop, so it is square by definition.
  const square = iconOnly || size === 'badge'

  const loud = tone === 'loud'

  // Locked keeps `--fg`, not the muted colour the prototype drew: at quiet
  // weight the only thing left separating "you can do this" from "you cannot
  // do this without paying" is the glyph, and a muted gate would read quieter
  // than the action it gates.
  const skin: React.CSSProperties = locked
    ? {
        background: 'transparent',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
      }
    : loud
      ? {
          background: active
            ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
            : 'var(--signal)',
          color: active ? 'var(--signal)' : 'var(--fg-on-accent)',
          // `all: unset` wipes the border, and the Following skin's background
          // is a 14% mix — without this the control has no edge at all in that
          // state. `box-sizing: border-box` below keeps the heights exact.
          border: '1px solid var(--signal)',
        }
      : {
          background: 'transparent',
          // Following stays `--signal`-tinted at either weight: it is a state,
          // and losing the colour loses the read (R3 rule 3).
          color: active ? 'var(--signal)' : 'var(--fg)',
          border: active
            ? '1px solid color-mix(in oklab, var(--signal) 55%, transparent)'
            : '1px solid var(--border-strong)',
        }

  const style: React.CSSProperties = {
    all: 'unset',
    boxSizing: 'border-box',
    cursor: 'pointer',
    // The hit overlay below is absolute against this.
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: geometry.gap,
    // The size table is authoritative, so this tracks it rather than pinning
    // 44 — every row density is deliberately below it, and the overlay, not a
    // hardcoded floor, is what keeps the target honest.
    minHeight: geometry.height,
    borderRadius: geometry.radius,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: loud ? 800 : 700,
    letterSpacing: '-0.01em',
    // A row-embedded button must never be the thing that wraps or shrinks; the
    // label beside it owns the flexible width.
    whiteSpace: 'nowrap',
    flexShrink: 0,
    ...skin,
    height: geometry.height,
    fontSize: geometry.fontSize,
    // `full` stretches; the padding insets the label rather than sizing the
    // control, which is why the table carries one anyway. Icon-only drops the
    // padding and squares off against the height instead.
    padding: square ? 0 : geometry.padding,
    ...(full ? { width: '100%' } : {}),
    // A square: the glyph has nothing beside it, so the horizontal padding
    // would only make a lopsided pill.
    ...(square ? { minWidth: geometry.height, width: geometry.height } : {}),
  }

  // The pill shrank; the target did not. Grown symmetrically on both axes, so
  // a square control lands at 44 × 44. A labelled one is already wider than 44,
  // and it still grows horizontally — the overlay reaches `grow` px past each
  // edge whatever the width. Anything interactive placed beside one of these
  // needs at least that much clearance, which is why every row that carries a
  // Follow gives it a gap rather than butting a second control against it.
  const grow = Math.max(0, (NF_TAP_MIN - geometry.height) / 2)

  // Locked keeps idle's accessible name; the gate sentence carries the truth.
  const ariaLabel = signedOut
    ? ARTIST_COPY.followSignedOutAria(name)
    : active
      ? ARTIST_COPY.followingAria(name)
      : ARTIST_COPY.followAria(name)

  const glyph = geometry.glyph

  return (
    <>
      <button
        type="button"
        // `all: unset` in `style` wipes the browser focus ring; `.ap-follow`
        // puts it back. A :focus-visible rule cannot be expressed inline.
        className="ap-follow"
        onClick={onClick}
        // Signed out and locked this is a dialog trigger, not a toggle —
        // `aria-pressed` is omitted entirely rather than set to false, which
        // would announce an off switch the visitor cannot turn on.
        aria-pressed={signedOut || locked ? undefined : active}
        aria-haspopup={signedOut || locked ? 'dialog' : undefined}
        aria-expanded={signedOut ? pickerOpen : undefined}
        aria-describedby={locked ? gateId : undefined}
        aria-label={ariaLabel}
        {...(signedOut ? { 'data-return-to': returnTo } : {})}
        style={style}
      >
        {grow > 0 && (
          <span
            aria-hidden
            data-hit-overlay=""
            style={{ position: 'absolute', inset: -grow }}
          />
        )}
        {locked ? (
          <svg
            data-glyph="lock"
            width={glyph}
            height={glyph}
            viewBox="0 0 12 14"
            fill="none"
            stroke="currentColor"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <rect
              x="1.2"
              y="6"
              width="9.6"
              height="7"
              rx="2"
              strokeWidth={1.5}
            />
            <path
              d="M3.6 6V4.2a2.4 2.4 0 014.8 0V6"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            data-glyph={active ? 'check' : 'plus'}
            width={glyph}
            height={glyph}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <path d={active ? 'M2 7.5l3.4 3.4L12 3.6' : 'M7 2v10M2 7h10'} />
          </svg>
        )}
        {!square && (active ? ARTIST_COPY.following : ARTIST_COPY.follow)}
      </button>
      {/* Visually hidden, NOT `hidden`: the hidden attribute drops a node from
          the a11y tree, so an aria-describedby pointed at it announces nothing.
          Clip is the only technique that keeps the node in the tree. */}
      {locked && (
        <span
          id={gateId}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {ARTIST_COPY.followGate}
        </span>
      )}
      {signedOut && (
        <TierPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          planState={LOGGED_OUT_PLAN_STATE}
          // Unreachable from here: a logged-out tier selection routes to
          // /sign-up, never to a payment element, so no SCA challenge can occur
          // before an account exists. `true` is the fail-safe value.
          scaRegion
          entry="logged-out-follow"
          signUpHref={signUpHref}
        />
      )}
    </>
  )
}
