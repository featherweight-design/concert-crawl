// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArtistPicker } from './ArtistPicker'
import { ARTIST_PICKER_COPY } from './definitions/copy'
import {
  SEARCH_FIELD_BOX,
  SEARCH_FIELD_FONT_SIZE,
} from '@/components/consumer/search/definitions/constants'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import type { PickArtist } from './definitions/types'

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
    searching: false,
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    onSearchOpen: vi.fn(),
    onSearchClose: vi.fn(),
    searchResults: [] as PickArtist[],
    searchState: 'rest' as const,
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

  // A failed read also hands back zero artists. Saying "nobody booked in that
  // lane" then blames the listings for an outage of our own.
  it('tells a failed read apart from a genuinely empty one', () => {
    renderPicker({ artists: [], errored: true })
    expect(screen.getByRole('alert')).toHaveTextContent(
      ARTIST_PICKER_COPY.errorTitle,
    )
    expect(
      screen.queryByText(ARTIST_PICKER_COPY.emptyTitle),
    ).not.toBeInTheDocument()
  })

  it('always offers the search escape, even when empty', () => {
    const props = renderPicker({ artists: [] })
    // A button, never a link: it opens a mode on this step. As a link to
    // /search it walked the visitor out of a committing flow holding an
    // uncommitted selection.
    const escape = screen.getByRole('button', {
      name: ARTIST_PICKER_COPY.searchEscape,
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(escape)
    expect(props.onSearchOpen).toHaveBeenCalled()
    // ACC-20: a full-size target, not a text link.
    expect(escape).toHaveStyle({ height: '44px' })
  })

  it('offers a retry and nothing else when the suggestions fail', () => {
    const onRetry = vi.fn()
    renderPicker({ artists: [], errored: true, onRetry })

    fireEvent.click(
      screen.getByRole('button', { name: ARTIST_PICKER_COPY.errorRetry }),
    )
    expect(onRetry).toHaveBeenCalled()
    // The step is skippable from the rail above and the commit below already
    // reads "Continue without following" at zero picks, so a third way out
    // stated here is noise in the one state that needs one clear action.
    expect(
      screen.queryByRole('button', { name: ARTIST_PICKER_COPY.searchBack }),
    ).not.toBeInTheDocument()
  })
})

// A pick made in search has no tile in the suggestions, so closing the field
// returned the visitor to a grid that said nothing about the artist they had
// just chosen. The rail counted it and the grid did not, which reads as the
// pick having been dropped.
describe('ArtistPicker — a pick made in search keeps a tile', () => {
  const GRIZ: PickArtist = {
    slug: 'griz',
    name: 'GRiZ',
    photoUrl: null,
    dateLabel: null,
  }

  // The picker learns an artist from whatever list it has drawn, so the pick
  // has to be MADE in search rather than asserted into the selection: a slug
  // the component has never seen has no name or art to draw a tile with.
  function pickInSearchThenClose(
    overrides: Partial<Parameters<typeof ArtistPicker>[0]> = {},
  ) {
    const props = {
      artists: ARTISTS,
      selected: new Set<string>(),
      onToggle: vi.fn(),
      loading: false,
      columns: 2,
      searching: true,
      searchQuery: 'griz',
      onSearchQueryChange: vi.fn(),
      onSearchOpen: vi.fn(),
      onSearchClose: vi.fn(),
      searchResults: [GRIZ],
      searchState: 'results' as const,
      ...overrides,
    }
    const { rerender } = render(<ArtistPicker {...props} />)
    const closed = (selected: ReadonlySet<string>, extra = {}) =>
      rerender(
        <ArtistPicker
          {...props}
          selected={selected}
          searching={false}
          searchQuery=""
          searchResults={[]}
          searchState="rest"
          {...extra}
        />,
      )
    closed(new Set(['griz']))
    return { ...props, closed }
  }

  it('draws the searched-for artist after the field closes', () => {
    pickInSearchThenClose()
    const box = screen.getByRole('checkbox', { name: /GRiZ/ })
    expect(box).toHaveAttribute('aria-checked', 'true')
  })

  it('appends it rather than dropping it into the ranking', () => {
    pickInSearchThenClose()
    const names = screen
      .getAllByRole('checkbox')
      .map((box) => box.getAttribute('aria-label') ?? box.textContent ?? '')
    expect(names).toHaveLength(3)
    expect(names[2]).toMatch(/GRiZ/)
  })

  it('still toggles from the appended tile', () => {
    const props = pickInSearchThenClose()
    fireEvent.click(screen.getByRole('checkbox', { name: /GRiZ/ }))
    expect(props.onToggle).toHaveBeenCalledWith('griz')
  })

  // The lane with nothing booked in it is where search matters most, so the
  // notice and the pick are siblings rather than alternatives.
  it('shows the pick beside the empty notice, not instead of it', () => {
    pickInSearchThenClose({ artists: [] })
    expect(screen.getByText(ARTIST_PICKER_COPY.emptyTitle)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /GRiZ/ })).toBeInTheDocument()
  })

  // Keyed on the live selection the appended tile is a readout, not a tile:
  // it vanishes the moment it is unticked, reflowing the grid and leaving no
  // way back to that artist short of retyping the query.
  it('keeps the tile once unticked, unchecked, the way a suggestion behaves', () => {
    const { closed } = pickInSearchThenClose()
    closed(new Set())
    const tile = screen.getByRole('checkbox', { name: /GRiZ/ })
    expect(tile).toHaveAttribute('aria-checked', 'false')
  })

  // The retry runs FROM the failed state, so skeletons-only here takes the
  // appended tiles away on the way out of the state that needed them most.
  it('keeps drawing it while a refetch is in flight', () => {
    const { closed } = pickInSearchThenClose({ artists: [], errored: true })
    closed(new Set(['griz']), { loading: true, errored: false })
    expect(screen.getByRole('checkbox', { name: /GRiZ/ })).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: ARTIST_PICKER_COPY.loading }),
    ).toBeInTheDocument()
  })

  it('shows the pick beside a failed read too', () => {
    pickInSearchThenClose({ artists: [], errored: true })
    expect(screen.getByRole('alert')).toHaveTextContent(
      ARTIST_PICKER_COPY.errorTitle,
    )
    expect(screen.getByRole('checkbox', { name: /GRiZ/ })).toBeInTheDocument()
  })
})

describe('ArtistPicker — where the trigger sits', () => {
  it('draws it under the grid on the phone', () => {
    renderPicker({ columns: 2 })
    const trigger = screen.getByRole('button', {
      name: ARTIST_PICKER_COPY.searchEscape,
    })
    const grid = screen.getByRole('group', {
      name: ARTIST_PICKER_COPY.groupLabel,
    })
    // compareDocumentPosition rather than a class or an index: what the
    // ruling is about is which one the reader meets first.
    expect(
      grid.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('lifts it above a five-column grid, where a full-width strip would read as an empty row', () => {
    renderPicker({ columns: 5, triggerAbove: true })
    const trigger = screen.getByRole('button', {
      name: ARTIST_PICKER_COPY.searchEscape,
    })
    const grid = screen.getByRole('group', {
      name: ARTIST_PICKER_COPY.groupLabel,
    })
    expect(
      grid.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy()
    // One control, not two: the desktop tree must not draw both placements.
    expect(
      screen.getAllByRole('button', {
        name: ARTIST_PICKER_COPY.searchEscape,
      }),
    ).toHaveLength(1)
  })
})

describe('ArtistPicker — search mode', () => {
  // One pick already made on the grid, so the strip has something to keep.
  const searchProps = {
    searching: true,
    searchQuery: '',
    selected: new Set(['punk-act']),
  }

  it('replaces the grid with the field and keeps the trigger out of the way', () => {
    renderPicker(searchProps)

    expect(
      screen.getByRole('textbox', {
        name: ARTIST_PICKER_COPY.searchFieldLabel,
      }),
    ).toBeInTheDocument()
    // The suggestion tiles are gone, so no stale checkbox can take a tap.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: ARTIST_PICKER_COPY.searchEscape }),
    ).not.toBeInTheDocument()
  })

  it('keeps the picks visible while the grid is off screen', () => {
    renderPicker(searchProps)
    // The whole reason this strip exists: the selection survives in
    // sessionStorage and nothing on screen used to say so, which made leaving
    // the grid look exactly like losing what you picked.
    expect(screen.getByText(ARTIST_PICKER_COPY.pickedCount(1))).toBeVisible()
  })

  it('counts the selection, not the faces it happens to have art for', () => {
    // A pick made in search has no card in this tree after a remount — the
    // upgrade round trip — so counting resolvable faces would report the
    // selection as smaller than it is, in the one component whose job is to
    // promise nothing was lost.
    renderPicker({
      ...searchProps,
      selected: new Set(['punk-act', 'stranger-from-search']),
    })
    expect(screen.getByText(ARTIST_PICKER_COPY.pickedCount(2))).toBeVisible()
  })

  it('prompts rather than apologising before anything is typed', () => {
    renderPicker(searchProps)
    expect(screen.getByText(ARTIST_PICKER_COPY.searchRestTitle)).toBeVisible()
    // Not an empty state: nothing has failed and nothing is missing.
    expect(
      screen.queryByText(ARTIST_PICKER_COPY.searchNoneTitle),
    ).not.toBeInTheDocument()
  })

  it('renders a result row as a checkbox, never a follow button', () => {
    // /search's own artist row writes on tap. Rendering it here would put two
    // commit models over one selection, which is the defect this mode exists
    // to prevent — so a result speaks the grid's language.
    renderPicker({
      ...searchProps,
      searchQuery: 'jazz',
      searchState: 'results',
      searchResults: [ARTISTS[1]!],
    })
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(1)
    expect(boxes[0]).toHaveAccessibleName(/Jazz Act/)
    expect(
      screen.queryByRole('button', { name: /^follow/i }),
    ).not.toBeInTheDocument()
  })

  it('keeps the head block out of the way while the field has its slot', () => {
    // The field REPLACES the head rather than following it: the contract is
    // that nothing below the slot moves when the mode flips.
    const head = <p>eyebrow and heading</p>
    const { rerender } = render(
      <ArtistPicker
        {...{
          artists: ARTISTS,
          selected: new Set<string>(),
          onToggle: vi.fn(),
          loading: false,
          columns: 2,
          searchQuery: '',
          onSearchQueryChange: vi.fn(),
          onSearchOpen: vi.fn(),
          onSearchClose: vi.fn(),
          searchResults: [],
          searchState: 'rest' as const,
          head,
        }}
        searching={false}
      />,
    )
    expect(screen.getByText('eyebrow and heading')).toBeVisible()

    rerender(
      <ArtistPicker
        {...{
          artists: ARTISTS,
          selected: new Set<string>(),
          onToggle: vi.fn(),
          loading: false,
          columns: 2,
          searchQuery: '',
          onSearchQueryChange: vi.fn(),
          onSearchOpen: vi.fn(),
          onSearchClose: vi.fn(),
          searchResults: [],
          searchState: 'rest' as const,
          head,
        }}
        searching
      />,
    )
    expect(screen.queryByText('eyebrow and heading')).not.toBeInTheDocument()
  })

  it('says the matches are already followed, rather than that nobody matched', () => {
    // The endpoint slices to three rows BEFORE the hook drops the followed
    // ones, so a query whose closest matches are all followed would otherwise
    // read as "Nobody by that name" — untrue about an artist the visitor
    // follows, and the one state where that lie is easy to tell.
    renderPicker({
      ...searchProps,
      searchQuery: 'jazz',
      searchState: 'allFollowed',
      searchResults: [],
    })
    // Twice on purpose — once drawn, once announced — so this names the
    // drawn one rather than matching whichever came first.
    const drawnTitle = screen
      .getAllByText(ARTIST_PICKER_COPY.searchAllFollowedTitle)
      .find((element) => element.closest('[role="status"]') === null)
    expect(drawnTitle).toBeVisible()
    expect(
      screen.queryByText(ARTIST_PICKER_COPY.searchNoneTitle),
    ).not.toBeInTheDocument()
    // Still offers the way back, as the no-match state does. Named
    // distinctly from the field's own X, which does the same thing.
    expect(
      screen.getByRole('button', { name: ARTIST_PICKER_COPY.searchBack }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: ARTIST_PICKER_COPY.searchCloseLabel,
      }),
    ).toBeVisible()
  })

  // A list that empties in silence tells a screen-reader user nothing about
  // why. The visible Notice is not live, so the status region has to carry it.
  it.each([
    ['none', ARTIST_PICKER_COPY.searchNoneTitle],
    ['allFollowed', ARTIST_PICKER_COPY.searchAllFollowedTitle],
  ] as const)(
    'announces the %s state, not a stale "searching"',
    (state, announced) => {
      renderPicker({
        ...searchProps,
        searchQuery: 'jazz',
        searchState: state,
        searchResults: [],
      })
      expect(screen.getByRole('status')).toHaveTextContent(announced)
      expect(screen.getByRole('status')).not.toHaveTextContent(
        ARTIST_PICKER_COPY.searchOpened,
      )
    },
  )

  it('closes the mode from the field, without clearing it first', () => {
    const props = renderPicker(searchProps)
    fireEvent.click(
      screen.getByRole('button', {
        name: ARTIST_PICKER_COPY.searchCloseLabel,
      }),
    )
    expect(props.onSearchClose).toHaveBeenCalled()
    expect(props.onSearchQueryChange).not.toHaveBeenCalled()
  })

  it('closes on Escape from the field', () => {
    const props = renderPicker(searchProps)
    fireEvent.keyDown(
      screen.getByRole('textbox', {
        name: ARTIST_PICKER_COPY.searchFieldLabel,
      }),
      { key: 'Escape' },
    )
    expect(props.onSearchClose).toHaveBeenCalled()
  })

  it('sizes the field at 16px, so iOS Safari does not zoom the step', () => {
    renderPicker(searchProps)
    // Below 16 the whole card zooms on focus, which on a fixed-height card
    // pushes the commit rail off screen — the one control the step is for.
    expect(
      screen.getByRole('textbox', {
        name: ARTIST_PICKER_COPY.searchFieldLabel,
      }),
    ).toHaveStyle({ fontSize: `${SEARCH_FIELD_FONT_SIZE}px` })
  })

  // The brief asks for "the same object as the one on /search". Read off the
  // shared constant rather than a literal, so a change to the search bar's box
  // moves this field with it rather than drifting from it silently.
  it('wears the search surface own field box', () => {
    renderPicker(searchProps)
    const field = screen.getByRole('textbox', {
      name: ARTIST_PICKER_COPY.searchFieldLabel,
    }).parentElement
    expect(field).toHaveStyle({
      height: `${SEARCH_FIELD_BOX.height}px`,
      borderRadius: `${SEARCH_FIELD_BOX.borderRadius}px`,
      background: SEARCH_FIELD_BOX.background,
    })
  })
})
