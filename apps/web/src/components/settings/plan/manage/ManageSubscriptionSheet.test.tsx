// @vitest-environment jsdom

// Manage-subscription sheet internals (PR 4.5, #780): surface routing
// (manage → cancel/downgrade/upgrade, founder → downgrade), tier-gated
// cancel retention, proration previews, lifecycle mutations + plan-state
// refresh, ChangesDisclosure, and the LifecycleSurface dismissal contract.
// Panel-level wiring (which card CTA opens this sheet) lives in
// ../PlanPanel.test.tsx.

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type * as BillingModule from '@/lib/billing'

let mobileViewport = false

const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    userId: 'user_test',
    isSignedIn: true,
  }),
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: mockRefresh,
  }),
}))

// Portal mechanics (session → https guard → navigate) are covered by the
// shared lib + PlanPanel suite; here we only assert the rows invoke the
// new-tab variant ("Opens Stripe in a new tab").
const mockNavigatePortal = vi.fn()
const mockOpenPortalNewTab = vi.fn()
vi.mock('@/lib/portal-navigation', () => ({
  navigateToPortalSession: (getToken: () => Promise<string | null>) =>
    mockNavigatePortal(getToken),
  openPortalSessionInNewTab: (getToken: () => Promise<string | null>) =>
    mockOpenPortalNewTab(getToken),
}))

const mockCancel = vi.fn()
const mockChangeTier = vi.fn()
const mockFetchPreview = vi.fn()
vi.mock('@/lib/billing', async () => {
  const actual = await vi.importActual<typeof BillingModule>('@/lib/billing')
  return {
    ...actual,
    cancelSubscription: (token: string) => mockCancel(token),
    changeSubscriptionTier: (token: string, tier: string) =>
      mockChangeTier(token, tier),
    fetchProrationPreview: (token: string, tier: string) =>
      mockFetchPreview(token, tier),
  }
})

import { ManageSubscriptionSheet } from './ManageSubscriptionSheet'
import {
  AMOUNT_PLACEHOLDER,
  CANCEL_FLOW_COPY,
  CHANGES_DISCLOSURE_COPY,
  DOWNGRADE_FLOW_COPY,
  MANAGE_ERRORS_COPY,
  MANAGE_SHEET_COPY,
  UPGRADE_FLOW_COPY,
} from './definitions/copy'
import type { PaidTier } from './definitions/types'
import { PLAN_CARD_COPY } from '../definitions/copy'

beforeEach(() => {
  mobileViewport = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobileViewport,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  vi.clearAllMocks()
  mockGetToken.mockResolvedValue('test-token')
  mockNavigatePortal.mockResolvedValue(undefined)
  mockOpenPortalNewTab.mockResolvedValue(undefined)
  mockCancel.mockResolvedValue(undefined)
  mockChangeTier.mockResolvedValue(undefined)
  mockFetchPreview.mockImplementation((_token: string, tier: string) =>
    Promise.resolve(
      tier === 'supporter'
        ? {
            amountDueCents: 0,
            creditCents: 123,
            currency: 'usd',
            periodEnd: '2026-08-03T00:00:00.000Z',
          }
        : {
            amountDueCents: 317,
            creditCents: 0,
            currency: 'usd',
            periodEnd: '2026-08-03T00:00:00.000Z',
          },
    ),
  )
})

interface RenderOptions {
  tier?: PaidTier
  periodEnd?: string | null
  open?: boolean
}

const renderSheet = ({
  tier = 'premium',
  periodEnd = 'Aug 3, 2026',
  open = true,
}: RenderOptions = {}) => {
  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = (isOpen: boolean) => (
    <QueryClientProvider client={queryClient}>
      <ManageSubscriptionSheet
        open={isOpen}
        onClose={onClose}
        tier={tier}
        periodEnd={periodEnd}
      />
    </QueryClientProvider>
  )
  const utils = render(view(open))
  const setOpen = (isOpen: boolean) => utils.rerender(view(isOpen))
  return { onClose, setOpen, ...utils }
}

const openCancelFlow = () => {
  fireEvent.click(screen.getByText(MANAGE_SHEET_COPY.inApp.cancel.label))
}

const openChangePlan = () => {
  fireEvent.click(screen.getByText(MANAGE_SHEET_COPY.inApp.changePlan.label))
}

describe('ManageSubscriptionSheet — manage surface', () => {
  it('renders nothing while closed', () => {
    renderSheet({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the two groups, all six rows, and the footer verbatim', () => {
    renderSheet({ tier: 'premium' })

    expect(
      screen.getByRole('dialog', { name: MANAGE_SHEET_COPY.ariaLabel }),
    ).toBeTruthy()
    expect(screen.getByText(MANAGE_SHEET_COPY.title)).toBeTruthy()
    expect(screen.getByText(MANAGE_SHEET_COPY.eyebrow('Premium'))).toBeTruthy()
    expect(
      screen.getByText(MANAGE_SHEET_COPY.subtitle('Premium', 'Aug 3, 2026')),
    ).toBeTruthy()

    expect(screen.getByText(MANAGE_SHEET_COPY.inApp.groupLabel)).toBeTruthy()
    expect(screen.getByText(MANAGE_SHEET_COPY.billing.groupLabel)).toBeTruthy()
    expect(screen.getByText(MANAGE_SHEET_COPY.billing.groupNote)).toBeTruthy()

    for (const label of [
      MANAGE_SHEET_COPY.inApp.changePlan.label,
      MANAGE_SHEET_COPY.inApp.cancel.label,
      MANAGE_SHEET_COPY.billing.paymentMethod.label,
      MANAGE_SHEET_COPY.billing.invoices.label,
      MANAGE_SHEET_COPY.billing.billingEmail.label,
      MANAGE_SHEET_COPY.billing.tax.label,
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
    }

    // The four portal rows each carry the Stripe chip.
    expect(screen.getAllByText(MANAGE_SHEET_COPY.portalChip)).toHaveLength(4)
    expect(
      screen.getByText(
        MANAGE_SHEET_COPY.inApp.cancel.sub('Premium', 'Aug 3, 2026'),
      ),
    ).toBeTruthy()
    expect(screen.getByText(MANAGE_SHEET_COPY.footer)).toBeTruthy()
  })

  it('falls back gracefully when periodEnd is null', () => {
    renderSheet({ tier: 'supporter', periodEnd: null })
    expect(
      screen.getByText(MANAGE_SHEET_COPY.subtitle('Supporter', null)),
    ).toBeTruthy()
    expect(
      screen.getByText(MANAGE_SHEET_COPY.inApp.cancel.sub('Supporter', null)),
    ).toBeTruthy()
  })

  it('routes billing rows to the Stripe portal in a new tab', () => {
    renderSheet()
    fireEvent.click(screen.getByText(MANAGE_SHEET_COPY.billing.invoices.label))
    expect(mockOpenPortalNewTab).toHaveBeenCalledTimes(1)
    expect(mockNavigatePortal).not.toHaveBeenCalled()
  })

  it('surfaces a portal failure inline and keeps the sheet open', async () => {
    mockOpenPortalNewTab.mockRejectedValue(new Error('portal down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const { onClose } = renderSheet()

    fireEvent.click(
      screen.getByText(MANAGE_SHEET_COPY.billing.paymentMethod.label),
    )
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        PLAN_CARD_COPY.errors.portal,
      )
    })
    expect(onClose).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('ManageSubscriptionSheet — change-plan routing', () => {
  it('premium → downgrade flow', () => {
    renderSheet({ tier: 'premium' })
    openChangePlan()
    expect(
      screen.getByRole('dialog', { name: DOWNGRADE_FLOW_COPY.ariaLabel }),
    ).toBeTruthy()
    expect(screen.getByText(DOWNGRADE_FLOW_COPY.headline)).toBeTruthy()
  })

  it('supporter → upgrade flow', () => {
    renderSheet({ tier: 'supporter' })
    openChangePlan()
    expect(
      screen.getByRole('dialog', { name: UPGRADE_FLOW_COPY.ariaLabel }),
    ).toBeTruthy()
    expect(screen.getByText(UPGRADE_FLOW_COPY.headline)).toBeTruthy()
  })

  it('founder → downgrade flow (valid change-tier source, #780 decision 6)', () => {
    renderSheet({ tier: 'founder' })
    openChangePlan()
    expect(
      screen.getByRole('dialog', { name: DOWNGRADE_FLOW_COPY.ariaLabel }),
    ).toBeTruthy()
    expect(screen.getByText(DOWNGRADE_FLOW_COPY.headline)).toBeTruthy()
  })
})

describe('ManageSubscriptionSheet — cancel flow', () => {
  it('premium gets the full flow: 90-day note + Supporter retention nudge', () => {
    renderSheet({ tier: 'premium' })
    openCancelFlow()

    expect(
      screen.getByRole('dialog', { name: CANCEL_FLOW_COPY.ariaLabel }),
    ).toBeTruthy()
    expect(screen.getByText(CANCEL_FLOW_COPY.headline)).toBeTruthy()
    expect(
      screen.getByText(CANCEL_FLOW_COPY.bodyPremiumUp('Aug 3, 2026')),
    ).toBeTruthy()
    expect(screen.getByText(CANCEL_FLOW_COPY.retention.eyebrow)).toBeTruthy()
    expect(
      screen.getByText(CANCEL_FLOW_COPY.retention.headline('$5')),
    ).toBeTruthy()
    expect(screen.getByText(CANCEL_FLOW_COPY.retention.switchCta)).toBeTruthy()
    expect(screen.getByText(CANCEL_FLOW_COPY.keepCta('Premium'))).toBeTruthy()
  })

  it('founder retention headline leads with the founder price', () => {
    renderSheet({ tier: 'founder' })
    openCancelFlow()
    expect(
      screen.getByText(CANCEL_FLOW_COPY.retention.headline('$3')),
    ).toBeTruthy()
  })

  it('supporter gets the thin flow — no nudge, badge-only body', () => {
    renderSheet({ tier: 'supporter' })
    openCancelFlow()
    expect(screen.queryByText(CANCEL_FLOW_COPY.retention.eyebrow)).toBeNull()
    expect(screen.queryByText(CANCEL_FLOW_COPY.retention.switchCta)).toBeNull()
    expect(
      screen.getByText(CANCEL_FLOW_COPY.bodySupporter('Aug 3, 2026')),
    ).toBeTruthy()
  })

  it('confirm cancels at period end, refreshes plan state, and closes', async () => {
    const { onClose } = renderSheet({ tier: 'premium' })
    openCancelFlow()

    fireEvent.click(screen.getByText(CANCEL_FLOW_COPY.confirmCta))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockCancel).toHaveBeenCalledWith('test-token')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('a cancel failure stays on the flow with the error line', async () => {
    mockCancel.mockRejectedValue(new Error('stripe down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const { onClose } = renderSheet({ tier: 'premium' })
    openCancelFlow()

    fireEvent.click(screen.getByText(CANCEL_FLOW_COPY.confirmCta))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        MANAGE_ERRORS_COPY.cancel,
      )
    })
    expect(onClose).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('"Never mind" backs out to the manage sheet', () => {
    renderSheet({ tier: 'premium' })
    openCancelFlow()
    fireEvent.click(screen.getByText(CANCEL_FLOW_COPY.keepCta('Premium')))
    expect(screen.getByText(MANAGE_SHEET_COPY.title)).toBeTruthy()
  })

  it('retention switch routes premium to the downgrade flow', () => {
    renderSheet({ tier: 'premium' })
    openCancelFlow()
    fireEvent.click(screen.getByText(CANCEL_FLOW_COPY.retention.switchCta))
    expect(
      screen.getByRole('dialog', { name: DOWNGRADE_FLOW_COPY.ariaLabel }),
    ).toBeTruthy()
  })

  it('retention switch routes founder to the downgrade flow', () => {
    const { onClose } = renderSheet({ tier: 'founder' })
    openCancelFlow()
    fireEvent.click(screen.getByText(CANCEL_FLOW_COPY.retention.switchCta))
    expect(onClose).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', { name: DOWNGRADE_FLOW_COPY.ariaLabel }),
    ).toBeTruthy()
  })
})

describe('ManageSubscriptionSheet — downgrade flow', () => {
  it('renders the proration credit from the preview endpoint', async () => {
    renderSheet({ tier: 'premium' })
    openChangePlan()

    await waitFor(() => {
      expect(screen.getByText('$1.23')).toBeTruthy()
    })
    expect(mockFetchPreview).toHaveBeenCalledWith('test-token', 'supporter')
    expect(screen.getByText('+$1.23')).toBeTruthy()
    expect(
      screen.getByText(DOWNGRADE_FLOW_COPY.math.fromTodayValue),
    ).toBeTruthy()
  })

  it('holds the quiet placeholder while the preview is in flight', () => {
    mockFetchPreview.mockImplementation(() => new Promise(() => undefined))
    renderSheet({ tier: 'premium' })
    openChangePlan()
    expect(screen.getAllByText(AMOUNT_PLACEHOLDER).length).toBeGreaterThan(0)
  })

  it('confirm switches to supporter, refreshes plan state, and closes', async () => {
    const { onClose } = renderSheet({ tier: 'premium' })
    openChangePlan()

    fireEvent.click(screen.getByText(DOWNGRADE_FLOW_COPY.confirmCta))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockChangeTier).toHaveBeenCalledWith('test-token', 'supporter')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('a change-tier failure stays on the flow with the error line', async () => {
    mockChangeTier.mockRejectedValue(new Error('stripe down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const { onClose } = renderSheet({ tier: 'premium' })
    openChangePlan()

    fireEvent.click(screen.getByText(DOWNGRADE_FLOW_COPY.confirmCta))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        MANAGE_ERRORS_COPY.changeTier,
      )
    })
    expect(onClose).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('"Never mind" backs out to the manage sheet', () => {
    renderSheet({ tier: 'premium' })
    openChangePlan()
    fireEvent.click(screen.getByText(DOWNGRADE_FLOW_COPY.backCta))
    expect(screen.getByText(MANAGE_SHEET_COPY.title)).toBeTruthy()
  })
})

describe('ManageSubscriptionSheet — upgrade flow', () => {
  it('renders the prorated charge, the unlocks grid, and the CTA sub-line', async () => {
    renderSheet({ tier: 'supporter' })
    openChangePlan()

    await waitFor(() => {
      expect(screen.getAllByText('$3.17').length).toBeGreaterThan(0)
    })
    expect(mockFetchPreview).toHaveBeenCalledWith('test-token', 'premium')
    expect(screen.getByText(UPGRADE_FLOW_COPY.confirmSub('$3.17'))).toBeTruthy()
    expect(
      screen.getByText(UPGRADE_FLOW_COPY.math.thenMonthlyValue),
    ).toBeTruthy()
    for (const unlock of UPGRADE_FLOW_COPY.unlocks) {
      expect(screen.getByText(unlock)).toBeTruthy()
    }
  })

  it('confirm switches to premium and closes', async () => {
    const { onClose } = renderSheet({ tier: 'supporter' })
    openChangePlan()

    fireEvent.click(screen.getByText(UPGRADE_FLOW_COPY.confirmCta))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockChangeTier).toHaveBeenCalledWith('test-token', 'premium')
  })
})

describe('ManageSubscriptionSheet — changes disclosure', () => {
  it('expands on tap, flipping aria-expanded, with stays/off lists + restore note', () => {
    renderSheet({ tier: 'premium' })
    openChangePlan()

    const summaryButton = screen.getByRole('button', {
      name: CHANGES_DISCLOSURE_COPY.summary,
    })
    expect(summaryButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(CHANGES_DISCLOSURE_COPY.restoreNote)).toBeNull()

    fireEvent.click(summaryButton)
    expect(summaryButton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(CHANGES_DISCLOSURE_COPY.staysLabel)).toBeTruthy()
    expect(screen.getByText(CHANGES_DISCLOSURE_COPY.offLabel)).toBeTruthy()
    for (const item of [
      ...CHANGES_DISCLOSURE_COPY.stays,
      ...CHANGES_DISCLOSURE_COPY.off,
    ]) {
      expect(screen.getByText(item)).toBeTruthy()
    }
    expect(screen.getByText(CHANGES_DISCLOSURE_COPY.restoreNote)).toBeTruthy()

    fireEvent.click(summaryButton)
    expect(summaryButton.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('ManageSubscriptionSheet — surface chrome', () => {
  it('Escape closes the surface', () => {
    const { onClose } = renderSheet()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the scrim closes the surface', () => {
    const { onClose } = renderSheet()
    fireEvent.click(screen.getByTestId('lifecycle-scrim'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('reopening resets back to the manage surface', () => {
    const { setOpen } = renderSheet({ tier: 'premium' })
    openCancelFlow()
    expect(screen.getByText(CANCEL_FLOW_COPY.headline)).toBeTruthy()

    setOpen(false)
    setOpen(true)
    expect(screen.getByText(MANAGE_SHEET_COPY.title)).toBeTruthy()
  })

  it('mobile renders the bottom sheet with the same dialog contract', () => {
    mobileViewport = true
    renderSheet({ tier: 'premium' })
    const dialog = screen.getByRole('dialog', {
      name: MANAGE_SHEET_COPY.ariaLabel,
    })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText(MANAGE_SHEET_COPY.title)).toBeTruthy()
  })
})
