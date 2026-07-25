// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SHELF_HINT_COOKIE } from '@/lib/shelf-hint'

let cookieValue: string | undefined
let authUserId: string | null = 'user_entitled'

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === SHELF_HINT_COOKIE && cookieValue !== undefined
          ? { name, value: cookieValue }
          : undefined,
    }),
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: authUserId }),
}))

import EventsLoading from './loading'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const renderLoading = async () => render(await EventsLoading())

const shelfTitle = SPOTIFY_COPY.discovery.title

describe('EventsLoading shelf reservation', () => {
  it('reserves the shelf footprint when the viewer is known to get one', async () => {
    // Without this the shelf paints with the page and shoves the filter bar
    // and the whole event list down — the shift this fallback exists to stop.
    cookieValue = 'user_entitled:1'
    authUserId = 'user_entitled'
    const { getByText } = await renderLoading()
    expect(getByText(shelfTitle)).toBeDefined()
  })

  it('reserves nothing for a viewer with no shelf', async () => {
    cookieValue = 'user_entitled:0'
    authUserId = 'user_entitled'
    const { queryByText } = await renderLoading()
    expect(queryByText(shelfTitle)).toBeNull()
  })

  it('reserves nothing when no hint has been recorded yet', async () => {
    // First-ever visit: no cookie. Under-reserving is the safe default —
    // a free user must never see a premium shelf's ghost.
    cookieValue = undefined
    authUserId = 'user_entitled'
    const { queryByText } = await renderLoading()
    expect(queryByText(shelfTitle)).toBeNull()
  })

  it('ignores a hint left behind by a different account', async () => {
    // Shared browser: an entitled user signs out, a free user signs in. The
    // stale `1` must not reserve a premium slot for the new session.
    cookieValue = 'user_entitled:1'
    authUserId = 'user_free'
    const { queryByText } = await renderLoading()
    expect(queryByText(shelfTitle)).toBeNull()
  })

  it('reserves nothing when there is no signed-in user', async () => {
    cookieValue = 'user_entitled:1'
    authUserId = null
    const { queryByText } = await renderLoading()
    expect(queryByText(shelfTitle)).toBeNull()
  })

  it('does not let the full-bleed skeleton row leak horizontal overflow', async () => {
    // The browse page's overflow regression (#33) came from this exact
    // -mx-4 card row; page.tsx clips it at <main> and the fallback must too.
    cookieValue = 'user_entitled:1'
    authUserId = 'user_entitled'
    const { container } = await renderLoading()
    const main = container.querySelector('main')
    expect(main?.className).toContain('overflow-x-clip')
  })
})
