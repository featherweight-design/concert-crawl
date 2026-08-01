// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingPosterAnimation } from './LandingPosterAnimation'
import type { LandingShow } from './LandingPoster'

const show = (num: number, href: string | null): LandingShow => ({
  id: `id-${num}`,
  artist: `Artist ${num}`,
  venue: `Venue ${num}`,
  city: 'Denver, CO',
  date: '2026-09-01',
  dateShort: 'SEP 01',
  showTime: '8pm',
  opener: null,
  state: null,
  href,
})

const LINKED = [1, 2, 3, 4].map((num) => show(num, `/events/id-${num}`))
const UNLINKED = [1, 2, 3, 4].map((num) => show(num, null))

describe('LandingPosterAnimation — stack links (#794)', () => {
  it('exposes exactly one poster link, never the layers behind it', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    const links = screen
      .getAllByRole('link')
      .filter((node) => node.getAttribute('href')?.startsWith('/events/'))
    expect(links).toHaveLength(1)
  })

  it('names the poster link with the show, venue and date', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    const link = screen.getByRole('link', {
      name: /Artist \d at Venue \d, SEP 01\. See the show/,
    })
    expect(link.getAttribute('href')).toMatch(/^\/events\/id-\d$/)
  })

  it('renders no link at all when the shows carry no href', () => {
    render(<LandingPosterAnimation mode="stack" shows={UNLINKED} width={200} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  // Nested inside the Link, the hover arrow navigated to the show on every
  // click instead of advancing the stack.
  it('renders the hover arrow outside the poster link', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    const next = screen.getByRole('button', { name: /next poster/i })
    expect(next.closest('a')).toBeNull()
  })

  it('gives the on-deck layers no arrow of their own', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    expect(
      screen.getAllByRole('button', { name: /next poster/i }),
    ).toHaveLength(1)
  })

  it('keeps manual advance on a keyboard-reachable pager', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    const dots = screen.getAllByRole('button', { name: /go to poster \d/i })
    expect(dots).toHaveLength(4)
    expect(dots[0]?.getAttribute('aria-current')).toBe('true')
  })

  // `all: unset` resets display to inline, where width/height are ignored and
  // a text-free dot collapses to 0x0 while staying clickable.
  it('keeps the pager dots block-level so their size applies', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    for (const dot of screen.getAllByRole('button', {
      name: /go to poster \d/i,
    })) {
      expect(dot.style.display).toBe('block')
    }
  })

  // The `background` shorthand resets background-clip. React rewrites only
  // changed properties, so once the active dot's colour changed the clip was
  // gone for good and the dot painted its full 30px padding box.
  it('sets the dot colour with a longhand so background-clip survives', () => {
    render(<LandingPosterAnimation mode="stack" shows={LINKED} width={200} />)
    for (const dot of screen.getAllByRole('button', {
      name: /go to poster \d/i,
    })) {
      expect(dot.style.background).toBe('')
      expect(dot.style.backgroundClip).toBe('content-box')
    }
  })

  it('still renders the ticker and wall modes', () => {
    const { container: ticker } = render(
      <LandingPosterAnimation mode="ticker" shows={LINKED} width={200} />,
    )
    expect(ticker.firstChild).not.toBeNull()
    const { container: wall } = render(
      <LandingPosterAnimation mode="wall" shows={LINKED} width={200} />,
    )
    expect(wall.firstChild).not.toBeNull()
  })
})
