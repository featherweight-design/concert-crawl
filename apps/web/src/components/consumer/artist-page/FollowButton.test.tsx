// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARTIST_COPY } from './definitions/copy'
import { NF_FOLLOW_SIZES } from './definitions/constants'
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
        onLockedTap={() => undefined}
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
        onLockedTap={() => undefined}
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
        onLockedTap={() => undefined}
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
        onLockedTap={() => undefined}
      />,
    )
    expect(getByRole('button').getAttribute('data-return-to')).toBe(
      '/artists/wax-harbour',
    )
  })

  it('sizes primary and row to the handoff', () => {
    const { getByRole, unmount } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    const row = getByRole('button')
    // The default is the quiet row, so a call site that names no size cannot
    // add a second filled pill to a screen by omission.
    expect(row.style.height).toBe('28px')
    expect(row.style.width).toBe('')
    expect(row.style.borderRadius).toBe('8px')
    expect(row.style.fontSize).toBe('12px')
    expect(row.style.fontWeight).toBe('700')
    expect(row.style.background).toBe('transparent')
    unmount()

    const { getByRole: get2 } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        size="primary"
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    const hero = get2('button')
    expect(hero.style.height).toBe('44px')
    expect(hero.style.padding).toBe('0px 18px')
    expect(hero.style.fontSize).toBe('14.5px')
  })

  // The narrow search row (under 360px). The label goes, the artist does not:
  // dropping to a glyph must not cost a screen reader the name, and the box
  // squares off against the height rather than shrinking to the icon.
  it('row icon-only: keeps the artist in the accessible name and stays square', () => {
    const { getByRole } = render(
      <FollowButton
        name="Wax Harbour"
        following={false}
        signedOut={false}
        size="row"
        iconOnly
        onToggle={noop}
        onLockedTap={() => undefined}
      />,
    )
    const button = getByRole('button')
    expect(button.textContent).toBe('')
    expect(button.getAttribute('aria-label')).toContain('Wax Harbour')
    expect(button.style.height).toBe('28px')
    expect(button.style.minWidth).toBe('28px')
    expect(button.style.padding).toBe('0px')
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
        onLockedTap={() => undefined}
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
        tone="loud"
        onToggle={noop}
        onLockedTap={() => undefined}
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
        tone="loud"
        onToggle={noop}
        onLockedTap={() => undefined}
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
        onLockedTap={() => undefined}
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
        onLockedTap={() => undefined}
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
      expect(button.style.height).toBe(`${NF_FOLLOW_SIZES.row.height}px`)
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
            onLockedTap={() => undefined}
          />
          <FollowButton
            name="Pale Quarry"
            following={false}
            signedOut={false}
            locked
            onToggle={noop}
            onLockedTap={() => undefined}
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

  describe('the follow contract', () => {
    it('reports the tap and renders the prop, leaving optimism to the caller', () => {
      // The spec's optimism (flip on click, roll back on error, reconcile to
      // the server's answer) lives in useArtistFollow. A second override here
      // could not see an unfollow that legitimately comes back still-following
      // via a Spotify sync, and would strand the button showing the wrong state.
      const onToggle = vi.fn()
      const { getByRole, rerender } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          onToggle={onToggle}
          onLockedTap={() => undefined}
        />,
      )
      const button = getByRole('button')
      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(button.textContent).toBe(ARTIST_COPY.follow)

      rerender(
        <FollowButton
          name="Wax Harbour"
          following
          signedOut={false}
          onToggle={onToggle}
          onLockedTap={() => undefined}
        />,
      )
      expect(button.textContent).toBe(ARTIST_COPY.following)
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(button.querySelector('[data-glyph="check"]')).not.toBeNull()
    })
  })

  describe('the row / iconOnly variant', () => {
    it('renders at the row geometry', () => {
      const { getByRole } = render(
        <FollowButton
          name="Wax Harbour"
          following
          signedOut={false}
          size="row"
          onToggle={noop}
          onLockedTap={noop}
        />,
      )
      const style = getByRole('button').getAttribute('style') ?? ''
      expect(style).toContain(`height: ${NF_FOLLOW_SIZES.row.height}px`)
      expect(style).toContain(`font-size: ${NF_FOLLOW_SIZES.row.fontSize}px`)
    })

    it('drops the label but keeps the accessible name when iconOnly', () => {
      const { getByRole } = render(
        <FollowButton
          name="Wax Harbour"
          following
          signedOut={false}
          size="row"
          iconOnly
          onToggle={noop}
          onLockedTap={noop}
        />,
      )
      const button = getByRole('button')
      expect(button.textContent).toBe('')
      expect(button.getAttribute('aria-label')).toBe(
        ARTIST_COPY.followingAria('Wax Harbour'),
      )
      // The glyph is the whole control, so it must stay square.
      const style = button.getAttribute('style') ?? ''
      expect(style).toContain(`width: ${NF_FOLLOW_SIZES.row.height}px`)
    })
  })

  // R3 rule 4: the visual height may shrink, the 44px target may not. The
  // overlay is the whole mechanism, so it is tested rather than assumed.
  describe('the tap-target overlay', () => {
    const renderAt = (size: 'row' | 'rowWide' | 'primary' | 'badge') =>
      render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          size={size}
          onToggle={noop}
          onLockedTap={noop}
        />,
      )

    it.each([
      ['badge', 9],
      ['row', 8],
      ['rowWide', 6],
    ] as const)('grows %s symmetrically to the 44px target', (size, pad) => {
      const { getByRole, unmount } = renderAt(size)
      const overlay = getByRole('button').querySelector('[data-hit-overlay]')
      // Symmetric, not a fixed horizontal inset: a one-sided expansion left
      // the icon-only square at 40px wide and missed the target entirely.
      expect(overlay?.getAttribute('style')).toContain(`inset: -${pad}px`)
      expect(NF_FOLLOW_SIZES[size].height + pad * 2).toBe(44)
      unmount()
    })

    it('draws no overlay at primary, which is already 44', () => {
      const { getByRole } = renderAt('primary')
      expect(getByRole('button').querySelector('[data-hit-overlay]')).toBeNull()
    })
  })

  describe('tone', () => {
    const renderTone = (tone: 'quiet' | 'loud') =>
      render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          size="primary"
          tone={tone}
          onToggle={noop}
          onLockedTap={noop}
        />,
      )

    it('fills only at loud', () => {
      const { getByRole, unmount } = renderTone('loud')
      expect(getByRole('button').style.background).toBe('var(--signal)')
      unmount()

      const { getByRole: get2 } = renderTone('quiet')
      expect(get2('button').style.background).toBe('transparent')
      expect(get2('button').style.color).toBe('var(--fg)')
    })

    it('keeps locked at --fg so the gate never reads quieter than the action', () => {
      const { getByRole } = render(
        <FollowButton
          name="Wax Harbour"
          following={false}
          signedOut={false}
          locked
          onToggle={noop}
          onLockedTap={noop}
        />,
      )
      expect(getByRole('button').style.color).toBe('var(--fg)')
    })
  })
})
