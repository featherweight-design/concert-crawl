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
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wednesday' }),
    ).toBeInTheDocument()
  })
})
