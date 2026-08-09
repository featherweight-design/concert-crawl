// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

import type { FollowNudgeTarget } from './lib/use-first-watch-nudge'

const route = vi.fn(() => '/events')
vi.mock('next/navigation', () => ({ usePathname: () => route() }))

// The card and the trigger hook each have their own suite. What the gate
// claims is WHERE the floating card is allowed to appear.
const nudgeTarget = vi.fn<() => FollowNudgeTarget | null>(() => null)
const answer = vi.fn()
vi.mock('./lib/use-first-watch-nudge', () => ({
  useFirstWatchNudge: () => ({ target: nudgeTarget(), answer }),
}))
vi.mock('./FollowNudgeCard', () => ({
  FollowNudgeCard: ({ onAnswer }: { onAnswer: () => void }) => (
    <div data-testid="follow-nudge">
      <button type="button" onClick={onAnswer}>
        Answer
      </button>
    </div>
  ),
}))

import { FollowNudgeGate } from './FollowNudgeGate'

const TARGET: FollowNudgeTarget = {
  eventId: 'evt-1',
  userEventId: 'ue-1',
  artist: 'Big Thief',
  artistSlug: 'big-thief',
}

beforeEach(() => {
  route.mockReturnValue('/events')
  nudgeTarget.mockReturnValue(TARGET)
  answer.mockClear()
})

afterEach(cleanup)

describe('FollowNudgeGate', () => {
  it('floats the card over browse', () => {
    render(<FollowNudgeGate />)
    expect(screen.getByTestId('follow-nudge')).toBeInTheDocument()
  })

  it('draws nothing when no watch has landed', () => {
    nudgeTarget.mockReturnValue(null)
    render(<FollowNudgeGate />)
    expect(screen.queryByTestId('follow-nudge')).toBeNull()
  })

  // ⚠️ Event detail swaps the nudge in place of its watch strip. If the gate
  // also fired there the same watch would produce two cards on one screen.
  it('stands down on an event detail page', () => {
    route.mockReturnValue('/events/evt-1')
    render(<FollowNudgeGate />)
    expect(screen.queryByTestId('follow-nudge')).toBeNull()
  })

  it('stands down on the public mirror of event detail', () => {
    route.mockReturnValue('/e/evt-1')
    render(<FollowNudgeGate />)
    expect(screen.queryByTestId('follow-nudge')).toBeNull()
  })

  it('stands down in admin', () => {
    route.mockReturnValue('/admin/events')
    render(<FollowNudgeGate />)
    expect(screen.queryByTestId('follow-nudge')).toBeNull()
  })

  it('answering the card is what closes it', () => {
    render(<FollowNudgeGate />)
    fireEvent.click(screen.getByText('Answer'))
    expect(answer).toHaveBeenCalledTimes(1)
  })
})
