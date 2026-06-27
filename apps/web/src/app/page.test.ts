import { describe, it, expect } from 'vitest'

// Contract test (#842): the landing page must export `revalidate = 300` so
// Next.js renders it via ISR with a 5-minute window. The crawler triggers
// every 10 min, so a 5-min window always catches new events within one cycle.
// If anyone removes the export or changes the window without coordinating with
// the crawler cadence, this test fails loudly.
describe('app/page — ISR contract (#842)', () => {
  it('exports revalidate = 300 (5 min)', async () => {
    const mod = await import('./page')
    expect(mod.revalidate).toBe(300)
  })
})
