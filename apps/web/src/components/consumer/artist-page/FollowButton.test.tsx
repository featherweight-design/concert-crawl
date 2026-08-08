// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
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

  it('keeps the focus-ring hook that all:unset would otherwise destroy', () => {
    // `all: unset` wipes the browser outline. `.ap-follow:focus-visible` in
    // globals.css puts it back, so losing the class silently makes keyboard
    // focus invisible on the page's primary conversion control.
    const { getByRole } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
      />,
    )
    expect(getByRole('button').className).toContain('ap-follow')
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

  describe('locked', () => {
    const renderLocked = (onLockedTap = noop) =>
      render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          locked
          onToggle={noop}
          onLockedTap={onLockedTap}
        />,
      )

    it('draws the gated skin without changing the label or the geometry', () => {
      const { getByRole } = renderLocked()
      const button = getByRole('button')
      expect(button.style.background).toBe('transparent')
      expect(button.style.color).toBe('var(--fg)')
      expect(button.style.border).toBe('1px solid var(--border-strong)')
      // Same word, same box as idle: the gate is a skin, not a different
      // control, and a shorter label would reflow the rail.
      expect(button.textContent).toBe(ARTIST_COPY.follow)
      expect(button.style.height).toBe('48px')
      expect(button.querySelector('[data-glyph="lock"]')).not.toBeNull()
    })

    it('is never disabled and never leaves the tab order', () => {
      // A disabled button cannot be focused, so the paywall becomes
      // unreachable by keyboard — the whole point of the locked state is that
      // tapping it is what offers the upgrade.
      const { getByRole } = renderLocked()
      const button = getByRole('button')
      expect(button.hasAttribute('disabled')).toBe(false)
      expect(button.getAttribute('tabindex')).toBeNull()
    })

    it('opens the upgrade instead of writing a follow', () => {
      const onLockedTap = vi.fn()
      const onToggle = vi.fn()
      const { getByRole } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          locked
          onToggle={onToggle}
          onLockedTap={onLockedTap}
        />,
      )
      fireEvent.click(getByRole('button'))
      expect(onLockedTap).toHaveBeenCalledTimes(1)
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('drops aria-pressed and describes the gate from a clipped node', () => {
      const { getByRole, container } = renderLocked()
      const button = getByRole('button')
      // Not a toggle: announcing an off switch nobody can turn on is worse
      // than announcing nothing.
      expect(button.getAttribute('aria-pressed')).toBeNull()
      const describedBy = button.getAttribute('aria-describedby')
      expect(describedBy).not.toBeNull()
      const gate = container.querySelector(`#${describedBy ?? ''}`)
      expect(gate?.textContent).toBe(ARTIST_COPY.followGate)
      // `hidden` would drop the node from the a11y tree and the describedby
      // would announce nothing. Clip keeps it there.
      expect(gate?.hasAttribute('hidden')).toBe(false)
      expect(gate).toBeInstanceOf(HTMLElement)
      if (gate instanceof HTMLElement) {
        // jsdom collapses the rect, so match the technique, not the string.
        expect(gate.style.clip).toMatch(/^rect\(/)
        expect(gate.style.position).toBe('absolute')
      }
    })

    it('gives every instance on the page its own gate id', () => {
      // A bill can carry four of these. A module counter collides across
      // mounts and aims every gate sentence at one node.
      const { container } = render(
        <>
          <FollowButton
            name="Wax Harbour"
            following={false}
            signedOut={false}
            locked
            onToggle={noop}
          />
          <FollowButton
            name="Pale Quarry"
            following={false}
            signedOut={false}
            locked
            onToggle={noop}
          />
        </>,
      )
      const ids = Array.from(container.querySelectorAll('button')).map((btn) =>
        btn.getAttribute('aria-describedby'),
      )
      expect(ids).toHaveLength(2)
      expect(ids[0]).not.toBe(ids[1])
      ids.forEach((id) => {
        expect(container.querySelectorAll(`#${id ?? ''}`)).toHaveLength(1)
      })
    })
  })

  describe('optimism', () => {
    it('flips before the server answers', () => {
      const { getByRole } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={() => new Promise<void>(() => undefined)}
        />,
      )
      const button = getByRole('button')
      fireEvent.click(button)
      expect(button.textContent).toBe(ARTIST_COPY.following)
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(button.querySelector('[data-glyph="check"]')).not.toBeNull()
    })

    it('rolls back when the write rejects', async () => {
      const { getByRole } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={() => Promise.reject(new Error('offline'))}
        />,
      )
      const button = getByRole('button')
      fireEvent.click(button)
      expect(button.textContent).toBe(ARTIST_COPY.following)
      await waitFor(() => {
        expect(button.textContent).toBe(ARTIST_COPY.follow)
      })
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })

    it('leaves optimism to a sync parent, so a swallowed tap cannot strand it', () => {
      // useArtistFollow is sync: it flips its own state and swallows a second
      // tap while a request is in flight. A local override on that swallowed
      // tap would never clear, because the prop it waits on never moves.
      const { getByRole, rerender } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={() => undefined}
        />,
      )
      const button = getByRole('button')
      fireEvent.click(button)
      // The parent has flipped; it re-renders with the new value.
      rerender(
        <FollowButton
          name="Wax Harbour"
          following
          signedOut={false}
          onToggle={() => undefined}
        />,
      )
      expect(button.textContent).toBe(ARTIST_COPY.following)

      // Second tap, swallowed by the parent — the button must not flip on its
      // own, and must still be reading the prop afterwards.
      fireEvent.click(button)
      expect(button.textContent).toBe(ARTIST_COPY.following)
    })

    it('holds the optimistic value until the SERVER value changes', () => {
      // #1467: clearing on mutation success re-reads a prop the parent has not
      // refetched yet, which flashes the old state back for one render.
      const { getByRole, rerender } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={() => Promise.resolve()}
        />,
      )
      const button = getByRole('button')
      fireEvent.click(button)
      expect(button.textContent).toBe(ARTIST_COPY.following)

      // The parent re-renders with the STALE server value — the override has
      // to win here, or the button snaps back under the user's finger.
      rerender(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={() => Promise.resolve()}
        />,
      )
      expect(button.textContent).toBe(ARTIST_COPY.following)

      // Server catches up: the override is dropped and the prop drives again.
      rerender(
        <FollowButton
          name="Wax Harbour"
          following
          signedOut={false}
          onToggle={() => Promise.resolve()}
        />,
      )
      expect(button.textContent).toBe(ARTIST_COPY.following)

      // And a later server-side unfollow (another tab, say) now shows through.
      rerender(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={() => Promise.resolve()}
        />,
      )
      expect(button.textContent).toBe(ARTIST_COPY.follow)
    })
  })
})
