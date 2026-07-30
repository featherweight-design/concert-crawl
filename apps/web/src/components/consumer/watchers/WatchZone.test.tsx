// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { EventWatchersResponse, WatchingShow } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true, getToken: async () => 'test-token' }),
}))

const watchingData = vi.fn<() => WatchingShow[] | undefined>(() => [])
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: watchingData() }),
}))

const watchersQuery = vi.fn<
  () => { data: EventWatchersResponse | undefined; isPending: boolean }
>(() => ({ data: undefined, isPending: false }))
vi.mock('@/lib/queries/use-event-watchers', () => ({
  useEventWatchers: () => watchersQuery(),
  eventWatchersEventKey: (eventId: string) => ['event-watchers', eventId],
}))

// The button owns its own hook stack (push, notification prefs, toggle); this
// suite only cares that WatchZone renders it, so stub it to a bare button.
vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button type="button">Watch</button>,
}))

import { WatchZone } from './WatchZone'

const watchedShow = (eventId: string): WatchingShow => ({
  userEventId: 'ue_1',
  eventId,
  artist: 'A',
  venueName: 'V',
  venueSlug: 'v',
  date: '2026-08-14',
  showTime: null,
  ticketUrl: null,
  ticketLinks: null,
  savedAt: '2026-07-19T00:00:00Z',
  savedPrice: null,
  currentPrice: null,
  sourceKind: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  attendingAt: null,
  updatedAt: '2026-07-19T00:00:00Z',
  imageUrl: null,
})

beforeEach(() => {
  watchingData.mockReturnValue([])
  watchersQuery.mockReturnValue({ data: undefined, isPending: false })
})

afterEach(cleanup)

describe('WatchZone', () => {
  it('shows the alerts hint while the viewer is not watching', () => {
    render(<WatchZone eventId="evt_1" />)
    expect(screen.getByText(CONSUMER_COPY.watchers.watchHint)).not.toBeNull()
  })

  it('drops the hint once the viewer is watching', () => {
    watchingData.mockReturnValue([watchedShow('evt_1')])
    render(<WatchZone eventId="evt_1" />)
    expect(screen.queryByText(CONSUMER_COPY.watchers.watchHint)).toBeNull()
  })

  it('falls back to the server-rendered watch state before the cache loads', () => {
    watchingData.mockReturnValue(undefined)
    render(<WatchZone eventId="evt_1" initialWatching />)
    expect(screen.queryByText(CONSUMER_COPY.watchers.watchHint)).toBeNull()
  })

  it('renders the social-proof surface from the watchers query', () => {
    watchersQuery.mockReturnValue({
      data: { total: 1, named: [{ handle: 'marisol', avatarColor: null }] },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      `marisol ${CONSUMER_COPY.watchers.one}`,
    )
  })
})
