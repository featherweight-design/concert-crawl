// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EventRow } from './EventRow'
import type { EventRowShow } from './lib/row-model'
import { rowChips } from './lib/row-chips'

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// jsdom has no layout engine, so the measure passes see a zero-width box and
// fall through to their pre-layout defaults (the ResizeObserver stub lives in
// the shared test setup). That is the behaviour asserted here; the geometry
// itself is covered by the pure helpers.
afterEach(() => {
  cleanup()
})

function makeShow(partial: Partial<EventRowShow> = {}): EventRowShow {
  return {
    id: 'evt-1',
    headliner: 'Test Artist',
    fallbackTitle: 'Test Artist at Test Ballroom',
    supports: [],
    tourName: null,
    imageUrl: null,
    artistPhotoUrl: null,
    venueName: 'Test',
    venueSlug: 'test',
    dateLabel: 'Sat, Aug 15',
    timeLabel: '8:00 PM',
    price: {
      amount: 68,
      isFloor: true,
      source: null,
      observedAt: null,
      isPending: false,
    },
    saved: null,
    genres: [],
    isFollowed: false,
    crewGoing: null,
    isWatching: false,
    status: 'live',
    lifecycle: 'upcoming',
    ...partial,
  }
}

describe('EventRow — Rule 1, context subtraction', () => {
  it('drops the date on Browse, which states it in the group header', () => {
    render(<EventRow show={makeShow()} surface="browse" />)
    expect(screen.getByTestId('when-where').textContent).not.toContain('Aug 15')
    expect(screen.getByTestId('when-where').textContent).toContain('8:00 PM')
  })

  it('drops the venue on a venue page, which is the venue', () => {
    render(<EventRow show={makeShow()} surface="venue" />)
    expect(screen.queryByTestId('venue-name-link')).toBeNull()
    expect(screen.getByTestId('when-where').textContent).toContain('Aug 15')
  })

  it('keeps all three units on Watching, whose headers are loose windows', () => {
    render(<EventRow show={makeShow()} surface="watching" />)
    const line = screen.getByTestId('when-where').textContent ?? ''
    expect(line).toContain('Aug 15')
    expect(line).toContain('8:00 PM')
    expect(screen.getByTestId('venue-name-link')).not.toBeNull()
  })
})

describe('EventRow — the row is a link, not a click handler', () => {
  it('gives the row one stretched anchor named by the artist', () => {
    render(<EventRow show={makeShow()} surface="browse" />)
    const stretch = document.querySelector('a.event-row-stretch')
    expect(stretch?.getAttribute('href')).toBe('/events/evt-1')
    expect(stretch?.textContent).toContain('Test Artist')
  })
})

describe('EventRow — watching is a report, not an action', () => {
  it('renders a non-interactive tick, never a button', () => {
    render(<EventRow show={makeShow({ isWatching: true })} surface="browse" />)
    const tick = screen.getByTestId('row-watching-tick')
    expect(tick.getAttribute('role')).toBe('img')
    expect(tick.getAttribute('aria-label')).toBe('You are watching Test Artist')
    expect(document.querySelector('button')).toBeNull()
  })

  it('renders the tick as an accent dot overhanging the artwork corner', () => {
    render(<EventRow show={makeShow({ isWatching: true })} surface="browse" />)
    const tick = screen.getByTestId('row-watching-tick')
    expect(tick.className).toContain('bg-accent')
    expect(tick.className).toContain('rounded-full')
    expect(tick.style.top).toBe('-3px')
    expect(tick.style.right).toBe('-3px')
    // An icon here is the regression: watching reports state, and --signal
    // belongs to the Following chip.
    expect(tick.querySelector('svg')).toBeNull()
  })

  it('leaves the artwork clip box unable to crop the overhanging tick', () => {
    render(<EventRow show={makeShow({ isWatching: true })} surface="browse" />)
    const tick = screen.getByTestId('row-watching-tick')
    expect(tick.parentElement?.className).not.toContain('overflow-hidden')
  })

  it('renders no tick at all when the show is not watched', () => {
    render(<EventRow show={makeShow()} surface="browse" />)
    expect(screen.queryByTestId('row-watching-tick')).toBeNull()
  })
})

describe('EventRow — the price slot', () => {
  it('prefixes a floor price with "from"', () => {
    render(<EventRow show={makeShow()} surface="browse" />)
    expect(screen.getByText('from')).not.toBeNull()
    expect(screen.getByText('$68')).not.toBeNull()
  })

  it('drops the "from" on a free floor, which would read "from Free"', () => {
    render(
      <EventRow
        show={makeShow({
          price: {
            amount: 0,
            isFloor: true,
            source: null,
            observedAt: null,
            isPending: false,
          },
        })}
        surface="browse"
      />,
    )
    expect(screen.queryByText('from')).toBeNull()
  })

  it('says tba rather than nothing when there is no price', () => {
    render(<EventRow show={makeShow({ price: null })} surface="browse" />)
    expect(screen.getByText('tba')).not.toBeNull()
  })

  it('suppresses the price on a cancelled show', () => {
    render(
      <EventRow show={makeShow({ lifecycle: 'cancelled' })} surface="browse" />,
    )
    expect(screen.queryByText('$68')).toBeNull()
  })

  it('takes the whole slot when sold out, spending no chip budget', () => {
    render(
      <EventRow
        show={makeShow({ status: 'soldout', isFollowed: true })}
        surface="browse"
      />,
    )
    expect(screen.getByTestId('row-sold-out')).not.toBeNull()
    expect(screen.queryByText('$68')).toBeNull()
    // The Following chip still gets its slot — sold out is not a chip.
    expect(screen.getByTestId('row-meta').textContent).toContain('Following')
  })

  it('shows the saved-price delta on Watching only', () => {
    const show = makeShow({ saved: { at: '2026-07-01', price: 80 } })
    const { rerender } = render(<EventRow show={show} surface="watching" />)
    expect(screen.getByTestId('row-price-delta').textContent).toContain('$12')

    // Browse fixtures do carry a saved price; gating on data would turn a
    // Browse price green for a show the user never saved.
    rerender(<EventRow show={show} surface="browse" />)
    expect(screen.queryByTestId('row-price-delta')).toBeNull()
  })

  it('reports a dollar-or-two move as flat rather than as an arrow', () => {
    render(
      <EventRow
        show={makeShow({ saved: { at: '2026-07-01', price: 69 } })}
        surface="watching"
      />,
    )
    expect(screen.getByTestId('row-price-flat')).not.toBeNull()
    expect(screen.queryByTestId('row-price-delta')).toBeNull()
  })

  it('marks an unconfirmed price rather than rendering it bare', () => {
    const price = { amount: 68, isFloor: true, source: null, observedAt: null }
    const { rerender } = render(
      <EventRow
        show={makeShow({ price: { ...price, isPending: true } })}
        surface="browse"
      />,
    )
    // The number still reads — an unconfirmed price the reader can sanity-check
    // is the point of showing it at all.
    expect(screen.getByText('$68')).not.toBeNull()
    expect(screen.getByTestId('row-price-pending')).not.toBeNull()

    rerender(
      <EventRow
        show={makeShow({ price: { ...price, isPending: false } })}
        surface="browse"
      />,
    )
    expect(screen.queryByTestId('row-price-pending')).toBeNull()
  })
})

describe('EventRow — lifecycle beats the price state', () => {
  it('reads Cancelled, not Sold out, on a show that is both', () => {
    // The live production bug: the old slot asked `soldout` first, so a
    // cancelled sold-out show told the reader to arrive and find a locked door.
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled', status: 'soldout' })}
        surface="watching"
      />,
    )
    expect(screen.getByTestId('row-cancelled')).not.toBeNull()
    expect(screen.queryByTestId('row-sold-out')).toBeNull()
    expect(screen.getByTestId('row-cancelled').textContent).toContain(
      'Cancelled',
    )
  })

  it('reads Postponed, not Sold out, on a show that is both', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'postponed', status: 'soldout' })}
        surface="watching"
      />,
    )
    expect(screen.getByTestId('row-postponed')).not.toBeNull()
    expect(screen.queryByTestId('row-sold-out')).toBeNull()
  })

  it('names the state for a screen reader instead of the bare chip word', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled' })}
        surface="watching"
      />,
    )
    expect(
      screen.getByText('This show has been cancelled').className,
    ).toContain('sr-only')
  })

  it('spends no chip budget, so the meta chips still render', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled', isFollowed: true })}
        surface="browse"
      />,
    )
    expect(screen.getByTestId('row-meta').textContent).toContain('Following')
  })
})

describe('EventRow — the three signals a suppressed row carries', () => {
  it('strikes the date and the time, and never the venue', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled' })}
        surface="watching"
      />,
    )
    const line = screen.getByTestId('when-where')
    const struck = Array.from(line.querySelectorAll('span')).filter(
      (node) => node.style.textDecoration === 'line-through',
    )
    // Date, time, and the one separator between them. The separator before the
    // venue joins a struck unit to an unstruck one, so it stays clean.
    expect(struck).toHaveLength(3)
    expect(screen.getByTestId('venue-name-link').style.textDecoration).toBe('')
  })

  it('leaves line 3 unstruck on a sold-out show, which is still happening', () => {
    render(
      <EventRow show={makeShow({ status: 'soldout' })} surface="watching" />,
    )
    const line = screen.getByTestId('when-where')
    expect(
      Array.from(line.querySelectorAll('span')).filter(
        (node) => node.style.textDecoration === 'line-through',
      ),
    ).toHaveLength(0)
  })

  it('dims the artwork rather than the row, which would fail AA', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled' })}
        surface="watching"
      />,
    )
    const art = screen
      .getByTestId('event-row')
      .querySelector('.overflow-hidden')
    expect(art?.getAttribute('style')).toContain('opacity: 0.55')
    expect(screen.getByTestId('event-row').style.opacity).toBe('')
  })

  it('leaves the artwork at full strength on a live show', () => {
    render(<EventRow show={makeShow()} surface="watching" />)
    const art = screen
      .getByTestId('event-row')
      .querySelector('.overflow-hidden')
    expect(art?.getAttribute('style')).toContain('opacity: 1')
  })
})

describe('EventRow — the action gutter', () => {
  it('reserves no gutter on Browse, where 36px costs the title column', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="browse"
        action={<button type="button">remove</button>}
      />,
    )
    expect(screen.queryByText('remove')).toBeNull()
  })

  it('renders the action on a surface that has one', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="watching"
        action={<button type="button">remove</button>}
      />,
    )
    expect(screen.getByText('remove')).not.toBeNull()
  })
})

describe('EventRow — the footer slot', () => {
  it('renders a footer outside the four-line contract', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="watching"
        footer={<div data-testid="going-nudge" />}
      />,
    )
    expect(screen.getByTestId('going-nudge')).not.toBeNull()
  })
})

/**
 * Rule 3. The reservation is asserted on the resolved `min-height` rather than
 * on a measured box, because jsdom has no layout engine and every rendered
 * height would come back as zero — an assertion that would pass whether or not
 * the reservation existed at all.
 *
 * The fixtures are Watching rows, not Browse ones. A zero-chip row is what the
 * reservation exists for, and on Browse it is unreachable: `genre` leads that
 * surface's priority and no production event carries an empty `genres[]`. On
 * Watching the chips are `freshness` and `provenance`, both of which a live,
 * bare-priced show legitimately lacks.
 */
describe('EventRow — Rule 3, the row reserves its own height', () => {
  const FRESH = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const STALE = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  const minHeights = (surface: 'watching' | 'artist', shows: EventRowShow[]) =>
    new Set(
      shows.map((show) => {
        cleanup()
        render(<EventRow show={show} surface={surface} />)
        return screen.getByTestId('event-row').style.minHeight
      }),
    )

  const watchingLadder = [
    // No chips at all: a fresh price with no corroborated source clears both
    // of this surface's chip kinds, and MetaRow renders nothing.
    makeShow({
      price: {
        amount: 68,
        isFloor: true,
        source: null,
        observedAt: FRESH,
        isPending: false,
      },
    }),
    // One chip.
    makeShow({
      price: {
        amount: 68,
        isFloor: true,
        source: 'boxoffice',
        observedAt: FRESH,
        isPending: false,
      },
    }),
    // Both chips, which is the whole budget.
    makeShow({
      price: {
        amount: 68,
        isFloor: true,
        source: 'boxoffice',
        observedAt: STALE,
        isPending: false,
      },
    }),
    // No price at all, so the price slot reads "tba" and neither chip kind has
    // anything to report.
    makeShow({ price: null }),
  ]

  // Asserted on the chip builder rather than on the rendered line, which has no
  // widths to fit against under jsdom. Without this the height claim below
  // would hold just as well over four identical rows.
  it('runs the ladder from no chips to the full budget', () => {
    expect(
      watchingLadder.map((show) => rowChips(show, 'watching').length),
    ).toEqual([0, 1, 2, 0])
  })

  it('holds one height across a Watching list that runs from no chips to full', () => {
    expect(minHeights('watching', watchingLadder).size).toBe(1)
  })

  it('reserves less on a surface that can never carry a support line', () => {
    // Watching and artist both declare `showsSupports: false`, so both take the
    // three-line reservation and a supports array they cannot render moves
    // neither of them.
    const withSupports = minHeights('watching', [
      makeShow({ supports: ['Opener One', 'Opener Two'] }),
    ])
    const without = minHeights('watching', [makeShow()])
    expect(withSupports).toEqual(without)
  })

  it('reserves the artist row at the same height as any other three-line row', () => {
    const artist = minHeights('artist', [makeShow({ tourName: 'Night Drive' })])
    const watching = minHeights('watching', [makeShow()])
    expect(artist).toEqual(watching)
  })
})
