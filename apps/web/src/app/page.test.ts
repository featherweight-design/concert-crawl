import { describe, it, expect } from 'vitest'

// Contract test (#842): the landing page must export `revalidate = 300` so
// Next.js renders it via ISR with a 5-minute window. A crawl that inserts
// events also asks for a revalidation (#847); this window is the fallback when
// that call is skipped. If anyone removes the export or changes the window,
// this test fails loudly.
describe('app/page — ISR contract (#842)', () => {
  it('exports revalidate = 300 (5 min)', async () => {
    const mod = await import('./page')
    expect(mod.revalidate).toBe(300)
  })
})
