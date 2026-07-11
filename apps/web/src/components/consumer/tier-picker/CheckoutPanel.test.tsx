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

const renderPanel = (overrides: { scaRegion?: boolean } = {}) => {
  const onSuccess = vi.fn()
  render(
    <CheckoutPanel
      tierKey="premium"
      clientSecret="cs_test_secret"
      scaRegion={overrides.scaRegion ?? false}
      onBack={vi.fn()}
      onSuccess={onSuccess}
    />,
  )
  return { onSuccess }
}

describe('CheckoutPanel — payment confirmation', () => {
  it('confirms with a return_url so redirect-based payment methods work', async () => {
    const { onSuccess } = renderPanel()
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
    const { onSuccess } = renderPanel()
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

describe('CheckoutPanel — legal block (#782 §6.1)', () => {
  it('renders the legal group with links to terms, privacy, and the refund anchor', () => {
    renderPanel()
    const group = screen.getByRole('group', {
      name: TIER_PICKER_COPY.checkout.legal.ariaLabel,
    })
    expect(group).toBeTruthy()
    const links = screen.getAllByRole('link')
    const hrefs = links.map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/legal/terms')
    expect(hrefs).toContain('/legal/privacy')
    expect(hrefs).toContain('/legal/terms#refunds')
  })

  it('renders the auto-renew line', () => {
    renderPanel()
    expect(
      screen.getByText(TIER_PICKER_COPY.checkout.legal.autoRenew),
    ).toBeTruthy()
  })

  it('shows the SCA notice only for SCA-region users', () => {
    renderPanel({ scaRegion: true })
    expect(
      screen.getByText(TIER_PICKER_COPY.checkout.legal.scaNotice),
    ).toBeTruthy()
  })

  it('hides the SCA notice outside SCA regions', () => {
    renderPanel({ scaRegion: false })
    expect(
      screen.queryByText(TIER_PICKER_COPY.checkout.legal.scaNotice),
    ).toBeNull()
  })
})

describe('CheckoutPanel — bottom mono rail (#782 §6.2)', () => {
  it('renders both rail segments', () => {
    renderPanel()
    expect(screen.getByText(TIER_PICKER_COPY.checkout.rail.stripe)).toBeTruthy()
    expect(screen.getByText(TIER_PICKER_COPY.checkout.rail.cancel)).toBeTruthy()
  })
})
