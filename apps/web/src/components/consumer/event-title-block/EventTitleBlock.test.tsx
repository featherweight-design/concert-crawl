// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventTitleBlock } from './EventTitleBlock'

describe('EventTitleBlock', () => {
  it('renders headliner + openers', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        surface="detail"
      />,
    )
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'with Hotline TNT',
    )
  })

  it('renders the tour name as a kicker', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName="Rat Saw God Tour"
        surface="detail"
      />,
    )
    expect(screen.getByText('Rat Saw God Tour')).toBeInTheDocument()
  })

  it('falls back to the legacy title for legacy rows (supportingArtists === null)', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={null}
        tourName={null}
        fallbackTitle="Wednesday + Hotline TNT / MJ Lenderman"
        surface="detail"
      />,
    )
    expect(
      screen.getByText('Wednesday + Hotline TNT / MJ Lenderman'),
    ).toBeInTheDocument()
  })

  it('suppresses the legacy fallback for freshly extracted solo shows (supportingArtists === [])', () => {
    // `[]` means the crawler ran and found no openers — the headliner alone is
    // correct, so the run-on `fallbackTitle` must NOT reappear even when it
    // differs from the headliner (e.g. carries promoter/presenter text).
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        fallbackTitle="AEG Presents Wednesday"
        surface="detail"
      />,
    )
    expect(screen.queryByText('AEG Presents Wednesday')).not.toBeInTheDocument()
  })

  it('omits the legacy fallback when it equals the headliner', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={null}
        tourName={null}
        fallbackTitle="Wednesday"
        surface="detail"
      />,
    )
    expect(screen.queryByText('Wednesday')).toBeInTheDocument()
    // headliner is present exactly once — no duplicate fallback paragraph
    expect(screen.getAllByText('Wednesday')).toHaveLength(1)
  })

  it('renders the headliner as an <h1> when headlinerAs="h1"', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wednesday' }),
    ).toBeInTheDocument()
  })

  // The strike came off every surface, event detail included: the status pill
  // states the cancellation in words, and a line through a proper noun reads as
  // a typo before it reads as a state.
  it('does not strike through a cancelled headliner', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        status="cancelled"
        headlinerAs="h1"
        surface="detail"
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).not.toHaveStyle({ textDecoration: 'line-through' })
    expect(heading.style.textDecoration).toBe('')
  })
})

// #1115 PR-G — the block can link the whole bill to artist pages, opt-in.
describe('EventTitleBlock — artist links (#1115 PR-G)', () => {
  it('renders no anchors without linkArtists, however many slugs are supplied', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        artistSlug="wednesday"
        supportingArtistSlugs={['hotline-tnt']}
        surface="hero"
      />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('renders no anchors on the detail surface until linkArtists is set', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        artistSlug="wednesday"
        supportingArtistSlugs={['hotline-tnt']}
        surface="detail"
      />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('links the headliner and openers on the detail surface', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT', 'No Page Act']}
        tourName={null}
        artistSlug="wednesday"
        supportingArtistSlugs={['hotline-tnt', null]}
        surface="detail"
        headlinerAs="h1"
        linkArtists
      />,
    )
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) =>
      anchor.getAttribute('href'),
    )
    expect(hrefs).toEqual(['/artists/wednesday', '/artists/hotline-tnt'])
    // The heading is still the heading — the link lives inside it.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Wednesday',
    )
  })

  it('leaves the headliner as plain text when it has no slug', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Unprojected Act"
        supportingArtists={[]}
        tourName={null}
        artistSlug={null}
        supportingArtistSlugs={[]}
        surface="detail"
        headlinerAs="h1"
        linkArtists
      />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Unprojected Act',
    )
  })
})
