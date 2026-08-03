import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}))

const SECRET = 'a'.repeat(64)

const makeRequest = (
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest =>
  new NextRequest('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const importRoute = async () => {
  const mod = await import('../route')
  return mod.POST
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.resetModules()
    revalidatePathMock.mockClear()
    process.env['REVALIDATE_SECRET'] = SECRET
  })

  afterEach(() => {
    delete process.env['REVALIDATE_SECRET']
  })

  it('revalidates an allowlisted path and returns 204', async () => {
    const POST = await importRoute()
    const response = await POST(
      makeRequest({ path: '/' }, { 'x-revalidate-token': SECRET }),
    )

    expect(response.status).toBe(204)
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
  })

  it('returns 401 when no token is supplied', async () => {
    const POST = await importRoute()
    const response = await POST(makeRequest({ path: '/' }))

    expect(response.status).toBe(401)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('returns 401 for a wrong token of the same length', async () => {
    const POST = await importRoute()
    const response = await POST(
      makeRequest({ path: '/' }, { 'x-revalidate-token': 'b'.repeat(64) }),
    )

    expect(response.status).toBe(401)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('returns 401 for a wrong token of a different length', async () => {
    const POST = await importRoute()
    const response = await POST(
      makeRequest({ path: '/' }, { 'x-revalidate-token': 'b' }),
    )

    expect(response.status).toBe(401)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('fails closed with 401 when REVALIDATE_SECRET is unset', async () => {
    delete process.env['REVALIDATE_SECRET']
    const POST = await importRoute()
    const response = await POST(
      makeRequest({ path: '/' }, { 'x-revalidate-token': SECRET }),
    )

    expect(response.status).toBe(401)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('rejects a path outside the allowlist with 400', async () => {
    const POST = await importRoute()
    const response = await POST(
      makeRequest({ path: '/events' }, { 'x-revalidate-token': SECRET }),
    )

    expect(response.status).toBe(400)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed body with 400', async () => {
    const POST = await importRoute()
    const response = await POST(
      makeRequest({ notAPath: true }, { 'x-revalidate-token': SECRET }),
    )

    expect(response.status).toBe(400)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
