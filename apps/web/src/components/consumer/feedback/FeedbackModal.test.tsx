// @vitest-environment jsdom

import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FEEDBACK_DRAFT_KEY } from '@/lib/feedback-draft'

beforeEach(() => {
  localStorage.clear()
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

afterEach(() => {
  vi.restoreAllMocks()
})

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('tok') }),
  useUser: () => ({ user: null }),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/browse',
}))
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'electric' }),
}))
vi.mock('@/components/brand/cc-mark', () => ({
  CCMark: () => <div data-testid="cc-mark" />,
}))

import { FeedbackModal } from './FeedbackModal'

// ── Helpers ────────────────────────────────────────────────────────────────

function fillCategoryAndMessage(message: string, category = 'Bug'): void {
  const categoryBtn = screen.getByRole('button', {
    name: category,
    pressed: false,
  })
  fireEvent.click(categoryBtn)
  const textarea = screen.getByRole('textbox')
  fireEvent.change(textarea, { target: { value: message } })
}

async function submitAndWait(): Promise<void> {
  const sendBtn = screen.getAllByRole('button', { name: /Send →/i })[0]
  if (!sendBtn) throw new Error('Send button not found')
  await act(async () => {
    fireEvent.click(sendBtn)
    // Flush the awaited getToken + fetch microtasks.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

// ── Existing smoke tests ───────────────────────────────────────────────────

describe('FeedbackModal — render', () => {
  it('renders the dialog with form content when open', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Holler at ya boi.')).toBeTruthy()
  })

  it('renders nothing when closed', () => {
    render(<FeedbackModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// ── Regression: #829 — notes preserved on submission error ────────────────

describe('FeedbackModal — error retry preserves user inputs (#829)', () => {
  it('keeps category + message after the user retries from the error state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('boom', { status: 500 }) as unknown as Response,
      )
    render(<FeedbackModal open={true} onClose={vi.fn()} />)

    fillCategoryAndMessage('the page wont load')
    await submitAndWait()

    // We should be in the error state now.
    expect(screen.getByText('Signal lost.')).toBeTruthy()

    // Click "Try again" — the error-state primary action.
    const tryAgain = screen.getByRole('button', { name: /Try again/i })
    fireEvent.click(tryAgain)

    // Form is back. Critical: message + category must still be populated.
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('the page wont load')
    // The selected chip retains aria-pressed=true.
    const bugChip = screen.getByRole('button', { name: 'Bug', pressed: true })
    expect(bugChip).toBeTruthy()

    fetchMock.mockRestore()
  })
})

// ── Regression: #830 — Save and come back persists draft + restores it ────

describe('FeedbackModal — Save and come back persists draft (#830)', () => {
  it('saves a draft on "Save and come back" and restores it on reopen', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('boom', { status: 500 }) as unknown as Response,
      )
    const onClose = vi.fn()
    const { rerender } = render(<FeedbackModal open={true} onClose={onClose} />)
    fillCategoryAndMessage('save me for later')
    await submitAndWait()

    // Click "Save and come back" — error-state secondary action.
    const saveBtn = screen.getByRole('button', {
      name: /Save and come back/i,
    })
    fireEvent.click(saveBtn)

    expect(onClose).toHaveBeenCalled()
    // Draft is persisted to localStorage.
    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '{}') as {
      category: string
      message: string
    }
    expect(parsed.category).toBe('bug')
    expect(parsed.message).toBe('save me for later')

    // Reopen the modal — the draft hydrates back into the form and a
    // "Saved draft restored" banner appears.
    rerender(<FeedbackModal open={false} onClose={onClose} />)
    rerender(<FeedbackModal open={true} onClose={onClose} />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('save me for later')
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy()

    fetchMock.mockRestore()
  })

  it('clears the saved draft on successful submission', async () => {
    // Pre-seed a draft, then submit successfully and ensure it's cleared.
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({
        category: 'idea',
        message: 'stale draft',
        screenshot: null,
        savedAt: Date.now(),
      }),
    )
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 201 }))
    render(<FeedbackModal open={true} onClose={vi.fn()} />)
    // Draft hydrated, banner present.
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy()
    await submitAndWait()

    // Success state shows up.
    expect(screen.getByText('Loud and clear.')).toBeTruthy()
    // Draft removed from localStorage.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull()
    fetchMock.mockRestore()
  })

  it('discards the saved draft when the user clicks "Discard draft"', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({
        category: 'idea',
        message: 'no longer relevant',
        screenshot: null,
        savedAt: Date.now(),
      }),
    )
    render(<FeedbackModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText(/Saved draft restored/i)).toBeTruthy()

    const discardBtn = screen.getByRole('button', {
      name: /Discard saved draft/i,
    })
    fireEvent.click(discardBtn)

    // Form cleared.
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('')
    expect(screen.queryByText(/Saved draft restored/i)).toBeNull()
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull()
  })
})
