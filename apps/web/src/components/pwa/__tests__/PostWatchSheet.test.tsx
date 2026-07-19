// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PostWatchSheet } from '../PostWatchSheet'

afterEach(() => {
  cleanup()
})

describe('PostWatchSheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PostWatchSheet
        open={false}
        onClose={() => undefined}
        onTurnOn={() => undefined}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the default (browser) variant with Turn on + Not now', () => {
    render(
      <PostWatchSheet
        open
        onClose={() => undefined}
        onTurnOn={() => undefined}
      />,
    )
    expect(
      screen.getByRole('heading', { name: /heads-up if anything changes/i }),
    ).not.toBeNull()
    expect(
      screen.getByRole('button', { name: /turn on notifications/i }),
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: /not now/i })).not.toBeNull()
    // Footnote about Settings is present only on the default variant.
    expect(screen.getByText(/settings/i)).not.toBeNull()
  })

  it('renders the ios variant with Show me how instead of Turn on', () => {
    render(
      <PostWatchSheet
        open
        onClose={() => undefined}
        onTurnOn={() => undefined}
        variant="ios"
      />,
    )
    expect(
      screen.getByRole('heading', { name: /home screen first/i }),
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: /show me how/i })).not.toBeNull()
    // No Settings footnote on the iOS variant.
    expect(screen.queryByText(/change this anytime/i)).toBeNull()
  })

  it('fires onTurnOn when the primary CTA is clicked', () => {
    const onTurnOn = vi.fn()
    render(
      <PostWatchSheet open onClose={() => undefined} onTurnOn={onTurnOn} />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: /turn on notifications/i }),
    )
    expect(onTurnOn).toHaveBeenCalledTimes(1)
  })

  it('fires onClose when Not now is clicked', () => {
    const onClose = vi.fn()
    render(<PostWatchSheet open onClose={onClose} onTurnOn={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fires onClose on Escape (BottomSheet contract)', () => {
    const onClose = vi.fn()
    render(<PostWatchSheet open onClose={onClose} onTurnOn={() => undefined} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the iOS Show me how CTA fires the same onTurnOn handoff', () => {
    const onTurnOn = vi.fn()
    render(
      <PostWatchSheet
        open
        onClose={() => undefined}
        onTurnOn={onTurnOn}
        variant="ios"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /show me how/i }))
    expect(onTurnOn).toHaveBeenCalledTimes(1)
  })
})
