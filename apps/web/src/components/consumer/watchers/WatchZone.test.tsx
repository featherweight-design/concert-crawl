// @vitest-environment jsdom

// The strip's own job: whether row 2 renders. Row 1's status line lives inside
// WatchShowButton (which this suite stubs) and is covered there.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type {
  EventWatcher,
  EventWatchersResponse,
  WatchingShow,
} from '@concert-crawl/types'
import type { FollowNudgeTarget } from '@/components/consumer/following/nudge'
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

// The nudge card owns the entitlement + follow stack, and the trigger hook
// owns the mutation cache; both are covered by their own suites. What this
// suite claims is the SWAP — which of the two objects occupies the slot.
const nudgeTarget = vi.fn<() => FollowNudgeTarget | null>(() => null)
const answer = vi.fn()
vi.mock('@/components/consumer/following/nudge', () => ({
  useFirstWatchNudge: () => ({ target: nudgeTarget(), answer }),
  FollowNudgeCard: ({ onAnswer }: { onAnswer: () => void }) => (
    <div data-testid="follow-nudge">
      <button type="button" onClick={onAnswer}>
        Answer
      </button>
    </div>
  ),
}))

import { WatchZone } from './WatchZone'

const TARGET: FollowNudgeTarget = {
  eventId: 'evt_1',
  userEventId: 'ue_1',
  artist: 'Big Thief',
  artistSlug: 'big-thief',
}

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
  artistPhotoUrl: null,
})

const crawl = () => screen.queryByRole('group')

beforeEach(() => {
  // The roster expander reads the viewport to pick a sheet or a popover.
  stubMatchMedia(false)
  authState.mockReturnValue({ isSignedIn: true })
  watchingData.mockReturnValue([])
  watchersQuery.mockReturnValue({ data: undefined, isPending: false })
  nudgeTarget.mockReturnValue(null)
  answer.mockClear()
})

afterEach(cleanup)

describe('WatchZone crawl visibility', () => {
  it('hides the crawl when the viewer is the only watcher', () => {
    watchingData.mockReturnValue([watchedShow('evt_1')])
    watchersQuery.mockReturnValue({
      data: { total: 0, named: [] },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    // "All 1" beside your own avatar isn't social proof.
    expect(crawl()).toBeNull()
  })

  it('hides the crawl for a lone stranger', () => {
    watchersQuery.mockReturnValue({
      data: { total: 1, named: named('marisol') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(crawl()).toBeNull()
  })

  it('shows the crawl when the viewer joins that one stranger', () => {
    watchingData.mockReturnValue([watchedShow('evt_1')])
    watchersQuery.mockReturnValue({
      data: { total: 1, named: named('marisol') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(crawl()?.getAttribute('aria-label')).toBe(
      `marisol ${CONSUMER_COPY.watchers.one}`,
    )
  })

  it('shows the crawl for two named strangers', () => {
    watchersQuery.mockReturnValue({
      data: { total: 2, named: named('marisol', 'dev_ftw') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(crawl()).not.toBeNull()
  })

  it('hides the crawl when every watcher is anonymous', () => {
    watchersQuery.mockReturnValue({
      data: { total: 5, named: [] },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    // A roster of dashes is a number, not a crawl.
    expect(crawl()).toBeNull()
  })

  it('hides the crawl while the watchers query is still in flight', () => {
    watchersQuery.mockReturnValue({ data: undefined, isPending: true })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(crawl()).toBeNull()
  })

  it('does not count a stale cached watch for a signed-out visitor', () => {
    authState.mockReturnValue({ isSignedIn: false })
    watchingData.mockReturnValue([watchedShow('evt_1')])
    watchersQuery.mockReturnValue({
      data: { total: 1, named: named('marisol') },
      isPending: false,
    })
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(crawl()).toBeNull()
  })
})

// Step 2 of the plan: on event detail the nudge REPLACES the watch card in
// place, at every width. Not a ported card, not a modal, and never both
// objects in the slot at once.
describe('WatchZone first-watch follow nudge', () => {
  it('leaves the strip alone while there is no nudge to make', () => {
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(screen.getByTestId('watch-strip')).toBeTruthy()
    expect(screen.queryByTestId('follow-nudge')).toBeNull()
  })

  it('stands in place of the strip once the watch lands', () => {
    nudgeTarget.mockReturnValue(TARGET)
    render(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(screen.getByTestId('follow-nudge')).toBeTruthy()
    // In place, not above: two watch affordances for one show is the state
    // this replacement exists to avoid.
    expect(screen.queryByTestId('watch-strip')).toBeNull()
  })

  it('restores the watch card when the nudge is answered', () => {
    nudgeTarget.mockReturnValue(TARGET)
    const { rerender } = render(<WatchZone eventId="evt_1" scaRegion={false} />)
    fireEvent.click(screen.getByText('Answer'))
    expect(answer).toHaveBeenCalledTimes(1)

    // The hook clears its own target on answer; this mirrors that.
    nudgeTarget.mockReturnValue(null)
    rerender(<WatchZone eventId="evt_1" scaRegion={false} />)
    expect(screen.getByTestId('watch-strip')).toBeTruthy()
    expect(screen.queryByTestId('follow-nudge')).toBeNull()
  })
})
