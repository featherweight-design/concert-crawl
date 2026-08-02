'use client'

import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'

import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'

import { ARTIST_COPY } from './definitions/copy'

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
  /** `full` is the rail/hero bar; `compact` is the sticky sub-header. */
  size?: 'full' | 'compact'
  /** Signed-in activation. Never called while signed out. */
  onToggle: () => void
}

const GLYPH_SIZE = 13

/**
 * ONE affordance for the artist relationship. A show is WATCHED (an eye); an
 * artist is FOLLOWED — this control, and nothing else. There is no third,
 * softer "like" gesture in this product, and no glyph for one.
 *
 * #794 §3.10: the signed-out control is pixel-identical to signed-in-and-not-
 * following. A different visible label would leak auth state back into the
 * layout, so the honesty lives in the accessible name and in the fact that
 * activation opens a dialog instead of writing a follow.
 */
export const FollowButton = ({
  name,
  following,
  signedOut,
  size = 'full',
  onToggle,
}: FollowButtonProps) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
  // relationship to render for a visitor who has no account.
  const active = !signedOut && following

  const onClick = () => {
    if (signedOut) {
      setPickerOpen(true)
      return
    }
    onToggle()
  }

  const style: React.CSSProperties = {
    all: 'unset',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    borderRadius: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    background: active
      ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
      : 'var(--signal)',
    color: active ? 'var(--signal)' : 'var(--fg-on-accent)',
    // `all: unset` wipes the border, and the Following skin's background is a
    // 14% mix — without this the control has no edge at all in that state.
    // `box-sizing: border-box` above keeps the 48/44 heights exact.
    border: '1px solid var(--signal)',
    ...(size === 'full'
      ? { height: 48, width: '100%', fontSize: 15 }
      : { height: 44, padding: '0 14px', fontSize: 13.5 }),
  }

  const ariaLabel = signedOut
    ? ARTIST_COPY.followSignedOutAria(name)
    : following
      ? ARTIST_COPY.followingAria(name)
      : ARTIST_COPY.followAria(name)

  return (
    <>
      <button
        type="button"
        // `all: unset` in `style` wipes the browser focus ring; `.ap-follow`
        // puts it back. A :focus-visible rule cannot be expressed inline.
        className="ap-follow"
        onClick={onClick}
        // Signed out this is a dialog trigger, not a toggle — `aria-pressed` is
        // omitted entirely rather than set to false, which would announce an
        // off switch the visitor cannot turn on.
        aria-pressed={signedOut ? undefined : active}
        aria-haspopup={signedOut ? 'dialog' : undefined}
        aria-expanded={signedOut ? pickerOpen : undefined}
        aria-label={ariaLabel}
        {...(signedOut ? { 'data-return-to': returnTo } : {})}
        style={style}
      >
        <svg
          data-glyph={active ? 'check' : 'plus'}
          width={GLYPH_SIZE}
          height={GLYPH_SIZE}
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
        {active ? ARTIST_COPY.following : ARTIST_COPY.follow}
      </button>
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
