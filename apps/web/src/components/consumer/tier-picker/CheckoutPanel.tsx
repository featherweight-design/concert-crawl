'use client'

// Embedded checkout — mounts Stripe's Payment Element against the
// clientSecret from POST /v1/billing/checkout-session and confirms
// in-surface (eng infra spec Part 2 §1.3: confirmPayment with
// redirect: 'if_required'). Declines route to the five failure surfaces
// (PR 4.4); 3DS/SCA next-actions get the ChallengeMount chrome while
// Stripe presents its bank window.
//
// The Elements provider and the PaymentElement's tree position are STABLE
// across checkout ↔ failure ↔ challenge layouts — remounting the provider
// or moving the element re-creates the Stripe iframe and loses the entered
// card. Layout pieces render as conditional siblings around the element.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { mapDeclineCategory, type DeclineCategory } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from './definitions/copy'
import {
  FAILURE_SURFACE_BEHAVIOR,
  REQUIRES_ACTION_POLL_MS,
  TIER_DEFINITIONS,
} from './definitions/constants'
import type { CheckoutSurface, TierKey } from './definitions/types'
import { watchForRequiresAction } from './lib/requires-action-detector'
import { useEscapeCapture } from './lib/use-escape-capture'
import {
  FailureActions,
  FailureCardKeptNote,
  FailureSurfaceIntro,
  TierSummaryLine,
  failureDialogProps,
} from './FailureSurface'
import { ChallengeMount } from './ChallengeMount'

const CHECKOUT_COPY = TIER_PICKER_COPY.checkout
const PUBLISHABLE_KEY = process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']

const CHECKOUT_SURFACE: CheckoutSurface = { kind: 'checkout' }

interface CheckoutPanelProps {
  tierKey: Exclude<TierKey, 'free'>
  clientSecret: string
  // Server-resolved from x-vercel-ip-country (spec §1.7) — gates the
  // conditional SCA notice row in the legal block and frames the
  // challenge mount as SCA rather than 3DS.
  scaRegion: boolean
  onBack: () => void
  onSuccess: () => void
  // Lets the sheet swap its rail header + modal width per surface.
  onSurfaceChange?: (surface: CheckoutSurface) => void
}

const LegalRow = ({
  children,
  tone = 'subtle',
}: {
  children: React.ReactNode
  tone?: 'subtle' | 'muted'
}) => (
  <div
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.02em',
      color: tone === 'muted' ? 'var(--fg-muted)' : 'var(--fg-subtle)',
      display: 'flex',
      alignItems: 'baseline',
      gap: 7,
    }}
  >
    <span
      aria-hidden
      style={{
        width: 4,
        height: 4,
        borderRadius: 4,
        marginTop: 6,
        flexShrink: 0,
        background: 'var(--border-strong)',
      }}
    />
    <span style={{ flex: 1 }}>{children}</span>
  </div>
)

// Legal pages open in a new tab — in-surface navigation would dismiss
// the sheet and abandon the in-flight subscription mid-checkout.
const LegalLink = ({ href, children }: { href: string; children: string }) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'var(--signal)',
      textDecoration: 'underline',
      textUnderlineOffset: 2,
      textDecorationColor:
        'color-mix(in oklch, var(--signal) 45%, transparent)',
    }}
  >
    {children}
  </Link>
)

// Above-CTA legal block (#782 §6.1) — stacked mono micro-rows keep every
// legal line visible, no collapse.
const LegalBlock = ({ scaRegion }: { scaRegion: boolean }) => (
  <div
    role="group"
    aria-label={CHECKOUT_COPY.legal.ariaLabel}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '10px 0 2px',
    }}
  >
    <LegalRow>
      {CHECKOUT_COPY.legal.agreePrefix}
      <LegalLink href="/legal/terms">{CHECKOUT_COPY.legal.termsLink}</LegalLink>
      {', '}
      <LegalLink href="/legal/privacy">
        {CHECKOUT_COPY.legal.privacyLink}
      </LegalLink>
      {' & '}
      <LegalLink href="/legal/terms#refunds">
        {CHECKOUT_COPY.legal.refundLink}
      </LegalLink>
      .
    </LegalRow>
    <LegalRow>{CHECKOUT_COPY.legal.autoRenew}</LegalRow>
    {scaRegion && (
      <LegalRow tone="muted">{CHECKOUT_COPY.legal.scaNotice}</LegalRow>
    )}
  </div>
)

const railTextStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 600,
  color: 'var(--fg-subtle)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
} as const

// Bottom mono rail (#782 §6.2) — splits trust (Stripe / card privacy)
// from the cancel reassurance so each reads.
const BottomMonoRail = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: '4px 12px',
      padding: '6px 0 2px',
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg
        width="11"
        height="11"
        viewBox="0 0 12 12"
        aria-hidden="true"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <rect
          x="2.5"
          y="5"
          width="7"
          height="5"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <path
          d="M4 5 V3.7 a2 2 0 0 1 4 0 V5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
      </svg>
      <span style={railTextStyle}>{CHECKOUT_COPY.rail.stripe}</span>
    </span>
    <span aria-hidden style={{ color: 'var(--border-strong)', fontSize: 9 }}>
      ·
    </span>
    <span style={railTextStyle}>{CHECKOUT_COPY.rail.cancel}</span>
  </div>
)

interface CheckoutFormProps {
  tierKey: Exclude<TierKey, 'free'>
  clientSecret: string
  scaRegion: boolean
  surface: CheckoutSurface
  onSurface: (surface: CheckoutSurface) => void
  onSuccess: () => void
  /** Dismiss back to the tier picker (failure-surface close / Escape). */
  onDismiss: () => void
}

const CheckoutForm = ({
  tierKey,
  clientSecret,
  scaRegion,
  surface,
  onSurface,
  onSuccess,
  onDismiss,
}: CheckoutFormProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  // Bumping remounts the PaymentElement empty ("Use a different card" /
  // freshEmpty failure entry — design table state coverage).
  const [elementKey, setElementKey] = useState(0)
  const tier = TIER_DEFINITIONS[tierKey]

  const isFailure = surface.kind === 'failure'
  const isChallenge = surface.kind === 'challenge'
  const behavior = isFailure ? FAILURE_SURFACE_BEHAVIOR[surface.category] : null
  // network_timeout keeps the entered card off-screen (card-kept note in
  // its place); the challenge hides it while Stripe's window is up.
  const hideElement = isChallenge || (behavior !== null && !behavior.freshCard)

  const enterFailure = (category: DeclineCategory) => {
    if (FAILURE_SURFACE_BEHAVIOR[category].freshEmpty)
      setElementKey((key) => key + 1)
    onSurface({ kind: 'failure', category })
  }

  const resetCard = () => setElementKey((key) => key + 1)

  const cancelChallenge = () => onSurface(CHECKOUT_SURFACE)

  // Cancelling the challenge returns focus to the payment surface's
  // primary CTA (a11y table — focus never falls to the document body).
  const payButtonRef = useRef<HTMLButtonElement | null>(null)
  const prevSurfaceKindRef = useRef(surface.kind)
  useEffect(() => {
    if (
      prevSurfaceKindRef.current === 'challenge' &&
      surface.kind === 'checkout'
    )
      payButtonRef.current?.focus()
    prevSurfaceKindRef.current = surface.kind
  }, [surface.kind])

  // Escape dismisses the failure surface to the picker, and cancels the
  // challenge chrome — before ModalShell's document listener closes the
  // whole sheet (a11y table).
  useEscapeCapture(isFailure, onDismiss)
  useEscapeCapture(isChallenge, cancelChallenge)

  const confirm = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    // confirmPayment handles 3DS/SCA next-actions itself with no callback,
    // so while it's in flight we watch the PaymentIntent for
    // `requires_action` and mount the challenge chrome around Stripe's
    // bank window the moment it flips.
    const stopWatching = watchForRequiresAction(
      stripe,
      clientSecret,
      () =>
        onSurface({ kind: 'challenge', challenge: scaRegion ? 'sca' : '3ds' }),
      REQUIRES_ACTION_POLL_MS,
    )
    try {
      const result = await stripe.confirmPayment({
        elements,
        // Card payments confirm in-surface, but redirect-based methods in
        // the Payment Element require a return_url or confirmation fails.
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })
      if (result.error) {
        console.error('tier-picker: confirmPayment declined', result.error)
        if (result.error.type === 'validation_error') {
          // Incomplete form — the Payment Element shows its own
          // field-level errors; no decline happened, stay put.
          if (isChallenge) onSurface(CHECKOUT_SURFACE)
          return
        }
        enterFailure(
          mapDeclineCategory({
            declineCode: result.error.decline_code ?? null,
            errorCode: result.error.code ?? null,
            errorType: result.error.type,
          }),
        )
        return
      }
      onSuccess()
    } catch (err) {
      // Thrown (not returned) errors are transport-level — the card was
      // never decided (spec §1.6 network_timeout row).
      console.error('tier-picker: confirmPayment failed', err)
      enterFailure('network_timeout')
    } finally {
      stopWatching()
      setSubmitting(false)
    }
  }

  return (
    <div
      {...(isFailure ? failureDialogProps(surface.category) : {})}
      style={{
        display: 'flex',
        flexDirection: 'column',
        // FailureBody stacks at 13 (design table); checkout keeps 14.
        gap: isFailure ? 13 : 14,
      }}
    >
      {isFailure && (
        <FailureSurfaceIntro
          category={surface.category}
          onDismiss={onDismiss}
        />
      )}
      {isFailure && <TierSummaryLine tierKey={tierKey} />}
      {isChallenge && (
        <ChallengeMount
          kind={surface.challenge}
          tierKey={tierKey}
          onCancel={cancelChallenge}
        />
      )}
      <div
        role="group"
        aria-label={CHECKOUT_COPY.eyebrow}
        style={hideElement ? { display: 'none' } : undefined}
      >
        <PaymentElement key={elementKey} />
      </div>
      {isFailure && behavior !== null && !behavior.freshCard && (
        <FailureCardKeptNote />
      )}
      {!isFailure && !isChallenge && (
        <>
          <LegalBlock scaRegion={scaRegion} />
          <button
            ref={payButtonRef}
            type="button"
            disabled={!stripe || submitting}
            onClick={() => void confirm()}
            style={{
              cursor: !stripe || submitting ? 'default' : 'pointer',
              textAlign: 'center',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid transparent',
              fontWeight: 700,
              fontSize: 14,
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              opacity: !stripe || submitting ? 0.6 : 1,
            }}
          >
            {submitting
              ? CHECKOUT_COPY.processing
              : `${CHECKOUT_COPY.payCta} · ${tier.priceText}${tier.key === 'founder' ? '/mo' : tier.priceUnit}`}
          </button>
          <BottomMonoRail />
        </>
      )}
      {isFailure && (
        <FailureActions
          category={surface.category}
          disabled={submitting}
          onPrimary={() => void confirm()}
          onSecondary={resetCard}
        />
      )}
    </div>
  )
}

export const CheckoutPanel = ({
  tierKey,
  clientSecret,
  scaRegion,
  onBack,
  onSuccess,
  onSurfaceChange,
}: CheckoutPanelProps) => {
  const stripePromise = useMemo(
    () => (PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null),
    [],
  )
  const tier = TIER_DEFINITIONS[tierKey]
  const [surface, setSurface] = useState<CheckoutSurface>(CHECKOUT_SURFACE)

  useEffect(() => {
    onSurfaceChange?.(surface)
  }, [surface, onSurfaceChange])

  if (stripePromise === null) {
    // Publishable key missing (misconfigured env) — never render a dead form.
    console.error('tier-picker: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    return (
      <div role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
        {CHECKOUT_COPY.startError}
      </div>
    )
  }

  return (
    <div
      data-testid="checkout-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {surface.kind === 'checkout' && (
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-muted)',
          }}
        >
          {CHECKOUT_COPY.backToTiers}
        </button>
      )}
      {surface.kind === 'checkout' && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {tier.name}
          </span>
          <span
            style={{ fontWeight: 800, fontSize: 16, color: 'var(--fg-muted)' }}
          >
            {tier.priceText}
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {' '}
              {tier.priceUnit}
            </span>
          </span>
        </div>
      )}
      <Elements
        stripe={stripePromise}
        options={{ clientSecret, appearance: { theme: 'stripe' } }}
      >
        <CheckoutForm
          tierKey={tierKey}
          clientSecret={clientSecret}
          scaRegion={scaRegion}
          surface={surface}
          onSurface={setSurface}
          onSuccess={onSuccess}
          onDismiss={onBack}
        />
      </Elements>
    </div>
  )
}
