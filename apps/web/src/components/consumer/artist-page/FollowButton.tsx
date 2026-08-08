'use client'

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'

import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'

import { ARTIST_COPY } from './definitions/copy'
import { NF_FOLLOW_SIZES } from './definitions/constants'

// Same reasoning as WatchShowButton: the sheet drags @stripe/stripe-js in via
// CheckoutPanel, and only a signed-out visitor can ever open it — a static
// import would put the Stripe chunk in every artist page's bundle.
// ssr:false because the picker is a modal that is always closed on first paint.
const TierPickerSheet = dynamic(
  () =>
    import('@/components/consumer/tier-picker/TierPickerSheet').then(
      (mod) => mod.TierPickerSheet,
    ),
  { ssr: false },
)

export interface FollowButtonProps {
  /** Artist name — used only to build the accessible name. */
  name: string
  following: boolean
  signedOut: boolean
  /**
   * Signed in, but the plan does not carry `following`. Never `disabled` — a
   * locked tap is how the upgrade gets offered, so the control keeps its place
   * in the tab order and calls `onLockedTap`. Computed by the parent with
   * `nfLocked(planState)` from @concert-crawl/entitlements, never by testing a
   * tier string here.
   */
  locked?: boolean
  /** `full` is the rail/hero bar; `compact` is the sticky sub-header. */
  size?: 'full' | 'compact'
  /**
   * Signed-in activation. Never called while signed out or locked. May return a
   * promise: a rejection rolls the optimistic flip back.
   */
  onToggle: () => void | Promise<void>
  /** Locked activation — opens the parent's TierPickerSheet. */
  onLockedTap?: () => void
}

/**
 * ONE affordance for the artist relationship. A show is WATCHED (an eye); an
 * artist is FOLLOWED — this control, and nothing else. There is no third,
 * softer "like" gesture in this product, and no glyph for one.
 *
 * THREE states, not four: `idle`, `following`, `locked`. There is no `pending`
 * skin — the button is optimistic, so the flip is instant and a spinner would
 * only ever flash. And no `unavailable`: an artist row exists only because a
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
  size = 'full',
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

  // Optimism, the #1467 way. The override is cleared when the SERVER value
  // changes, never on mutation success: clearing on success re-reads a prop the
  // parent has not refetched yet, which flashes the old state back for one
  // render. Rollback on rejection is the only other exit.
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const lastFollowing = useRef(following)
  useEffect(() => {
    const changed = lastFollowing.current !== following
    lastFollowing.current = following
    if (changed && following === optimistic) setOptimistic(null)
  }, [following, optimistic])

  // Signed out we draw the at-rest skin, never the following one — there is no
  // relationship to render for a visitor who has no account. Locked likewise:
  // a plan that cannot follow cannot be following.
  const active = !signedOut && !locked && (optimistic ?? following)

  const onClick = () => {
    if (signedOut) {
      setPickerOpen(true)
      return
    }
    if (locked) {
      onLockedTap?.()
      return
    }
    const next = !active
    setOptimistic(next)
    const result = onToggle()
    if (result instanceof Promise) {
      void result.catch(() => {
        // Back to whatever the server last said. Not `setOptimistic(!next)`,
        // which would invent a second wrong answer if the prop moved meanwhile.
        setOptimistic(null)
      })
    }
  }

  const geometry = size === 'full' ? NF_FOLLOW_SIZES.full : NF_FOLLOW_SIZES.md

  const skin: React.CSSProperties = locked
    ? {
        background: 'transparent',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
      }
    : {
        background: active
          ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
          : 'var(--signal)',
        color: active ? 'var(--signal)' : 'var(--fg-on-accent)',
        // `all: unset` wipes the border, and the Following skin's background is
        // a 14% mix — without this the control has no edge at all in that
        // state. `box-sizing: border-box` below keeps the 48/44 heights exact.
        border: '1px solid var(--signal)',
      }

  const style: React.CSSProperties = {
    all: 'unset',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: geometry.gap,
    minHeight: 44,
    borderRadius: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    ...skin,
    height: geometry.height,
    fontSize: geometry.fontSize,
    // `full` stretches; its padding insets the label rather than sizing the
    // control, which is why the table carries one anyway.
    padding: geometry.padding,
    ...(size === 'full' ? { width: '100%' } : {}),
  }

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
        {active ? ARTIST_COPY.following : ARTIST_COPY.follow}
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
