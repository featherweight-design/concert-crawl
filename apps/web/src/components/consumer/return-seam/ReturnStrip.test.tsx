// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

import { ReturnStrip } from './ReturnStrip'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ReturnStrip — post-signup confirmation (#794)', () => {
  it('announces politely and clears after six seconds', () => {
    render(<ReturnStrip artist="Geese" href="/events/e1" />)
    const strip = screen.getByRole('status')
    expect(strip.getAttribute('aria-live')).toBe('polite')
    expect(strip.textContent).toContain('Now watching Geese.')
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('is still there just before the six-second mark', () => {
    render(<ReturnStrip artist="Geese" href="/events/e1" />)
    act(() => {
      vi.advanceTimersByTime(5900)
    })
    expect(screen.queryByRole('status')).not.toBeNull()
  })

  it('says Kept, never Saved — there is no Saved concept in this product', () => {
    render(<ReturnStrip artist="Geese" href="/events/e1" />)
    const text = screen.getByRole('status').textContent ?? ''
    expect(text).toContain('Kept while you were signing up')
    expect(text.toLowerCase()).not.toContain('saved')
  })

  it('links back to the destination', () => {
    render(<ReturnStrip artist="Geese" href="/events/e1" />)
    expect(
      screen.getByRole('link', { name: /view/i }).getAttribute('href'),
    ).toBe('/events/e1')
  })

  it('renders nothing when the replay failed', () => {
    // Sold out, unlinked, deleted mid-flow: the visitor still lands on the
    // destination, but nothing is claimed that did not happen.
    render(<ReturnStrip artist={null} href="/events/e1" />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
