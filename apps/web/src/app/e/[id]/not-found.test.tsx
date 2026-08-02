// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.publicEvent

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

const loadNotFound = async () => (await import('./not-found')).default

describe('/e/[id] not-found (#72)', () => {
  it('sends a pre-launch visitor to the landing page, not /events', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'false')
    const NotFound = await loadNotFound()

    render(<NotFound />)

    // /events is gated before launch, so linking it here would bounce the
    // visitor to /sign-in — a second dead end on top of the missing show.
    const link = screen.getByRole('link', { name: copy.notFoundHomeButton })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('sends a post-launch visitor to the browse list', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const NotFound = await loadNotFound()

    render(<NotFound />)

    const link = screen.getByRole('link', { name: copy.notFoundBrowseButton })
    expect(link.getAttribute('href')).toBe('/events')
  })

  it('renders exactly one CTA and the branded copy', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true')
    const NotFound = await loadNotFound()

    render(<NotFound />)

    expect(screen.getByText(copy.notFoundHeading)).toBeDefined()
    expect(screen.getByText(copy.notFoundBody)).toBeDefined()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
