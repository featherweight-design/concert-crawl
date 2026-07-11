'use client'

// Embedded checkout — mounts Stripe's Payment Element against the
// clientSecret from POST /v1/billing/checkout-session and confirms
// in-surface (eng infra spec Part 2 §1.3: confirmPayment with
// redirect: 'if_required'). The full five-surface decline flow is PR 4.1;
// this panel surfaces Stripe's own user-facing message inline.

import { useMemo, useState } from 'react'
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
  onBack: () => void
  onSuccess: () => void
}

const CheckoutForm = ({
  tierKey,
  onSuccess,
}: Pick<CheckoutPanelProps, 'tierKey' | 'onSuccess'>) => {
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
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {CHECKOUT_COPY.secureLine}
      </div>
    </div>
  )
}

export const CheckoutPanel = ({
  tierKey,
  clientSecret,
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
        <CheckoutForm tierKey={tierKey} onSuccess={onSuccess} />
      </Elements>
    </div>
  )
}
