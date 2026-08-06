// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModalShell } from './ModalShell'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

const Header = () => <div>Modal Header</div>

describe('ModalShell', () => {
  // Triggers sit inside clipping and transformed ancestors — the filter rail
  // scrolls horizontally, and a transformed ancestor makes `position: fixed`
  // resolve against that box, which rendered the gate sheet inside its chip.
  it('escapes its trigger by portalling to the body', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', transform: 'translateX(0)' }}>
        <ModalShell open onClose={vi.fn()} ariaLabel="Test">
          <div>Content</div>
        </ModalShell>
      </div>,
    )
    const dialog = screen.getByRole('dialog')
    expect(container.contains(dialog)).toBe(false)
    expect(dialog.parentElement).toBe(document.body)
  })

  it('renders nothing when closed', () => {
    render(
      <ModalShell
        open={false}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with header and children when open', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
    expect(screen.getByText('Modal Header')).toBeTruthy()
  })

  it('applies role and labelledby/describedby overrides, dropping aria-label', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
        role="alertdialog"
        ariaLabelledBy="headline-id"
        ariaDescribedBy="body-id"
      >
        <div>Content</div>
      </ModalShell>,
    )
    const dialog = screen.getByRole('alertdialog')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(dialog.getAttribute('aria-label')).toBeNull()
    expect(dialog.getAttribute('aria-labelledby')).toBe('headline-id')
    expect(dialog.getAttribute('aria-describedby')).toBe('body-id')
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <ModalShell
        open={true}
        onClose={onClose}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when scrim is clicked', () => {
    const onClose = vi.fn()
    render(
      <ModalShell
        open={true}
        onClose={onClose}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    )
    fireEvent.click(screen.getByTestId('modal-scrim'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders no header band when header is omitted', () => {
    render(
      <ModalShell open={true} onClose={vi.fn()} ariaLabel="Test">
        <div>Content</div>
      </ModalShell>,
    )
    const dialog = screen.getByRole('dialog')
    // Only the content wrapper — no empty header container above it.
    expect(dialog.children).toHaveLength(1)
    expect(screen.getByText('Content')).toBeTruthy()
  })

  it('renders footer when provided', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
        footer={<button>Submit</button>}
      >
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy()
  })

  it('renders no footer section when footer prop is omitted', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
      >
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})

// `aria-modal` tells a screen reader the rest of the page is inert; it does
// nothing to the keyboard, so Tab used to walk straight out behind the scrim.
describe('ModalShell focus containment', () => {
  const TwoControls = () => (
    <ModalShell open onClose={vi.fn()} ariaLabel="Test">
      <button>First</button>
      <button>Last</button>
    </ModalShell>
  )

  it('moves focus to the dialog rather than leaving it on the trigger', () => {
    render(<TwoControls />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('wraps Tab from the last control back to the first', () => {
    render(<TwoControls />)
    screen.getByRole('button', { name: 'Last' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'First' }),
    )
  })

  it('wraps Shift+Tab from the first control to the last', () => {
    render(<TwoControls />)
    screen.getByRole('button', { name: 'First' }).focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Last' }),
    )
  })

  it('wraps Shift+Tab off the dialog itself to the last control', () => {
    render(<TwoControls />)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Last' }),
    )
  })

  it('hides the scrim from assistive tech and from the tab order', () => {
    render(<TwoControls />)
    const scrim = screen.getByTestId('modal-scrim')
    expect(scrim.getAttribute('aria-hidden')).toBe('true')
    expect(scrim.tabIndex).toBe(-1)
  })
})
