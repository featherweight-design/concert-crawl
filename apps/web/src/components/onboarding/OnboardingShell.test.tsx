// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  act,
  waitFor,
  fireEvent,
} from '@testing-library/react'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// The tour now reaches two steps that talk to the network and to Clerk. None of
// that is what these tests are about, so the boundaries are stubbed and the
// picker steps get their own suites.
// Held in a box so a test can take the token away: the suggestions read has to
// fail rather than fall back to the anonymous client, which answers
// `following: null` and would re-offer artists the visitor already follows.
const token: { current: string | null } = { current: 'test-token' }

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => token.current,
    isSignedIn: false,
    userId: null,
  }),
}))

const fetchArtistSuggestions =
  vi.fn<
    (
      limit?: number,
      genres?: readonly string[],
      token?: string | null,
    ) => Promise<unknown[]>
  >()

const followArtistsBulk = vi.fn<() => Promise<unknown>>()

vi.mock('@/lib/following', () => ({
  fetchArtistSuggestions: (
    limit?: number,
    genres?: readonly string[],
    token?: string | null,
  ) => fetchArtistSuggestions(limit, genres, token),
  followArtistsBulk: () => followArtistsBulk(),
}))

// The tour is post-auth, so the real hook's `enabled: !!isSignedIn` would leave
// plan state undefined forever behind the signed-out Clerk stub above. Held in
// a box so a test can decide whether the plan has landed yet.
const FREE_PLAN: PlanState = {
  plan: 'free',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
}

const planState: { current: PlanState | undefined } = { current: FREE_PLAN }

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: planState.current }),
  planStateQueryKey: (userId: string | null) => ['plan-state', userId],
}))

const SUGGESTIONS = [
  {
    slug: 'geese',
    name: 'Geese',
    photoUrl: null,
    nextShow: {
      eventId: 'ev1',
      iso: '2026-09-12',
      venue: 'Hi-Dive',
      venueSlug: 'hi-dive',
    },
    following: false,
  },
  {
    slug: 'ekko',
    name: 'Ekko Astral',
    photoUrl: null,
    nextShow: {
      eventId: 'ev2',
      iso: '2026-09-20',
      venue: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
    },
    following: false,
  },
  {
    slug: 'wednesday',
    name: 'Wednesday',
    photoUrl: null,
    nextShow: {
      eventId: 'ev3',
      iso: '2026-09-28',
      venue: 'Gothic',
      venueSlug: 'gothic',
    },
    following: true,
  },
]

interface TierPickerProps {
  planState: PlanState
  open: boolean
}

const tierPickerRender = vi.fn<(props: TierPickerProps) => void>()

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: (props: TierPickerProps) => {
    tierPickerRender(props)
    return null
  },
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlanState } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { OnboardingShell, type OnboardingShellProps } from './OnboardingShell'
import { ONBOARDING_COPY } from './definitions/copy'
import { ARTIST_PICKER_COPY } from '@/components/consumer/artist-picker/definitions/copy'
import { ThemeProvider } from '@/theme/ThemeProvider'

const nav = ONBOARDING_COPY.nav
const EVENT_ID = '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01'

// The theme step reads a media query; jsdom ships neither matchMedia nor
// scrollTo.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

beforeEach(() => {
  push.mockClear()
  fetchArtistSuggestions.mockReset()
  fetchArtistSuggestions.mockResolvedValue(SUGGESTIONS)
  followArtistsBulk.mockReset()
  followArtistsBulk.mockResolvedValue(undefined)
  tierPickerRender.mockClear()
  planState.current = FREE_PLAN
  token.current = 'test-token'
  // jsdom implements no scrolling; the shell resets scroll on every step change.
  Element.prototype.scrollTo = vi.fn()
  window.sessionStorage.clear()
})

afterEach(cleanup)

// The theme step reads the theme context.
const renderShell = (props: OnboardingShellProps = {}) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ThemeProvider>
        <OnboardingShell {...props} />
      </ThemeProvider>
    </QueryClientProvider>,
  )

// Both layouts render at once; the desktop half is display:none, so anything
// that should exist in both is queried with `hidden: true`.
const primaryCtas = () =>
  screen.getAllByRole('button', {
    name: /next|back to|start browsing|continue without following|^follow /i,
    hidden: true,
  })

const next = () => act(() => primaryCtas()[0]!.click())

/**
 * FLOW.length - 1 presses. Derived, not typed: the whole point of the counter
 * reading FLOW.length is that adding a step is a one-line change.
 */
const STEP_COUNT = Object.keys(nav.stepLabels).length

const advanceToEnd = () => {
  for (let i = 0; i < STEP_COUNT - 1; i += 1) next()
}

describe('OnboardingShell — post-auth tour (#794)', () => {
  it('puts Make it yours before What it does not do yet', () => {
    renderShell()
    const labels = Object.values(nav.stepLabels)
    const seen: string[] = []
    for (let i = 0; i < STEP_COUNT; i += 1) {
      seen.push(
        screen.getAllByText((text) => labels.includes(text), {
          ignore: false,
        })[0]!.textContent!,
      )
      if (i < STEP_COUNT - 1) next()
    }
    expect(seen).toEqual([
      nav.stepLabels.welcome,
      nav.stepLabels.how,
      nav.stepLabels.today,
      nav.stepLabels.theme,
      nav.stepLabels.notyet,
      nav.stepLabels.genres,
      nav.stepLabels.artists,
      nav.stepLabels.done,
    ])
  })

  it('carries no beta framing — the tour is a public welcome now', () => {
    const { container } = renderShell()
    const text = container.textContent ?? ''
    expect(text.toLowerCase()).not.toContain('beta')
    expect(text).not.toContain('Code accepted')
    expect(text).toContain(nav.railLabel)
  })

  it('offers a skip on every step, in both layouts', () => {
    renderShell()
    for (let i = 0; i < STEP_COUNT; i += 1) {
      expect(
        screen.getAllByRole('link', { name: /^skip$/i, hidden: true }),
      ).toHaveLength(2)
      if (i < STEP_COUNT - 1) next()
    }
  })

  it('ends on Start browsing when there is nothing pending', () => {
    renderShell()
    advanceToEnd()
    expect(primaryCtas()[0]!.textContent).toBe(nav.finishButton(null))
    next()
    expect(push).toHaveBeenCalledWith('/events')
  })

  it('ends by returning the visitor to their pending show, intent attached', () => {
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
    })
    advanceToEnd()
    expect(primaryCtas()[0]!.textContent).toBe(nav.finishButton('Geese'))
    next()
    expect(push).toHaveBeenCalledWith(
      `/events/e1?intent=watch%3A${EVENT_ID}&label=Geese`,
    )
  })

  it('carries a tier chosen before sign-up past the tour (#1284)', () => {
    // The tour is a stop on the way, not the destination. Dropping the tier
    // here means the picker never reopens on the far side.
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
      pendingTier: 'premium',
    })
    advanceToEnd()
    next()
    expect(push).toHaveBeenCalledWith(
      `/events/e1?intent=watch%3A${EVENT_ID}&label=Geese&tier=premium`,
    )
  })

  it('carries the tier out through the skip as well (#1284)', () => {
    renderShell({ pendingTier: 'supporter' })
    for (const link of screen.getAllByRole('link', {
      name: /^skip$/i,
      hidden: true,
    })) {
      expect(link.getAttribute('href')).toBe('/events?tier=supporter')
    }
  })

  it('names the pending show in the skip rail mid-intent', () => {
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
    })
    expect(
      screen.getAllByRole('link', {
        name: /skip: back to geese/i,
        hidden: true,
      }),
    ).toHaveLength(2)
  })

  it('carries the pending watch out through the skip, not just the finish', () => {
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
    })
    // Leaving early is a choice about the tour, not about the watch.
    for (const link of screen.getAllByRole('link', {
      name: /skip: back to geese/i,
      hidden: true,
    })) {
      expect(link.getAttribute('href')).toBe(
        `/events/e1?intent=watch%3A${EVENT_ID}&label=Geese`,
      )
    }
  })

  it('reads Close, not Skip, when opened from the account menu', () => {
    renderShell({ entry: 'menu' })
    expect(
      screen.getAllByRole('link', { name: /^close$/i, hidden: true }),
    ).toHaveLength(2)
  })

  it('ignores a label with no intent — there is nothing to hand back', () => {
    renderShell({ destinationLabel: 'Geese', returnPath: '/events/e1' })
    expect(
      screen.getAllByRole('link', { name: /^skip$/i, hidden: true }),
    ).toHaveLength(2)
    advanceToEnd()
    expect(primaryCtas()[0]!.textContent).toBe(nav.finishButton(null))
  })
})

const pickCopy = ONBOARDING_COPY.pickArtists
const ARTISTS_STEP_INDEX = Object.keys(nav.stepLabels).indexOf('artists')

/** Walk to the artists step and wait for its suggestions to land. */
const goToArtists = async () => {
  for (let i = 0; i < ARTISTS_STEP_INDEX; i += 1) next()
  await waitFor(() =>
    expect(
      screen.getAllByRole('checkbox', { name: /geese/i, hidden: true }).length,
    ).toBeGreaterThan(0),
  )
}

const tile = (name: RegExp) =>
  screen.getAllByRole('checkbox', { name, hidden: true })[0]!

describe('OnboardingShell — genres then artists', () => {
  it('offers the two picker steps before the send-off, both skippable', async () => {
    renderShell()
    await goToArtists()
    // Nothing picked is a legitimate way through: the CTA is a skip, not a wall.
    expect(primaryCtas()[0]!.textContent).toBe(pickCopy.skip)
    next()
    expect(
      screen.getAllByText(nav.stepLabels.done, { ignore: false }).length,
    ).toBeGreaterThan(0)
  })

  it('counts the picks in the CTA, pluralised for real', async () => {
    renderShell()
    await goToArtists()

    act(() => fireEvent.click(tile(/geese/i)))
    expect(primaryCtas()[0]!.textContent).toMatch(/\b1 artist\b/)

    act(() => fireEvent.click(tile(/ekko/i)))
    expect(primaryCtas()[0]!.textContent).toMatch(/\b2 artists\b/)
  })

  it('mirrors the selection so an upgrade can come back to it', async () => {
    renderShell()
    await goToArtists()
    act(() => fireEvent.click(tile(/geese/i)))

    // The picker unmounts this tree on some platforms; sessionStorage is what
    // survives it (PK-18, OB-06).
    expect(
      JSON.parse(
        window.sessionStorage.getItem('cc.onboarding.artistPicks') ?? '[]',
      ),
    ).toEqual(['geese'])
  })

  it('asks as the signed-in reader, so the followed can be left out', async () => {
    renderShell()
    await goToArtists()

    // Anonymously the route answers `following: null` on every row and the
    // exclusion below quietly does nothing.
    await waitFor(() =>
      expect(fetchArtistSuggestions).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Array),
        'test-token',
      ),
    )
    // No unchecked tile for someone you already follow — it would let you
    // "select" something the commit could not change.
    expect(
      screen.queryAllByRole('checkbox', { name: /wednesday/i, hidden: true }),
    ).toHaveLength(0)
  })

  it('drops picks the refetched grid no longer offers', async () => {
    // Changing genres refetches, and a pick with no tile left has no way to be
    // unticked. Riding along in the count and the commit is the bug.
    window.sessionStorage.setItem(
      'cc.onboarding.artistPicks',
      JSON.stringify(['geese', 'ghost']),
    )
    renderShell()
    await goToArtists()

    await waitFor(() =>
      expect(primaryCtas()[0]!.textContent).toMatch(/\b1 artist\b/),
    )
    expect(
      JSON.parse(
        window.sessionStorage.getItem('cc.onboarding.artistPicks') ?? '[]',
      ),
    ).toEqual(['geese'])
  })

  // A failed fetch also stops loading and also reports zero artists. Pruning
  // against that would wipe the selection the upgrade round-trip just restored.
  it('keeps a restored selection when the suggestions fetch fails', async () => {
    fetchArtistSuggestions.mockRejectedValue(new Error('offline'))
    window.sessionStorage.setItem(
      'cc.onboarding.artistPicks',
      JSON.stringify(['geese', 'ghost']),
    )
    renderShell()
    for (let i = 0; i < ARTISTS_STEP_INDEX; i += 1) next()

    // The failure notice only renders once the query has settled, so waiting on
    // it is what makes the assertions below land after the failure, not before.
    // The hook retries once, so settling outlasts waitFor's default window.
    await waitFor(
      () =>
        expect(
          screen.getAllByText(ARTIST_PICKER_COPY.errorTitle).length,
        ).toBeGreaterThan(0),
      { timeout: 5000 },
    )
    expect(primaryCtas()[0]!.textContent).toMatch(/\b2 artists\b/)
    expect(
      JSON.parse(
        window.sessionStorage.getItem('cc.onboarding.artistPicks') ?? '[]',
      ),
    ).toEqual(['geese', 'ghost'])
  })

  // Anonymously the route answers `following: null` on every row, so a
  // token-less read would re-offer artists the visitor already follows and the
  // tile has no way to say so. Failing is the better shape.
  it('does not read suggestions anonymously when the token is missing', async () => {
    token.current = null
    renderShell()
    for (let i = 0; i < ARTISTS_STEP_INDEX; i += 1) next()

    await waitFor(
      () =>
        expect(
          screen.getAllByText(ARTIST_PICKER_COPY.errorTitle).length,
        ).toBeGreaterThan(0),
      { timeout: 5000 },
    )
    expect(fetchArtistSuggestions).not.toHaveBeenCalled()
  })

  // `advance()` steps relative to wherever the tour is when the write settles,
  // so a Back press mid-flight would drop the visitor a step and then the
  // settle would push them forward onto the step they had just committed.
  it('holds Back shut while the follow write is in flight', async () => {
    let settle: () => void = () => {}
    followArtistsBulk.mockReturnValue(
      new Promise<undefined>((resolve) => {
        settle = () => resolve(undefined)
      }),
    )
    renderShell()
    await goToArtists()
    act(() => tile(/geese/i).click())

    const back = () =>
      screen.getAllByRole('button', { name: /back/i, hidden: true })[0]!
    expect(back().hasAttribute('disabled')).toBe(false)

    act(() => primaryCtas()[0]!.click())
    await waitFor(() => expect(back().hasAttribute('disabled')).toBe(true))

    await act(async () => {
      settle()
    })
    await waitFor(() => expect(followArtistsBulk).toHaveBeenCalled())
  })

  // The tour is post-auth, so a signed-out fallback would offer the wrong
  // ladder and bill the upgrade event to a visitor who does not exist.
  it('waits for the real plan before opening the tier picker', async () => {
    planState.current = undefined
    followArtistsBulk.mockRejectedValue(
      new ApiError(403, 'Premium required', 'entitlement_required'),
    )
    renderShell()
    await goToArtists()
    act(() => tile(/geese/i).click())
    act(() => primaryCtas()[0]!.click())

    await waitFor(() => expect(followArtistsBulk).toHaveBeenCalled())
    expect(tierPickerRender).not.toHaveBeenCalled()
  })

  it('opens the tier picker against the real plan once it has landed', async () => {
    followArtistsBulk.mockRejectedValue(
      new ApiError(403, 'Premium required', 'entitlement_required'),
    )
    renderShell()
    await goToArtists()
    act(() => tile(/geese/i).click())
    act(() => primaryCtas()[0]!.click())

    await waitFor(() =>
      expect(tierPickerRender.mock.calls.some(([props]) => props.open)).toBe(
        true,
      ),
    )
    for (const [props] of tierPickerRender.mock.calls) {
      expect(props.planState.plan).toBe('free')
    }
  })

  it('never locks the tiles themselves — only the commit is paywalled', async () => {
    renderShell()
    await goToArtists()
    for (const box of screen.getAllByRole('checkbox', { hidden: true })) {
      expect(box.hasAttribute('disabled')).toBe(false)
      expect(box.getAttribute('aria-disabled')).toBeNull()
    }
  })
})
