// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARTIST_COPY } from './definitions/copy'
import { FollowButton } from './FollowButton'

vi.mock('next/navigation', () => ({
  usePathname: () => '/artists/wax-harbour',
  useSearchParams: () => new URLSearchParams(),
}))

// The signed-out branch mounts the tier picker, which drags in Stripe and
// React Query. The contract under test is that a dialog opens, not what is in
// it, so the sheet is stubbed.
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Pick a lane" /> : null,
}))

afterEach(cleanup)

// VOCABULARY-BAN-CHECK — this file names the banned glyph to assert its absence.
const noop = () => undefined

describe('FollowButton', () => {
  // #794 §3.10: a signed-out visitor must not be able to read auth state off
  // the layout. The honesty lives in the accessible name, not in the pixels.
  it('renders a signed-out control pixel-identical to not-following', () => {
    const { getByRole, unmount } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
      />,
    )
    const signedIn = getByRole('button')
    const signedInStyle = signedIn.getAttribute('style')
    const signedInClass = signedIn.getAttribute('class')
    unmount()

    const { getByRole: get2 } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut
        onToggle={noop}
      />,
    )
    const signedOut = get2('button')
    expect(signedOut.getAttribute('style')).toBe(signedInStyle)
    expect(signedOut.getAttribute('class')).toBe(signedInClass)
    expect(signedOut.textContent).toBe(ARTIST_COPY.follow)

    // They differ ONLY in the accessible name and the dialog affordance.
    expect(signedOut.getAttribute('aria-label')).toBe(
      ARTIST_COPY.followSignedOutAria('Wax Harbour'),
    )
    expect(signedOut.getAttribute('aria-haspopup')).toBe('dialog')
    // Never an off switch — signed out this is a dialog trigger, not a toggle.
    expect(signedOut.getAttribute('aria-pressed')).toBeNull()
  })

  it('opens the sign-in hand-off on a signed-out click and never calls follow', () => {
    const onToggle = vi.fn()
    const { getByRole, queryByRole } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut
        onToggle={onToggle}
      />,
    )
    expect(queryByRole('dialog')).toBeNull()
    fireEvent.click(getByRole('button'))
    expect(queryByRole('dialog')).not.toBeNull()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('carries the current path through as the return target', () => {
    const { getByRole } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut
        onToggle={noop}
      />,
    )
    expect(getByRole('button').getAttribute('data-return-to')).toBe(
      '/artists/wax-harbour',
    )
  })

  it('sizes full and compact to the handoff', () => {
    const { getByRole, unmount } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
      />,
    )
    const full = getByRole('button')
    expect(full.style.height).toBe('48px')
    expect(full.style.width).toBe('100%')
    expect(full.style.borderRadius).toBe('10px')
    expect(full.style.fontSize).toBe('15px')
    expect(full.style.fontWeight).toBe('800')
    unmount()

    const { getByRole: get2 } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        size="compact"
        onToggle={noop}
      />,
    )
    const compact = get2('button')
    expect(compact.style.height).toBe('44px')
    expect(compact.style.padding).toBe('0px 14px')
    expect(compact.style.fontSize).toBe('13.5px')
  })

  it('carries state in the glyph as well as the fill, and announces it', () => {
    const { getByRole, unmount } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
      />,
    )
    const off = getByRole('button')
    expect(off.style.background).toBe('var(--signal)')
    expect(off.style.color).toBe('var(--fg-on-accent)')
    // `all: unset` strips the border, so the design's 1px edge has to be put
    // back explicitly. It is invisible against the filled skin — and it is the
    // ONLY edge the Following skin has, whose background is a 14% mix.
    expect(off.style.border).toBe('1px solid var(--signal)')
    expect(off.getAttribute('aria-pressed')).toBe('false')
    expect(off.getAttribute('aria-label')).toBe(
      ARTIST_COPY.followAria('Wax Harbour'),
    )
    expect(off.querySelector('[data-glyph="plus"]')).not.toBeNull()
    unmount()

    const { getByRole: get2 } = render(
      <FollowButton
        name="Wax Harbour"
        following
        signedOut={false}
        onToggle={noop}
      />,
    )
    const on = get2('button')
    expect(on.style.background).toBe(
      'color-mix(in oklab, var(--signal) 14%, transparent)',
    )
    expect(on.style.color).toBe('var(--signal)')
    expect(on.style.border).toBe('1px solid var(--signal)')
    expect(on.getAttribute('aria-pressed')).toBe('true')
    expect(on.getAttribute('aria-label')).toBe(
      ARTIST_COPY.followingAria('Wax Harbour'),
    )
    expect(on.textContent).toBe(ARTIST_COPY.following)
    expect(on.querySelector('[data-glyph="check"]')).not.toBeNull()
  })

  // Following an artist is not Watching a show. The eye belongs to shows and
  // the heart belongs to nothing at all — no heart exists in this product.
  it('shows neither an eye nor a heart', () => {
    const { container } = render(
      <FollowButton
        name="Wax Harbour"
        following
        signedOut={false}
        onToggle={noop}
      />,
    )
    expect(container.querySelector('[data-glyph="eye"]')).toBeNull()
    expect(container.querySelector('.lucide-eye')).toBeNull()
    expect(container.innerHTML.toLowerCase()).not.toContain('heart')
  })

  it('calls the toggle once per signed-in click', () => {
    const onToggle = vi.fn()
    const { getByRole } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={onToggle}
      />,
    )
    fireEvent.click(getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
