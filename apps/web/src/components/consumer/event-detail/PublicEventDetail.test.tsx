// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { EventDetailResponse } from '@concert-crawl/types'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

// Heavy client subtrees are stubbed. EventDetailPriceBlock in particular pulls
// in Clerk's useAuth and the whole price-submission machinery; what these
// assertions are about is what the mirror does and does not render around it.
vi.mock('@/components/consumer/EventDetailClient', () => ({
  EventDetailPriceBlock: () => <div data-testid="price-block" />,
}))
vi.mock('@/components/consumer/event-image', () => ({
  EventImage: () => <div data-testid="event-image" />,
}))
vi.mock('@/components/consumer/event-card/EventCard', () => ({
  EventCard: ({ event }: { event: { artist: string } }) => (
    <div data-testid="related-card">{event.artist}</div>
  ),
}))

// Pins "today" so the past-show case is deterministic.
vi.mock('@/lib/time', () => ({
  localDateString: () => '2026-08-02',
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
  setlist: null,
  watching: 0,
  isWatching: false,
  attendingAt: null,
  venueGuidePublished: false,
  ...overrides,
})

describe('PublicEventDetail (#72)', () => {
  it('renders the show, and exactly one sign-in CTA pointed at /sign-in', () => {
    render(<PublicEventDetail event={buildEvent()} related={[]} />)

    expect(screen.getByText('Nightjar Choir')).toBeDefined()
    expect(screen.getByTestId('event-venue-name')).toBeDefined()
    expect(screen.getByText('Bluebird Theater')).toBeDefined()

    // /sign-in, never /sign-up: before launch sign-up bounces to the invite
    // wall at /auth/code, a dead end for someone with no code.
    const signIn = screen.getByRole('link', { name: copy.signInButton })
    expect(signIn.getAttribute('href')).toBe('/sign-in')
    expect(screen.queryByRole('link', { name: /sign up/i })).toBeNull()
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
    // The sign-in CTA is still the one thing on offer.
    expect(screen.getByRole('link', { name: copy.signInButton })).toBeDefined()
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

  it('renders related shows through the same card the public browse list uses', () => {
    const related = [{ ...buildEvent({ id: 'rel-1', artist: 'Other Band' }) }]

    render(<PublicEventDetail event={buildEvent()} related={related} />)

    expect(screen.getByTestId('related-card').textContent).toBe('Other Band')
  })
})
