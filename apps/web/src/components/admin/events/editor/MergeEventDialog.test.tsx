// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from '@testing-library/react'

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

import { MergeEventDialog } from './MergeEventDialog'

beforeEach(() => {
  mockApiGet.mockReset()
  mockApiPost.mockReset()
  mockGetToken.mockReset()
  mockGetToken.mockResolvedValue('test-token')
  cleanup()
})

describe('MergeEventDialog', () => {
  it('searches /v1/admin/events with query after typing', async () => {
    mockApiGet.mockResolvedValue([])
    render(
      <MergeEventDialog
        sourceId="evt-source"
        sourceTitle="Source Show"
        onCancel={() => {}}
        onMerged={() => {}}
      />,
    )
    const input = screen.getByLabelText('Search by title, artist, or venue')
    fireEvent.change(input, { target: { value: 'Spoon' } })
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled()
    })
    const [url] = mockApiGet.mock.calls[0] ?? []
    expect(url).toBe('/v1/admin/events?query=Spoon&limit=10&offset=0')
  })

  it('shows search results and lets the admin pick a target', async () => {
    mockApiGet.mockResolvedValue([
      {
        id: 'evt-target',
        title: 'Target Show',
        artist: 'Target Artist',
        date: '2026-09-02',
        venueName: 'Mission Ballroom',
      },
    ])
    render(
      <MergeEventDialog
        sourceId="evt-source"
        sourceTitle="Source Show"
        onCancel={() => {}}
        onMerged={() => {}}
      />,
    )
    const input = screen.getByLabelText('Search by title, artist, or venue')
    fireEvent.change(input, { target: { value: 'Target' } })
    await waitFor(() => {
      expect(screen.getByText('Target Show')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Target Show'))
    // After picking, the preview shows the merge heading.
    expect(screen.getByText('Merge "Source Show" → "Target Show"')).toBeTruthy()
  })

  it('disables the row that matches the source event', async () => {
    mockApiGet.mockResolvedValue([
      {
        id: 'evt-source',
        title: 'Source Show',
        artist: null,
        date: '2026-09-01',
        venueName: 'Venue',
      },
      {
        id: 'evt-other',
        title: 'Other Show',
        artist: null,
        date: '2026-09-02',
        venueName: 'Venue',
      },
    ])
    render(
      <MergeEventDialog
        sourceId="evt-source"
        sourceTitle="Source Show"
        onCancel={() => {}}
        onMerged={() => {}}
      />,
    )
    const input = screen.getByLabelText('Search by title, artist, or venue')
    fireEvent.change(input, { target: { value: 'Show' } })
    await waitFor(() => {
      expect(screen.getByText('Source Show')).toBeTruthy()
    })
    expect(
      screen.getByText("That's this event — pick a different one."),
    ).toBeTruthy()
    // The source's row is the disabled one.
    const sourceBtn = screen.getByText('Source Show').closest('button')
    expect((sourceBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('POSTs to /merge with the picked targetId on Merge', async () => {
    mockApiGet.mockResolvedValue([
      {
        id: 'evt-target',
        title: 'Target Show',
        artist: null,
        date: '2026-09-02',
        venueName: 'Venue',
      },
    ])
    mockApiPost.mockResolvedValue({
      mergedInto: 'evt-target',
      referencesMoved: {
        userEventsMoved: 1,
        userEventsDropped: 0,
        reportsMoved: 0,
        submissionsMoved: 0,
        priceLogsMoved: 0,
      },
    })
    const onMerged = vi.fn()
    render(
      <MergeEventDialog
        sourceId="evt-source"
        sourceTitle="Source"
        onCancel={() => {}}
        onMerged={onMerged}
      />,
    )
    const input = screen.getByLabelText('Search by title, artist, or venue')
    fireEvent.change(input, { target: { value: 'Target' } })
    await waitFor(() => {
      expect(screen.getByText('Target Show')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Target Show'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByText('Merge'))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/v1/admin/events/evt-source/merge',
        'test-token',
        { targetId: 'evt-target' },
      )
    })
    await waitFor(() => {
      expect(onMerged).toHaveBeenCalledWith('evt-target')
    })
  })

  it('Pick another returns to the search list', async () => {
    mockApiGet.mockResolvedValue([
      {
        id: 'evt-target',
        title: 'Target Show',
        artist: null,
        date: '2026-09-02',
        venueName: 'Venue',
      },
    ])
    render(
      <MergeEventDialog
        sourceId="evt-source"
        sourceTitle="Source"
        onCancel={() => {}}
        onMerged={() => {}}
      />,
    )
    const input = screen.getByLabelText('Search by title, artist, or venue')
    fireEvent.change(input, { target: { value: 'Target' } })
    await waitFor(() => {
      expect(screen.getByText('Target Show')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Target Show'))
    expect(
      screen.queryByLabelText('Search by title, artist, or venue'),
    ).toBeNull()
    fireEvent.click(screen.getByText('Pick another'))
    expect(
      screen.getByLabelText('Search by title, artist, or venue'),
    ).toBeTruthy()
  })
})
