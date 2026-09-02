// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  act,
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import AdminArtistsPage from './page'

const mockGetToken = vi.fn<() => Promise<string | null>>()

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

// The picker fetches Spotify candidates on mount. None of these tests open it,
// and stubbing it keeps a failure here from reading as a failure in the page.
vi.mock('@/components/admin/artists/CandidatePicker', () => ({
  CandidatePicker: () => null,
}))

interface ListRow {
  id: string
  name: string
  canonicalName: string
  slug: string
  spotifyArtistId: string | null
  matchStatus: string
  photoUrl: string | null
  matchCheckedAt: string | null
  hidden: boolean
  isExhausted: boolean
}

const row = (overrides: Partial<ListRow> = {}): ListRow => ({
  id: 'artist-1',
  name: 'Bingo Night',
  canonicalName: 'bingo night',
  slug: 'bingo-night',
  spotifyArtistId: null,
  matchStatus: 'ambiguous',
  photoUrl: null,
  matchCheckedAt: null,
  hidden: false,
  isExhausted: false,
  ...overrides,
})

const COUNTS = {
  ambiguous: 3,
  unmatched: 0,
  no_match: 1,
  matched: 9,
  not_an_artist: 0,
  exhausted: 2,
}

const json = (body: unknown) => ({ ok: true, json: async () => body })

interface Harness {
  list: ListRow[]
  /** What the next PATCH answers with, minus `isExhausted`. */
  patched: Omit<ListRow, 'isExhausted'>
  /** Held to keep a PATCH in flight while something else lands. */
  patchGate: Promise<void> | null
}

// Declared through the factory so `fetchMock.mock.calls` carries fetch's own
// argument types, and `init` can be read without a cast.
const makeFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'PATCH') {
      if (harness.patchGate !== null) await harness.patchGate
      return json({ data: harness.patched })
    }
    if (url.includes('/counts')) return json({ data: COUNTS })
    return json({ data: harness.list, total: harness.list.length })
  })

let harness: Harness
let fetchMock: ReturnType<typeof makeFetchMock>

/** GETs only — the count the no-refetch assertions are actually about. */
const getCount = (): number =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === undefined).length

beforeEach(() => {
  mockGetToken.mockResolvedValue('token')
  harness = { list: [row()], patched: row(), patchGate: null }
  fetchMock = makeFetchMock()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const rowFor = (name: string): HTMLElement => {
  const cell = screen.getByText(name)
  const tableRow = cell.closest('tr')
  if (tableRow === null) throw new Error(`no row rendered for ${name}`)
  return tableRow
}

const renderLoaded = async () => {
  render(<AdminArtistsPage />)
  await waitFor(() => expect(screen.getByText('Bingo Night')).toBeDefined())
}

describe('AdminArtistsPage', () => {
  it('marks a row not an artist without refetching the page', async () => {
    harness.patched = row({ matchStatus: 'not_an_artist' })
    await renderLoaded()
    const getsAfterLoad = getCount()

    fireEvent.click(
      within(rowFor('Bingo Night')).getByRole('button', {
        name: 'Not an artist',
      }),
    )

    // The row leaves the ambiguous chip it no longer belongs to.
    await waitFor(() => expect(screen.queryByText('Bingo Night')).toBeNull())
    // The bug: `load()` set isLoading, blanking the table for the whole
    // round trip. No GET means no blanking.
    expect(getCount()).toBe(getsAfterLoad)
    expect(screen.queryByText('Loading artists…')).toBeNull()
  })

  it('moves both counts when a row changes bucket', async () => {
    harness.patched = row({ matchStatus: 'not_an_artist' })
    await renderLoaded()

    expect(screen.getByRole('button', { name: 'Ambiguous (3)' })).toBeDefined()

    fireEvent.click(
      within(rowFor('Bingo Night')).getByRole('button', {
        name: 'Not an artist',
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Ambiguous (2)' }),
      ).toBeDefined(),
    )
    expect(
      screen.getByRole('button', { name: 'Not an artist (1)' }),
    ).toBeDefined()
  })

  it('keeps a resolved row in place during a search', async () => {
    harness.list = [row(), row({ id: 'artist-2', name: 'Bingo Hall' })]
    harness.patched = row({ matchStatus: 'not_an_artist' })
    await renderLoaded()

    fireEvent.change(screen.getByLabelText('Search artists'), {
      target: { value: 'bingo' },
    })
    await waitFor(() =>
      expect(
        screen.getByText(
          'Searching every status and every date. Clear the box to filter by chip.',
        ),
      ).toBeDefined(),
    )
    const getsAfterSearch = getCount()

    fireEvent.click(
      within(rowFor('Bingo Night')).getByRole('button', {
        name: 'Not an artist',
      }),
    )

    // A search lists "everything named X", and an edited row still is one.
    await waitFor(() =>
      expect(
        within(rowFor('Bingo Night')).getByText('Not an artist'),
      ).toBeDefined(),
    )
    expect(screen.getByText('Bingo Night')).toBeDefined()
    expect(getCount()).toBe(getsAfterSearch)
  })

  it('flips the hidden badge in place without refetching', async () => {
    harness.patched = row({ hidden: true })
    await renderLoaded()
    const getsAfterLoad = getCount()

    expect(screen.queryByText('Hidden')).toBeNull()
    fireEvent.click(
      within(rowFor('Bingo Night')).getByRole('button', { name: 'Hide' }),
    )

    await waitFor(() =>
      expect(within(rowFor('Bingo Night')).getByText('Hidden')).toBeDefined(),
    )
    // Visibility is orthogonal to the match state, so the row stays on the
    // ambiguous chip and the counts do not move.
    expect(screen.getByRole('button', { name: 'Ambiguous (3)' })).toBeDefined()
    expect(getCount()).toBe(getsAfterLoad)
    expect(
      within(rowFor('Bingo Night')).getByRole('button', { name: 'Restore' }),
    ).toBeDefined()
  })

  it('keeps a given-up row given up when only its visibility changes', async () => {
    harness.list = [row({ isExhausted: true })]
    harness.patched = row({ hidden: true })
    await renderLoaded()

    fireEvent.click(screen.getByRole('button', { name: 'Given up (2)' }))
    await waitFor(() => expect(screen.getByText('Bingo Night')).toBeDefined())

    fireEvent.click(
      within(rowFor('Bingo Night')).getByRole('button', { name: 'Hide' }),
    )

    // The visibility PATCH never touches the attempt counter, so the row must
    // not fall out of the given-up bucket the admin is looking at.
    await waitFor(() =>
      expect(within(rowFor('Bingo Night')).getByText('Hidden')).toBeDefined(),
    )
    expect(screen.getByRole('button', { name: 'Given up (2)' })).toBeDefined()
  })

  it('drops a write whose list was replaced while it was in flight', async () => {
    harness.patched = row({ matchStatus: 'not_an_artist' })
    let release = () => {}
    harness.patchGate = new Promise<void>((resolve) => {
      release = () => resolve()
    })
    await renderLoaded()

    fireEvent.click(
      within(rowFor('Bingo Night')).getByRole('button', {
        name: 'Not an artist',
      }),
    )
    // The admin moves to another chip before the PATCH answers. That load
    // brings its own rows and its own counts, both read after the write.
    fireEvent.click(screen.getByRole('button', { name: 'Matched (9)' }))
    await waitFor(() => expect(getCount()).toBe(4))

    release()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Folding in on top of that would count the same transition twice.
    expect(screen.getByRole('button', { name: 'Ambiguous (3)' })).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Not an artist (0)' }),
    ).toBeDefined()
  })
})
