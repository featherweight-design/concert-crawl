import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock must be declared before the dynamic import of page.tsx.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

describe('/admin/prices/submissions', () => {
  beforeEach(() => {
    mockRedirect.mockClear()
  })

  it('retires to the Review submissions tab', async () => {
    // The submissions UI now lives inside Review as its own tab, so this
    // standalone page is retired behind a redirect. Bookmarks and any stored
    // deep links keep resolving instead of 404ing.
    const { default: PricesSubmissionsPage } = await import('./page')
    expect(() => PricesSubmissionsPage()).toThrow(/NEXT_REDIRECT/)
    expect(mockRedirect).toHaveBeenCalledWith('/admin/review?tab=submissions')
  })
})
