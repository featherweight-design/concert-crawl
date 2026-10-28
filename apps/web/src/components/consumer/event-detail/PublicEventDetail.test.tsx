// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { EventDetailResponse } from '@concert-crawl/types'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

// Heavy client subtrees are stubbed. EventDetailClient is stubbed even though
// the mirror no longer imports it — the stub is what makes the "never renders
// the price block" assertion below meaningful rather than vacuous.
vi.mock('@/components/consumer/EventDetailClient', () => ({
  EventDetailPriceBlock: () => <div data-testid="price-block" />,
}))
vi.mock('@/components/consumer/event-image', () => ({
  EventImage: ({
    src,
    artistPhotoUrl,
  }: {
    src: string | null
    artistPhotoUrl?: string | null
  }) => (
    <div
      data-testid="event-image"
      data-src={src ?? ''}
      data-artist-photo-url={artistPhotoUrl ?? ''}
    />
  ),
}))
vi.mock('@/components/consumer/event-row', () => ({
  EventRow: ({ show }: { show: { headliner: string } }) => (
    <div data-testid="related-card">{show.headliner}</div>
  ),
  fromEventWithVenue: (event: { artist: string }) => ({
    headliner: event.artist,
  }),
}))

// Pins "today" so the past-show case is deterministic.
vi.mock('@/lib/time', () => ({
  localDateString: () => '2026-08-02',
}))

vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'electric' }),
}))

import { PublicEventDetail } from './PublicEventDetail'

const copy = CONSUMER_COPY.publicEvent
const detailCopy = CONSUMER_COPY.eventDetail

afterEach(cleanup)

const VENUE: EventDetailResponse['venue'] = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Bluebird Theater',
  slug: 'bluebird-theater',
  city: 'Denver',
  websiteUrl: 'https://bluebird.example.com',
  timezone: 'America/Denver',
}

// A fully-typed fixture rather than a cast: if the response shape gains a
// required field this stops compiling instead of failing at runtime.
const buildEvent = (
  overrides: Partial<EventDetailResponse> = {},
): EventDetailResponse => ({
  id: '11111111-1111-4111-8111-111111111111',
  venueId: VENUE.id,
  title: 'Nightjar Choir at the Bluebird',
  artist: 'Nightjar Choir',
  supportingArtists: null,
  supportingArtistSlugs: null,
  artistSlug: null,
  tourName: null,
  date: '2026-12-31',
  doorsTime: '19:00:00',
  showTime: '20:00:00',
  ticketUrl: 'https://tickets.example.com/nightjar',
  ticketLinks: null,
  eventUrl: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  priceSource: null,
  pipelineExhaustedAt: null,
  description: null,
  imageUrl: null,
  genre: ['indie'],
  status: 'upcoming',
  confidenceScore: null,
  verified: true,
  sourceUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  venue: VENUE,
  watching: 0,
  isWatching: false,
  attendingAt: null,
  venueGuidePublished: false,
  ...overrides,
})

describe('PublicEventDetail (#72)', () => {
  it('renders the show, and exactly one account CTA pointed at /sign-up', () => {
    render(<PublicEventDetail event={buildEvent()} related={[]} />)

    expect(screen.getByText('Nightjar Choir')).toBeDefined()
    expect(screen.getByTestId('event-venue-name')).toBeDefined()
    expect(screen.getByText('Bluebird Theater')).toBeDefined()

    // The recipient of a pasted link has no account by definition, so the one
    // account-shaped affordance offers to make one (#1359). Middleware opens
    // `/sign-up(.*)` and `/e/(.*)` in the same matcher, so this destination can
    // never be walled while a visitor is standing here.
    const signUp = screen.getAllByRole('link', { name: copy.signUpButton })
    expect(signUp).toHaveLength(1)
    // It carries the show back through auth: without redirect_url the new
    // account lands on /events and the link they were sent is lost.
    expect(signUp[0]?.getAttribute('href')).toBe(
      '/sign-up?redirect_url=%2Fe%2F11111111-1111-4111-8111-111111111111',
    )
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })

  // #1359: what a link recipient can actually do here. Everything that needs a
  // session is absent, so the page must not be one dead control after another.
  it('leaves the recipient exactly three controls, all of them live', () => {
    render(<PublicEventDetail event={buildEvent()} related={[]} />)

    // Enumerated rather than probed one by one: the claim is about what is
    // absent as much as what is present, and a fourth control added later
    // would pass every individual assertion.
    const names = [
      ...screen.getAllByRole('link'),
      ...screen.getAllByRole('button'),
    ].map((el) => el.getAttribute('aria-label') ?? el.textContent)

    expect(names).toHaveLength(3)
    // Tickets, because that is the whole reason the link was sent.
    expect(names).toContain(detailCopy.getTickets)
    // Sharing it onward, which needs no session at all.
    expect(names).toContain(CONSUMER_COPY.share.triggerLabel)
    expect(names).toContain(copy.signUpButton)
  })

  it('names what an account is for rather than just asking for one', () => {
    render(<PublicEventDetail event={buildEvent()} related={[]} />)

    // The three affordances the mirror omits are the three the prompt promises,
    // so the omissions read as gated rather than missing.
    expect(screen.getByText(copy.signUpPrompt)).toBeDefined()
  })

  it('omits every account-gated affordance', () => {
    const { container } = render(
      <PublicEventDetail event={buildEvent()} related={[]} />,
    )

    // Watching is the only show-tracking concept and its glyph is the lucide
    // Eye. The mirror omits the affordance rather than substituting another
    // glyph — and there is no heart anywhere in this product.
    expect(screen.queryByText(/watching/i)).toBeNull()
    expect(screen.queryByText(/i'm going/i)).toBeNull()
    expect(screen.queryByText(/report/i)).toBeNull()
    expect(screen.queryByText(/add a price/i)).toBeNull()
    expect(container.querySelector('.lucide-heart')).toBeNull()
    expect(container.querySelector('.lucide-eye')).toBeNull()
    // EventDetailPriceBlock reaches price submission, tier-add and report
    // modals through useAuth. It must not render here at all — suppressing the
    // CTAs one by one would leave the next one added to it exposed.
    expect(screen.queryByTestId('price-block')).toBeNull()
  })

  it('shows the price as a flat read-only row', () => {
    render(
      <PublicEventDetail
        event={buildEvent({ ticketPriceMin: '25', ticketPriceMax: '35' })}
        related={[]}
      />,
    )

    const row = screen.getByTestId('public-event-price')
    expect(row.textContent).toContain('$25\u2013$35')
    expect(row.querySelector('button')).toBeNull()
  })

  it('says sold out rather than showing a stale price', () => {
    render(
      <PublicEventDetail
        event={buildEvent({
          ticketPriceMin: '25',
          ticketPriceMax: '35',
          priceStatus: 'soldout',
        })}
        related={[]}
      />,
    )

    expect(screen.getByTestId('public-event-price').textContent).toContain(
      detailCopy.soldOut,
    )
  })

  // The only honest thing to put in an empty price row is an invitation to
  // submit one, and that is exactly the affordance this surface can't offer.
  it('renders no price row at all when there is no price', () => {
    render(
      <PublicEventDetail
        event={buildEvent({ ticketPriceMin: null, ticketPriceMax: null })}
        related={[]}
      />,
    )

    expect(screen.queryByTestId('public-event-price')).toBeNull()
  })

  it('keeps the ticket CTA on an upcoming show', () => {
    render(<PublicEventDetail event={buildEvent()} related={[]} />)

    const cta = screen.getByRole('link', {
      name: new RegExp(detailCopy.getTickets, 'i'),
    })
    expect(cta.getAttribute('href')).toBe(
      'https://tickets.example.com/nightjar',
    )
    expect(cta.getAttribute('rel')).toContain('noopener')
  })

  it('drops the ticket CTA once the show has passed', () => {
    render(
      <PublicEventDetail
        event={buildEvent({ date: '2026-07-01' })}
        related={[]}
      />,
    )

    // A poster link is often opened after the gig; a live "Get tickets" button
    // on a finished show points at a dead vendor page.
    expect(
      screen.queryByRole('link', {
        name: new RegExp(detailCopy.getTickets, 'i'),
      }),
    ).toBeNull()
    // The account CTA is still the one thing on offer.
    expect(screen.getByRole('link', { name: copy.signUpButton })).toBeDefined()
  })

  it('filters an unsafe ticket url out of the CTA', () => {
    render(
      <PublicEventDetail
        event={buildEvent({
          ticketUrl: 'javascript:alert(1)',
          venue: { ...VENUE, websiteUrl: 'javascript:alert(2)' },
        })}
        related={[]}
      />,
    )

    expect(screen.queryByRole('link', { name: /get tickets/i })).toBeNull()
    expect(screen.getByText(detailCopy.noTicketsAvailable)).toBeDefined()
  })

  it('renders related shows through the same row the public browse list uses', () => {
    const related = [{ ...buildEvent({ id: 'rel-1', artist: 'Other Band' }) }]

    render(<PublicEventDetail event={buildEvent()} related={related} />)

    expect(screen.getByTestId('related-card').textContent).toBe('Other Band')
  })

  // #1525 — the hero is an event surface, so it resolves artwork, then the
  // headliner's portrait, then the generated mark.
  it('feeds the headliner portrait to the hero as a second source', () => {
    const portrait = 'https://example.test/artist.jpg'
    render(
      <PublicEventDetail
        event={buildEvent({ imageUrl: null, artistPhotoUrl: portrait })}
        related={[]}
      />,
    )

    expect(
      screen.getByTestId('event-image').getAttribute('data-artist-photo-url'),
    ).toBe(portrait)
  })

  // #1525 — the title moved into the band. The old layout drew it below a
  // 300px hero and pulled it back up with a negative margin; if that copy were
  // ever left behind the headliner would render twice on the same page.
  it('renders the headliner exactly once now the title lives in the band', () => {
    render(<PublicEventDetail event={buildEvent()} related={[]} />)

    expect(screen.getAllByText('Nightjar Choir')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  // The bill block arrives as a SLOT (design table ED-06) so neither detail
  // screen is forked to carry it.
  describe('the bill follow slot', () => {
    it('renders nothing in its place for a caller that predates it', () => {
      render(<PublicEventDetail event={buildEvent()} related={[]} />)

      expect(screen.queryByTestId('bill-slot')).toBeNull()
    })

    it('places the slot after the ticket CTA and before the account CTA', () => {
      render(
        <PublicEventDetail
          event={buildEvent()}
          related={[]}
          billBlock={<div data-testid="bill-slot" />}
        />,
      )

      const slot = screen.getByTestId('bill-slot')
      const cta = screen.getByRole('link', {
        name: new RegExp(detailCopy.getTickets, 'i'),
      })
      const signUp = screen.getByRole('link', { name: copy.signUpButton })

      // DOCUMENT_POSITION_PRECEDING === 2: the CTA comes first in the DOM.
      expect(slot.compareDocumentPosition(cta)).toBe(
        Node.DOCUMENT_POSITION_PRECEDING,
      )
      expect(slot.compareDocumentPosition(signUp)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })

    // Parity is structural: one slot in the single centred column, so there is
    // no breakpoint at which one viewport gets a block the other does not.
    it('gives the slot no breakpoint-gated wrapper', () => {
      render(
        <PublicEventDetail
          event={buildEvent()}
          related={[]}
          billBlock={<div data-testid="bill-slot" />}
        />,
      )

      const wrapper = screen.getByTestId('bill-slot').parentElement
      expect(wrapper?.className ?? '').not.toMatch(/(sm|md|lg|xl):/)
    })
  })
})
