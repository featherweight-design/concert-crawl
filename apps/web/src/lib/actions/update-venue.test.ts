import { beforeEach, describe, expect, it, vi } from 'vitest'

const patch = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ getToken: async () => 'token' }),
  currentUser: async () => null,
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, apiClient: { patch } }
})

const { ApiError } = await import('@/lib/api')
const { updateVenue } = await import('./venues')

beforeEach(() => {
  patch.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('updateVenue on a refused save (#1344)', () => {
  it("returns a hand-rolled 400's message and field instead of throwing", async () => {
    patch.mockRejectedValue(
      new ApiError(
        400,
        'crawlWaitForSelector is required for browser-mode venues',
        undefined,
        undefined,
        undefined,
        'crawlWaitForSelector',
      ),
    )

    await expect(updateVenue('v1', new FormData())).resolves.toEqual({
      success: false,
      error: 'crawlWaitForSelector is required for browser-mode venues',
      field: 'crawlWaitForSelector',
    })
  })

  it("takes the field from a Zod issue's path", async () => {
    patch.mockRejectedValue(
      new ApiError(400, 'Invalid url', undefined, [
        { path: ['priceUrl'], message: 'Invalid url' },
      ]),
    )

    await expect(updateVenue('v1', new FormData())).resolves.toEqual({
      success: false,
      error: 'Invalid url',
      field: 'priceUrl',
    })
  })

  it('still throws a non-400 failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    patch.mockRejectedValue(new ApiError(500, 'boom'))
    await expect(updateVenue('v1', new FormData())).rejects.toThrow('boom')
  })
})
