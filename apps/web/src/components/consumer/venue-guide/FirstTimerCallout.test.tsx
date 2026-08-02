// @vitest-environment jsdom

import '@testing-library/jest-dom'
import type { VenueGuide } from '@concert-crawl/types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CONSUMER_COPY } from '../definitions/copy'
import { FirstTimerCallout } from './FirstTimerCallout'

afterEach(cleanup)

const copy = CONSUMER_COPY.venueGuide

const populated: VenueGuide = {
  chips: [
    { chipType: 'accessibility', body: 'Ramp.', isPlaceholder: false },
    { chipType: 'parking', body: 'Lot on 13th.', isPlaceholder: false },
  ],
  insiderTip: 'Bar upstairs is never busy.',
  publishedAt: '2026-08-01T12:00:00.000Z',
}

const thin: VenueGuide = {
  chips: [{ chipType: 'accessibility', body: 'Ramp.', isPlaceholder: false }],
  insiderTip: null,
  publishedAt: '2026-08-01T12:00:00.000Z',
}

describe('FirstTimerCallout', () => {
  it('asks the question with the short venue name', () => {
    render(<FirstTimerCallout venueName="The Roxy" guide={populated} />)
    expect(screen.getByText(copy.callout.question('Roxy'))).toBeInTheDocument()
  })

  it('uses the populated sub-copy when the guide has substance', () => {
    render(<FirstTimerCallout venueName="The Roxy" guide={populated} />)
    expect(screen.getByText(copy.callout.populatedSub)).toBeInTheDocument()
    expect(screen.queryByText(copy.callout.thinSub)).toBeNull()
  })

  it('uses the thin sub-copy when only accessibility is known', () => {
    render(<FirstTimerCallout venueName="The Roxy" guide={thin} />)
    expect(screen.getByText(copy.callout.thinSub)).toBeInTheDocument()
  })

  it('jumps to the guide anchor with a labelled 44px target', () => {
    render(<FirstTimerCallout venueName="The Roxy" guide={populated} />)
    const jump = screen.getByRole('link', { name: copy.jumpAriaLabel })
    expect(jump).toHaveAttribute('href', '#ft-guide')
    expect(jump.style.minWidth).toBe('44px')
    expect(jump.style.minHeight).toBe('44px')
  })

  it('marks every decorative svg aria-hidden', () => {
    const { container } = render(
      <FirstTimerCallout venueName="The Roxy" guide={populated} />,
    )
    const svgs = Array.from(container.querySelectorAll('svg'))
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
  })
})
