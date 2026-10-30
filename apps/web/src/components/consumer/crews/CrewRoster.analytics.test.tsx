// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CrewMember } from '@concert-crawl/types'
import { CrewRoster } from './CrewRoster'
import { WatchersRoster } from '../watchers/WatchersRoster'

// posthog-js autocapture skips any element inside a `ph-no-capture` ancestor
// and leaves its text out of an enclosing button's or link's label, so
// another reader's handle carries the class wherever it is drawn.
const member = (overrides: Partial<CrewMember>): CrewMember => ({
  userId: 'user_other',
  handle: 'marisol',
  avatarColor: 'signal',
  joinedAt: '2026-10-01T00:00:00Z',
  isKeeper: false,
  isYou: false,
  ...overrides,
})

describe("other readers' handles are kept out of analytics", () => {
  afterEach(cleanup)

  it('marks every crew member handle in the roster', () => {
    render(
      <CrewRoster
        members={[member({}), member({ userId: 'user_b', handle: 'teo' })]}
        memberCount={2}
        isKeeper
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />,
    )
    expect(screen.getByText('marisol')).toHaveClass('ph-no-capture')
    expect(screen.getByText('teo')).toHaveClass('ph-no-capture')
  })

  it('leaves the row action capturable', () => {
    render(
      <CrewRoster
        members={[member({})]}
        memberCount={1}
        isKeeper
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />,
    )
    const remove = screen.getByRole('button')
    expect(remove.closest('.ph-no-capture')).toBeNull()
  })

  it('marks every handle in the watchers roster', () => {
    render(
      <WatchersRoster
        named={[
          { handle: 'marisol', avatarColor: 'signal' },
          { handle: 'teo', avatarColor: 'accent' },
        ]}
        anonymousCount={0}
      />,
    )
    expect(screen.getByText('marisol')).toHaveClass('ph-no-capture')
    expect(screen.getByText('teo')).toHaveClass('ph-no-capture')
  })
})
