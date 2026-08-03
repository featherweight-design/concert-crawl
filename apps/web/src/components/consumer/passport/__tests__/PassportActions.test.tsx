// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { PassportActions } from '../PassportActions'

const track = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({ track }))

const COPY = CONSUMER_COPY.passport

const pngResponse = () =>
  Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) })

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => pngResponse()),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  track.mockClear()
})

describe('PassportActions', () => {
  it('shares the PNG itself rather than a URL the reader could not open', async () => {
    const shared: ShareData[] = []
    const share = (data: ShareData) => {
      shared.push(data)
      return Promise.resolve()
    }
    render(
      <PassportActions
        imageUrl="/passport/square"
        capabilities={{ share, canShare: () => true }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: COPY.shareLabel }))

    await waitFor(() => expect(shared).toHaveLength(1))
    expect(shared[0]?.files).toHaveLength(1)
    // The bytes go out, not a link: the only URL this card has sits behind the
    // owner's session, so a recipient could not open it.
    expect(shared[0]).not.toHaveProperty('url')
    expect(track).toHaveBeenCalledWith('passport_shared', {
      destination: 'system',
    })
  })

  // Dismissing the OS sheet rejects with AbortError. That is a cancel, and
  // telling the user to save instead would be answering a question they
  // deliberately backed out of.
  it('stays silent when the user dismisses the OS sheet', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    render(
      <PassportActions
        imageUrl="/passport/square"
        capabilities={{
          share: () => Promise.reject(abort),
          canShare: () => true,
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: COPY.shareLabel }))

    await waitFor(() => expect(track).not.toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('points at saving the image when the PNG fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <PassportActions
        imageUrl="/passport/square"
        capabilities={{
          share: () => Promise.resolve(),
          canShare: () => true,
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: COPY.shareLabel }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      COPY.shareFailed,
    )
  })

  // Every desktop browser lands here, so the save link cannot depend on the
  // OS sheet existing — without it those users have no way to keep the card.
  it('still offers the download on a browser with no share sheet', () => {
    render(<PassportActions imageUrl="/passport/square" capabilities={{}} />)

    expect(
      screen.queryByRole('button', { name: COPY.shareLabel }),
    ).not.toBeInTheDocument()
    const save = screen.getByRole('link', { name: COPY.saveLabel })
    expect(save).toHaveAttribute('href', '/passport/square')
    expect(save).toHaveAttribute('download', COPY.downloadName)
  })

  it('records a save as its own destination', async () => {
    render(<PassportActions imageUrl="/passport/square" capabilities={{}} />)

    fireEvent.click(screen.getByRole('link', { name: COPY.saveLabel }))

    expect(track).toHaveBeenCalledWith('passport_shared', {
      destination: 'save-image',
    })
  })
})
