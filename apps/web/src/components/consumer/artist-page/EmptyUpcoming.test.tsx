// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARTIST_COPY } from './definitions/copy'
import { EmptyUpcoming } from './EmptyUpcoming'

vi.mock('next/navigation', () => ({
  usePathname: () => '/artists/wax-harbour',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

afterEach(cleanup)

const noop = () => undefined

describe('EmptyUpcoming', () => {
  it('branches the body copy on the follow relationship', () => {
    const { container, unmount } = render(
      <EmptyUpcoming
        name="Wax Harbour"
        following={false}
        signedOut={false}
        inlineFollow
        onToggle={noop}
      />,
    )
    expect(container.textContent).toContain(ARTIST_COPY.emptyBody)
    expect(container.textContent).toContain(ARTIST_COPY.emptyTitle)
    unmount()

    const { container: active } = render(
      <EmptyUpcoming
        name="Wax Harbour"
        following
        signedOut={false}
        inlineFollow
        onToggle={noop}
      />,
    )
    expect(active.textContent).toContain(ARTIST_COPY.emptyBodyFollowing)
    expect(active.textContent).not.toContain(ARTIST_COPY.emptyBody)
  })

  it('is a radius-14 card under an uncounted Upcoming head', () => {
    const { container } = render(
      <EmptyUpcoming
        name="Wax Harbour"
        following={false}
        signedOut={false}
        inlineFollow
        onToggle={noop}
      />,
    )
    const card = container.querySelector('[data-empty-upcoming]')
    expect(card?.getAttribute('style')).toContain('border-radius: 14px')
    expect(container.textContent).toContain(ARTIST_COPY.upcomingTitle)
    // The section head carries no count here — there is nothing to count.
    expect(container.textContent).not.toContain('0 shows')
  })

  it('carries the follow only when the page hands it the inline slot', () => {
    const { queryByRole, rerender } = render(
      <EmptyUpcoming
        name="Wax Harbour"
        following={false}
        signedOut={false}
        inlineFollow
        onToggle={noop}
      />,
    )
    expect(queryByRole('button')).not.toBeNull()

    rerender(
      <EmptyUpcoming
        name="Wax Harbour"
        following={false}
        signedOut={false}
        inlineFollow={false}
        onToggle={noop}
      />,
    )
    expect(queryByRole('button')).toBeNull()
  })
})
