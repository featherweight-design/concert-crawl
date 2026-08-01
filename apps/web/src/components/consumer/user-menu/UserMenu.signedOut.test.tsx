// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act, within } from '@testing-library/react'
import { AccountMenuProvider, UserMenu } from './UserMenu'
import { AppHeader } from '@/components/consumer/app-header/AppHeader'
import { BottomNav } from '@/components/consumer/bottom-nav/BottomNav'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const patchMe = vi.fn()
const fetchMe = vi.fn()

vi.mock('@/lib/users', () => ({
  patchMe: (...args: unknown[]) => patchMe(...args),
  fetchMe: (...args: unknown[]) => fetchMe(...args),
}))

let mockAuth: {
  isSignedIn: boolean
  isLoaded: boolean
  getToken: () => Promise<string | null>
  sessionClaims: null
} = {
  isSignedIn: false,
  isLoaded: true,
  getToken: async () => null,
  sessionClaims: null,
}

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockAuth,
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}))

let mockPathname = '/events'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../search-palette/SearchPalette', () => ({
  SearchPalette: () => null,
}))

let mockTheme = 'electric'
const setTheme = vi.fn((next: string) => {
  mockTheme = next
})

vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme }),
}))

const SIGNED_OUT_LABEL = CONSUMER_COPY.userMenu.ariaLabels.accountMenuSignedOut

/** Widen the viewport past `sm` so the desktop popover branch is the one taken. */
function setViewport(matchesSm: boolean): void {
  window.matchMedia = (query: string) => ({
    matches: matchesSm,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

beforeEach(() => {
  mockAuth = {
    isSignedIn: false,
    isLoaded: true,
    getToken: async () => null,
    sessionClaims: null,
  }
  mockTheme = 'electric'
  mockPathname = '/events'
  patchMe.mockReset()
  fetchMe.mockReset()
  setTheme.mockReset()
  localStorage.clear()
  setViewport(false)
})

afterEach(cleanup)

function openDesktopMenu(): void {
  const trigger = screen.getByRole('button', { name: SIGNED_OUT_LABEL })
  act(() => {
    trigger.click()
  })
}

describe('account menu — signed out (#794)', () => {
  it('leads with the get-in card and never a "you" section', () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()

    expect(screen.getByRole('link', { name: /sign up free/i })).toBeTruthy()
    // "You" is the signed-in identity section; there is no `you` signed out.
    expect(screen.queryByText(CONSUMER_COPY.userMenu.sections.you)).toBeNull()
    expect(screen.getByText(CONSUMER_COPY.userMenu.sections.app)).toBeTruthy()
  })

  it('omits the signed-in rows rather than rendering them disabled', () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()

    // A disabled row still advertises a feature the visitor cannot use; the
    // signed-out body is meant to be short and entirely actionable.
    for (const label of [/settings/i, /sign out/i, /submitted prices/i]) {
      expect(screen.queryByText(label)).toBeNull()
    }
    const disabled = screen
      .getAllByRole('button')
      .filter(
        (el) =>
          el.hasAttribute('disabled') ||
          el.getAttribute('aria-disabled') === 'true',
      )
    expect(disabled).toHaveLength(0)
  })

  it('keeps the theme picker, the how-it-works row, and the legal pair', () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()

    const copy = CONSUMER_COPY.userMenu.signedOut
    expect(screen.getByText(copy.howItWorks)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: copy.terms }).getAttribute('href'),
    ).toBe(copy.termsHref)
    expect(
      screen.getByRole('link', { name: copy.privacy }).getAttribute('href'),
    ).toBe(copy.privacyHref)
    // The theme row is the reason the menu still earns its place signed out.
    expect(screen.getByText(/electric/i)).toBeTruthy()
  })

  it('picks a theme locally without a server round-trip', async () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()

    const themeToggle = screen.getByText(/electric/i).closest('button')
    if (!themeToggle) throw new Error('theme row button not found')
    act(() => {
      themeToggle.click()
    })
    const jade = screen.getByText(/jade/i).closest('button')
    if (!jade) throw new Error('jade swatch not found')
    await act(async () => {
      jade.click()
    })

    expect(setTheme).toHaveBeenCalled()
    // No token signed out, so the persist call must be skipped entirely —
    // patchMe with a null token would 401 on every theme pick.
    expect(patchMe).not.toHaveBeenCalled()
  })

  it('is a dialog whose surface takes focus, so the first Tab lands on Sign up free', () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toBe(
      CONSUMER_COPY.userMenu.ariaLabels.menuTitle,
    )
    expect(dialog.getAttribute('tabindex')).toBe('-1')
    // The popover has no scrim and leaves the page interactive, so claiming
    // modality would misdescribe it — only the mobile sheet is truly modal.
    expect(dialog.hasAttribute('aria-modal')).toBe(false)
    expect(document.activeElement).toBe(dialog)
  })

  it('marks the mobile sheet modal, since that surface does render a scrim', () => {
    setViewport(true)
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('returns focus to the trigger when dismissed by an outside click', () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    const trigger = screen.getByRole('button', { name: SIGNED_OUT_LABEL })
    act(() => {
      trigger.click()
    })

    // Outside-click dismissal must restore focus like Escape does — otherwise a
    // keyboard or screen-reader user is stranded at the top of the document.
    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('pulls focus back inside when Tab is pressed from outside the surface', () => {
    render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()
    const dialog = screen.getByRole('dialog')

    // Something moved focus out of the dialog. A surface-scoped listener would
    // never see this Tab, letting a keyboard user step behind an aria-modal
    // surface — so the handler lives on document instead.
    act(() => {
      document.body.focus()
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      )
    })
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('dismisses itself when a row navigates within the same layout', () => {
    const { rerender } = render(
      <AccountMenuProvider>
        <UserMenu />
      </AccountMenuProvider>,
    )
    openDesktopMenu()
    expect(screen.queryByRole('dialog')).not.toBeNull()

    // The version footer pushes to /changelog, which shares this layout, so the
    // menu would otherwise stay open covering the destination page.
    mockPathname = '/changelog'
    act(() => {
      rerender(
        <AccountMenuProvider>
          <UserMenu />
        </AccountMenuProvider>,
      )
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('never renders more than one dialog, whichever trigger opens it', () => {
    // The header disc and bottom-nav slot 4 are separate triggers over one
    // state. Two dialogs would mean two stacked sheets on a single tap.
    render(
      <AccountMenuProvider>
        <AppHeader />
        <BottomNav />
      </AccountMenuProvider>,
    )

    expect(screen.queryAllByRole('dialog')).toHaveLength(0)

    act(() => {
      screen.getByTestId('mobile-profile-entry').click()
    })
    expect(screen.queryAllByRole('dialog')).toHaveLength(1)

    // Scoped to the nav: all three triggers carry the same accessible name,
    // which is itself the point — they are one control in three places.
    act(() => {
      within(
        screen.getByRole('navigation', {
          name: CONSUMER_COPY.bottomNav.nav.ariaLabel,
        }),
      )
        .getByRole('button', {
          name: CONSUMER_COPY.userMenu.ariaLabels.accountMenuSignedOut,
        })
        .click()
    })
    expect(screen.queryAllByRole('dialog').length).toBeLessThanOrEqual(1)
  })
})
