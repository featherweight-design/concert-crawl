// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CONSUMER_COPY } from '../definitions/copy'
import { EventFirstTimerChip } from './EventFirstTimerChip'

afterEach(cleanup)

const copy = CONSUMER_COPY.venueGuide

describe('EventFirstTimerChip', () => {
  it('links to the venue guide anchor for a first-timer', () => {
    render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="first_timer"
      />,
    )
    const chip = screen.getByTestId('event-first-timer-chip')
    expect(chip).toHaveAttribute('href', '/venues/the-roxy#ft-guide')
    expect(chip).toHaveTextContent(copy.eventChip('Roxy'))
  })

  it('renders nothing when the venue has no published guide', () => {
    const { container } = render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished={false}
        mode="first_timer"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a returner', () => {
    const { container } = render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="returner"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('clears the 44px touch-target floor', () => {
    render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="first_timer"
      />,
    )
    expect(screen.getByTestId('event-first-timer-chip').style.minHeight).toBe(
      '44px',
    )
  })

  it('marks its decorative svg aria-hidden', () => {
    const { container } = render(
      <EventFirstTimerChip
        venueName="The Roxy"
        venueSlug="the-roxy"
        venueGuidePublished
        mode="first_timer"
      />,
    )
    const svgs = Array.from(container.querySelectorAll('svg'))
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
  })
})
