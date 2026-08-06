// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { CREWS_COPY } from '@/components/consumer/crews/definitions/copy'
import NotFound from './not-found'

const copy = CONSUMER_COPY.notFound

afterEach(cleanup)

describe('/crew/join/[token] not-found (#1226)', () => {
  it('renders the app ordinary 404 with a way back', () => {
    render(<NotFound />)

    expect(screen.getByRole('heading', { name: copy.heading })).toBeDefined()
    // The boundary exists for this: without it the route falls outside every
    // route group that owns one, and Next's bare default offers no link at all.
    expect(
      screen
        .getByRole('link', { name: copy.browseButton })
        .getAttribute('href'),
    ).toBe('/events')
  })

  it('carries no invite or crew identity', () => {
    render(<NotFound />)

    // An unknown token must be indistinguishable from any other missing page.
    // Naming the invite here would confirm which tokens exist.
    const text = document.body.textContent ?? ''
    expect(text).not.toContain(CREWS_COPY.linkDead.eyebrow)
    expect(text).not.toContain(CREWS_COPY.landing.eyebrow)
  })
})
