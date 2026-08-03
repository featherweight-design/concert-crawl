// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const mockTrack = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}))

import { PublicEventView } from './PublicEventView'

const EVENT_ID = '11111111-2222-4333-8444-555555555555'

const setReferrer = (value: string) => {
  Object.defineProperty(document, 'referrer', {
    value,
    configurable: true,
  })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  setReferrer('')
})

describe('<PublicEventView /> (#72)', () => {
  it('records that a poster link landed somebody on the mirror', () => {
    render(<PublicEventView eventId={EVENT_ID} />)

    expect(mockTrack).toHaveBeenCalledWith('public_event_viewed', {
      eventId: EVENT_ID,
      referrer: null,
    })
  })

  // A full referrer routinely carries a query string belonging to somebody
  // else's session. The host answers the only question being asked.
  it('sends the referring host, never the full referrer url', () => {
    setReferrer('https://t.co/abc123?session=secret')

    render(<PublicEventView eventId={EVENT_ID} />)

    expect(mockTrack).toHaveBeenCalledWith('public_event_viewed', {
      eventId: EVENT_ID,
      referrer: 't.co',
    })
  })

  it('treats an unparseable referrer as absent rather than throwing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setReferrer('not a url')

    expect(() => render(<PublicEventView eventId={EVENT_ID} />)).not.toThrow()
    expect(mockTrack).toHaveBeenCalledWith('public_event_viewed', {
      eventId: EVENT_ID,
      referrer: null,
    })
  })

  it('renders nothing — it is a beacon, not a surface', () => {
    const { container } = render(<PublicEventView eventId={EVENT_ID} />)

    expect(container.innerHTML).toBe('')
  })

  // Strict Mode runs effects twice in development; without the mount guard
  // every local page load would double-count a view.
  it('counts one view per mount under Strict Mode', () => {
    render(
      <React.StrictMode>
        <PublicEventView eventId={EVENT_ID} />
      </React.StrictMode>,
    )

    expect(mockTrack).toHaveBeenCalledTimes(1)
  })
})
