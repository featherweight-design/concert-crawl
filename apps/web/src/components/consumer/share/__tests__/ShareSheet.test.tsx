// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'jade' }),
}))

import { ShareSheet } from '../ShareSheet'
import type { ShareCapabilities } from '@/lib/share/destinations'
import type { PosterEvent } from '@/lib/share/poster-event'

afterEach(cleanup)

const EVENT_ID = '11111111-2222-4333-8444-555555555555'

const poster: PosterEvent = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  venue: 'Bluebird Theater',
  city: 'Denver',
  dateShort: 'FRI, MAR 14',
  showTime: '8:00 PM',
  state: 'going',
  dropLabel: null,
}

const mount = (props: Partial<React.ComponentProps<typeof ShareSheet>> = {}) =>
  render(
    <ShareSheet
      open
      onClose={props.onClose ?? (() => {})}
      event={poster}
      handle={props.handle ?? null}
      capabilities={props.capabilities ?? {}}
    />,
  )

describe('<ShareSheet />', () => {
  it('is a labelled modal dialog', () => {
    mount()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    mount({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('previews the poster with descriptive alt text', () => {
    mount()
    const preview = screen.getByRole('img')
    expect(preview.getAttribute('src')).toBe(
      `/share/${EVENT_ID}/story?theme=jade`,
    )
    expect(preview.getAttribute('alt')).toContain('Snakebite Revival')
    expect(preview.getAttribute('alt')).toContain('Bluebird Theater')
  })

  it('repoints the preview and the download when the shape changes', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Square' }))
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      `/share/${EVENT_ID}/square?theme=jade`,
    )
    expect(
      screen.getByRole('link', { name: 'Save image' }).getAttribute('href'),
    ).toBe(`/share/${EVENT_ID}/square?theme=jade`)
  })

  // The route defaults the theme when the query omits it, so a sheet that
  // forgets to send it renders every user's card in the same tint while every
  // other assertion here still passes.
  it('renders the poster in the theme the app is currently wearing', () => {
    mount()
    expect(screen.getByRole('img').getAttribute('src')).toContain('theme=jade')
  })

  it('signs the poster when the sharer has a handle', () => {
    mount({ handle: '@hugh' })
    expect(screen.getByRole('img').getAttribute('src')).toContain('by=%40hugh')
  })

  it('offers a downloadable file name', () => {
    mount()
    expect(
      screen.getByRole('link', { name: 'Save image' }).getAttribute('download'),
    ).toBe('snakebite-revival-bluebird-theater.png')
  })

  it('hides the system share tile where the platform has no share API', () => {
    mount()
    expect(screen.queryByRole('button', { name: 'Share…' })).toBeNull()
  })

  it('offers the system share tile where the platform supports it', async () => {
    const share = vi.fn(async (): Promise<void> => undefined)
    const capabilities: ShareCapabilities = { share }
    mount({ capabilities })
    fireEvent.click(screen.getByRole('button', { name: 'Share…' }))
    await waitFor(() => expect(share).toHaveBeenCalled())
  })

  it('confirms a copied link politely', async () => {
    const writeText = vi.fn(async (): Promise<void> => undefined)
    mount({ capabilities: { clipboard: { writeText } } })
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    const live = await screen.findByText('Link copied')
    expect(live.getAttribute('aria-live')).toBe('polite')
  })

  it('says so when there is no clipboard rather than failing silently', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(await screen.findByText(/Couldn't share/)).toBeTruthy()
  })

  it('copies the public mirror, not the protected page', async () => {
    const writeText = vi.fn(async (): Promise<void> => undefined)
    mount({ capabilities: { clipboard: { writeText } } })
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/e/${EVENT_ID}`,
      ),
    )
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <ShareSheet
        open={false}
        onClose={() => {}}
        event={poster}
        handle={null}
        capabilities={{}}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
