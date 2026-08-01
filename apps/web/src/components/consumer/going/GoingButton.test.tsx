// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { GoingButton } from './GoingButton'
import { GOING_COPY } from './definitions/copy'

const SHOW = {
  eventId: 'ev1',
  artist: 'Khruangbin',
  date: '2026-10-14',
}

describe('GoingButton', () => {
  afterEach(cleanup)

  it('renders the commitment copy by default, exclamation included', () => {
    render(<GoingButton show={SHOW} />)
    expect(screen.getByRole('button')).toHaveTextContent("I'm going!")
  })

  it('renders the going copy and sets aria-pressed', () => {
    render(<GoingButton show={SHOW} state="going" />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent(GOING_COPY.button.going)
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('is not pressed in the default state', () => {
    render(<GoingButton show={SHOW} />)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('omits aria-pressed in the read-only past states', () => {
    for (const state of ['past-yes', 'past-no'] as const) {
      render(<GoingButton show={SHOW} state={state} />)
      expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(
        false,
      )
      cleanup()
    }
  })

  it('carries the focus-ring class that restores :focus-visible', () => {
    render(<GoingButton show={SHOW} />)
    expect(screen.getByRole('button').classList.contains('going-cta')).toBe(
      true,
    )
  })

  it('renders the show date in past-yes, not the tap date', () => {
    render(<GoingButton show={SHOW} state="past-yes" />)
    expect(screen.getByRole('button')).toHaveTextContent(
      'You went · Oct 14, 2026',
    )
  })

  it('renders the declined copy in past-no', () => {
    render(<GoingButton show={SHOW} state="past-no" />)
    expect(screen.getByRole('button')).toHaveTextContent("Didn't make it")
  })

  it('reports going=true when tapped from default', () => {
    const onChange = vi.fn()
    render(<GoingButton show={SHOW} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reports going=false when tapped while going', () => {
    const onChange = vi.fn()
    render(<GoingButton show={SHOW} state="going" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it.each(['past-yes', 'past-no'] as const)(
    '%s is a read-only display, not an affordance',
    (state) => {
      const onChange = vi.fn()
      render(<GoingButton show={SHOW} state={state} onChange={onChange} />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      fireEvent.click(button)
      expect(onChange).not.toHaveBeenCalled()
    },
  )

  // Blocks a second tap but stays undimmed: the caller commits optimistically,
  // so dimming here would undo the point of the optimistic state.
  it('blocks a second tap while pending without dimming', () => {
    const onChange = vi.fn()
    render(<GoingButton show={SHOW} pending onChange={onChange} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.style.opacity).toBe('1')
    fireEvent.click(button)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('announces the commitment on transition into going', () => {
    const { rerender } = render(<GoingButton show={SHOW} />)
    expect(screen.getByRole('status').textContent).toBe('')
    rerender(<GoingButton show={SHOW} state="going" />)
    expect(screen.getByRole('status').textContent).toBe(
      GOING_COPY.button.stateChangeGoing,
    )
  })

  it('announces the release on transition out of going', () => {
    const { rerender } = render(<GoingButton show={SHOW} state="going" />)
    rerender(<GoingButton show={SHOW} state="default" />)
    expect(screen.getByRole('status').textContent).toBe(
      GOING_COPY.button.stateChangeReleased,
    )
  })

  // Landing on a past show you already attended is not something the user just
  // did, so it must not be announced.
  it('stays silent when mounted straight into going', () => {
    render(<GoingButton show={SHOW} state="going" />)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it.each(['sm', 'md', 'lg'] as const)(
    'meets the 44px tap target at size %s',
    (size) => {
      render(<GoingButton show={SHOW} size={size} />)
      const button = screen.getByRole('button')
      const drawn = parseFloat(button.style.height)
      if (drawn >= 44) return
      // Below 44 the hit area is extended by an overflowing overlay child.
      const overlay = button.querySelector('span[aria-hidden="true"]')
      expect(overlay).not.toBeNull()
      const pad = Math.abs(parseFloat((overlay as HTMLElement).style.top))
      expect(drawn + pad * 2).toBeGreaterThanOrEqual(44)
    },
  )

  it('fills with the artist accent only once committed', () => {
    const { container: off } = render(<GoingButton show={SHOW} />)
    const offBorder = off.querySelector('button')!.style.border
    cleanup()
    const { container: on } = render(<GoingButton show={SHOW} state="going" />)
    const onBorder = on.querySelector('button')!.style.border
    expect(offBorder).toContain('var(--border-strong)')
    expect(onBorder).not.toBe(offBorder)
  })
})
