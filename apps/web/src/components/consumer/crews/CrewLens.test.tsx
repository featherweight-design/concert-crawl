// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { stubMatchMedia } from '@/test-utils/match-media'
import type { CrewSummary } from '@concert-crawl/types'
import { CrewLensPill, CrewLensRail } from './CrewLens'

const crew = (id: string, name: string): CrewSummary => ({
  id,
  name,
  patchSalt: 0,
  memberCount: 3,
  members: [],
  upcomingCount: 2,
  isKeeper: false,
  muted: false,
})

const CREWS = [crew('c1', 'Thursdays'), crew('c2', 'Night Shift')]

beforeEach(() => stubMatchMedia(true))
afterEach(cleanup)

describe('CrewLensPill', () => {
  it('rests as the plural noun and reports itself off', () => {
    render(
      <CrewLensPill
        crews={CREWS}
        activeCrew={null}
        onSelect={vi.fn()}
        wide={false}
      />,
    )
    const pill = screen.getByRole('button')
    expect(pill).toHaveTextContent('Crews')
    expect(pill).toHaveAttribute('aria-pressed', 'false')
  })

  // The h1 immediately left of the pill already renders the crew's name, and at
  // 390px both truncated rather than either one reading. The patch carries which
  // crew visually; the label carries it for everyone else.
  it('leaves the name to the heading and reports itself on', () => {
    render(
      <CrewLensPill
        crews={CREWS}
        activeCrew={CREWS[0]!}
        onSelect={vi.fn()}
        wide={false}
      />,
    )
    const pill = screen.getByRole('button')
    expect(pill).toHaveTextContent('Crews')
    expect(pill).not.toHaveTextContent('Thursdays')
    expect(pill).toHaveAttribute('aria-pressed', 'true')
    expect(pill).toHaveAccessibleName(/Crew lens on: Thursdays/)
  })

  it('offers a reset row above the crews and applies a pick immediately', () => {
    const onSelect = vi.fn()
    render(
      <CrewLensPill
        crews={CREWS}
        activeCrew={null}
        onSelect={onSelect}
        wide={false}
      />,
    )
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Everyone')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Night Shift'))
    expect(onSelect).toHaveBeenCalledWith('c2')
    // Selecting dismisses: no confirm step, like every shipped sheet.
    expect(screen.queryByText('Everyone')).not.toBeInTheDocument()
  })

  it('offers the crews as one single-select set, not loose toggles', () => {
    render(
      <CrewLensPill
        crews={CREWS}
        activeCrew={CREWS[0]!}
        onSelect={vi.fn()}
        wide={false}
      />,
    )
    fireEvent.click(screen.getByRole('button'))

    const group = screen.getByRole('radiogroup')
    expect(group).toBeInTheDocument()
    // Everyone + the two crews, with only the active one checked.
    const options = screen.getAllByRole('radio')
    expect(options).toHaveLength(3)
    expect(
      options.filter((opt) => opt.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(1)
    expect(screen.getByRole('radio', { name: /Thursdays/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('keeps the group to one tab stop and moves focus with the arrows', () => {
    render(
      <CrewLensPill
        crews={CREWS}
        activeCrew={CREWS[0]!}
        onSelect={vi.fn()}
        wide={false}
      />,
    )
    fireEvent.click(screen.getByRole('button'))

    const options = screen.getAllByRole('radio')
    expect(options.filter((opt) => opt.tabIndex === 0)).toHaveLength(1)

    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' })
    expect(screen.getByRole('radio', { name: /Night Shift/ })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'Home' })
    expect(screen.getByRole('radio', { name: /Everyone/ })).toHaveFocus()
  })
})

describe('CrewLensRail', () => {
  it('states the narrowed count and clears back to everyone', () => {
    const onClear = vi.fn()
    render(<CrewLensRail count={3} onClear={onClear} />)
    expect(screen.getByText(/CREW LENS · 3 SHOWS/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Crew lens off/ }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('declines to claim zero shows when the feed failed', () => {
    render(<CrewLensRail count={null} onClear={vi.fn()} />)
    expect(screen.getByText(/CREW LENS · NO RESULT/)).toBeInTheDocument()
    expect(screen.queryByText(/0 SHOWS/)).not.toBeInTheDocument()
  })
})
