import { describe, expect, it, vi, beforeEach } from 'vitest'

// An expired Clerk session makes the internal getToken() throw. If that call
// sits outside the try/catch, the throw escapes the Server Action and Next
// replaces the whole admin page with its error screen — taking the draft the
// admin was mid-way through typing with it. These assert it stays caught.

const clerkGetToken = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: clerkGetToken }),
  currentUser: () => Promise.resolve(null),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

const { saveVenueGuide, publishVenueGuide, unpublishVenueGuide } =
  await import('./venues')

beforeEach(() => {
  clerkGetToken.mockReset().mockResolvedValue(null)
})

describe('venue guide actions — auth failure (#764)', () => {
  it('saveVenueGuide returns a failure result instead of throwing', async () => {
    await expect(
      saveVenueGuide('venue-1', { insiderTip: null, chips: [] }),
    ).resolves.toMatchObject({ success: false })
  })

  it('publishVenueGuide returns a failure result instead of throwing', async () => {
    await expect(publishVenueGuide('venue-1')).resolves.toMatchObject({
      success: false,
    })
  })

  it('unpublishVenueGuide returns a failure result instead of throwing', async () => {
    await expect(unpublishVenueGuide('venue-1')).resolves.toMatchObject({
      success: false,
    })
  })
})
