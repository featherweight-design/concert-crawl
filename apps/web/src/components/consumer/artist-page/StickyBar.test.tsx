// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NF_FOLLOW_SIZES } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { StickyBar } from './StickyBar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/wax-harbour',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

afterEach(cleanup)

const noop = () => undefined

describe('StickyBar', () => {
  it('renders nothing until the plate has scrolled past', () => {
    const { container } = render(
      <StickyBar
        name="Wax Harbour"
        visible={false}
        showFollow
        following={false}
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('is a 56px bar carrying back, the name, and the compact follow', () => {
    const { container, getByRole, getByText } = render(
      <StickyBar
        name="Wax Harbour"
        visible
        showFollow
        following={false}
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    const bar = container.querySelector('[data-sticky-bar]')
    expect(bar).not.toBeNull()
    // Mobile-only: the desktop rail keeps the follow on screen, and the handoff
    // is explicit that there is no desktop sub-header.
    expect(bar?.className).toContain('md:hidden')
    const style = bar?.getAttribute('style') ?? ''
    expect(style).toContain('height: 56px')
    expect(style).toContain('var(--bg)')
    expect(getByText('Wax Harbour')).not.toBeNull()
    // The compact follow, not the full bar.
    const follow = getByRole('button', {
      name: ARTIST_COPY.followAria('Wax Harbour'),
    })
    expect(follow.style.height).toBe(`${NF_FOLLOW_SIZES.row.height}px`)
  })

  it('takes showFollow from the page rather than deciding for itself', () => {
    const { queryByRole } = render(
      <StickyBar
        name="Wax Harbour"
        visible
        showFollow={false}
        following={false}
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    expect(
      queryByRole('button', { name: ARTIST_COPY.followAria('Wax Harbour') }),
    ).toBeNull()
  })
})
