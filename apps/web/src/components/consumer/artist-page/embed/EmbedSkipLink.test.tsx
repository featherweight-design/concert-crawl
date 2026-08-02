// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmbedSkipLink } from './EmbedSkipLink'

describe('EmbedSkipLink', () => {
  it('renders nothing when there is nothing below to skip to', () => {
    const { container } = render(<EmbedSkipLink targetId={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('moves focus to the target, not just the scroll position', () => {
    // The whole point is bypassing Spotify's tab stops. A link that only
    // scrolls leaves focus on itself, so the next Tab goes into the iframe.
    const target = document.createElement('div')
    target.id = 'ap-shows'
    document.body.appendChild(target)

    render(<EmbedSkipLink targetId="ap-shows" />)
    fireEvent.click(screen.getByRole('link'))

    expect(document.activeElement).toBe(target)
    expect(target.tabIndex).toBe(-1)

    document.body.removeChild(target)
  })
})
