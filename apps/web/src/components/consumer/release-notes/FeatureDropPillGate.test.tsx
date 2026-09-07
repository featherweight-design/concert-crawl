// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let pathname: string
let isLoaded: boolean
let isSignedIn: boolean

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded, isSignedIn }),
}))

vi.mock('./FeatureDropPill', () => ({
  FeatureDropPill: () => <div data-testid="feature-pill" />,
}))

vi.mock('./SpotlightModal', () => ({
  SpotlightModal: () => <div data-testid="spotlight-modal" />,
}))

// The gate short-circuits when the newest real release ships no spotlight, so
// the fixture pins one in place — the signed-out assertions are about auth,
// not about whatever happens to sit at the top of releases.ts.
vi.mock('@/lib/definitions/releases', () => ({
  RELEASES: [
    {
      version: 'v0.0.0-test',
      date: 'Jul 29, 2026',
      headline: 'Fixture release',
      items: [{ kind: 'added', text: 'A thing' }],
      spotlight: {
        title: 'Fixture spotlight',
        tagline: 'For the gate test',
        hero: 'map',
        steps: [{ caption: 'One' }],
      },
    },
  ],
}))

// Hoisted: `vi.mock` runs before module-scope consts, so the spy has to be
// created inside the hoisted block to be visible to the factory.
const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }))
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

const mockFeatureFlag = (key: string, enabled: boolean) =>
  useFeatureFlag.mockImplementation((requested: string) => ({
    isLoading: false,
    enabled: requested === key ? enabled : true,
  }))

import { FeatureDropPillGate } from './FeatureDropPillGate'

beforeEach(() => {
  pathname = '/events'
  isLoaded = true
  isSignedIn = true
  // Flags on by default, so every pre-flag assertion keeps asserting the
  // behaviour it was written for.
  mockFeatureFlag('release-notes', true)
})

afterEach(() => {
  localStorage.clear()
})

describe('FeatureDropPillGate — signed-out gating (#794)', () => {
  it('renders the pill for a signed-in visitor on a consumer route', () => {
    const { queryByTestId } = render(<FeatureDropPillGate />)
    expect(queryByTestId('feature-pill')).toBeTruthy()
  })

  // The pill's read state is per-account and the spotlight is a "what's new
  // for you" beat — meaningless to someone who has never been in.
  it('renders nothing when signed out', () => {
    isSignedIn = false
    const { container } = render(<FeatureDropPillGate />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing while Clerk is still resolving', () => {
    isLoaded = false
    isSignedIn = false
    const { container } = render(<FeatureDropPillGate />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when the release-notes flag is off', () => {
    mockFeatureFlag('release-notes', false)
    const { container } = render(<FeatureDropPillGate />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the pill as before when the flag is on', () => {
    mockFeatureFlag('release-notes', true)
    const { queryByTestId } = render(<FeatureDropPillGate />)
    expect(queryByTestId('feature-pill')).toBeTruthy()
  })

  it('still hides on /changelog and admin routes', () => {
    pathname = '/changelog'
    expect(render(<FeatureDropPillGate />).container.innerHTML).toBe('')
    pathname = '/admin/venues'
    expect(render(<FeatureDropPillGate />).container.innerHTML).toBe('')
  })
})
