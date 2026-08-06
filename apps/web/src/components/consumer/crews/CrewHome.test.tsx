// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from '@testing-library/react'
import type { CrewDetail, CrewMember, CrewShow } from '@concert-crawl/types'
import {
  CREW_HANDOFF_REQUIRED_CODE,
  CREW_LAST_MEMBER_CODE,
} from '@concert-crawl/types'

const refresh = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }))

const getToken = vi.fn(async () => 'tok')
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }))

const leaveCrew = vi.fn(async () => undefined)
const rerollPatch = vi.fn(async () => ({
  id: 'c1',
  name: 'Thursdays',
  patchSalt: 4,
}))
const fetchCurrentInvite = vi.fn(async () => null)
const mintInvite = vi.fn(async () => ({
  id: 'i1',
  crewId: 'c1',
  token: 'tkn',
  createdBy: 'u1',
  expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  createdAt: new Date().toISOString(),
}))
vi.mock('@/lib/crews', () => ({
  leaveCrew: () => leaveCrew(),
  rerollPatch: () => rerollPatch(),
  fetchCurrentInvite: () => fetchCurrentInvite(),
  mintInvite: () => mintInvite(),
  revokeInvite: vi.fn(),
  handoffCrew: vi.fn(),
  removeMember: vi.fn(),
  deleteCrew: vi.fn(),
}))

import { ApiError } from '@/lib/api'
import { CrewHome, leadTabFor } from './CrewHome'
import { CrewHomeSkeleton } from './CrewHomeSkeleton'
import { RerollSheet } from './RerollSheet'
import { CREWS_COPY } from './definitions/copy'

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const member = (over: Partial<CrewMember> = {}): CrewMember => ({
  userId: 'u1',
  handle: 'ana',
  avatarColor: null,
  joinedAt: new Date().toISOString(),
  isKeeper: true,
  isYou: true,
  ...over,
})

const show = (over: Partial<CrewShow> = {}): CrewShow => ({
  eventId: 'e1',
  iso: '2026-09-14',
  showTime: null,
  title: 'Turnstile',
  venue: 'Ogden Theatre',
  venueSlug: 'ogden',
  goingCount: 2,
  going: [],
  ...over,
})

const detail = (over: Partial<CrewDetail> = {}): CrewDetail => ({
  id: 'c1',
  name: 'Thursdays',
  patchSalt: 3,
  memberCount: 3,
  isKeeper: true,
  muted: false,
  members: [
    member(),
    member({ userId: 'u2', handle: 'bo', isKeeper: false, isYou: false }),
    member({ userId: 'u3', handle: 'cy', isKeeper: false, isYou: false }),
  ],
  upcoming: [],
  nights: [],
  ...over,
})

// AM1
describe('CrewHome lead order (#1226)', () => {
  it('opens Coming up when it has content', () => {
    const crew = detail({
      upcoming: [show()],
      nights: [show({ eventId: 'e2' })],
    })
    expect(leadTabFor(crew)).toBe('upcoming')
    render(<CrewHome crew={crew} />)
    expect(screen.getByRole('tab', { name: /Coming up/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('opens Been there when Coming up is empty but there is history', () => {
    const crew = detail({ upcoming: [], nights: [show({ iso: '2025-04-02' })] })
    expect(leadTabFor(crew)).toBe('nights')
    render(<CrewHome crew={crew} />)
    expect(screen.getByRole('tab', { name: /Been there/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('falls back to the roster when a crew has neither', () => {
    expect(leadTabFor(detail())).toBe('roster')
  })
})

// AM2
describe('CrewTabs keyboard (#1226)', () => {
  const tabs = () => screen.getAllByRole('tab')

  it('wraps with the arrow keys and jumps with Home/End', () => {
    render(<CrewHome crew={detail({ upcoming: [show()] })} />)
    const strip = screen.getByRole('tablist')

    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(strip, { key: 'ArrowLeft' })
    fireEvent.keyDown(strip, { key: 'ArrowLeft' })
    // Wrapped off the left end onto the last tab.
    expect(tabs()[2]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(strip, { key: 'End' })
    expect(tabs()[2]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(strip, { key: 'Home' })
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the strip to one tab stop with a roving tabIndex', () => {
    render(<CrewHome crew={detail({ upcoming: [show()] })} />)
    const selected = tabs().filter(
      (tab) => tab.getAttribute('tabindex') === '0',
    )
    expect(selected).toHaveLength(1)
  })
})

// AM3
describe('CrewHome roster (#1226)', () => {
  it('never invents a name for a member without a handle', () => {
    render(
      <CrewHome
        crew={detail({
          members: [
            member(),
            member({
              userId: 'u2',
              handle: null,
              isKeeper: false,
              isYou: false,
            }),
          ],
          memberCount: 2,
        })}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /Who's in/ }))
    expect(screen.getByText(CREWS_COPY.roster.noHandle)).toBeInTheDocument()
    expect(screen.getByText(CREWS_COPY.roster.noHandleHelp)).toBeInTheDocument()
  })

  // AM4
  it('shows a notice rather than an empty state at capacity', () => {
    const members = Array.from({ length: 12 }, (_, i) =>
      member({
        userId: `u${i}`,
        handle: `p${i}`,
        isKeeper: i === 0,
        isYou: i === 0,
      }),
    )
    render(<CrewHome crew={detail({ members, memberCount: 12 })} />)
    fireEvent.click(screen.getByRole('tab', { name: /Who's in/ }))
    expect(screen.getByText(CREWS_COPY.empty.atCapTitle)).toBeInTheDocument()
    // The real roster is still there — a full crew is not an empty one.
    expect(screen.getByText('p5')).toBeInTheDocument()
  })
})

// AM5
describe('CrewHome crew of one (#1226)', () => {
  it('renders an inline notice above the tabs with the hero still present', () => {
    render(<CrewHome crew={detail({ members: [member()], memberCount: 1 })} />)
    const notice = screen.getByText(CREWS_COPY.empty.crewOfOneTitle)
    expect(notice).toBeInTheDocument()
    // The hero survives: this is a quiet crew, not a missing one.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Thursdays' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)

    const tablist = screen.getByRole('tablist')
    expect(
      notice.compareDocumentPosition(tablist) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

// AM6
describe('CrewHome leave 409 mapping (#1226)', () => {
  const openLeave = () => {
    render(<CrewHome crew={detail()} />)
    fireEvent.click(screen.getByRole('tab', { name: /Who's in/ }))
    fireEvent.click(
      screen.getByRole('button', { name: CREWS_COPY.roster.leave }),
    )
  }

  // The roster's row action and the confirm's primary share the same words,
  // so the CTA is only unambiguous inside the dialog.
  const confirmLeave = () =>
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: CREWS_COPY.confirm.leaveCta,
      }),
    )

  it('turns a handoff-required 409 into the handoff confirm', async () => {
    leaveCrew.mockRejectedValueOnce(
      new ApiError(409, 'nope', CREW_HANDOFF_REQUIRED_CODE),
    )
    openLeave()
    confirmLeave()
    expect(
      await screen.findByText(CREWS_COPY.confirm.handoffTitle),
    ).toBeInTheDocument()
  })

  // The 409 swaps the kind without unmounting the dialog, so a reset keyed to
  // close alone leaves the confirm it just opened permanently disabled.
  it('leaves the handoff confirm usable after the 409 swapped the kind', async () => {
    leaveCrew.mockRejectedValueOnce(
      new ApiError(409, 'nope', CREW_HANDOFF_REQUIRED_CODE),
    )
    openLeave()
    confirmLeave()
    await screen.findByText(CREWS_COPY.confirm.handoffTitle)

    const dialog = within(screen.getByRole('alertdialog'))
    fireEvent.click(dialog.getAllByRole('radio')[0] as HTMLElement)
    expect(
      dialog.getByRole('button', { name: CREWS_COPY.confirm.handoffCta }),
    ).toBeEnabled()
  })

  it('turns a last-member 409 into the delete-is-the-only-outcome confirm', async () => {
    leaveCrew.mockRejectedValueOnce(
      new ApiError(409, 'nope', CREW_LAST_MEMBER_CODE),
    )
    openLeave()
    confirmLeave()
    expect(
      await screen.findByText(CREWS_COPY.confirm.lastOneTitle('Thursdays')),
    ).toBeInTheDocument()
  })
})

// AM7
describe('RerollSheet explicit apply (#1226)', () => {
  it('issues no request on open and exactly one on apply', async () => {
    const onApplied = vi.fn()
    render(
      <RerollSheet
        open
        onClose={vi.fn()}
        crewId="c1"
        patchSalt={3}
        onApplied={onApplied}
      />,
    )
    expect(rerollPatch).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: CREWS_COPY.roster.newPatchCta }),
    )
    await screen.findByRole('button', { name: CREWS_COPY.roster.newPatchKeep })
    expect(rerollPatch).toHaveBeenCalledTimes(1)
  })
})

// AM8
describe('CrewHomeSkeleton (#1226)', () => {
  it('renders neither the crew name nor a patch', () => {
    const { container } = render(<CrewHomeSkeleton />)
    expect(screen.queryByText('Thursdays')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByText(CREWS_COPY.net.loadingCrew)).toBeInTheDocument()
  })
})
