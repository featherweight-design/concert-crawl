// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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
})

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/components/brand/cc-mark', () => ({
  CCMark: () => <div data-testid="cc-mark" />,
}))
vi.mock('lucide-react', () => ({
  ShieldCheck: () => <svg data-testid="shield-check-icon" />,
}))
vi.mock('@/lib/sp-policy', () => ({
  validateSubmission: () => ({ valid: true, errors: {}, warnings: {} }),
}))

// Default: no existing submission
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    data: { alreadySubmitted: false, userSubmission: null },
  }),
})

import { SubmitPriceModal } from './SubmitPriceModal'

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  eventId: 'evt-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  date: '2099-07-15T19:00:00.000Z',
}

// Fill the form with values that pass the runtime type-guard in handleSubmit.
// validateSubmission is mocked above (always valid), but the component does a
// follow-up isTier/isVendor/isSourceCategory check before sending the payload,
// so we have to click through the chip groups to seed real enum values.
async function fillForm() {
  await waitFor(() => expect(screen.getByText('Box office')).toBeTruthy())
  fireEvent.click(screen.getByText('Box office')) // sourceCategory + vendor auto-fill
  fireEvent.click(screen.getByText('GA')) // tier
  // Floor needs a value > 0 (the form validates floor min); the runtime guard
  // doesn't check floor specifically but mocked validateSubmission already
  // skips the check, so any number works.
  const floorInput = screen.getByLabelText(/Face value/i) as HTMLInputElement
  fireEvent.change(floorInput, { target: { value: '32' } })
}

describe('SubmitPriceModal — form view', () => {
  it('renders nothing when closed', () => {
    render(<SubmitPriceModal {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the form after checking for existing submission', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    expect(screen.getByText('Radiohead')).toBeTruthy()
    expect(screen.getByText(/Red Rocks/)).toBeTruthy()
  })

  it('renders the ShieldCheck icon in the anti-abuse banner', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByTestId('shield-check-icon')).toBeTruthy(),
    )
  })

  it('renders tier chip options', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('GA')).toBeTruthy())
    expect(screen.getByText('VIP')).toBeTruthy()
  })

  it('renders source-category options and they appear BEFORE the floor field in DOM order', async () => {
    const { container } = render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByText("Where's this price from?")).toBeTruthy(),
    )
    expect(screen.getByText('Box office')).toBeTruthy()
    expect(screen.getByText('Standard ticket')).toBeTruthy()
    expect(screen.getByText('Resale')).toBeTruthy()

    // Source group must precede the Floor field in DOM order
    const sourceLabel = screen.getByText("Where's this price from?")
    const floorLabel = screen.getByText('Floor')
    const orderPosition = sourceLabel.compareDocumentPosition(floorLabel)
    // Node.DOCUMENT_POSITION_FOLLOWING === 0x04
    expect(orderPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Should NOT render the old howFound chip group
    expect(screen.queryByText('Bought it myself')).toBeNull()
    expect(screen.queryByText('Saw the listing')).toBeNull()
    expect(container).toBeDefined()
  })

  it("clicking source='boxoffice' switches the floor label to 'Face value' and renders the 'printed price' hint", async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Box office')).toBeTruthy())
    fireEvent.click(screen.getByText('Box office'))
    await waitFor(() => expect(screen.getByText('Face value')).toBeTruthy())
    expect(screen.getByText('the printed price')).toBeTruthy()
    // Floor label should be replaced, not duplicated
    expect(screen.queryByText('Floor')).toBeNull()
  })

  it("clicking source='resale' switches the floor label to 'Resale price'", async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Resale')).toBeTruthy())
    fireEvent.click(screen.getByText('Resale'))
    await waitFor(() => expect(screen.getByText('Resale price')).toBeTruthy())
    expect(screen.queryByText('Floor')).toBeNull()
  })

  it("source='boxoffice' auto-fills the vendor to 'Venue' and renders the auto-filled note", async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Box office')).toBeTruthy())
    fireEvent.click(screen.getByText('Box office'))
    await waitFor(() =>
      expect(
        screen.getByText('Auto-filled because source is box office'),
      ).toBeTruthy(),
    )
    // The Vendor chip "Venue" should be present (vendor auto-fills to VenueBoxOffice)
    expect(screen.getByText('Venue')).toBeTruthy()
  })

  it('switching source away from boxoffice clears the auto-filled vendor', async () => {
    // Regression test for Copilot R2 finding: previously the vendor stayed
    // as 'Venue' (VenueBoxOffice) when the user switched the source category
    // away from 'boxoffice', allowing inconsistent payloads (e.g. resale
    // price tagged with box-office vendor).
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Box office')).toBeTruthy())
    // Pick boxoffice → vendor auto-fills, auto-filled note appears
    fireEvent.click(screen.getByText('Box office'))
    await waitFor(() =>
      expect(
        screen.getByText('Auto-filled because source is box office'),
      ).toBeTruthy(),
    )
    // Switch to resale → auto-filled note should disappear (vendor cleared)
    fireEvent.click(screen.getByText('Resale'))
    await waitFor(() =>
      expect(
        screen.queryByText('Auto-filled because source is box office'),
      ).toBeNull(),
    )
  })
})

describe('SubmitPriceModal — success state', () => {
  it('shows success view after successful submission', async () => {
    // First call: check existing (none). Second call: submit (success).
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await fillForm()

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Got it.')).toBeTruthy())
    expect(screen.getByText('Back to show')).toBeTruthy()
    expect(screen.queryByText('Submit another')).toBeNull()
  })
})

describe('SubmitPriceModal — payload shape', () => {
  it('POST body includes sourceCategory + derived howFound; no standalone howFound chip-group field', async () => {
    let postBody: unknown
    let callCount = 0
    global.fetch = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { alreadySubmitted: false, userSubmission: null },
            }),
          })
        }
        if (init?.body) {
          postBody = JSON.parse(init.body as string)
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'sub-new',
              priceMin: '32',
              priceMax: null,
              tier: 'GA',
              vendor: 'VenueBoxOffice',
              howFound: 'bought_myself',
              sourceCategory: 'boxoffice',
            },
          }),
        })
      })

    render(<SubmitPriceModal {...defaultProps} />)
    await fillForm()
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Got it.')).toBeTruthy())

    expect(postBody).toBeDefined()
    const body = postBody as Record<string, unknown>
    expect(body['sourceCategory']).toBe('boxoffice')
    // boxoffice → bought_myself per howFoundForSource
    expect(body['howFound']).toBe('bought_myself')
    // boxoffice auto-fills vendor to VenueBoxOffice (API value preserved)
    expect(body['vendor']).toBe('VenueBoxOffice')
  })
})

describe('SubmitPriceModal — 409 race toast', () => {
  it('surfaces the disputeRace409Toast and returns to form when 409 has no `submission` payload', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      // 409 without `submission` body → race-case (counter conflict)
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error:
            'Another challenge is already pending against this submission.',
        }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await fillForm()
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() =>
      expect(
        screen.getByText(
          'Another challenge was just filed — refresh to see it.',
        ),
      ).toBeTruthy(),
    )
    // Form is still visible (not transitioned to alreadySubmitted)
    expect(screen.queryByText('Already in.')).toBeNull()
    // Source field still on screen — confirms we returned to 'form'
    expect(screen.getByText("Where's this price from?")).toBeTruthy()
  })
})

describe('SubmitPriceModal — error state (#398)', () => {
  it('shows full error view (not inline text) when submission fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() =>
      expect(screen.getByText('Didn’t go through.')).toBeTruthy(),
    )
    expect(screen.getByText('Try again')).toBeTruthy()
    expect(screen.getByText('Close')).toBeTruthy()
    // Must NOT use the old inline error text pattern
    expect(screen.queryByText('Something went wrong.')).toBeNull()
  })

  it('returns to form with "Try again"', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() =>
      expect(screen.getByText('Didn’t go through.')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('Try again'))
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
  })
})

describe('SubmitPriceModal — alreadySubmitted state', () => {
  it('starts in alreadySubmitted when existing submission is found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          alreadySubmitted: true,
          userSubmission: {
            id: 'sub-1',
            priceMin: 45,
            priceMax: 75,
            tier: 'GA',
            vendor: 'AXS',
          },
        },
      }),
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
    expect(screen.getByText(/\$45/)).toBeTruthy()
    expect(screen.getByText('Edit submission')).toBeTruthy()
    expect(screen.getByText('Withdraw')).toBeTruthy()
  })

  it('transitions to alreadySubmitted on 409 from POST when `submission` payload is included', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      // 409 WITH `submission` body — the "already submitted" flavor, not the
      // race-case. Per PR 4 the race-case (empty 409 body) now surfaces
      // disputeRace409Toast and stays on form; see "409 race toast" describe.
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({
          submission: {
            id: 'sub-existing',
            priceMin: '40',
            priceMax: null,
            tier: 'GA',
            vendor: 'AXS',
          },
        }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await fillForm()
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
  })

  it('sets existingSubmission from 409 body and Withdraw succeeds → modal closes', async () => {
    const onClose = vi.fn()
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Initial check: no existing submission
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      if (callCount === 2) {
        // POST returns 409 with submission data
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            submission: {
              id: 'sub-409',
              priceMin: '55',
              priceMax: null,
              tier: 'GA',
              vendor: 'AXS',
            },
          }),
        })
      }
      // DELETE succeeds
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} onClose={onClose} />)
    await fillForm()

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
    expect(screen.getByText(/\$55/)).toBeTruthy()

    fireEvent.click(screen.getByText('Withdraw'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('shows error state when Withdraw fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Initial check: no existing submission
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      if (callCount === 2) {
        // POST returns 409 with submission data
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            submission: {
              id: 'sub-409',
              priceMin: '55',
              priceMax: null,
              tier: 'GA',
              vendor: 'AXS',
            },
          }),
        })
      }
      // DELETE fails
      return Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await fillForm()

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())

    fireEvent.click(screen.getByText('Withdraw'))
    await waitFor(() =>
      expect(screen.getByText('Didn’t go through.')).toBeTruthy(),
    )
    expect(screen.getByText('Try again')).toBeTruthy()
    // Should show a non-network-specific error for a 403
    expect(screen.queryByText(/Couldn't reach the server/)).toBeNull()
  })
})

describe('SubmitPriceModal — multi-tier panels (#832)', () => {
  it('starts with one panel and no remove control', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    expect(screen.getAllByText('Tier')).toHaveLength(1)
    expect(screen.queryByLabelText(/^Remove /)).toBeNull()
    expect(screen.getByText('+ Add another tier')).toBeTruthy()
  })

  it('"+ Add another tier" appends a panel and updates the submit label', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('+ Add another tier'))
    expect(screen.getAllByText('Tier')).toHaveLength(2)
    expect(screen.getByText('Submit 2 tiers')).toBeTruthy()
    expect(screen.queryByText('Submit price')).toBeNull()
    // Both panels now show a remove control
    expect(screen.getAllByLabelText(/^Remove /)).toHaveLength(2)
  })

  it('a tier chosen in one panel is disabled in the other panel', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('GA')) // select GA in panel 0
    fireEvent.click(screen.getByText('+ Add another tier'))
    const gaChips = screen
      .getAllByText('GA')
      .map((node) => node.closest('button'))
    expect(gaChips).toHaveLength(2)
    expect(gaChips[0]?.disabled).toBe(false) // own selection stays active
    expect(gaChips[1]?.disabled).toBe(true) // other panel's GA greyed out
  })

  it('removing a panel re-enables its tier elsewhere and restores the single-panel label', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('GA'))
    fireEvent.click(screen.getByText('+ Add another tier'))
    // Panel 0 is the GA panel -> its remove control is labeled "Remove GA"
    fireEvent.click(screen.getByLabelText('Remove GA'))
    expect(screen.getAllByText('Tier')).toHaveLength(1)
    expect(screen.getByText('Submit price')).toBeTruthy()
    const gaButton = screen.getByText('GA').closest('button')
    expect(gaButton?.disabled).toBe(false)
    expect(screen.queryByLabelText(/^Remove /)).toBeNull()
  })

  it('hides the add-tier button once all 5 tiers have panels', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    for (let clickCount = 0; clickCount < 4; clickCount++) {
      fireEvent.click(screen.getByText('+ Add another tier'))
    }
    expect(screen.getAllByText('Tier')).toHaveLength(5)
    expect(screen.queryByText('+ Add another tier')).toBeNull()
  })

  it('bundle fields (source, vendor) render once, above the tier panels', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('+ Add another tier'))
    expect(screen.getAllByText("Where's this price from?")).toHaveLength(1)
    expect(screen.getAllByText('Vendor')).toHaveLength(1)
    // Vendor (bundle-level) must precede the first Tier group in DOM order
    const vendorLabel = screen.getByText('Vendor')
    const firstTierLabel = screen.getAllByText('Tier')[0]!
    const orderPosition = vendorLabel.compareDocumentPosition(firstTierLabel)
    expect(orderPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('SubmitPriceModal — edit mode constraints (#832)', () => {
  it('edit mode locks the tier, hides add-tier, and labels the button "Save changes"', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          alreadySubmitted: true,
          userSubmission: {
            id: 'sub-1',
            priceMin: '45',
            priceMax: null,
            tier: 'GA',
            vendor: 'AXS',
            howFound: 'saw_listing',
            sourceCategory: 'standard',
          },
        },
      }),
    })
    render(<SubmitPriceModal {...defaultProps} openInEditMode />)
    await waitFor(() => expect(screen.getByText('Save changes')).toBeTruthy())
    expect(screen.queryByText('+ Add another tier')).toBeNull()
    expect(screen.queryByLabelText(/^Remove /)).toBeNull()
    const gaButton = screen.getByText('GA').closest('button')
    const vipButton = screen.getByText('VIP').closest('button')
    expect(gaButton?.disabled).toBe(true)
    expect(vipButton?.disabled).toBe(true)
    // Prefilled floor from the existing submission
    const floorInput = screen.getByLabelText(/Floor/i)
    expect((floorInput as HTMLInputElement).value).toBe('45')
  })
})
