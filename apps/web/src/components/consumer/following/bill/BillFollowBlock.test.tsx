// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from '@testing-library/react'
import type { BulkFollowResponse, PlanState } from '@concert-crawl/types'
import type * as ApiModule from '@/lib/api'

import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants'
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'

import { BillFollowBlock } from './BillFollowBlock'
import { BILL_FOLLOW_COPY } from './definitions/copy'
import type { BillArtist } from './lib/bill-artists'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('token'),
    isSignedIn: true,
    userId: 'user_1',
  }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/events/evt-1',
  useSearchParams: () => new URLSearchParams(),
}))

// The picker is a lazy client sheet with its own checkout tree; the claims
// here are about what the block draws, not about what the sheet renders.
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}))

const { followArtistsBulk, apiPost, apiDelete } = vi.hoisted(() => ({
  followArtistsBulk: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/lib/following', () => ({ followArtistsBulk }))
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof ApiModule>('@/lib/api')
  return {
    ...actual,
    apiClient: { post: apiPost, delete: apiDelete },
  }
})

// The REAL useEntitlement runs; only the plan it reads is swapped. That keeps
// the tier -> surface mapping under test rather than restating the matrix,
// which is exactly how a Supporter got a live Follow button in design R2.
const planState = vi.hoisted(() => ({ current: null as PlanState | null }))
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: planState.current, isPending: false }),
}))

// useEntitlement also reads the release-flag map, a react-query hook. These
// cases render without a QueryClientProvider, so the map is stubbed at the
// registry defaults; no flag names `following`, so the seam is inert here.
vi.mock('@/lib/queries/use-feature-flags', async () => {
  const { featureFlagDefaults } = await import('@concert-crawl/entitlements')
  return {
    useFeatureFlags: () => ({ data: featureFlagDefaults(), isPending: false }),
  }
})

const plan = (over: Partial<PlanState> = {}): PlanState => ({
  plan: 'premium',
  onTrial: false,
  trialEndsAt: null,
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
  ...over,
})

const BILL: BillArtist[] = [
  { slug: 'nightjar-choir', name: 'Nightjar Choir', following: false },
  { slug: 'paper-tigers', name: 'Paper Tigers', following: false },
  { slug: 'low-ceiling', name: 'Low Ceiling', following: false },
]

const bulkOk = (slugs: string[]): BulkFollowResponse => ({
  results: slugs.map((slug) => ({ slug, status: 'followed' })),
  followedCount: slugs.length,
})

const COPY = BILL_FOLLOW_COPY

const followButtons = () =>
  BILL.map((artist) =>
    screen.queryByRole('button', { name: ARTIST_COPY.followAria(artist.name) }),
  ).filter((node) => node !== null)

beforeEach(() => {
  planState.current = plan()
  followArtistsBulk.mockReset()
  apiPost.mockReset()
  apiDelete.mockReset()
})

afterEach(cleanup)

describe('BillFollowBlock — the block itself', () => {
  it('lists the whole bill, headliner first, with the billed count', () => {
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    expect(screen.getByTestId('bill-follow-block')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: COPY.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY.count(3))).toBeInTheDocument()

    const names = screen
      .getAllByRole('listitem')
      .map((row) => row.textContent ?? '')
    expect(names[0]).toContain('Nightjar Choir')
    expect(names).toHaveLength(3)
  })

  // ED-08: following is the artist, watching is the show. The block may never
  // imply that a follow moves anything into Watching.
  it('never promises that following puts the show in Watching', () => {
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    expect(screen.getByTestId('bill-follow-block').textContent).not.toMatch(
      /watch/i,
    )
  })

  it('renders nothing at all for a bill with no followable acts', () => {
    const { container } = render(
      <BillFollowBlock artists={[]} scaRegion={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('BillFollowBlock — the header shortcut', () => {
  // R3 rule 1: the shortcut is a convenience for the rows below it, not the
  // section's own CTA. Drawn full-width and filled below the list, it read as
  // the latter. Its home is the header, at the rows' own density.
  it('sits in the header beside the title, quiet and at row density', () => {
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    const bulk = screen.getByTestId('bill-follow-all')
    expect(bulk.style.height).toBe(`${NF_FOLLOW_SIZES.row.height}px`)
    expect(bulk.style.borderRadius).toBe(`${NF_FOLLOW_SIZES.row.radius}px`)
    // Quiet: no fill, and the width is the label's rather than the block's.
    expect(bulk.style.background).toBe('transparent')
    expect(bulk.style.width).toBe('')

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.parentElement?.parentElement).toBe(bulk.parentElement)
  })

  // The pill shrank to 28; the target did not (WCAG 2.5.8).
  it('grows an invisible 44px target around the 28px pill', () => {
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    const overlay = screen
      .getByTestId('bill-follow-all')
      .querySelector<HTMLElement>('[data-hit-overlay]')
    expect(overlay).not.toBeNull()
    // The 44 is the WCAG requirement, so it is written out rather than read
    // from `NF_TAP_MIN`: a test that takes its target from the same constant
    // the component does cannot notice the target being lowered. The sum is
    // what makes the literal safe — the pill and its overlay have to add up.
    expect(overlay?.style.inset).toBe('-8px')
    expect(NF_FOLLOW_SIZES.row.height + 8 * 2).toBe(44)
  })
})

describe('BillFollowBlock — ONE paywall, ONE tap (ED-05)', () => {
  it('gives a Supporter a single locked action instead of a lock per act', async () => {
    planState.current = plan({ plan: 'supporter' })
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    // The whole point: three acts must not mean three walls.
    expect(followButtons()).toHaveLength(0)

    const bulk = screen.getByTestId('bill-follow-all')
    expect(bulk).toHaveAttribute('aria-haspopup', 'dialog')
    // The label counts the whole bill while locked — none of it is reachable,
    // so "Follow all 3" is the honest number.
    expect(bulk).toHaveTextContent(COPY.followAll(3))

    // The gate is told in an sr-only sentence, and it has to be IN the a11y
    // tree for aria-describedby to announce anything.
    const gateId = bulk.getAttribute('aria-describedby')
    expect(gateId).toBeTruthy()
    const gate = document.getElementById(gateId ?? '')
    expect(gate).toHaveTextContent(FOLLOWING_COPY.followGate)
    expect(gate).not.toHaveAttribute('hidden')

    fireEvent.click(bulk)
    expect(screen.getByTestId('tier-picker')).toBeInTheDocument()
    expect(followArtistsBulk).not.toHaveBeenCalled()
  })

  it('gives a Premium subscriber independent rows and no gate', () => {
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    expect(followButtons()).toHaveLength(3)
    expect(screen.getByTestId('bill-follow-all')).not.toHaveAttribute(
      'aria-describedby',
    )
    expect(screen.queryByText(FOLLOWING_COPY.followGate)).toBeNull()
  })

  // roleComped is an override the matrix does not encode; a comped account on
  // plan 'free' renders locked if anything tests the tier string inline.
  it('does not lock a comped free account', () => {
    planState.current = plan({ plan: 'free', roleComped: true })
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    expect(followButtons()).toHaveLength(3)
    expect(screen.queryByText(FOLLOWING_COPY.followGate)).toBeNull()
  })

  it('locks a free account as one unit too', () => {
    planState.current = plan({ plan: 'free' })
    render(<BillFollowBlock artists={BILL} scaRegion={false} />)

    expect(followButtons()).toHaveLength(0)
    expect(screen.getByTestId('bill-follow-all')).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    )
  })

  // The signed-out mirror recruits: every row routes to sign-up on its own, so
  // a second route to the same place in the same block is noise.
  it('recruits row by row when signed out, with no bulk action', () => {
    planState.current = null
    render(<BillFollowBlock artists={BILL} signedOut scaRegion={false} />)

    expect(followButtons()).toHaveLength(0)
    expect(
      screen.getAllByRole('button', {
        name: ARTIST_COPY.followSignedOutAria('Nightjar Choir'),
      }),
    ).toHaveLength(1)
    expect(screen.queryByTestId('bill-follow-all')).toBeNull()
  })
})

describe('BillFollowBlock — "Follow all N"', () => {
  it('commits the unfollowed acts once and shows a pending skin meanwhile', async () => {
    let release: (value: BulkFollowResponse) => void = () => {}
    followArtistsBulk.mockImplementation(
      () =>
        new Promise<BulkFollowResponse>((resolve) => {
          release = resolve
        }),
    )

    const artists: BillArtist[] = [
      { ...BILL[0]!, following: true },
      BILL[1]!,
      BILL[2]!,
    ]
    render(<BillFollowBlock artists={artists} scaRegion={false} />)

    const bulk = screen.getByTestId('bill-follow-all')
    // Only the two that are not already followed are on offer.
    expect(bulk).toHaveTextContent(COPY.followAll(2))

    fireEvent.click(bulk)

    await waitFor(() => expect(bulk).toHaveAttribute('aria-busy', 'true'))
    // aria-disabled, never disabled: a disabled button drops focus to the body
    // mid-commit. The label is unchanged, so the control cannot move out from
    // under the finger still on it (ED-04).
    expect(bulk).toHaveAttribute('aria-disabled', 'true')
    expect(bulk).not.toBeDisabled()
    expect(bulk).toHaveAccessibleName(COPY.followAllPendingAria)

    // A second tap while in flight must not double-write.
    fireEvent.click(bulk)
    expect(followArtistsBulk).toHaveBeenCalledTimes(1)
    expect(followArtistsBulk).toHaveBeenCalledWith('token', [
      'paper-tigers',
      'low-ceiling',
    ])

    release(bulkOk(['paper-tigers', 'low-ceiling']))

    // ED-03: nothing left to commit, so the action goes.
    await waitFor(() =>
      expect(screen.queryByTestId('bill-follow-all')).toBeNull(),
    )
    expect(followButtons()).toHaveLength(0)
  })

  it('drops an act the projection no longer has rather than leaving a pill', async () => {
    followArtistsBulk.mockResolvedValue({
      results: [
        { slug: 'nightjar-choir', status: 'followed' },
        { slug: 'paper-tigers', status: 'artist_not_found' },
        { slug: 'low-ceiling', status: 'already_following' },
      ],
      followedCount: 1,
    } satisfies BulkFollowResponse)

    render(<BillFollowBlock artists={BILL} scaRegion={false} />)
    fireEvent.click(screen.getByTestId('bill-follow-all'))

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: ARTIST_COPY.followAria('Paper Tigers'),
        }),
      ).toBeInTheDocument(),
    )
    // Its neighbours succeeded and must not be rolled back with it.
    expect(
      screen.getByRole('button', {
        name: ARTIST_COPY.followingAria('Nightjar Choir'),
      }),
    ).toBeInTheDocument()
    // One act is still on offer, and its own row button is the way to take
    // it — a bulk action for a single row is the same decision twice.
    expect(screen.queryByTestId('bill-follow-all')).toBeNull()
  })

  it('rolls the bill back and opens the picker on a stale entitlement', async () => {
    const { ApiError } = await vi.importActual<typeof ApiModule>('@/lib/api')
    followArtistsBulk.mockRejectedValue(
      new ApiError(403, 'Premium required', 'entitlement_required'),
    )

    render(<BillFollowBlock artists={BILL} scaRegion={false} />)
    fireEvent.click(screen.getByTestId('bill-follow-all'))

    await waitFor(() =>
      expect(screen.getByTestId('tier-picker')).toBeInTheDocument(),
    )
    expect(followButtons()).toHaveLength(3)
  })

  // A failed bulk used to restore a snapshot of the whole set, which also
  // reversed any row the viewer toggled while it was in flight — a tap they
  // watched succeed, silently undone by an unrelated failure.
  it('rolls back only its own acts, leaving a row toggled meanwhile alone', async () => {
    const { ApiError } = await vi.importActual<typeof ApiModule>('@/lib/api')
    let reject: (reason: unknown) => void = () => {}
    followArtistsBulk.mockImplementation(
      () =>
        new Promise<BulkFollowResponse>((_resolve, rejectBulk) => {
          reject = rejectBulk
        }),
    )
    apiDelete.mockResolvedValue({ following: false })

    // Nightjar Choir is already followed, so the bulk does not carry it and it
    // stays tappable while the other two commit.
    const artists: BillArtist[] = [
      { ...BILL[0]!, following: true },
      BILL[1]!,
      BILL[2]!,
    ]
    render(<BillFollowBlock artists={artists} scaRegion={false} />)

    fireEvent.click(screen.getByTestId('bill-follow-all'))
    await waitFor(() =>
      expect(followArtistsBulk).toHaveBeenCalledWith('token', [
        'paper-tigers',
        'low-ceiling',
      ]),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: ARTIST_COPY.followingAria('Nightjar Choir'),
      }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: ARTIST_COPY.followAria('Nightjar Choir'),
        }),
      ).toBeInTheDocument(),
    )

    reject(new ApiError(500, 'Server error', 'internal_error'))

    // The two the bulk carried come back; the one it never touched does not.
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: ARTIST_COPY.followAria('Paper Tigers'),
        }),
      ).toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', {
        name: ARTIST_COPY.followAria('Nightjar Choir'),
      }),
    ).toBeInTheDocument()
  })

  it('is withheld once every act on the bill is followed', () => {
    render(
      <BillFollowBlock
        artists={BILL.map((artist) => ({ ...artist, following: true }))}
        scaRegion={false}
      />,
    )
    expect(screen.queryByTestId('bill-follow-all')).toBeNull()
  })

  // Two buttons reading "Follow" in one block is one decision offered twice.
  it('is withheld on a one-act bill, where the row already carries it', () => {
    render(<BillFollowBlock artists={[BILL[0]!]} scaRegion={false} />)
    expect(screen.queryByTestId('bill-follow-all')).toBeNull()
    expect(
      screen.getByRole('button', {
        name: ARTIST_COPY.followAria('Nightjar Choir'),
      }),
    ).toBeInTheDocument()
  })

  // ...unless the rows are not drawn at all, which is every act below Premium.
  it('survives on a one-act bill while locked, as the only control there', () => {
    planState.current = plan({ plan: 'supporter' })

    render(<BillFollowBlock artists={[BILL[0]!]} scaRegion={false} />)

    expect(screen.getByTestId('bill-follow-all')).toBeInTheDocument()
    expect(followButtons()).toHaveLength(0)
  })

  // The downgrade case: a lapsed Premium viewer follows the whole bill, so
  // there is nothing left to commit — but nothing is reachable either, and a
  // block with no control in it is a dead surface.
  it('keeps the locked action even when the viewer follows every act', () => {
    planState.current = plan({ plan: 'supporter' })

    render(
      <BillFollowBlock
        artists={BILL.map((artist) => ({ ...artist, following: true }))}
        scaRegion={false}
      />,
    )

    const bulk = screen.getByTestId('bill-follow-all')
    expect(bulk).toHaveAttribute('aria-haspopup', 'dialog')
    expect(bulk).toHaveTextContent(COPY.followAll(3))
  })
})

describe('BillFollowBlock — a single row', () => {
  // The row is a flex ROW, so the name's automatic minimum size is the whole
  // name. Without min-w-0 a long one shoves the follow button off the end
  // instead of ellipsising — the same class as the FollowDateLine defect.
  it('lets a long artist name shrink rather than push the button out', () => {
    const { container } = render(
      <BillFollowBlock
        artists={[{ ...BILL[0]!, name: 'A Band With A Very Long Name Indeed' }]}
        scaRegion={false}
      />,
    )

    const name = container.querySelector('li > span')
    expect(name?.className).toContain('text-ellipsis')
    expect(name?.className).toContain('min-w-0')
  })

  it('takes the server answer rather than keeping the optimistic guess', async () => {
    apiDelete.mockResolvedValue({ following: true })

    render(
      <BillFollowBlock
        artists={[{ ...BILL[0]!, following: true }]}
        scaRegion={false}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: ARTIST_COPY.followingAria('Nightjar Choir'),
      }),
    )

    // A Spotify sync can legitimately still hold the row, so an unfollow that
    // comes back still-following settles as following.
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: ARTIST_COPY.followingAria('Nightjar Choir'),
        }),
      ).toBeInTheDocument(),
    )
    expect(apiDelete).toHaveBeenCalledTimes(1)
  })

  it('rolls one row back without disturbing the rest of the bill', async () => {
    apiPost.mockRejectedValue(new Error('network'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <BillFollowBlock
        artists={[BILL[0]!, { ...BILL[1]!, following: true }]}
        scaRegion={false}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: ARTIST_COPY.followAria('Nightjar Choir'),
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: ARTIST_COPY.followAria('Nightjar Choir'),
        }),
      ).toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', {
        name: ARTIST_COPY.followingAria('Paper Tigers'),
      }),
    ).toBeInTheDocument()
    warn.mockRestore()
  })
})
