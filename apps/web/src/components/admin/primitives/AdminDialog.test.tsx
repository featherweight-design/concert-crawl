// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { AdminDialog } from './AdminDialog'
import { useDialogKeyboard } from './useDialogKeyboard'

const renderDialog = (
  props: Partial<React.ComponentProps<typeof AdminDialog>> = {},
) => {
  const onDismiss = props.onDismiss ?? vi.fn()
  render(
    <AdminDialog
      accent="var(--danger)"
      label="Delete everything?"
      eyebrow="Careful"
      heading="Delete everything?"
      onDismiss={onDismiss}
      footer={
        <>
          <button type="button">Cancel</button>
          <button type="button">Confirm</button>
        </>
      }
      {...props}
    >
      <p>Body copy.</p>
    </AdminDialog>,
  )
  return { onDismiss }
}

describe('AdminDialog', () => {
  it('announces itself as a modal named by its label', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Delete everything?')
  })

  it('renders eyebrow, heading, body and footer', () => {
    renderDialog()
    expect(screen.getByText('Careful')).toBeTruthy()
    expect(screen.getByText('Body copy.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy()
  })

  // `aria-modal` claims the background is inert. These three are what make
  // that true rather than merely asserted.
  it('moves focus into the panel, onto the first action', () => {
    renderDialog()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
      true,
    )
    expect(document.activeElement?.textContent).toBe('Cancel')
  })

  it('dismisses on Escape', () => {
    const { onDismiss } = renderDialog()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('wraps Tab from the last action back to the first', () => {
    renderDialog()
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    confirm.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement?.textContent).toBe('Cancel')
  })

  it('wraps Shift+Tab from the first action back to the last', () => {
    renderDialog()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement?.textContent).toBe('Confirm')
  })

  // Boundary wrapping only fires when focus is already on the head or tail.
  // Focus can sit outside the panel entirely — back from browser chrome, or
  // moved programmatically — and Tab from there walks into the page behind a
  // dialog still claiming it is inert.
  it('pulls focus back in when Tab is pressed from outside the panel', () => {
    const outside = document.createElement('button')
    outside.textContent = 'Outside'
    document.body.appendChild(outside)

    renderDialog()
    outside.focus()
    expect(document.activeElement).toBe(outside)

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
      true,
    )
    outside.remove()
  })

  it('restores focus to the opener on unmount', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.appendChild(opener)
    opener.focus()

    const { unmount } = render(
      <AdminDialog
        accent="var(--danger)"
        label="Gone"
        eyebrow="Eyebrow"
        heading="Gone"
        onDismiss={vi.fn()}
        footer={<button type="button">Cancel</button>}
      >
        <p>Body.</p>
      </AdminDialog>,
    )
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('dismisses on a scrim click but not a panel click', () => {
    const { onDismiss } = renderDialog()
    fireEvent.click(screen.getByText('Body copy.'))
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  // A dialog mid-request has already committed. Letting Escape or the scrim
  // close it would tell the admin they cancelled something still running.
  it('goes inert on Escape and scrim while not dismissible', () => {
    const { onDismiss } = renderDialog({ dismissible: false })
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('dialog'))
    expect(onDismiss).not.toHaveBeenCalled()
  })

  // A caller that renders its panel inline behind an `open` flag would
  // otherwise hold a document-level Escape listener for the whole time the
  // component is mounted, firing dismiss from anywhere on the page.
  // A disabled button cannot take focus, so counting one as a trap member
  // breaks the trap twice: the opening focus no-ops, and a disabled tail
  // means the Tab-wrap comparison never matches and Tab leaves the dialog.
  it('skips disabled controls when placing focus', () => {
    render(
      <AdminDialog
        accent="var(--danger)"
        label="Armed?"
        eyebrow="Careful"
        heading="Armed?"
        onDismiss={vi.fn()}
        footer={
          <>
            <button type="button" disabled>
              Cancel
            </button>
            <button type="button">Confirm</button>
          </>
        }
      >
        <p>Body copy.</p>
      </AdminDialog>,
    )
    expect(document.activeElement?.textContent).toBe('Confirm')
  })

  it('wraps Tab around the enabled controls only', () => {
    render(
      <AdminDialog
        accent="var(--danger)"
        label="Armed?"
        eyebrow="Careful"
        heading="Armed?"
        onDismiss={vi.fn()}
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button" disabled>
              Confirm
            </button>
          </>
        }
      >
        <p>Body copy.</p>
      </AdminDialog>,
    )
    // Cancel is both head and tail while Confirm is disabled, so Tab must
    // stay on it rather than falling through to the page behind the scrim.
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement?.textContent).toBe('Cancel')
  })

  // Mid-request every control is disabled. Focus must still be inside a
  // dialog that is telling assistive technology the page is inert.
  it('falls back to the panel when every control is disabled', () => {
    const { container } = render(
      <AdminDialog
        accent="var(--danger)"
        label="Working"
        eyebrow="Careful"
        heading="Working"
        dismissible={false}
        onDismiss={vi.fn()}
        footer={
          <button type="button" disabled>
            Cancel
          </button>
        }
      >
        <p>Body copy.</p>
      </AdminDialog>,
    )
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog?.contains(document.activeElement)).toBe(true)
  })

  // A caller passing a freshly-declared function each render must not cause
  // the effect to tear down and rebuild. The harm is observable as a blur
  // round trip: cleanup returns focus to the opener, setup pulls it back.
  // Asserting the final focus position is NOT enough — it is identical
  // either way, which is how the first version of this test passed against
  // the bug.
  it('does not re-run the effect when onDismiss identity changes', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const Harness = ({ tick }: { tick: number }) => (
      <AdminDialog
        accent="var(--danger)"
        label="Stable"
        eyebrow="Careful"
        heading="Stable"
        onDismiss={() => {
          void tick
        }}
        footer={<button type="button">Cancel</button>}
      >
        <input aria-label="token" />
      </AdminDialog>
    )
    const { rerender } = render(<Harness tick={0} />)

    const input = screen.getByLabelText('token')
    input.focus()
    const blurs = vi.fn()
    input.addEventListener('blur', blurs)

    rerender(<Harness tick={1} />)

    expect(blurs).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input)
    opener.remove()
  })

  it('attaches nothing while disabled', () => {
    const onDismiss = vi.fn()
    const Harness = () => {
      const ref = React.useRef<HTMLDivElement>(null)
      useDialogKeyboard(ref, onDismiss, { enabled: false })
      return <div ref={ref} />
    }
    render(<Harness />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('keeps focus contained even while not dismissible', () => {
    renderDialog({ dismissible: false })
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
      true,
    )
  })
})
