// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CrewMemberPreview } from '@concert-crawl/types'
import { CrewGoingLine } from './CrewGoingLine'

const member = (
  userId: string,
  handle: string | null = null,
): CrewMemberPreview => ({ userId, handle, avatarColor: 'signal' })

afterEach(cleanup)

describe('CrewGoingLine', () => {
  it('renders nothing when nobody in a crew is going', () => {
    const { container } = render(<CrewGoingLine going={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the budgeted handles and counts the rest', () => {
    render(
      <CrewGoingLine
        going={[
          member('u1', 'mvp_ross'),
          member('u2', 'natstretch'),
          member('u3', 'kitfisto'),
          member('u4', 'omar.wav'),
        ]}
      />,
    )
    expect(
      screen.getByText('mvp_ross, natstretch + 2 more going'),
    ).toBeInTheDocument()
  })

  it('keeps the full named list for screen readers at the visible budget', () => {
    render(
      <CrewGoingLine
        going={[
          member('u1', 'mvp_ross'),
          member('u2', 'natstretch'),
          member('u3', 'kitfisto'),
        ]}
      />,
    )
    // The visible line drops a name for width; the sr-only line never does.
    expect(
      screen.getByText('Going: mvp_ross, natstretch, kitfisto'),
    ).toBeInTheDocument()
  })

  it('counts members it cannot name rather than inventing a handle', () => {
    render(<CrewGoingLine going={[member('u1', 'mvp_ross'), member('u2')]} />)
    expect(screen.getByText('Going: mvp_ross and 1 more')).toBeInTheDocument()
  })

  it('falls back to a bare count when nobody going has a handle', () => {
    render(<CrewGoingLine going={[member('u1'), member('u2')]} />)
    expect(screen.getByText('2 from your crews going')).toBeInTheDocument()
    // Nothing to name, so there is no second announcement to make.
    expect(screen.queryByText(/^Going:/)).not.toBeInTheDocument()
  })
})
