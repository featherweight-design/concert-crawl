// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

// Next.js Link renders as <a> in tests
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    style,
  }: {
    href: string
    children: React.ReactNode
    style?: React.CSSProperties
  }) => (
    <a href={href} style={style}>
      {children}
    </a>
  ),
}))

describe('EmptyState', () => {
  it('renders eyebrow, title, and body', () => {
    render(
      <EmptyState
        eyebrow="Tonight"
        title="No shows tonight, grandpa."
        body="Slow night on the calendar."
      />,
    )
    expect(screen.getByText('Tonight')).toBeTruthy()
    expect(screen.getByText('No shows tonight, grandpa.')).toBeTruthy()
    expect(screen.getByText('Slow night on the calendar.')).toBeTruthy()
  })

  it('renders rail-right as "0 / 0" for no-data state', () => {
    render(
      <EmptyState
        state="no-data"
        eyebrow="Tonight"
        title="No shows"
        body="Nothing here."
      />,
    )
    expect(screen.getByText('0 / 0')).toBeTruthy()
  })

  it('renders rail-right as "0 hits" for filtered state', () => {
    render(
      <EmptyState
        state="filtered"
        eyebrow="Filtered"
        title="Crickets."
        body="Try widening your filters."
      />,
    )
    expect(screen.getByText('0 hits')).toBeTruthy()
  })

  it('renders rail-right as "err" for error state', () => {
    render(
      <EmptyState
        state="error"
        eyebrow="Failed to load"
        title="Signal lost."
        body="Try again."
      />,
    )
    expect(screen.getByText('err')).toBeTruthy()
  })

  it('renders primaryCta as Link', () => {
    render(
      <EmptyState
        eyebrow="Watching"
        title="Empty queue."
        body="Nothing saved."
        primaryCta={{ label: 'Browse tonight', href: '/events' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Browse tonight' })
    expect(link.getAttribute('href')).toBe('/events')
  })

  it('renders secondaryCta as Link', () => {
    render(
      <EmptyState
        eyebrow="Filtered"
        title="Crickets."
        body="Try widening."
        secondaryCta={{ label: 'Clear filters', href: '/events' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Clear filters' })
    expect(link.getAttribute('href')).toBe('/events')
  })

  it('renders no links when no CTAs are given', () => {
    render(
      <EmptyState
        eyebrow="Search"
        title="Type something."
        body="Artist or venue."
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('applies className to wrapper', () => {
    const { container } = render(
      <EmptyState
        eyebrow="Test"
        title="Test"
        body="Test"
        className="test-class"
      />,
    )
    expect(container.firstChild).toBeTruthy()
    expect(
      (container.firstChild as HTMLElement).classList.contains('test-class'),
    ).toBe(true)
  })
})
