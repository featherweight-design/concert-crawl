// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import {
  MissingEventLink,
  MissingVenueLink,
  VenueCheckLink,
} from './MissingLinks'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe('MissingEventLink', () => {
  it('links to the admin record, not the consumer page (which 404s once missing)', () => {
    render(<MissingEventLink eventId="evt-1" title="Lord Huron" />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/admin/events/evt-1/edit',
    )
  })
})

describe('MissingVenueLink', () => {
  it('links to the admin venue page', () => {
    render(<MissingVenueLink venueId="ven-1" venueName="Mission Ballroom" />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/admin/venues/ven-1',
    )
  })

  it('still links when the LEFT JOIN yields an id but no name', () => {
    render(<MissingVenueLink venueId="ven-1" venueName={null} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/admin/venues/ven-1')
    expect(link.getAttribute('aria-label')).toBe(
      'Open the admin page for this venue',
    )
  })

  it('renders plain text when the row has no venue id', () => {
    render(<MissingVenueLink venueId={null} venueName={null} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('—')).toBeTruthy()
  })
})

describe('VenueCheckLink', () => {
  it('opens the event page in a new tab with a safe rel', () => {
    render(
      <VenueCheckLink
        title="GRiZ"
        eventUrl="https://redrocksonline.com/events/griz-1489047/"
        sourceUrl="https://redrocksonline.com/events/"
      />,
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(
      'https://redrocksonline.com/events/griz-1489047/',
    )
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders nothing when neither URL is safe', () => {
    const { container } = render(
      <VenueCheckLink
        title="GRiZ"
        eventUrl="javascript:alert(1)"
        sourceUrl={null}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
