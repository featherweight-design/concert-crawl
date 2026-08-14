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
import type { VenueWithCrawlHealth } from '@concert-crawl/types'

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockUpdateVenue = vi.fn()
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
  pauseVenue: vi.fn(),
  activateVenue: vi.fn(),
  setVenueFeatured: vi.fn(),
  generateVenueAbout: vi.fn(),
  probeVenuePlatform: vi.fn(),
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

const ADDRESS_COPY = ADMIN_COPY.venueDetailsClient.fields.address
const SAVE_LABEL = ADMIN_COPY.venueDetailsClient.saveBar.saveChanges

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

const addressInput = (): HTMLInputElement => {
  const input = document.getElementById('edit-venue-address')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected #edit-venue-address to be an input')
  }
  return input
}

describe('VenueDetailsClient — street address field', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub)
    mockUpdateVenue.mockReset()
    mockUpdateVenue.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the address input prefilled from the venue', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({ address: '1380 W Florida Ave, Denver, CO 80223' })}
      />,
    )

    expect(addressInput().value).toBe('1380 W Florida Ave, Denver, CO 80223')
    expect(addressInput().placeholder).toBe(ADDRESS_COPY.placeholder)
  })

  it('renders an empty address input when the venue has none', () => {
    render(<VenueDetailsClient venue={buildVenue({ address: null })} />)

    expect(addressInput().value).toBe('')
  })

  it('sends the edited address to updateVenue on save', async () => {
    render(<VenueDetailsClient venue={buildVenue({ address: null })} />)

    fireEvent.change(addressInput(), {
      target: { value: '  1380 W Florida Ave, Denver, CO 80223  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }))

    await waitFor(() => {
      expect(mockUpdateVenue).toHaveBeenCalledTimes(1)
    })

    const call = mockUpdateVenue.mock.calls[0]
    if (!call) throw new Error('Expected updateVenue to have been called')
    const [venueId, formData] = call
    expect(venueId).toBe('venue-1')
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData')
    }
    expect(formData.get('address')).toBe('1380 W Florida Ave, Denver, CO 80223')
  })
})
