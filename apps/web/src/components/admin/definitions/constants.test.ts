import { describe, expect, it } from 'vitest'
import type { ActiveCrawlAlert } from '@concert-crawl/types'
import { resolveCrawlAlertBadge } from './constants'

describe('resolveCrawlAlertBadge', () => {
  const baseAlert: Pick<ActiveCrawlAlert, 'notificationId'> = {
    notificationId: '00000000-0000-0000-0000-000000000001',
  }

  it('returns Went dark label for went_dark severity', () => {
    const config = resolveCrawlAlertBadge({
      ...baseAlert,
      category: 'crawl.event_count_dropped',
      severity: 'went_dark',
    })
    expect(config.label).toBe('Went dark')
    expect(config.variant).toBe('destructive')
  })

  it('returns Dropped sharply label for dropped_sharply severity', () => {
    const config = resolveCrawlAlertBadge({
      ...baseAlert,
      category: 'crawl.event_count_dropped',
      severity: 'dropped_sharply',
    })
    expect(config.label).toBe('Dropped sharply')
    expect(config.variant).toBe('destructive')
  })

  it('falls back to neutral Event drop label when severity is null', () => {
    const config = resolveCrawlAlertBadge({
      ...baseAlert,
      category: 'crawl.event_count_dropped',
      severity: null,
    })
    expect(config.label).toBe('Event drop')
  })

  it('falls back to neutral Event drop label when severity is missing', () => {
    const config = resolveCrawlAlertBadge({
      ...baseAlert,
      category: 'crawl.event_count_dropped',
    })
    expect(config.label).toBe('Event drop')
  })

  it('returns Failing label for crawl.failed category regardless of severity', () => {
    const config = resolveCrawlAlertBadge({
      ...baseAlert,
      category: 'crawl.failed',
    })
    expect(config.label).toBe('Failing')
    expect(config.variant).toBe('destructive')
  })
})
