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

// jsdom implements neither half of the object-URL API, and the prefetch hands
// the save link one. Captured so the stubs can be put back — Vitest shares a
// worker across files, so an unrestored global outlives this suite.
const objectUrlApi = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => pngResponse()),
  )
  URL.createObjectURL = vi.fn(() => 'blob:passport')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  URL.createObjectURL = objectUrlApi.create
  URL.revokeObjectURL = objectUrlApi.revoke
  track.mockClear()
  // The console spies below would otherwise outlive their own test and
  // swallow warnings in every later case — the config sets no restoreMocks.
  vi.restoreAllMocks()
})

/** Resolves once the prefetch has landed and the share button is live. */
const readyShareButton = async () => {
  const button = await screen.findByRole('button', { name: COPY.shareLabel })
  await waitFor(() => expect(button).toBeEnabled())
  return button
}

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

    fireEvent.click(await readyShareButton())

    await waitFor(() => expect(shared).toHaveLength(1))
    expect(shared[0]?.files).toHaveLength(1)
    // The bytes go out, not a link: the only URL this card has sits behind the
    // owner's session, so a recipient could not open it.
    expect(shared[0]).not.toHaveProperty('url')
    expect(track).toHaveBeenCalledWith('passport_shared', {
      destination: 'system',
    })
  })

  // The regression behind "sharing worked once, then wouldn't again": awaiting
  // the multi-second card render inside the click handler spends the gesture's
  // transient user activation, so the second `share()` raises NotAllowedError.
  // The image has to already be in hand when the button is pressed.
  it('fetches the card before the click, not during it', async () => {
    render(
      <PassportActions
        imageUrl="/passport/square"
        capabilities={{ share: () => Promise.resolve(), canShare: () => true }}
      />,
    )

    await readyShareButton()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/passport/square')
  })

  // Until the bytes land the button cannot do anything, and one that looks
  // ready and then sits silent is exactly what reads as broken.
  it('holds the share button in a preparing state until the card is ready', async () => {
    render(
      <PassportActions
        imageUrl="/passport/square"
        capabilities={{ share: () => Promise.resolve(), canShare: () => true }}
      />,
    )

    const preparing = screen.getByRole('button', {
      name: COPY.preparingLabel,
    })
    expect(preparing).toBeDisabled()
    expect(preparing).toHaveAttribute('aria-busy', 'true')

    await readyShareButton()
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

    fireEvent.click(await readyShareButton())

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

    expect(await screen.findByRole('status')).toHaveTextContent(
      COPY.shareFailed,
    )
    // The save link still resolves to the route, so the page is slow rather
    // than dead.
    expect(screen.getByRole('link', { name: COPY.saveLabel })).toHaveAttribute(
      'href',
      '/passport/square',
    )
  })

  // Every desktop browser lands here, so the save link cannot depend on the
  // OS sheet existing — without it those users have no way to keep the card.
  it('still offers the download on a browser with no share sheet', async () => {
    render(<PassportActions imageUrl="/passport/square" capabilities={{}} />)

    expect(
      screen.queryByRole('button', { name: COPY.shareLabel }),
    ).not.toBeInTheDocument()
    const save = screen.getByRole('link', { name: COPY.saveLabel })
    expect(save).toHaveAttribute('download', COPY.downloadName)
    // Once the prefetch lands the download is local bytes, not a second render
    // of a card the browser already has.
    await waitFor(() => expect(save).toHaveAttribute('href', 'blob:passport'))
  })

  // Desktop Safari has `navigator.share` but rejects files. Offering the
  // button there promises something this card cannot do — it has no URL to
  // fall back to — so the only honest outcome would be an apology.
  it('hides the share button on a sheet that takes text but not files', () => {
    render(
      <PassportActions
        imageUrl="/passport/square"
        capabilities={{
          share: () => Promise.resolve(),
          canShare: () => false,
        }}
      />,
    )

    expect(
      screen.queryByRole('button', { name: COPY.shareLabel }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: COPY.saveLabel })).toBeVisible()
  })

  it('records a save as its own destination', () => {
    render(<PassportActions imageUrl="/passport/square" capabilities={{}} />)

    fireEvent.click(screen.getByRole('link', { name: COPY.saveLabel }))

    expect(track).toHaveBeenCalledWith('passport_shared', {
      destination: 'save-image',
    })
  })
})
