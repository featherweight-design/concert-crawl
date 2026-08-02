// @vitest-environment jsdom

import '@testing-library/jest-dom'
import type { VenueGuide } from '@concert-crawl/types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CONSUMER_COPY } from '../definitions/copy'
import { GuideSection } from './GuideSection'

afterEach(cleanup)

const copy = CONSUMER_COPY.venueGuide

const guide = (overrides: Partial<VenueGuide> = {}): VenueGuide => ({
  chips: [
    {
      chipType: 'accessibility',
      body: 'Ramp at stage left.',
      isPlaceholder: false,
    },
    { chipType: 'parking', body: 'Lot on 13th, $10.', isPlaceholder: false },
    {
      chipType: 'transit',
      body: 'RTD 15 stops out front.',
      isPlaceholder: false,
    },
  ],
  insiderTip: 'Bar upstairs is never busy.',
  publishedAt: '2026-08-01T12:00:00.000Z',
  ...overrides,
})

describe('GuideSection', () => {
  it('renders nothing when the venue has no published guide', () => {
    const { container } = render(
      <GuideSection venueName="The Roxy" guide={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('leads with the insider tip, before any chip', () => {
    render(<GuideSection venueName="The Roxy" guide={guide()} />)
    const section = screen.getByTestId('venue-guide')
    const tip = screen.getByTestId('guide-insider-tip')
    const firstChip = screen.getByTestId('guide-chip-accessibility')
    expect(section).toContainElement(tip)
    expect(
      tip.compareDocumentPosition(firstChip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('omits the insider tip element entirely when there is no tip', () => {
    render(
      <GuideSection venueName="The Roxy" guide={guide({ insiderTip: null })} />,
    )
    expect(screen.queryByTestId('guide-insider-tip')).toBeNull()
  })

  it('orders chips by GUIDE_CHIP_ORDER with accessibility first', () => {
    render(
      <GuideSection
        venueName="The Roxy"
        guide={guide({
          chips: [
            { chipType: 'transit', body: 'RTD 15.', isPlaceholder: false },
            { chipType: 'accessibility', body: 'Ramp.', isPlaceholder: false },
            { chipType: 'parking', body: 'Lot on 13th.', isPlaceholder: false },
          ],
        })}
      />,
    )
    const rendered = screen
      .getAllByTestId(/^guide-chip-/)
      .map((node) => node.getAttribute('data-testid'))
    expect(rendered).toEqual([
      'guide-chip-accessibility',
      'guide-chip-parking',
      'guide-chip-transit',
    ])
  })

  it('renders the honest accessibility row when accessibility is a placeholder', () => {
    render(
      <GuideSection
        venueName="The Roxy"
        guide={guide({
          chips: [
            { chipType: 'accessibility', body: '', isPlaceholder: true },
            { chipType: 'parking', body: 'Lot on 13th.', isPlaceholder: false },
          ],
        })}
      />,
    )
    expect(
      screen.getByTestId('guide-chip-accessibility-placeholder'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(copy.accessibilityNotDocumented),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.accessibilityPlaceholder)).toBeInTheDocument()
  })

  it('lists only the unauthored chips as still gathering', () => {
    render(<GuideSection venueName="The Roxy" guide={guide()} />)
    const gathering = screen.getByTestId('guide-still-gathering')
    expect(gathering).toHaveTextContent(
      copy.stillGathering([
        copy.chipLabels.age_policy,
        copy.chipLabels.bag_check,
        copy.chipLabels.coat_check,
        copy.chipLabels.will_call,
        copy.chipLabels.food_drink,
      ]),
    )
  })

  it('states the missing topics as prose, not as tappable-looking pills', () => {
    // Dashed pills carry the visual grammar of filter chips; there is nothing
    // behind these to open, so a user tapping one gets silence.
    render(<GuideSection venueName="The Roxy" guide={guide()} />)
    const gathering = screen.getByTestId('guide-still-gathering')
    expect(gathering.querySelector('li')).toBeNull()
    expect(gathering.querySelector('button')).toBeNull()
    expect(gathering.querySelector('a')).toBeNull()
  })

  it('drops the duplicate section eyebrow when the callout already sits above', () => {
    const { rerender } = render(
      <GuideSection venueName="The Roxy" guide={guide()} />,
    )
    expect(screen.getByText(copy.sectionEyebrow)).toBeInTheDocument()
    rerender(
      <GuideSection venueName="The Roxy" guide={guide()} followsCallout />,
    )
    expect(screen.queryByText(copy.sectionEyebrow)).toBeNull()
  })

  it('omits the still-gathering block when every chip is authored', () => {
    render(
      <GuideSection
        venueName="The Roxy"
        guide={guide({
          chips: [
            { chipType: 'accessibility', body: 'Ramp.', isPlaceholder: false },
            { chipType: 'parking', body: 'Lot.', isPlaceholder: false },
            { chipType: 'age_policy', body: '16+.', isPlaceholder: false },
            { chipType: 'bag_check', body: 'No bags.', isPlaceholder: false },
            { chipType: 'coat_check', body: '$3.', isPlaceholder: false },
            {
              chipType: 'will_call',
              body: 'Box office.',
              isPlaceholder: false,
            },
            { chipType: 'food_drink', body: 'Two bars.', isPlaceholder: false },
            { chipType: 'transit', body: 'RTD 15.', isPlaceholder: false },
          ],
        })}
      />,
    )
    expect(screen.queryByTestId('guide-still-gathering')).toBeNull()
  })

  it('renders the honest footer naming the venue in the thin state', () => {
    render(
      <GuideSection
        venueName="The Roxy"
        guide={guide({
          chips: [
            { chipType: 'accessibility', body: 'Ramp.', isPlaceholder: false },
          ],
          insiderTip: null,
        })}
      />,
    )
    expect(screen.getByText(copy.thinFooter('Roxy'))).toBeInTheDocument()
  })

  it('withholds the "new to us" footer from a populated guide', () => {
    // The ghost pills still belong on a populated guide, but the closing line
    // says the venue is new to us — beside an insider tip and several authored
    // chips that reads as a lie.
    render(<GuideSection venueName="The Roxy" guide={guide()} />)
    expect(screen.getByTestId('guide-still-gathering')).toBeInTheDocument()
    expect(screen.queryByText(copy.thinFooter('Roxy'))).toBeNull()
  })

  it('marks every decorative svg aria-hidden', () => {
    const { container } = render(
      <GuideSection venueName="The Roxy" guide={guide()} />,
    )
    const svgs = Array.from(container.querySelectorAll('svg'))
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('anchors the section at #ft-guide so the callout jump lands', () => {
    render(<GuideSection venueName="The Roxy" guide={guide()} />)
    expect(screen.getByTestId('venue-guide')).toHaveAttribute('id', 'ft-guide')
  })
})
