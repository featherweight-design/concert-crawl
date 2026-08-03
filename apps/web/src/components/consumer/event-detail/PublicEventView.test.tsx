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

  // The guard is keyed by eventId, not a bare boolean. React can keep this
  // instance alive across a client-side navigation between two mirrors, and a
  // once-only flag would then swallow the view of every show after the first.
  it('records a second show when the id changes under the same instance', () => {
    const OTHER_ID = '99999999-8888-4777-8666-555555555555'
    const { rerender } = render(<PublicEventView eventId={EVENT_ID} />)

    rerender(<PublicEventView eventId={OTHER_ID} />)

    expect(mockTrack).toHaveBeenCalledTimes(2)
    expect(mockTrack).toHaveBeenLastCalledWith('public_event_viewed', {
      eventId: OTHER_ID,
      referrer: null,
    })
  })

  it('does not re-record the same show on an unrelated re-render', () => {
    const { rerender } = render(<PublicEventView eventId={EVENT_ID} />)

    rerender(<PublicEventView eventId={EVENT_ID} />)

    expect(mockTrack).toHaveBeenCalledTimes(1)
  })
})
