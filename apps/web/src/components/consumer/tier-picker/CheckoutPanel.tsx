'use client'

// Embedded checkout — mounts Stripe's Payment Element against the
// clientSecret from POST /v1/billing/checkout-session and confirms
// in-surface (eng infra spec Part 2 §1.3: confirmPayment with
// redirect: 'if_required'). The full five-surface decline flow is PR 4.1;
// this panel surfaces Stripe's own user-facing message inline.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { TIER_PICKER_COPY } from './definitions/copy'
import { TIER_DEFINITIONS } from './definitions/constants'
import type { TierKey } from './definitions/types'

const CHECKOUT_COPY = TIER_PICKER_COPY.checkout
const PUBLISHABLE_KEY = process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']

interface CheckoutPanelProps {
  tierKey: Exclude<TierKey, 'free'>
  clientSecret: string
  // Server-resolved from x-vercel-ip-country (spec §1.7) — gates the
  // conditional SCA notice row in the legal block.
  scaRegion: boolean
  onBack: () => void
  onSuccess: () => void
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

const CheckoutForm = ({
  tierKey,
  scaRegion,
  onSuccess,
}: Pick<CheckoutPanelProps, 'tierKey' | 'scaRegion' | 'onSuccess'>) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const tier = TIER_DEFINITIONS[tierKey]

  const confirm = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    setErrorText(null)
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
        setErrorText(result.error.message ?? CHECKOUT_COPY.confirmError)
        return
      }
      onSuccess()
    } catch (err) {
      console.error('tier-picker: confirmPayment failed', err)
      setErrorText(CHECKOUT_COPY.confirmError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PaymentElement />
      {errorText !== null && (
        <div
          role="alert"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--danger)',
            lineHeight: 1.45,
          }}
        >
          {errorText}
        </div>
      )}
      <LegalBlock scaRegion={scaRegion} />
      <button
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
    </div>
  )
}

export const CheckoutPanel = ({
  tierKey,
  clientSecret,
  scaRegion,
  onBack,
  onSuccess,
}: CheckoutPanelProps) => {
  const stripePromise = useMemo(
    () => (PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null),
    [],
  )
  const tier = TIER_DEFINITIONS[tierKey]

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
      <Elements
        stripe={stripePromise}
        options={{ clientSecret, appearance: { theme: 'stripe' } }}
      >
        <CheckoutForm
          tierKey={tierKey}
          scaRegion={scaRegion}
          onSuccess={onSuccess}
        />
      </Elements>
    </div>
  )
}
