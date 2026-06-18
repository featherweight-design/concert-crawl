// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventEditorClient, type EditorEvent } from './EventEditorClient'

const SAMPLE: EditorEvent = {
  id: 'evt-1',
  title: 'Lord Huron',
  artist: 'Lord Huron',
  date: '2026-06-19',
  doorsTime: '19:00',
  showTime: '20:00',
  ticketPriceMin: '35',
  ticketPriceMax: '60',
  confidenceScore: 0.82,
  verified: true,
  status: 'upcoming',
  extractionStrategy: 'llm',
  genre: ['indie', 'folk'],
  updatedAt: '2026-06-12T18:14:00Z',
  venueId: 'venue-1',
  venueName: 'Mission Ballroom',
  isSoldOut: false,
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
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

describe('EventEditorClient', () => {
  it('renders the editor header with title + lifecycle + verification', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByRole('heading', { name: 'Lord Huron' })).toBeTruthy()
    // Upcoming + Verified each appear in both the header and the status section.
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
  })

  it('renders all five numbered sections', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('Identity')).toBeTruthy()
    expect(screen.getByText('Pricing')).toBeTruthy()
    expect(screen.getByText('Classification')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()
    expect(screen.getByText('Identity art')).toBeTruthy()
  })

  it('renders the genre tags', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('indie')).toBeTruthy()
    expect(screen.getByText('folk')).toBeTruthy()
  })

  it('renders the Available chip when isSoldOut=false', () => {
    render(<EventEditorClient event={SAMPLE} />)
    expect(screen.getByText('Available')).toBeTruthy()
  })

  it('renders Sold out when isSoldOut=true', () => {
    render(<EventEditorClient event={{ ...SAMPLE, isSoldOut: true }} />)
    expect(screen.getByText('Sold out')).toBeTruthy()
  })
})
