// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from '@testing-library/react'
import type { PlanState } from '@concert-crawl/types'
import type * as ApiModule from '@/lib/api'

import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'

import { FollowNudgeCard } from './FollowNudgeCard'
import { FOLLOW_NUDGE_COPY } from './definitions/copy'
import type { FollowNudgeTarget } from './lib/use-first-watch-nudge'

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

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}))

const { apiPost, apiDelete } = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof ApiModule>('@/lib/api')
  return { ...actual, apiClient: { post: apiPost, delete: apiDelete } }
})

// The REAL useEntitlement runs; only the plan it reads is swapped, so the
// tier -> surface mapping stays under test rather than being restated here.
const planState = vi.hoisted(() => ({ current: null as PlanState | null }))
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: planState.current, isPending: false }),
}))

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

const TARGET: FollowNudgeTarget = {
  eventId: 'evt-1',
  userEventId: 'ue-1',
  artist: 'Big Thief',
  artistSlug: 'big-thief',
}

beforeEach(() => {
  planState.current = plan()
  apiPost.mockResolvedValue({ following: true })
  apiDelete.mockResolvedValue({ following: false })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const followButton = () =>
  screen.getByRole('button', { name: ARTIST_COPY.followAria(TARGET.artist) })

describe('FollowNudgeCard', () => {
  it('confirms the watch and asks for the follow in one card', () => {
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={vi.fn()}
      />,
    )
    expect(
      screen.getByText(FOLLOW_NUDGE_COPY.watchConfirmed),
    ).toBeInTheDocument()
    expect(
      screen.getByText(FOLLOW_NUDGE_COPY.title(TARGET.artist)),
    ).toBeInTheDocument()
    expect(screen.getByText(FOLLOW_NUDGE_COPY.body)).toBeInTheDocument()
    expect(followButton()).toBeInTheDocument()
  })

  it('dismissing answers the nudge', () => {
    const onAnswer = vi.fn()
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={onAnswer}
      />,
    )
    fireEvent.click(screen.getByText(FOLLOW_NUDGE_COPY.dismiss))
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  // jsdom computes no styles, so the assertion is on the two things that
  // actually broke it: the ring class being present, and no inline `all` or
  // `box-shadow` resolving over the top of it at inline priority.
  it('leaves the secondary control a focus ring a keyboard can see', () => {
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={vi.fn()}
      />,
    )
    const secondary = screen.getByText(FOLLOW_NUDGE_COPY.dismiss)
    expect(secondary.className).toContain('focus-visible:ring-2')
    expect(secondary.style.all).toBe('')
    expect(secondary.style.boxShadow).toBe('')
  })

  it('follows, then stands its ground with a close instead of a decline', async () => {
    const onAnswer = vi.fn()
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={onAnswer}
      />,
    )
    fireEvent.click(followButton())
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        `/v1/artists/${TARGET.artistSlug}/follow`,
        'token',
        {},
      ),
    )
    // The card is still up — the confirmation is not yanked out from under
    // the finger that just landed the follow.
    await screen.findByText(FOLLOW_NUDGE_COPY.close)
    expect(
      screen.queryByText(FOLLOW_NUDGE_COPY.dismiss),
    ).not.toBeInTheDocument()
    expect(onAnswer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText(FOLLOW_NUDGE_COPY.close))
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  // Step 1: "Free tier still sees it, with the lock on the CTA." The card is
  // the pitch, so withholding it from the tier being pitched to is backwards.
  it('shows a free viewer the same card with the lock on the CTA', () => {
    planState.current = plan({ plan: 'free' })
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={vi.fn()}
      />,
    )
    expect(
      screen.getByText(FOLLOW_NUDGE_COPY.title(TARGET.artist)),
    ).toBeInTheDocument()
    // Locked keeps idle's accessible name; the gate sentence carries the truth.
    const cta = followButton()
    expect(cta.querySelector('[data-glyph="lock"]')).not.toBeNull()
    expect(screen.getByText(FOLLOWING_COPY.followGate)).toBeInTheDocument()
  })

  it('opens the tier picker on a locked tap and writes nothing', () => {
    planState.current = plan({ plan: 'supporter' })
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={vi.fn()}
      />,
    )
    fireEvent.click(followButton())
    expect(screen.getByTestId('tier-picker')).toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })

  // The floating variant is the same card in a fixed shell, so the copy claim
  // is made once and only the extra affordance is asserted separately.
  it('carries the same copy floating, plus a close control', () => {
    const onAnswer = vi.fn()
    render(
      <FollowNudgeCard
        target={TARGET}
        variant="floating"
        scaRegion={false}
        onAnswer={onAnswer}
      />,
    )
    expect(
      screen.getByText(FOLLOW_NUDGE_COPY.title(TARGET.artist)),
    ).toBeInTheDocument()
    expect(screen.getByText(FOLLOW_NUDGE_COPY.body)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: FOLLOW_NUDGE_COPY.dismissAria }),
    )
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  // ⚠️ Handoff §6 a11y, both clauses. The floating card lands unbidden over
  // whatever the user was reading, so it owes a live-region announcement and
  // a corner target a thumb can actually hit. The 44px is the one that
  // regresses silently: a 16px glyph in a padded box looks identical.
  it('announces once and gives the close control a 44px target', () => {
    const { container } = render(
      <FollowNudgeCard
        target={TARGET}
        variant="floating"
        scaRegion={false}
        onAnswer={vi.fn()}
      />,
    )
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    const close = screen.getByRole('button', {
      name: FOLLOW_NUDGE_COPY.dismissAria,
    })
    expect(close.className).toContain('h-11')
    expect(close.className).toContain('w-11')
  })

  // The inline card replaces the watch strip the user just tapped, so it is a
  // state change they caused, not an interruption to announce.
  it('does not make the inline card a live region', () => {
    const { container } = render(
      <FollowNudgeCard
        target={TARGET}
        variant="inline"
        scaRegion={false}
        onAnswer={vi.fn()}
      />,
    )
    expect(container.querySelector('[role="status"]')).toBeNull()
  })
})
