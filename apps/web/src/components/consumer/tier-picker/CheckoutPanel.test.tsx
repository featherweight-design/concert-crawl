// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { CheckoutPanel as CheckoutPanelComponent } from './CheckoutPanel'
import type { TIER_PICKER_COPY as tierPickerCopyValue } from './definitions/copy'

const mockConfirmPayment = vi.fn()

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => ({}),
}))

// PUBLISHABLE_KEY is read at module scope, so the env stub must land
// before the component module is evaluated — hence the dynamic import.
let CheckoutPanel: typeof CheckoutPanelComponent
let TIER_PICKER_COPY: typeof tierPickerCopyValue

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123')
  ;({ CheckoutPanel } = await import('./CheckoutPanel'))
  ;({ TIER_PICKER_COPY } = await import('./definitions/copy'))
})

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirmPayment.mockResolvedValue({})
})

describe('CheckoutPanel — payment confirmation', () => {
  it('confirms with a return_url so redirect-based payment methods work', async () => {
    const onSuccess = vi.fn()
    render(
      <CheckoutPanel
        tierKey="premium"
        clientSecret="cs_test_secret"
        onBack={vi.fn()}
        onSuccess={onSuccess}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(TIER_PICKER_COPY.checkout.payCta),
      }),
    )
    await waitFor(() =>
      expect(mockConfirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required',
        }),
      ),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('surfaces the Stripe error message on decline without calling onSuccess', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockConfirmPayment.mockResolvedValue({
      error: { message: 'Your card was declined.' },
    })
    const onSuccess = vi.fn()
    render(
      <CheckoutPanel
        tierKey="premium"
        clientSecret="cs_test_secret"
        onBack={vi.fn()}
        onSuccess={onSuccess}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(TIER_PICKER_COPY.checkout.payCta),
      }),
    )
    await waitFor(() =>
      expect(screen.getByText('Your card was declined.')).toBeTruthy(),
    )
    expect(onSuccess).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
