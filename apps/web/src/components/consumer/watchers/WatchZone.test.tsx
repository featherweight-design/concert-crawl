// @vitest-environment jsdom

// The strip's own job: whether row 2 renders. Row 1's status line lives inside
// WatchShowButton (which this suite stubs) and is covered there.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type {
  EventWatcher,
  EventWatchersResponse,
  WatchingShow,
} from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { stubMatchMedia } from '@/test-utils/match-media'

const authState = vi.fn(() => ({ isSignedIn: true }))
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ ...authState(), getToken: async () => 'test-token' }),
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

const named = (...handles: string[]): EventWatcher[] =>
  handles.map((handle) => ({ handle, avatarColor: null }))

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
  priceSourceCategory: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  attendingAt: null,
  updatedAt: '2026-07-19T00:00:00Z',
  priceObservedAt: null,
  imageUrl: null,
})

const crawl = () => screen.queryByRole('group')

beforeEach(() => {
  // The roster expander reads the viewport to pick a sheet or a popover.
  stubMatchMedia(false)
  authState.mockReturnValue({ isSignedIn: true })
  watchingData.mockReturnValue([])
  watchersQuery.mockReturnValue({ data: undefined, isPending: false })
})

afterEach(cleanup)

describe('WatchZone crawl visibility', () => {
  it('hides the crawl when the viewer is the only watcher', () => {
    watchingData.mockReturnValue([watchedShow('evt_1')])
    watchersQuery.mockReturnValue({
      data: { total: 0, named: [] },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    // "All 1" beside your own avatar isn't social proof.
    expect(crawl()).toBeNull()
  })

  it('hides the crawl for a lone stranger', () => {
    watchersQuery.mockReturnValue({
      data: { total: 1, named: named('marisol') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    expect(crawl()).toBeNull()
  })

  it('shows the crawl when the viewer joins that one stranger', () => {
    watchingData.mockReturnValue([watchedShow('evt_1')])
    watchersQuery.mockReturnValue({
      data: { total: 1, named: named('marisol') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    expect(crawl()?.getAttribute('aria-label')).toBe(
      `marisol ${CONSUMER_COPY.watchers.one}`,
    )
  })

  it('shows the crawl for two named strangers', () => {
    watchersQuery.mockReturnValue({
      data: { total: 2, named: named('marisol', 'dev_ftw') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    expect(crawl()).not.toBeNull()
  })

  it('hides the crawl when every watcher is anonymous', () => {
    watchersQuery.mockReturnValue({
      data: { total: 5, named: [] },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    // A roster of dashes is a number, not a crawl.
    expect(crawl()).toBeNull()
  })

  it('hides the crawl while the watchers query is still in flight', () => {
    watchersQuery.mockReturnValue({ data: undefined, isPending: true })
    render(<WatchZone eventId="evt_1" />)
    expect(crawl()).toBeNull()
  })

  it('does not count a stale cached watch for a signed-out visitor', () => {
    authState.mockReturnValue({ isSignedIn: false })
    watchingData.mockReturnValue([watchedShow('evt_1')])
    watchersQuery.mockReturnValue({
      data: { total: 1, named: named('marisol') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" />)
    expect(crawl()).toBeNull()
  })
})
