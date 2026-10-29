// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BottomSheet } from '../BottomSheet'

afterEach(cleanup)

describe('BottomSheet', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <BottomSheet open={false} onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('is a dialog with aria-modal when open', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  // Anchored to the bottom edge of a wide viewport this read as a stray
  // drawer, so it centers from sm up — one media query, not a second tree.
  it('is a bottom sheet on mobile and a centered modal from sm up', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog')

    expect(dialog.className).toContain('bottom-0')
    expect(dialog.className).toContain('rounded-t-2xl')

    expect(dialog.className).toContain('sm:inset-0')
    expect(dialog.className).toContain('sm:m-auto')
    expect(dialog.className).toContain('sm:h-fit')
    expect(dialog.className).toContain('sm:max-w-md')
    expect(dialog.className).toContain('sm:rounded-2xl')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} title="test">
        <button>inside</button>
      </BottomSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // Escape is not a phone gesture and the backdrop above a tall sheet can be a
  // sliver, so the sheet carries its own visible close (#1358).
  it('renders a named close button that dismisses the sheet', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} title="test">
        <p>no interactives here</p>
      </BottomSheet>,
    )
    const close = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('gives the close button a 44px tap target', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <p>body</p>
      </BottomSheet>,
    )
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('h-11')
    expect(close.className).toContain('w-11')
  })

  it('lands initial focus on the close button, first in the sheet', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <button>inside</button>
      </BottomSheet>,
    )
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    )
  })

  it('pulls focus back into the sheet if Tab is pressed while focus is outside', () => {
    render(
      <>
        <button data-testid="outside-before">outside-before</button>
        <BottomSheet open onClose={() => {}} title="test">
          <button data-testid="inside-first">inside-first</button>
          <button data-testid="inside-last">inside-last</button>
        </BottomSheet>
      </>,
    )
    // Force focus outside the sheet.
    const outside = screen.getByTestId('outside-before')
    outside.focus()
    expect(document.activeElement).toBe(outside)
    fireEvent.keyDown(document, { key: 'Tab' })
    // The sheet's own close button is its first focusable.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    )
  })

  it('closes when the scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <BottomSheet open onClose={onClose} title="test">
        <button>inside</button>
      </BottomSheet>,
    )
    const scrim = container.querySelector('[aria-hidden="true"]')
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
