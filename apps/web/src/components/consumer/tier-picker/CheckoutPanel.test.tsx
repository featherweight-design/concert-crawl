// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { CheckoutPanel as CheckoutPanelComponent } from './CheckoutPanel'
import type { TIER_PICKER_COPY as tierPickerCopyValue } from './definitions/copy'

const mockConfirmPayment = vi.fn()
const mockRetrievePaymentIntent = vi.fn()
// Tracks PaymentElement remounts — a React key bump re-creates the mock
// instance, so a fresh mount id proves the card slot was reset.
let paymentElementMounts = 0

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
  PaymentElement: () => {
    const [mountId] = React.useState(() => (paymentElementMounts += 1))
    return <div data-testid="payment-element" data-mount={mountId} />
  },
  useStripe: () => ({
    confirmPayment: mockConfirmPayment,
    retrievePaymentIntent: mockRetrievePaymentIntent,
  }),
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
  mockRetrievePaymentIntent.mockResolvedValue({
    paymentIntent: { status: 'processing' },
  })
})

const renderPanel = (overrides: { scaRegion?: boolean } = {}) => {
  const onSuccess = vi.fn()
  const onBack = vi.fn()
  const onSurfaceChange = vi.fn()
  render(
    <CheckoutPanel
      tierKey="premium"
      clientSecret="cs_test_secret"
      flow="new"
      scaRegion={overrides.scaRegion ?? false}
      onBack={onBack}
      onSuccess={onSuccess}
      onSurfaceChange={onSurfaceChange}
    />,
  )
  return { onSuccess, onBack, onSurfaceChange }
}

const clickPay = () =>
  fireEvent.click(
    screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.checkout.payCta),
    }),
  )

const declineWith = (error: Record<string, unknown>) => {
  mockConfirmPayment.mockResolvedValue({ error })
}

describe('CheckoutPanel — payment confirmation', () => {
  it('confirms with a return_url so redirect-based payment methods work', async () => {
    const { onSuccess } = renderPanel()
    clickPay()
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
})

describe('CheckoutPanel — decline → failure surface routing (PR 4.4)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('routes insufficient_funds to surface 01, keeping the entered card', async () => {
    declineWith({
      type: 'card_error',
      code: 'card_declined',
      decline_code: 'insufficient_funds',
      message: 'declined',
    })
    const { onSuccess } = renderPanel()
    const mountBefore = screen
      .getByTestId('payment-element')
      .getAttribute('data-mount')
    clickPay()
    await waitFor(() =>
      expect(
        screen.getByText(
          TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
        ),
      ).toBeTruthy(),
    )
    expect(
      screen.getByRole('button', { name: TIER_PICKER_COPY.failure.closeLabel }),
    ).toBeTruthy()
    // Same mount id — the card the user typed survives (freshEmpty=false).
    expect(
      screen.getByTestId('payment-element').getAttribute('data-mount'),
    ).toBe(mountBefore)
    // Never renders the raw decline code.
    expect(screen.queryByText(/insufficient_funds/)).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('routes expired_card to surface 02 with an EMPTY re-rendered element', async () => {
    declineWith({
      type: 'card_error',
      code: 'card_declined',
      decline_code: 'expired_card',
      message: 'declined',
    })
    renderPanel()
    const mountBefore = screen
      .getByTestId('payment-element')
      .getAttribute('data-mount')
    clickPay()
    await waitFor(() =>
      expect(
        screen.getByText(
          TIER_PICKER_COPY.failure.categories.expired_or_incorrect_card
            .headline,
        ),
      ).toBeTruthy(),
    )
    // Key bump remounts the element — fresh empty card form.
    expect(
      screen.getByTestId('payment-element').getAttribute('data-mount'),
    ).not.toBe(mountBefore)
    consoleSpy.mockRestore()
  })

  it('routes fraud codes to surface 04 without ever saying "fraud"', async () => {
    declineWith({
      type: 'card_error',
      code: 'card_declined',
      decline_code: 'stolen_card',
      message: 'declined',
    })
    renderPanel()
    clickPay()
    await waitFor(() =>
      expect(
        screen.getByText(
          TIER_PICKER_COPY.failure.categories.fraud_block.headline,
        ),
      ).toBeTruthy(),
    )
    expect(document.body.textContent).not.toMatch(/fraud/i)
    // No retry-same-card affordance: no secondary, primary is a
    // different-card verb, and the element re-rendered empty.
    expect(
      screen.queryByRole('button', {
        name: TIER_PICKER_COPY.failure.secondary,
      }),
    ).toBeNull()
    expect(
      screen.getByRole('button', {
        name: TIER_PICKER_COPY.failure.categories.fraud_block.primary,
      }),
    ).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('routes an api_connection_error decline to surface 05 with the element hidden and card kept', async () => {
    declineWith({ type: 'api_connection_error', message: 'network sad' })
    renderPanel()
    clickPay()
    await waitFor(() =>
      expect(
        screen.getByText(
          TIER_PICKER_COPY.failure.categories.network_timeout.headline,
        ),
      ).toBeTruthy(),
    )
    // display:none — mounted (state kept) but hidden.
    const element = screen.getByTestId('payment-element')
    expect(element.parentElement?.style.display).toBe('none')
    expect(screen.getByText(TIER_PICKER_COPY.failure.cardKeptNote)).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('routes a thrown confirmPayment error to network_timeout', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('fetch failed'))
    renderPanel()
    clickPay()
    await waitFor(() =>
      expect(
        screen.getByText(
          TIER_PICKER_COPY.failure.categories.network_timeout.headline,
        ),
      ).toBeTruthy(),
    )
    consoleSpy.mockRestore()
  })

  it('stays on the checkout layout for validation errors (element shows its own)', async () => {
    declineWith({ type: 'validation_error', message: 'incomplete' })
    renderPanel()
    clickPay()
    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalled())
    expect(
      screen.queryByRole('button', {
        name: TIER_PICKER_COPY.failure.closeLabel,
      }),
    ).toBeNull()
    expect(
      screen.getByRole('button', {
        name: new RegExp(TIER_PICKER_COPY.checkout.payCta),
      }),
    ).toBeTruthy()
    consoleSpy.mockRestore()
  })
})

describe('CheckoutPanel — failure surface actions', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  const enterFailure = async (declineCode: string, headline: string) => {
    declineWith({
      type: 'card_error',
      code: 'card_declined',
      decline_code: declineCode,
      message: 'declined',
    })
    const handles = renderPanel()
    clickPay()
    await waitFor(() => expect(screen.getByText(headline)).toBeTruthy())
    return handles
  }

  it('"Try again" re-invokes confirmPayment', async () => {
    await enterFailure(
      'insufficient_funds',
      TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
    )
    expect(mockConfirmPayment).toHaveBeenCalledTimes(1)
    fireEvent.click(
      screen.getByRole('button', {
        name: TIER_PICKER_COPY.failure.categories.insufficient_funds.primary,
      }),
    )
    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalledTimes(2))
    consoleSpy.mockRestore()
  })

  it('"Use a different card" resets the element via a key bump, staying on the surface', async () => {
    await enterFailure(
      'insufficient_funds',
      TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
    )
    const mountBefore = screen
      .getByTestId('payment-element')
      .getAttribute('data-mount')
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.failure.secondary }),
    )
    await waitFor(() =>
      expect(
        screen.getByTestId('payment-element').getAttribute('data-mount'),
      ).not.toBe(mountBefore),
    )
    expect(
      screen.getByText(
        TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
      ),
    ).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('close X dismisses back to the picker', async () => {
    const { onBack } = await enterFailure(
      'insufficient_funds',
      TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
    )
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.failure.closeLabel }),
    )
    expect(onBack).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('Escape dismisses the failure surface to the picker (capture phase)', async () => {
    const { onBack } = await enterFailure(
      'insufficient_funds',
      TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onBack).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('returns to the checkout layout when a retry hits a validation error', async () => {
    await enterFailure(
      'insufficient_funds',
      TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
    )
    // Retry with an incomplete form — the element renders its own field
    // errors, so the failure layout must yield back to checkout.
    declineWith({ type: 'validation_error', message: 'incomplete' })
    fireEvent.click(
      screen.getByRole('button', {
        name: TIER_PICKER_COPY.failure.categories.insufficient_funds.primary,
      }),
    )
    await waitFor(() =>
      expect(
        screen.queryByText(
          TIER_PICKER_COPY.failure.categories.insufficient_funds.headline,
        ),
      ).toBeNull(),
    )
    expect(
      screen.getByRole('button', {
        name: new RegExp(TIER_PICKER_COPY.checkout.payCta),
      }),
    ).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('ignores a confirmPayment that resolves after the surface unmounted', async () => {
    let resolveConfirm: (value: Record<string, unknown>) => void = () => {}
    mockConfirmPayment.mockReturnValue(
      new Promise((resolve) => {
        resolveConfirm = resolve
      }),
    )
    const onSuccess = vi.fn()
    const { unmount } = render(
      <CheckoutPanel
        tierKey="premium"
        clientSecret="cs_test_secret"
        flow="new"
        scaRegion={false}
        onBack={vi.fn()}
        onSuccess={onSuccess}
        onSurfaceChange={vi.fn()}
      />,
    )
    clickPay()
    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalled())
    unmount()
    await act(async () => {
      resolveConfirm({})
    })
    expect(onSuccess).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('hides the checkout back-button, legal block, and pay CTA while failed', async () => {
    await enterFailure(
      'issuer_declined',
      TIER_PICKER_COPY.failure.categories.issuer_declined.headline,
    )
    expect(
      screen.queryByRole('button', {
        name: TIER_PICKER_COPY.checkout.backToTiers,
      }),
    ).toBeNull()
    expect(
      screen.queryByRole('group', {
        name: TIER_PICKER_COPY.checkout.legal.ariaLabel,
      }),
    ).toBeNull()
    consoleSpy.mockRestore()
  })

  it('reports surface changes to the sheet', async () => {
    const { onSurfaceChange } = await enterFailure(
      'stolen_card',
      TIER_PICKER_COPY.failure.categories.fraud_block.headline,
    )
    await waitFor(() =>
      expect(onSurfaceChange).toHaveBeenCalledWith({
        kind: 'failure',
        category: 'fraud_block',
      }),
    )
    consoleSpy.mockRestore()
  })
})

describe('CheckoutPanel — 3DS/SCA challenge detection', () => {
  it('mounts the 3DS challenge chrome when the intent flips to requires_action', async () => {
    vi.useFakeTimers()
    let resolveConfirm: (value: Record<string, unknown>) => void = () => {}
    mockConfirmPayment.mockReturnValue(
      new Promise((resolve) => {
        resolveConfirm = resolve
      }),
    )
    mockRetrievePaymentIntent.mockResolvedValue({
      paymentIntent: { status: 'requires_action' },
    })
    const { onSuccess } = renderPanel()
    clickPay()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(
      screen.getByText(TIER_PICKER_COPY.challenge.kinds['3ds'].headline),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: TIER_PICKER_COPY.challenge.cancel }),
    ).toBeTruthy()
    // The element stays mounted (hidden) while Stripe runs the challenge.
    expect(
      screen.getByTestId('payment-element').parentElement?.style.display,
    ).toBe('none')
    // Bank approves → confirm resolves → success.
    await act(async () => {
      resolveConfirm({})
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(onSuccess).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('frames the challenge as SCA for SCA-region users', async () => {
    vi.useFakeTimers()
    mockConfirmPayment.mockReturnValue(new Promise(() => {}))
    mockRetrievePaymentIntent.mockResolvedValue({
      paymentIntent: { status: 'requires_action' },
    })
    renderPanel({ scaRegion: true })
    clickPay()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(
      screen.getByText(TIER_PICKER_COPY.challenge.kinds.sca.headline),
    ).toBeTruthy()
    vi.useRealTimers()
  })

  it('"Cancel payment" returns to the checkout layout', async () => {
    vi.useFakeTimers()
    mockConfirmPayment.mockReturnValue(new Promise(() => {}))
    mockRetrievePaymentIntent.mockResolvedValue({
      paymentIntent: { status: 'requires_action' },
    })
    renderPanel()
    clickPay()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.challenge.cancel }),
    )
    expect(
      screen.queryByText(TIER_PICKER_COPY.challenge.kinds['3ds'].headline),
    ).toBeNull()
    expect(
      screen.getByTestId('payment-element').parentElement?.style.display,
    ).not.toBe('none')
    vi.useRealTimers()
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

  it('opens legal links in a new tab with noopener noreferrer', () => {
    renderPanel()
    const legalHrefs = [
      '/legal/terms',
      '/legal/privacy',
      '/legal/terms#refunds',
    ]
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href')
      if (href !== null && legalHrefs.includes(href)) {
        expect(link.getAttribute('target')).toBe('_blank')
        expect(link.getAttribute('rel')).toBe('noopener noreferrer')
      }
    }
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
