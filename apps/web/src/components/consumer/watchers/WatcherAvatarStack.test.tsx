// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { WatcherAvatarStack } from './WatcherAvatarStack'

afterEach(cleanup)

describe('WatcherAvatarStack', () => {
  it('hides every disc from assistive tech — the sentence carries the meaning', () => {
    const { container } = render(
      <WatcherAvatarStack
        watchers={[{ handle: 'marisol', avatarColor: 'signal' }]}
        anonymousDiscs={1}
        overflow={3}
      />,
    )
    // No node in the stack contributes to the accessibility tree.
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(
      container.querySelectorAll('[aria-hidden]').length,
    )
    expect(container.textContent).toContain('+3')
  })

  it('strips a leading underscore so the disc letter is alphanumeric', () => {
    const { container } = render(
      <WatcherAvatarStack
        watchers={[{ handle: '_dev_ftw', avatarColor: null }]}
      />,
    )
    expect(container.textContent).toContain('D')
    expect(container.textContent).not.toContain('_')
  })

  it('renders one disc per watcher plus the anonymous tail', () => {
    const { container } = render(
      <WatcherAvatarStack
        watchers={[
          { handle: 'marisol', avatarColor: null },
          { handle: 'priya', avatarColor: null },
        ]}
        anonymousDiscs={2}
      />,
    )
    expect(container.querySelectorAll('[data-watcher-disc]').length).toBe(4)
  })

  it('omits the overflow chip when nothing overflows', () => {
    const { container } = render(
      <WatcherAvatarStack
        watchers={[{ handle: 'priya', avatarColor: null }]}
      />,
    )
    expect(container.textContent).not.toContain('+')
  })
})
