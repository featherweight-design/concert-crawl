import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestLandingRevalidationSafely } from '../revalidate.js'

const SECRET = 'a'.repeat(64)

describe('requestLandingRevalidationSafely', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env['REVALIDATE_SECRET'] = SECRET
    process.env['ADMIN_URL'] = 'https://concertcrawl.app'
  })

  afterEach(() => {
    delete process.env['REVALIDATE_SECRET']
    delete process.env['ADMIN_URL']
  })

  it('posts the landing path with the shared secret when events were inserted', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await requestLandingRevalidationSafely(3)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://concertcrawl.app/api/revalidate')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ path: '/' }))
    expect(
      init?.headers && 'x-revalidate-token' in init.headers
        ? init.headers['x-revalidate-token']
        : null,
    ).toBe(SECRET)
  })

  it('does nothing when no events were inserted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await requestLandingRevalidationSafely(0)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does nothing when REVALIDATE_SECRET is unset', async () => {
    delete process.env['REVALIDATE_SECRET']
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await requestLandingRevalidationSafely(3)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('swallows a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    )

    await expect(requestLandingRevalidationSafely(3)).resolves.toBeUndefined()
  })

  it('swallows a thrown fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(requestLandingRevalidationSafely(3)).resolves.toBeUndefined()
  })
})
