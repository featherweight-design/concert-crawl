// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

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

import { SkipRail } from './SkipRail'

afterEach(cleanup)

describe('SkipRail — three weights, one position (#794)', () => {
  it('renders a quiet mono link by default', () => {
    render(<SkipRail mode={{ kind: 'default' }} />)
    const skip = screen.getByRole('link', { name: /^skip$/i })
    expect(skip.getAttribute('href')).toBe('/events')
    // Quiet means no button chrome — a border here would read as a CTA.
    expect(skip.style.border).toBe('')
  })

  it('names the destination and goes loud mid-intent', () => {
    render(
      <SkipRail
        mode={{
          kind: 'mid-intent',
          destinationLabel: 'Geese',
          href: '/events/e1',
        }}
      />,
    )
    const skip = screen.getByRole('link', { name: /skip: back to geese/i })
    expect(skip.getAttribute('href')).toBe('/events/e1')
    expect(skip.style.border).toContain('var(--border-strong)')
  })

  it('states the pending action mid-intent so the tour explains itself', () => {
    render(
      <SkipRail
        mode={{
          kind: 'mid-intent',
          destinationLabel: 'Geese',
          href: '/events/e1',
        }}
      />,
    )
    expect(screen.getByRole('status').textContent).toBe(
      "Watching Geese. We'll take you back",
    )
  })

  it('reads Close with no pending strip when entered from the account menu', () => {
    render(<SkipRail mode={{ kind: 'menu' }} />)
    expect(screen.getByRole('link', { name: /^close$/i })).not.toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows no pending strip by default either', () => {
    render(<SkipRail mode={{ kind: 'default' }} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
