// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArtistPicker } from './ArtistPicker'
import { ARTIST_PICKER_COPY } from './definitions/copy'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import type { PickArtist } from './definitions/types'

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

const ARTISTS: PickArtist[] = [
  { slug: 'punk-act', name: 'Punk Act', photoUrl: null, dateLabel: 'Sep 12' },
  { slug: 'jazz-act', name: 'Jazz Act', photoUrl: null, dateLabel: null },
]

function renderPicker(overrides: Partial<Parameters<typeof ArtistPicker>[0]>) {
  const props = {
    artists: ARTISTS,
    selected: new Set<string>(),
    onToggle: vi.fn(),
    loading: false,
    columns: 2,
    ...overrides,
  }
  render(<ArtistPicker {...props} />)
  return props
}

describe('ArtistPicker', () => {
  it('renders each artist as a checkbox inside a labelled group', () => {
    renderPicker({})
    const group = screen.getByRole('group', {
      name: ARTIST_PICKER_COPY.groupLabel,
    })
    expect(group).toBeInTheDocument()
    // ACC-06: the tile IS the checkbox, so two artists is two targets.
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]).toHaveAccessibleName(/Punk Act/)
  })

  it('reports selection through aria-checked, not colour alone', () => {
    renderPicker({ selected: new Set(['punk-act']) })
    const [first, second] = screen.getAllByRole('checkbox')
    expect(first).toHaveAttribute('aria-checked', 'true')
    expect(second).toHaveAttribute('aria-checked', 'false')
  })

  it('never marks a tile disabled — selection is free for everyone', () => {
    renderPicker({})
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toBeDisabled()
      expect(box).not.toHaveAttribute('aria-disabled')
    }
  })

  it('toggles by slug', () => {
    const props = renderPicker({})
    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    expect(props.onToggle).toHaveBeenCalledWith('punk-act')
  })

  it('falls back to the shared no-date string', () => {
    renderPicker({})
    expect(screen.getByText(FOLLOWING_COPY.cardNoDate)).toBeInTheDocument()
    expect(screen.getByText('Sep 12')).toBeInTheDocument()
  })

  it('renders skeletons instead of tiles while loading', () => {
    renderPicker({ loading: true })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(
      screen.getByRole('status', { name: ARTIST_PICKER_COPY.loading }),
    ).toBeInTheDocument()
  })

  it('explains an empty result rather than showing a bare grid', () => {
    renderPicker({ artists: [] })
    expect(screen.getByText(ARTIST_PICKER_COPY.emptyTitle)).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: ARTIST_PICKER_COPY.groupLabel }),
    ).not.toBeInTheDocument()
  })

  it('always offers the search escape, even when empty', () => {
    renderPicker({ artists: [] })
    const escape = screen.getByRole('link', {
      name: ARTIST_PICKER_COPY.searchEscape,
    })
    expect(escape).toHaveAttribute('href', '/search')
    // ACC-20: the escape is a full-size target, not a text link.
    expect(escape).toHaveStyle({ minHeight: '44px' })
  })
})
