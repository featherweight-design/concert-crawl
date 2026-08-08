// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARTIST_COPY } from './definitions/copy'
import { FollowBlock } from './FollowBlock'

vi.mock('next/navigation', () => ({
  usePathname: () => '/artists/wax-harbour',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

afterEach(cleanup)

const noop = () => undefined

describe('FollowBlock', () => {
  it('tells the truth about what a follow does in each state', () => {
    const { container, unmount } = render(
      <FollowBlock
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    expect(container.textContent).toContain(ARTIST_COPY.followPitch)
    unmount()

    const { container: active, unmount: unmount2 } = render(
      <FollowBlock
        name="Wax Harbour"
        following
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    expect(active.textContent).toContain(ARTIST_COPY.followPitchActive)
    unmount2()

    // Signed out the sub-line is where the account requirement is stated —
    // the button label stays "Follow" (#794 §3.10).
    const { container: out } = render(
      <FollowBlock
        name="Wax Harbour"
        following={false}
        signedOut
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    expect(out.textContent).toContain(ARTIST_COPY.followSignedOutPitch)
    expect(out.textContent).toContain(ARTIST_COPY.follow)
  })

  it('renders the button and a sub-line under it', () => {
    const { getByRole, container } = render(
      <FollowBlock
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    expect(getByRole('button')).not.toBeNull()
    const sub = container.querySelector('[data-follow-pitch]')
    expect(sub).not.toBeNull()
    expect(sub?.getAttribute('style')).toContain('font-size: 11.5px')
  })
})
