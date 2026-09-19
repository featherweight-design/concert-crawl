import { describe, it, expect } from 'vitest'
import type { PosterSource } from '@/lib/share/poster-event'

import { eventCanonicalPath, eventShareMetadata, fill } from './event-metadata'

const EVENT_ID = '11111111-1111-4111-8111-111111111111'

const event: PosterSource = {
  id: EVENT_ID,
  artist: 'Sylvan Esso',
  // YYYY-MM-DD: `formatEventDate` anchors it to UTC noon itself.
  date: '2026-10-02',
  showTime: '20:00',
  venue: {
    name: 'Ogden Theatre',
    city: 'Denver',
    timezone: 'America/Denver',
  },
}

describe('fill', () => {
  it('substitutes every occurrence of a placeholder', () => {
    expect(fill('{one} and {one} and {two}', { one: 'x', two: 'y' })).toBe(
      'x and x and y',
    )
  })

  it('leaves an unknown placeholder alone rather than emptying it', () => {
    expect(fill('{one} {missing}', { one: 'x' })).toBe('x {missing}')
  })
})

describe('eventShareMetadata', () => {
  it('declares /events/:id as canonical from the share mirror', () => {
    const meta = eventShareMetadata(event, `/e/${EVENT_ID}`)

    expect(meta.alternates?.canonical).toBe(
      `http://localhost:3000/events/${EVENT_ID}`,
    )
  })

  it('declares /events/:id as canonical from the event page itself', () => {
    const meta = eventShareMetadata(event, eventCanonicalPath(EVENT_ID))

    expect(meta.alternates?.canonical).toBe(
      `http://localhost:3000/events/${EVENT_ID}`,
    )
  })

  // The two tags answer different questions. Repointing the mirror's og:url at
  // /events/:id would send an unfurl click away from the surface built for it.
  it('keeps og:url on the page being rendered, not the canonical', () => {
    const mirror = eventShareMetadata(event, `/e/${EVENT_ID}`)
    const page = eventShareMetadata(event, eventCanonicalPath(EVENT_ID))

    expect(mirror.openGraph?.url).toBe(`http://localhost:3000/e/${EVENT_ID}`)
    expect(page.openGraph?.url).toBe(`http://localhost:3000/events/${EVENT_ID}`)
  })

  it('renders the same card art from both routes', () => {
    const mirror = eventShareMetadata(event, `/e/${EVENT_ID}`)
    const page = eventShareMetadata(event, eventCanonicalPath(EVENT_ID))

    expect(mirror.twitter?.images).toStrictEqual(page.twitter?.images)
  })

  it('absolutises the card image, which a crawler cannot resolve relatively', () => {
    const meta = eventShareMetadata(event, eventCanonicalPath(EVENT_ID))
    const images = meta.openGraph?.images

    expect(images).toBeDefined()
    expect(JSON.stringify(images)).toContain(
      `http://localhost:3000/share/${EVENT_ID}/link`,
    )
  })

  it('names the artist and venue in the title', () => {
    const meta = eventShareMetadata(event, eventCanonicalPath(EVENT_ID))

    expect(meta.title).toBe('Sylvan Esso at Ogden Theatre')
  })
})
