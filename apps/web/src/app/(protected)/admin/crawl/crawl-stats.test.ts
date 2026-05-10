import { describe, it, expect } from 'vitest'
import { formatSweepHint, formatRunsBreakdown } from './crawl-stats'

describe('formatSweepHint', () => {
  it('returns empty string when no runs provided', () => {
    expect(formatSweepHint([])).toBe('')
  })

  it('returns date + time range string when multiple runs are present', () => {
    // Runs ordered newest-first; UTC times that map to 12:14 and 12:42 MDT (UTC-6 in May)
    const runs = [
      { createdAt: '2026-05-07T18:42:00Z' },
      { createdAt: '2026-05-07T18:14:00Z' },
    ] as { createdAt: string }[]
    const hint = formatSweepHint(runs)
    expect(hint).toMatch(/May 7/)
    expect(hint).toContain('–')
    expect(hint).toContain('12:42')
    expect(hint).toContain('12:14')
  })

  it('returns date + single time (no range) when only one run', () => {
    const runs = [{ createdAt: '2026-05-07T18:42:00Z' }] as {
      createdAt: string
    }[]
    const hint = formatSweepHint(runs)
    expect(hint).toMatch(/May 7/)
    expect(hint).not.toContain('–')
  })
})

describe('formatRunsBreakdown', () => {
  it('returns empty string when no runs', () => {
    expect(formatRunsBreakdown([])).toBe('')
  })

  it('formats counts for all statuses present', () => {
    const runs = [
      { status: 'success' },
      { status: 'success' },
      { status: 'partial' },
      { status: 'failed' },
    ] as { status: string }[]
    expect(formatRunsBreakdown(runs)).toBe('2 ok · 1 partial · 1 failed')
  })

  it('omits zero-count statuses', () => {
    const runs = [{ status: 'success' }, { status: 'success' }] as {
      status: string
    }[]
    expect(formatRunsBreakdown(runs)).toBe('2 ok')
  })

  it('returns empty string for unknown statuses (no CrawlRun.status=blocked)', () => {
    const runs = [{ status: 'blocked' }] as { status: string }[]
    expect(formatRunsBreakdown(runs)).toBe('')
  })
})
