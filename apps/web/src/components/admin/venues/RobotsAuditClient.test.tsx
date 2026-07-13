// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { VenueRobotsStatus } from '@concert-crawl/types'
import { RobotsAuditClient } from './RobotsAuditClient'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.robotsAudit

const venue = (overrides: Partial<VenueRobotsStatus>): VenueRobotsStatus => ({
  id: 'venue-1',
  name: 'Test Venue',
  slug: 'test-venue',
  websiteUrl: 'https://testvenue.example.com',
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

const venues: VenueRobotsStatus[] = [
  venue({
    id: 'a',
    name: 'Allowed Venue',
    slug: 'allowed',
    robotsTxtAllowed: true,
  }),
  venue({
    id: 'b',
    name: 'Blocked Venue',
    slug: 'blocked',
    robotsTxtAllowed: false,
  }),
  venue({
    id: 'c',
    name: 'Unchecked Venue',
    slug: 'unchecked',
    robotsTxtAllowed: null,
    robotsTxtCheckedAt: null,
  }),
]

afterEach(cleanup)

describe('RobotsAuditClient', () => {
  it('renders every active venue by default', () => {
    render(<RobotsAuditClient venues={venues} />)
    expect(screen.getByText('Allowed Venue')).toBeTruthy()
    expect(screen.getByText('Blocked Venue')).toBeTruthy()
    expect(screen.getByText('Unchecked Venue')).toBeTruthy()
  })

  it('filters to a single status when a filter pill is pressed', () => {
    render(<RobotsAuditClient venues={venues} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.filters.blocked }))
    expect(screen.getByText('Blocked Venue')).toBeTruthy()
    expect(screen.queryByText('Allowed Venue')).toBeNull()
    expect(screen.queryByText('Unchecked Venue')).toBeNull()
  })

  it('shows the empty copy when a filter matches nothing', () => {
    render(
      <RobotsAuditClient
        venues={[venue({ robotsTxtAllowed: true, name: 'Only Allowed' })]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.filters.blocked }))
    expect(screen.getByText(COPY.empty)).toBeTruthy()
  })

  it('renders the never-checked label for venues without a check timestamp', () => {
    render(
      <RobotsAuditClient
        venues={[
          venue({
            name: 'Never Venue',
            robotsTxtAllowed: null,
            robotsTxtCheckedAt: null,
          }),
        ]}
      />,
    )
    expect(screen.getByText(COPY.neverChecked)).toBeTruthy()
  })

  it('shows only the error banner when venues is null (no misleading empty copy)', () => {
    render(<RobotsAuditClient venues={null} />)
    expect(screen.getByRole('alert').textContent).toContain(COPY.loadError)
    // The empty-state copy is an "everything filtered out" message — it must
    // not leak into the load-error path, where the stats/filters/table are
    // hidden entirely.
    expect(screen.queryByText(COPY.empty)).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.filters.all })).toBeNull()
  })

  it('renders a malformed website URL without crashing the table', () => {
    render(
      <RobotsAuditClient
        venues={[venue({ name: 'Bad URL Venue', websiteUrl: 'not-a-url' })]}
      />,
    )
    expect(screen.getByText('Bad URL Venue')).toBeTruthy()
    // Falls back to the raw stored string rather than throwing on new URL().
    expect(screen.getByText('not-a-url')).toBeTruthy()
  })

  it('does not render an unsafe-scheme URL as a clickable link', () => {
    render(
      <RobotsAuditClient
        venues={[
          venue({
            name: 'XSS Venue',
            websiteUrl: 'javascript:alert(1)',
          }),
        ]}
      />,
    )
    // A javascript: URL is shown as plain text (raw string), never an anchor —
    // guards against a stored-XSS vector through the admin table.
    const label = screen.getByText('javascript:alert(1)')
    expect(label.closest('a')).toBeNull()
  })
})
