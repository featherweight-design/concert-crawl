// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import type { PublicCrewInvite } from '@concert-crawl/types'

// One stable `getToken` for the whole file. A fresh function per render would
// re-fire any effect that depends on it, which no real Clerk hook does, and
// which has already hidden a bug once on this epic.
const getToken = async () => 'tok'
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken }),
}))

const push = vi.fn()
const refresh = vi.fn()
// The real `notFound()` throws for the nearest boundary to catch, which would
// tear this render down before anything could be asserted. The mock only
// records the call — what matters is that the branded dead end is never the
// answer for a token that never existed.
const notFound = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  notFound: () => notFound(),
}))

const joinCrew = vi.fn()
vi.mock('@/lib/crews', () => ({
  joinCrew: (...args: unknown[]) => joinCrew(...args),
  CREW_FULL_CODE: 'crew_full',
  isCrewInviteDeadReason: (value: unknown) =>
    value === 'unknown' || value === 'expired' || value === 'revoked',
}))

import { ApiError } from '@/lib/api'
import { InviteLanding } from './InviteLanding'
import { InviteLandingSkeleton } from './InviteLandingSkeleton'
import { DeadInviteLink } from './DeadInviteLink'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

afterEach(cleanup)

const invite: PublicCrewInvite = {
  crewId: 'crew-1',
  name: 'Thursdays',
  patchSalt: 3,
  memberCount: 4,
  invitedByHandle: 'mvp_ross',
  isFull: false,
  viewerIsMember: false,
}

beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  notFound.mockClear()
  joinCrew
    .mockReset()
    .mockResolvedValue({ crewId: 'crew-1', joined: true, alreadyMember: false })
})

const mount = (overrides: Partial<PublicCrewInvite> = {}) =>
  render(
    <InviteLanding
      inviteToken="tok-abc"
      invite={{ ...invite, ...overrides }}
    />,
  )

const joinButton = () =>
  screen.getByRole('button', { name: COPY.landing.cta(invite.name) })

describe('InviteLanding (#1226)', () => {
  it('renders the invite with the inviter named', () => {
    mount()
    expect(
      screen.getByRole('heading', {
        name: COPY.landing.title('mvp_ross', 'Thursdays'),
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY.landing.eyebrow)).toBeInTheDocument()
    expect(screen.getByText(COPY.list.memberCount(4))).toBeInTheDocument()
    expect(screen.getByText(COPY.landing.body(4))).toBeInTheDocument()
    expect(screen.getByText(COPY.landing.privacy)).toBeInTheDocument()
    expect(joinButton()).toBeEnabled()
  })

  // The API's handle is nullable all the way through: a member without one is
  // never given an invented name (#762).
  it('falls back to the nameless title when there is no inviter handle', () => {
    mount({ invitedByHandle: null })
    expect(
      screen.getByRole('heading', {
        name: COPY.landing.titleNoName('Thursdays'),
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(COPY.landing.title('mvp_ross', 'Thursdays')),
    ).not.toBeInTheDocument()
  })

  // At capacity is NOT a dead link: identity stays, only the body and CTA swap.
  it('swaps the CTA and drops the privacy note at capacity', () => {
    mount({ isFull: true })
    expect(
      screen.getByRole('heading', {
        name: COPY.landing.title('mvp_ross', 'Thursdays'),
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY.linkDead.fullBody)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: COPY.linkDead.browse }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: COPY.landing.cta(invite.name) }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(COPY.landing.privacy)).not.toBeInTheDocument()
  })

  // A forwarded link opened by someone already in the crew. Everything written
  // for a stranger goes; the way in replaces the way to join.
  it('offers the way in rather than a join CTA to an existing member', () => {
    mount({ viewerIsMember: true })
    expect(
      screen.getByRole('heading', {
        name: COPY.landing.memberTitle('Thursdays'),
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY.landing.memberEyebrow)).toBeInTheDocument()
    expect(screen.getByText(COPY.list.memberCount(4))).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: COPY.landing.cta(invite.name) }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(COPY.landing.body(4))).not.toBeInTheDocument()
    expect(screen.queryByText(COPY.landing.privacy)).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: COPY.landing.memberCta('Thursdays') }),
    )
    expect(push).toHaveBeenCalledWith('/crews/crew-1')
    expect(joinCrew).not.toHaveBeenCalled()
  })

  // Membership outranks capacity: a full crew is not a reason to shut a member
  // out of their own crew.
  it('keeps the member surface when the crew is also full', () => {
    mount({ viewerIsMember: true, isFull: true })
    expect(
      screen.getByRole('button', { name: COPY.landing.memberCta('Thursdays') }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: COPY.linkDead.browse }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(COPY.linkDead.fullBody)).not.toBeInTheDocument()
  })

  it('navigates to the crew on a successful join', async () => {
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(joinCrew).toHaveBeenCalledWith('tok', 'tok-abc')
    expect(push).toHaveBeenCalledWith('/crews/crew-1')
    // The crews list is cached from before this membership existed.
    expect(refresh).toHaveBeenCalled()
  })

  // A forwarded link tapped twice must land on the crew, not error.
  it('treats alreadyMember as a success and navigates', async () => {
    joinCrew.mockResolvedValue({
      crewId: 'crew-1',
      joined: false,
      alreadyMember: true,
    })
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(push).toHaveBeenCalledWith('/crews/crew-1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // The crew can fill between the landing render and the tap.
  it('swaps to the at-capacity surface in place on a 409', async () => {
    joinCrew.mockRejectedValue(
      new ApiError(409, 'This crew is full', 'crew_full'),
    )
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(screen.getByText(COPY.linkDead.fullBody)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: COPY.landing.cta(invite.name) }),
    ).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  // Otherwise the surface reads "4 members" directly above "12 is the cap".
  it('drops the server-rendered count on a 409, but keeps it when the landing arrived full', async () => {
    joinCrew.mockRejectedValue(
      new ApiError(409, 'This crew is full', 'crew_full'),
    )
    const { unmount } = mount()
    expect(
      screen.getByText(COPY.list.memberCount(invite.memberCount)),
    ).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    // The 409 proves the count is stale: the crew filled after that render.
    expect(
      screen.queryByText(COPY.list.memberCount(invite.memberCount)),
    ).not.toBeInTheDocument()
    unmount()

    // A landing that arrives full never had a stale count to begin with.
    mount({ isFull: true })
    expect(
      screen.getByText(COPY.list.memberCount(invite.memberCount)),
    ).toBeInTheDocument()
  })

  // The swap is silent otherwise: nothing else on the surface tells a screen
  // reader the button it was about to press is gone.
  it('announces the at-capacity swap, and says nothing on a landing that arrives full', async () => {
    // `toHaveTextContent('')` is a substring match and passes against any
    // string, so the empty assertions read textContent directly.
    const live = () => document.querySelector('[aria-live="polite"]')

    const { unmount } = mount({ isFull: true })
    // Present from the first render, because a live region populated at mount
    // time is not announced at all.
    expect(live()).toBeInTheDocument()
    expect(live()?.textContent).toBe('')
    unmount()

    joinCrew.mockRejectedValue(
      new ApiError(409, 'This crew is full', 'crew_full'),
    )
    mount()
    expect(live()?.textContent).toBe('')
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(live()).toHaveTextContent(COPY.linkDead.filledUp)
  })

  // And it can be retired in that same window.
  it('swaps to the dead-link surface in place on a 404', async () => {
    joinCrew.mockRejectedValue(
      new ApiError(404, 'Not found', undefined, undefined, 'revoked'),
    )
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(screen.getByText(COPY.linkDead.revokedTitle)).toBeInTheDocument()
    expect(screen.getByText(COPY.linkDead.revokedBody)).toBeInTheDocument()
    // A dead link carries no crew identity at all.
    expect(screen.queryByText('Thursdays')).not.toBeInTheDocument()
  })

  // `unknown` gets the app's ordinary 404 rather than a branded dead end, or
  // the surface would confirm which tokens exist.
  it('raises notFound for an unknown token', async () => {
    joinCrew.mockRejectedValue(
      new ApiError(404, 'Not found', undefined, undefined, 'unknown'),
    )
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(notFound).toHaveBeenCalled()
  })

  // The defect class this epic keeps producing: state that outlives the
  // interaction that set it. A join that fails must leave a live button.
  it('clears the busy flag and keeps the CTA usable after a failure', async () => {
    joinCrew.mockRejectedValue(new Error('offline'))
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.net.joinFailed)
    expect(joinButton()).toBeEnabled()
    expect(screen.queryByText(COPY.landing.joining)).not.toBeInTheDocument()

    joinCrew.mockResolvedValue({
      crewId: 'crew-1',
      joined: true,
      alreadyMember: false,
    })
    await act(async () => {
      fireEvent.click(joinButton())
    })
    expect(push).toHaveBeenCalledWith('/crews/crew-1')
  })

  it('disables the CTA while the join is in flight so a double tap cannot fire two joins', async () => {
    joinCrew.mockReturnValue(new Promise(() => undefined))
    mount()
    await act(async () => {
      fireEvent.click(joinButton())
    })
    const button = screen.getByRole('button', { name: COPY.landing.joining })
    expect(button).toBeDisabled()
    await act(async () => {
      fireEvent.click(button)
    })
    expect(joinCrew).toHaveBeenCalledTimes(1)
  })
})

describe('DeadInviteLink (#1226)', () => {
  it.each([
    ['expired' as const, COPY.linkDead.expiredTitle, COPY.linkDead.expiredBody],
    ['revoked' as const, COPY.linkDead.revokedTitle, COPY.linkDead.revokedBody],
  ])('renders the %s dead end with no crew identity', (kind, title, body) => {
    render(<DeadInviteLink kind={kind} />)
    expect(screen.getByText(COPY.linkDead.eyebrow)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(body)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: COPY.linkDead.browse }),
    ).toBeInTheDocument()
  })
})

describe('InviteLandingSkeleton (#1226)', () => {
  it('announces the check without guessing at a crew', () => {
    render(<InviteLandingSkeleton />)
    expect(screen.getByText(COPY.net.loadingInvite)).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
