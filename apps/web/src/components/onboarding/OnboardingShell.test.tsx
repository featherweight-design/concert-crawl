// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { OnboardingShell, type OnboardingShellProps } from './OnboardingShell'
import { ONBOARDING_COPY } from './definitions/copy'
import { ThemeProvider } from '@/theme/ThemeProvider'

const nav = ONBOARDING_COPY.nav
const EVENT_ID = '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01'

// The theme step reads a media query; jsdom ships neither matchMedia nor
// scrollTo.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

beforeEach(() => {
  push.mockClear()
  // jsdom implements no scrolling; the shell resets scroll on every step change.
  Element.prototype.scrollTo = vi.fn()
})

afterEach(cleanup)

// The theme step reads the theme context.
const renderShell = (props: OnboardingShellProps = {}) =>
  render(
    <ThemeProvider>
      <OnboardingShell {...props} />
    </ThemeProvider>,
  )

// Both layouts render at once; the desktop half is display:none, so anything
// that should exist in both is queried with `hidden: true`.
const primaryCtas = () =>
  screen.getAllByRole('button', {
    name: /next|back to|start browsing/i,
    hidden: true,
  })

const next = () => act(() => primaryCtas()[0]!.click())

/** 6 steps → 5 presses. The two layouts share one index, so one click moves both. */
const advanceToEnd = () => {
  for (let i = 0; i < 5; i += 1) next()
}

describe('OnboardingShell — post-auth tour (#794)', () => {
  it('puts Make it yours before What it does not do yet', () => {
    renderShell()
    const labels = Object.values(nav.stepLabels)
    const seen: string[] = []
    for (let i = 0; i < 6; i += 1) {
      seen.push(
        screen.getAllByText((text) => labels.includes(text), {
          ignore: false,
        })[0]!.textContent!,
      )
      if (i < 5) next()
    }
    expect(seen).toEqual([
      nav.stepLabels.welcome,
      nav.stepLabels.how,
      nav.stepLabels.today,
      nav.stepLabels.theme,
      nav.stepLabels.notyet,
      nav.stepLabels.done,
    ])
  })

  it('carries no beta framing — the tour is a public welcome now', () => {
    const { container } = renderShell()
    const text = container.textContent ?? ''
    expect(text.toLowerCase()).not.toContain('beta')
    expect(text).not.toContain('Code accepted')
    expect(text).toContain(nav.railLabel)
  })

  it('offers a skip on every step, in both layouts', () => {
    renderShell()
    for (let i = 0; i < 6; i += 1) {
      expect(
        screen.getAllByRole('link', { name: /^skip$/i, hidden: true }),
      ).toHaveLength(2)
      if (i < 5) next()
    }
  })

  it('ends on Start browsing when there is nothing pending', () => {
    renderShell()
    advanceToEnd()
    expect(primaryCtas()[0]!.textContent).toBe(nav.finishButton(null))
    next()
    expect(push).toHaveBeenCalledWith('/events')
  })

  it('ends by returning the visitor to their pending show, intent attached', () => {
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
    })
    advanceToEnd()
    expect(primaryCtas()[0]!.textContent).toBe(nav.finishButton('Geese'))
    next()
    expect(push).toHaveBeenCalledWith(
      `/events/e1?intent=watch%3A${EVENT_ID}&label=Geese`,
    )
  })

  it('names the pending show in the skip rail mid-intent', () => {
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
    })
    expect(
      screen.getAllByRole('link', {
        name: /skip: back to geese/i,
        hidden: true,
      }),
    ).toHaveLength(2)
  })

  it('carries the pending watch out through the skip, not just the finish', () => {
    renderShell({
      intent: `watch:${EVENT_ID}`,
      returnPath: '/events/e1',
      destinationLabel: 'Geese',
    })
    // Leaving early is a choice about the tour, not about the watch.
    for (const link of screen.getAllByRole('link', {
      name: /skip: back to geese/i,
      hidden: true,
    })) {
      expect(link.getAttribute('href')).toBe(
        `/events/e1?intent=watch%3A${EVENT_ID}&label=Geese`,
      )
    }
  })

  it('reads Close, not Skip, when opened from the account menu', () => {
    renderShell({ entry: 'menu' })
    expect(
      screen.getAllByRole('link', { name: /^close$/i, hidden: true }),
    ).toHaveLength(2)
  })

  it('ignores a label with no intent — there is nothing to hand back', () => {
    renderShell({ destinationLabel: 'Geese', returnPath: '/events/e1' })
    expect(
      screen.getAllByRole('link', { name: /^skip$/i, hidden: true }),
    ).toHaveLength(2)
    advanceToEnd()
    expect(primaryCtas()[0]!.textContent).toBe(nav.finishButton(null))
  })
})
