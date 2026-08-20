import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock must be declared before the dynamic import of page.tsx.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

describe('/admin/prices', () => {
  beforeEach(() => {
    mockRedirect.mockClear()
  })

  it('repoints to the Review price-coverage tab', async () => {
    // The bare alias used to land on `/admin/review`, which defaults to the
    // Event flags tab — a typeable price URL dropping the admin on an
    // unrelated surface. Stored notification `actionUrl`s still carry
    // `/admin/prices` (packages/db/seed.ts), so this stays a redirect rather
    // than being deleted.
    const { default: PricesRedirectPage } = await import('./page')
    expect(() => PricesRedirectPage()).toThrow(/NEXT_REDIRECT/)
    expect(mockRedirect).toHaveBeenCalledWith('/admin/review?tab=prices')
  })
})
