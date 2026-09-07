// @vitest-environment jsdom

// The crews release flag empties FilterBar's crew list at the source rather
// than at each render site, because `lensCrew` is resolved out of that list:
// gating only the pill and the rail would still print an active crew's name in
// the heading for anyone holding a `?crew=` URL.

import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CrewSummary } from '@concert-crawl/types'

const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }))
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

const searchParams = { current: new URLSearchParams() }

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/events',
  useSearchParams: () => searchParams.current,
}))

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => ({ isLoading: false, active: false, surface: null }),
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

import { FilterBar } from './FilterBar'

const crew: CrewSummary = {
  id: 'crew_1',
  name: 'Night Shift',
  patchSalt: 1,
  memberCount: 3,
  members: [],
  upcomingCount: 2,
  isKeeper: false,
  muted: false,
}

beforeEach(() => {
  searchParams.current = new URLSearchParams('crew=crew_1')
  useFeatureFlag.mockImplementation((key: string) => ({
    isLoading: false,
    enabled: key === 'crews',
  }))
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(cleanup)

describe('FilterBar crews flag', () => {
  it('names the active crew in the heading when the flag is on', () => {
    render(<FilterBar venues={[]} crews={[crew]} />)
    expect(screen.getAllByText(crew.name).length).toBeGreaterThan(0)
  })

  it('drops the crew name from the heading when the flag is off', () => {
    useFeatureFlag.mockImplementation(() => ({
      isLoading: false,
      enabled: false,
    }))
    render(<FilterBar venues={[]} crews={[crew]} />)
    expect(screen.queryByText(crew.name)).toBeNull()
  })
})
