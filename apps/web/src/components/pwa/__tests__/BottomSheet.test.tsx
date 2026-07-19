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

  it('focuses the container itself if there are no focusable children', () => {
    render(
      <BottomSheet open onClose={() => {}} title="test">
        <p>no interactives here</p>
      </BottomSheet>,
    )
    // The container (role=dialog) is tabIndex=-1 so it can accept focus.
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)
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
    expect(document.activeElement).toBe(screen.getByTestId('inside-first'))
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
