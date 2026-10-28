// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import type {
  PlatformProbeResult,
  VenueWithCrawlHealth,
} from '@concert-crawl/types'

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockProbeVenuePlatform = vi.fn()
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: vi.fn(),
  pauseVenue: vi.fn(),
  activateVenue: vi.fn(),
  setVenueFeatured: vi.fn(),
  generateVenueAbout: vi.fn(),
  probeVenuePlatform: (...args: unknown[]) => mockProbeVenuePlatform(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTitle: vi.fn() }),
}))

vi.mock('@/components/consumer/identity-art/IdentityArt', () => ({
  IdentityArt: () => null,
  ia_getInitials: () => 'TV',
  ia_isDark: () => true,
  identityFor: () => ({ palette: { bg: '#101010' } }),
}))

vi.mock('./DeleteVenueConfirm', () => ({
  DeleteVenueConfirm: () => null,
}))

vi.mock('./generate-field/GenerateField', () => ({
  GenerateField: () => null,
}))

vi.mock('./crawl-trigger-button/CrawlTriggerButton', () => ({
  CrawlTriggerButton: () => null,
}))

// Reads triage over the network behind Clerk auth; these suites are about the
// venue form, and there is no ClerkProvider around them.
vi.mock('@/components/admin/venue-expected-badge/VenueExpectedBadge', () => ({
  VenueExpectedBadge: () => null,
}))

import { VenueDetailsClient } from './VenueDetailsClient'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const PLATFORM_COPY = ADMIN_COPY.venueDetailsClient.fields.platformRouting

// jsdom has no window.matchMedia — VenueDetailsClient reads it for its
// mobile breakpoint effect.
const matchMediaStub = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})

// ───── Helpers ───────────────────────────────────────────────────────────────

const buildVenue = (
  overrides: Partial<VenueWithCrawlHealth> = {},
): VenueWithCrawlHealth => ({
  id: 'venue-1',
  name: 'Test Venue',
  slug: 'test-venue',
  websiteUrl: 'https://testvenue.example.com',
  city: 'Denver',
  timezone: 'America/Denver',
  active: true,
  verified: true,
  verifiedBy: null,
  verifiedAt: null,
  lastCrawledAt: null,
  crawlNotes: null,
  crawlDelayMs: 3000,
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: null,
  consecutiveFailures: 0,
  blockedAt: null,
  crawlPausedAt: null,
  removedAt: null,
  extractionStrategy: null,
  contactEmail: null,
  priceUrl: null,
  ticketVendor: null,
  debugCaptureHtml: false,
  crawlMode: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  address: null,
  capacity: null,
  venueType: null,
  about: null,
  neighborhood: null,
  featured: false,
  lat: null,
  lng: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  crawlHealth: {
    sevenDayPercent: 100,
    sparkline: [],
    lastCrawledAt: null,
    avgDurationMs: null,
    eventsTracked: 0,
    consecutiveFails: 0,
  },
  ...overrides,
})

const platformSelect = (): HTMLSelectElement => {
  const select = document.getElementById('edit-venue-platform')
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('Expected #edit-venue-platform to be a select')
  }
  return select
}

const platformVenueIdInput = (): HTMLInputElement | null => {
  const input = document.getElementById('edit-venue-platform-venue-id')
  if (input !== null && !(input instanceof HTMLInputElement)) {
    throw new Error('Expected #edit-venue-platform-venue-id to be an input')
  }
  return input
}

const probeButton = (): HTMLButtonElement => {
  const btn = screen.getByRole('button', { name: PLATFORM_COPY.probe.button })
  if (!(btn instanceof HTMLButtonElement)) {
    throw new Error('Expected probe button to be an HTMLButtonElement')
  }
  return btn
}

// ───── Tests ─────────────────────────────────────────────────────────────────

describe('VenueDetailsClient — platform routing (#721 #665)', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub)
    mockProbeVenuePlatform.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the platform select with Auto selected and no ID input by default', () => {
    render(<VenueDetailsClient venue={buildVenue()} />)

    expect(platformSelect().value).toBe('')
    expect(platformVenueIdInput()).toBeNull()
    expect(probeButton().disabled).toBe(true)
  })

  it('shows the venue ID input when a platform is selected', () => {
    render(<VenueDetailsClient venue={buildVenue()} />)

    fireEvent.change(platformSelect(), { target: { value: 'aeg' } })

    const idInput = platformVenueIdInput()
    expect(idInput).not.toBeNull()
    expect(screen.getByText(PLATFORM_COPY.platformVenueId.aegHint)).toBeTruthy()
    expect(probeButton().disabled).toBe(false)
  })

  it('hides and clears the venue ID when switching back to Auto', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    )

    expect(platformVenueIdInput()?.value).toBe('89')

    fireEvent.change(platformSelect(), { target: { value: '' } })
    expect(platformVenueIdInput()).toBeNull()

    // Re-selecting the platform starts from a cleared ID, not the stale one
    fireEvent.change(platformSelect(), { target: { value: 'aeg' } })
    expect(platformVenueIdInput()?.value).toBe('')
  })

  it('offers detail-page and collects no venue ID for it (#1435)', () => {
    render(<VenueDetailsClient venue={buildVenue()} />)

    fireEvent.change(platformSelect(), { target: { value: 'detail-page' } })

    expect(platformSelect().value).toBe('detail-page')
    // The fetcher keys off websiteUrl, so there is nothing to enter — and the
    // probe must still be reachable without an ID.
    expect(platformVenueIdInput()).toBeNull()
    expect(probeButton().disabled).toBe(false)
  })

  it('drops a stale venue ID when switching from AEG to detail-page', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    )
    expect(platformVenueIdInput()?.value).toBe('89')

    fireEvent.change(platformSelect(), { target: { value: 'detail-page' } })
    expect(platformVenueIdInput()).toBeNull()

    fireEvent.change(platformSelect(), { target: { value: 'aeg' } })
    expect(platformVenueIdInput()?.value).toBe('')
  })

  it('runs the probe: pending → done renders eventsFound and sourceUrl', async () => {
    const okResult: PlatformProbeResult = {
      ok: true,
      eventsFound: 12,
      fetchLatencyMs: 250,
      sourceUrl: 'https://aegwebprod.blob.core.windows.net/json/events/89',
    }
    let resolveProbe: (value: {
      success: boolean
      data?: PlatformProbeResult
      error?: string
    }) => void = () => undefined
    mockProbeVenuePlatform.mockReturnValue(
      new Promise((resolve) => {
        resolveProbe = resolve
      }),
    )

    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    )

    fireEvent.click(probeButton())

    // Pending state: button swaps to the pending label and disables
    const pendingButton = await screen.findByRole('button', {
      name: PLATFORM_COPY.probe.buttonPending,
    })
    if (!(pendingButton instanceof HTMLButtonElement)) {
      throw new Error('Expected pending probe button to be a button')
    }
    expect(pendingButton.disabled).toBe(true)

    resolveProbe({ success: true, data: okResult })

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes(`12 ${PLATFORM_COPY.probe.okEvents} 250ms`),
        ),
      ).toBeTruthy()
    })
    expect(
      screen.getByText(
        new RegExp('aegwebprod\\.blob\\.core\\.windows\\.net/json/events/89'),
      ),
    ).toBeTruthy()
    expect(mockProbeVenuePlatform).toHaveBeenCalledWith('venue-1', {
      platform: 'aeg',
      platformVenueId: '89',
    })
  })

  it('renders the failure reason when the probe reports ok:false', async () => {
    const failedResult: PlatformProbeResult = {
      ok: false,
      reason: 'fetch_error',
      error: 'AEG feed returned 503',
    }
    mockProbeVenuePlatform.mockResolvedValue({
      success: true,
      data: failedResult,
    })

    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    )

    fireEvent.click(probeButton())

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(PLATFORM_COPY.probe.reasons.fetchError)),
      ).toBeTruthy()
    })
    expect(screen.getByText(/AEG feed returned 503/)).toBeTruthy()
  })

  it('clears a probe result when the venue ID input changes', async () => {
    mockProbeVenuePlatform.mockResolvedValue({
      success: true,
      data: {
        ok: true,
        eventsFound: 12,
        fetchLatencyMs: 250,
        sourceUrl: 'https://aegwebprod.blob.core.windows.net/json/events/89',
      },
    })

    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    )

    fireEvent.click(probeButton())
    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes(`12 ${PLATFORM_COPY.probe.okEvents}`),
        ),
      ).toBeTruthy()
    })

    const idInput = platformVenueIdInput()
    if (!idInput) throw new Error('Expected the venue ID input to render')
    fireEvent.change(idInput, { target: { value: '90' } })

    expect(
      screen.queryByText((content) =>
        content.includes(`12 ${PLATFORM_COPY.probe.okEvents}`),
      ),
    ).toBeNull()
  })

  it('short-circuits to missing_config without a request when the ID is empty', async () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: null })}
      />,
    )

    fireEvent.click(probeButton())

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes(PLATFORM_COPY.probe.reasons.missingConfig),
        ),
      ).toBeTruthy()
    })
    expect(
      screen.getByText((content) =>
        content.includes(PLATFORM_COPY.platformVenueId.requiredError),
      ),
    ).toBeTruthy()
    expect(mockProbeVenuePlatform).not.toHaveBeenCalled()
  })

  it('renders the request-failed message when the action itself fails', async () => {
    mockProbeVenuePlatform.mockResolvedValue({
      success: false,
      error: 'network down',
    })

    render(
      <VenueDetailsClient
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    )

    fireEvent.click(probeButton())

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(PLATFORM_COPY.probe.requestFailed)),
      ).toBeTruthy()
    })
    expect(screen.getByText(/network down/)).toBeTruthy()
  })
})
