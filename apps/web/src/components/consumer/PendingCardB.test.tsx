// @vitest-environment jsdom

import React from 'react'
import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SP_POLICY } from '@concert-crawl/types'
import { PendingCardB, type PendingCardBProps } from './PendingCardB'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const counterPointerLabel =
  CONSUMER_COPY.priceRegion.dispute.counterPointerLabel

// Anchor a fixed "now" so `formatTimeAgo` is deterministic. Tests that need
// a different elapsed window set `submittedAt` relative to NOW.
const NOW = new Date('2026-06-17T12:00:00.000Z')

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  vi.useRealTimers()
})

const minutesAgo = (mins: number): string =>
  new Date(NOW.getTime() - mins * 60_000).toISOString()

function buildProps(
  overrides: Partial<PendingCardBProps> = {},
): PendingCardBProps {
  return {
    floor: 25,
    ceiling: null,
    tier: 'GA',
    vendor: 'AXS',
    kind: 'community',
    submitter: { handle: '@friend', url: 'https://example.com/friend' },
    submittedAt: minutesAgo(5),
    confirms: 1,
    needed: 2,
    view: 'other',
    note: null,
    onConfirm: vi.fn(),
    onWithdraw: vi.fn(),
    onEdit: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('PendingCardB', () => {
  describe('strip header', () => {
    it('shows "{confirms} of {needed} confirmed" and "{remaining} to go"', () => {
      render(<PendingCardB {...buildProps({ confirms: 1, needed: 3 })} />)
      expect(screen.getByText(/1\s+of\s+3\s+confirmed/i)).toBeTruthy()
      // 3 needed - 1 confirmed = 2 remaining
      expect(screen.getByText(/2\s+to go/i)).toBeTruthy()
    })
  })

  describe('imminent-show tag (#895)', () => {
    // Derive the confirm denominators from policy so the test intent survives
    // a change to SP_POLICY: the tag is driven by `needed` exceeding the
    // standard requirement, not by the literal values 2/3.
    it('renders the "Days away" tag inside an accessible trigger and reveals the tooltip on click', () => {
      render(
        <PendingCardB
          {...buildProps({
            confirms: 1,
            needed: SP_POLICY.confirmsRequiredImminent,
          })}
        />,
      )
      expect(screen.getByText('Days away')).toBeTruthy()

      // The trigger is a real button so it is keyboard-focusable, with a
      // concise accessible name; the explanation is exposed via the tooltip
      // (aria-describedby) once opened, not baked into the name.
      const trigger = screen.getByRole('button', { name: /days away/i })

      // Click-triggered (no native title hover delay): the tooltip appears only
      // after activating the trigger, and describes the trigger while open.
      expect(screen.queryByRole('tooltip')).toBeNull()
      fireEvent.click(trigger)
      const tooltip = screen.getByRole('tooltip')
      expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id)
      expect(tooltip.textContent).toMatch(
        new RegExp(`${SP_POLICY.imminentThresholdDays} days?`, 'i'),
      )
      expect(tooltip.textContent).toMatch(
        new RegExp(
          `${SP_POLICY.confirmsRequiredImminent} confirmations? instead of ${SP_POLICY.confirmsRequired}`,
          'i',
        ),
      )
    })

    it('does not render the imminent tag for a standard-confirm show', () => {
      render(
        <PendingCardB
          {...buildProps({ confirms: 1, needed: SP_POLICY.confirmsRequired })}
        />,
      )
      expect(screen.queryByText('Days away')).toBeNull()
    })
  })

  describe('price headline', () => {
    it('renders single price when ceiling is null', () => {
      render(<PendingCardB {...buildProps({ floor: 30, ceiling: null })} />)
      expect(screen.getByText('$30')).toBeTruthy()
    })

    it('renders single price when ceiling equals floor', () => {
      render(<PendingCardB {...buildProps({ floor: 30, ceiling: 30 })} />)
      expect(screen.getByText('$30')).toBeTruthy()
    })

    it('renders range when ceiling > floor', () => {
      render(<PendingCardB {...buildProps({ floor: 30, ceiling: 60 })} />)
      expect(screen.getByText('$30–$60')).toBeTruthy()
    })
  })

  describe('kind: community vs box-office', () => {
    it('community shows "Tickets" eyebrow and no face-value line', () => {
      render(<PendingCardB {...buildProps({ kind: 'community' })} />)
      expect(screen.getByText('Tickets')).toBeTruthy()
      expect(screen.queryByText(/face value/i)).toBeNull()
    })

    it('box-office shows "Box office" eyebrow and "face value · no fees" line', () => {
      render(<PendingCardB {...buildProps({ kind: 'boxoffice' })} />)
      // Two 'Box office' renderings on the box-office tier — the Eyebrow at the
      // top of the body and the PendingTrustPill on the headline row. The
      // community variant (separate test above) asserts neither appears, so
      // requiring ≥ 2 here catches removal of either element.
      expect(screen.getAllByText('Box office').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/face value/i)).toBeTruthy()
    })
  })

  describe('vendor display', () => {
    it('formats VenueBoxOffice as "Venue box office"', () => {
      render(<PendingCardB {...buildProps({ vendor: 'VenueBoxOffice' })} />)
      expect(screen.getByText(/seen on\s+Venue box office/i)).toBeTruthy()
    })

    it('passes through other vendor names unchanged', () => {
      render(<PendingCardB {...buildProps({ vendor: 'SeatGeek' })} />)
      expect(screen.getByText(/seen on\s+SeatGeek/)).toBeTruthy()
    })
  })

  describe('attribution line', () => {
    it('view "other" with a submitter renders the handle as a link', () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'other',
            submitter: { handle: '@friend', url: 'https://example.com/friend' },
          })}
        />,
      )
      const link = screen.getByRole('link', { name: '@friend' })
      expect(link.getAttribute('href')).toBe('https://example.com/friend')
      expect(screen.queryByText('you')).toBeNull()
    })

    it('view "other" with a null submitter renders "an anonymous fan"', () => {
      render(
        <PendingCardB {...buildProps({ view: 'other', submitter: null })} />,
      )
      expect(screen.getByText('an anonymous fan')).toBeTruthy()
      expect(screen.queryByRole('link', { name: '@friend' })).toBeNull()
    })

    it('view "submitter" renders "you" regardless of submitter prop', () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'submitter',
            submitter: { handle: '@friend', url: 'https://example.com/friend' },
          })}
        />,
      )
      expect(screen.getByText('you')).toBeTruthy()
      expect(screen.queryByRole('link', { name: '@friend' })).toBeNull()
    })

    it('view "self-locked" renders "you" regardless of submitter prop', () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'self-locked',
            kind: 'boxoffice',
            submitter: { handle: '@friend', url: 'https://example.com/friend' },
          })}
        />,
      )
      expect(screen.getByText('you')).toBeTruthy()
    })
  })

  describe('footer per view', () => {
    it('view "other" renders Edit ("Saw a different number?") + Confirm CTAs', () => {
      const props = buildProps({ view: 'other' })
      render(<PendingCardB {...props} />)
      expect(
        screen.getByRole('button', { name: /saw a different number/i }),
      ).toBeTruthy()
      expect(
        screen.getByRole('button', { name: /confirm price/i }),
      ).toBeTruthy()
      // Other-view footer should not surface the submitter labels
      expect(screen.queryByText('Your submission')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
    })

    it('view "submitter" renders Your-submission label + Edit + Withdraw', () => {
      render(<PendingCardB {...buildProps({ view: 'submitter' })} />)
      expect(screen.getByText('Your submission')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Withdraw' })).toBeTruthy()
      expect(
        screen.queryByRole('button', { name: /confirm price/i }),
      ).toBeNull()
    })

    it('view "self-locked" renders Your-submission label + waiting copy, no Edit/Withdraw', () => {
      render(
        <PendingCardB
          {...buildProps({ view: 'self-locked', kind: 'boxoffice' })}
        />,
      )
      expect(screen.getByText('Your submission')).toBeTruthy()
      expect(screen.getByText('Waiting on one more fan')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
      expect(
        screen.queryByRole('button', { name: /confirm price/i }),
      ).toBeNull()
    })
  })

  describe('callbacks', () => {
    it('view "other": clicking Confirm calls onConfirm', () => {
      const onConfirm = vi.fn()
      const onEdit = vi.fn()
      render(
        <PendingCardB {...buildProps({ view: 'other', onConfirm, onEdit })} />,
      )
      fireEvent.click(screen.getByRole('button', { name: /confirm price/i }))
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onEdit).not.toHaveBeenCalled()
    })

    it('view "other": clicking "Saw a different number?" calls onEdit', () => {
      const onConfirm = vi.fn()
      const onEdit = vi.fn()
      render(
        <PendingCardB {...buildProps({ view: 'other', onConfirm, onEdit })} />,
      )
      fireEvent.click(
        screen.getByRole('button', { name: /saw a different number/i }),
      )
      expect(onEdit).toHaveBeenCalledTimes(1)
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('view "submitter": Edit and Withdraw call their respective handlers', () => {
      const onEdit = vi.fn()
      const onWithdraw = vi.fn()
      render(
        <PendingCardB
          {...buildProps({ view: 'submitter', onEdit, onWithdraw })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
      expect(onEdit).toHaveBeenCalledTimes(1)
      expect(onWithdraw).toHaveBeenCalledTimes(1)
    })
  })

  describe('note', () => {
    it('renders a quoted block when note is present', () => {
      render(<PendingCardB {...buildProps({ note: 'in line now' })} />)
      expect(screen.getByText(/in line now/)).toBeTruthy()
    })

    it('hides the block when note is null', () => {
      render(<PendingCardB {...buildProps({ note: null })} />)
      expect(screen.queryByText(/“|”/)).toBeNull()
    })

    it('hides the block when note is an empty string', () => {
      render(<PendingCardB {...buildProps({ note: '' })} />)
      expect(screen.queryByText(/“|”/)).toBeNull()
    })
  })

  describe('formatTimeAgo', () => {
    it('renders minutes when under an hour', () => {
      render(<PendingCardB {...buildProps({ submittedAt: minutesAgo(12) })} />)
      expect(screen.getByText('12m ago')).toBeTruthy()
    })

    it('renders hours when between 1 and 24 hours', () => {
      // 2 hours = 120 minutes
      render(
        <PendingCardB {...buildProps({ submittedAt: minutesAgo(2 * 60) })} />,
      )
      expect(screen.getByText('2h ago')).toBeTruthy()
    })

    it('renders days when 24+ hours', () => {
      // 3 days = 72 hours = 4320 minutes
      render(
        <PendingCardB
          {...buildProps({ submittedAt: minutesAgo(3 * 24 * 60) })}
        />,
      )
      expect(screen.getByText('3d ago')).toBeTruthy()
    })
  })

  describe('counter pointer (LOCKED §9 Q3 — Appendix A.4)', () => {
    it("when counterPointer is set, the 'Saw a different number?' button is NOT in the DOM", () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'other',
            counterPointer: { href: '#counter-abc' },
          })}
        />,
      )
      expect(screen.queryByText(/saw a different/i)).toBeNull()
    })

    it('when counterPointer is set, renders the coral pointer link with the locked label, href, mono uppercase styling', () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'other',
            counterPointer: { href: '#counter-abc' },
          })}
        />,
      )
      const link = screen.getByRole('link', {
        name: counterPointerLabel,
      })
      expect(link.getAttribute('href')).toBe('#counter-abc')
      // Coral (oklch) + mono + uppercase per Appendix A.4
      // jsdom normalizes the trailing zero on 0.20 → 0.2
      expect(link.getAttribute('style')).toMatch(/oklch\(0\.65 0\.2 25\)/)
      expect(link.getAttribute('style')).toMatch(/JetBrains Mono/)
      expect(link.getAttribute('style')).toMatch(/text-transform:\s*uppercase/)
    })

    it("when counterPointer is set, the 'Confirm price' button is STILL rendered", () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'other',
            counterPointer: { href: '#counter-abc' },
          })}
        />,
      )
      expect(screen.getByText('Confirm price')).toBeTruthy()
    })

    it("when counterPointer is null/omitted, the original 'Saw a different number?' button renders", () => {
      render(<PendingCardB {...buildProps({ view: 'other' })} />)
      expect(screen.getByText(/saw a different/i)).toBeTruthy()
      expect(
        screen.queryByRole('link', { name: counterPointerLabel }),
      ).toBeNull()
    })
  })

  describe("§8 state #18 — admin defer pill on view='other'", () => {
    it("renders 'Admin requested more info' pill in place of the 'to go' caption when lastAdminActionKind='defer'", () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'other',
            confirms: 1,
            needed: 2,
            lastAdminActionKind: 'defer',
          })}
        />,
      )
      // Pill copy comes from CONSUMER_COPY.priceRegion.adminDeferPillLabel.
      expect(screen.getByText(/admin requested more info/i)).toBeTruthy()
      // The "to go" caption is suppressed when the pill takes over the slot.
      expect(screen.queryByText(/to go/i)).toBeNull()
    })

    it("does NOT render the pill when view='submitter' (engagement signal only on counters from someone else)", () => {
      render(
        <PendingCardB
          {...buildProps({
            view: 'submitter',
            lastAdminActionKind: 'defer',
          })}
        />,
      )
      expect(screen.queryByText(/admin requested more info/i)).toBeNull()
      expect(screen.getByText(/to go/i)).toBeTruthy()
    })

    it('does NOT render the pill when lastAdminActionKind is null/omitted', () => {
      render(<PendingCardB {...buildProps({ view: 'other' })} />)
      expect(screen.queryByText(/admin requested more info/i)).toBeNull()
      expect(screen.getByText(/to go/i)).toBeTruthy()
    })
  })
})
