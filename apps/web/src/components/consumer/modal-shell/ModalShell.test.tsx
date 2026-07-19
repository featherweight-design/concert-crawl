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
