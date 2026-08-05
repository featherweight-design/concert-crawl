// @vitest-environment jsdom

// CCTip + CCOverlay behaviour. Carries the coverage the retired InfoTooltip
// test held (concise accessible name, aria-describedby, toggle, Escape) plus
// the two traps the design review hit: the focus trap must sit on the dialog
// rather than a wrapper holding the scrim, and every trigger transition must
// clear the pending hover timer.

import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { stubMatchMedia } from '@/test-utils/match-media'
import { CCTip } from './CCTip'
import { OVERLAY_COPY } from '../cc-overlay/definitions/copy'
import type { TipContent } from './definitions/types'

const TEXT_TIP: TipContent = {
  label: 'Days away',
  variant: 'text',
  body: 'Extra confirmation needed.',
}

const DEFS_TIP: TipContent = {
  label: 'Going vs. Watching',
  variant: 'defs',
  intro: 'Two different promises.',
  rows: [
    {
      tone: 'good',
      title: 'Watching: free',
      body: 'Keeps an eye on the price.',
    },
    {
      tone: 'neutral',
      title: 'Going',
      body: 'Saves the night to your history.',
    },
  ],
}

let setMobile: (next: boolean) => void

const renderTip = (tip: TipContent = TEXT_TIP) =>
  render(
    <div>
      <CCTip tip={tip} />
      <button type="button">outside</button>
    </div>,
  )

const triggerFor = (name: string | RegExp) =>
  screen.getByRole('button', { name })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setMobile = stubMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CCTip on desktop', () => {
  it('gives the trigger a concise name and hides the panel until clicked', () => {
    renderTip()
    const trigger = triggerFor('Days away')
    // The explanation is a description, not the name, so it is not announced
    // twice.
    expect(trigger).toHaveAttribute('aria-label', 'Days away')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('toggles on click and describes the trigger via the panel', () => {
    renderTip()
    const trigger = triggerFor('Days away')

    fireEvent.click(trigger)
    const panel = screen.getByRole('dialog')
    expect(panel).toHaveTextContent('Extra confirmation needed.')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-describedby', panel.id)
    expect(trigger).toHaveAttribute('aria-controls', panel.id)

    fireEvent.click(trigger)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on Escape and returns focus to the trigger', () => {
    renderTip()
    const trigger = triggerFor('Days away')
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('leaves the panel open when a hover-out is immediately followed by a click', () => {
    renderTip()
    const trigger = triggerFor('Days away')
    const wrapper = trigger.parentElement
    if (wrapper === null) throw new Error('no trigger wrapper')

    fireEvent.mouseEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByRole('dialog')).toBeTruthy()

    // Hover out schedules a close; the click that follows pins the panel and
    // must cancel it. Without the clearTimeout the stale close fires here.
    fireEvent.mouseLeave(wrapper)
    fireEvent.click(trigger)
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closes an unpinned panel once the hover-out delay elapses', () => {
    renderTip()
    const trigger = triggerFor('Days away')
    const wrapper = trigger.parentElement
    if (wrapper === null) throw new Error('no trigger wrapper')

    fireEvent.mouseEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    fireEvent.mouseLeave(wrapper)
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders every row of a defs tip', () => {
    renderTip(DEFS_TIP)
    fireEvent.click(triggerFor('Going vs. Watching'))
    expect(screen.getByText('Two different promises.')).toBeInTheDocument()
    expect(screen.getByText('Watching: free')).toBeInTheDocument()
    expect(screen.getByText('Going')).toBeInTheDocument()
  })

  // The admin Panel clips its rounded corners with overflow:hidden, which cut
  // the bottom off any tip opened inside one. jsdom has no layout, so the
  // testable invariant is the one that fixes it: the popover must not render
  // inside the clipping container at all.
  it('renders the popover outside a clipping ancestor', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <CCTip tip={DEFS_TIP} />
      </div>,
    )

    fireEvent.click(triggerFor('Going vs. Watching'))

    const popover = screen.getByRole('dialog')
    expect(popover).toBeInTheDocument()
    expect(container.contains(popover)).toBe(false)
  })
})

describe('CCTip on mobile', () => {
  beforeEach(() => {
    setMobile(true)
  })

  it('opens a modal sheet on tap', () => {
    renderTip(DEFS_TIP)
    fireEvent.click(triggerFor('Going vs. Watching'))

    const sheet = screen.getByRole('dialog')
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(sheet).toHaveAttribute('aria-label', 'Going vs. Watching')
  })

  it('returns focus to the trigger when dismissed by the close button', () => {
    renderTip(DEFS_TIP)
    const trigger = triggerFor('Going vs. Watching')
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('button', { name: OVERLAY_COPY.close }))

    expect(screen.queryByRole('dialog')).toBeNull()
    // The close button unmounts with the sheet, so without an explicit restore
    // focus falls to document.body and a keyboard user loses their place.
    expect(document.activeElement).toBe(trigger)
  })

  it('ignores hover entirely', () => {
    renderTip(DEFS_TIP)
    const wrapper = triggerFor('Going vs. Watching').parentElement
    if (wrapper === null) throw new Error('no trigger wrapper')

    fireEvent.mouseEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lands initial focus inside the dialog, never on the scrim', () => {
    renderTip(DEFS_TIP)
    fireEvent.click(triggerFor('Going vs. Watching'))

    const sheet = screen.getByRole('dialog')
    const scrim = screen.getByTestId('cc-overlay-scrim')
    expect(sheet.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(scrim)
    // The scrim is click-to-dismiss only, and presentational rather than a
    // control, so it can neither take pointer focus nor reach the tab order.
    expect(scrim).toHaveAttribute('role', 'presentation')
    expect(scrim.tagName).toBe('DIV')
  })

  it('traps Tab inside the sheet in both directions', () => {
    renderTip(DEFS_TIP)
    fireEvent.click(triggerFor('Going vs. Watching'))

    const sheet = screen.getByRole('dialog')
    const close = screen.getByRole('button', { name: OVERLAY_COPY.close })

    // Forward from the last (and only) control wraps back to the first.
    close.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(sheet.contains(document.activeElement)).toBe(true)

    // Backward from the container wraps to the last control.
    sheet.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(close)
  })

  it('closes the sheet from the scrim and from the close button', () => {
    renderTip(DEFS_TIP)
    const trigger = triggerFor('Going vs. Watching')

    fireEvent.click(trigger)
    fireEvent.click(screen.getByTestId('cc-overlay-scrim'))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: OVERLAY_COPY.close }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
