// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrawlStatusBadge } from './CrawlStatusBadge'
import { CRAWL_STATUS_DISPLAY } from '@/components/admin/definitions/crawl-status'

describe('CrawlStatusBadge', () => {
  it('labels a status from the shared definition', () => {
    render(<CrawlStatusBadge status="skipped" />)
    expect(screen.getByText(CRAWL_STATUS_DISPLAY.skipped.label)).toBeTruthy()
  })

  it('reads skipped as unremarkable, not as a fault', () => {
    // Skipped means page-hash dedup matched, which is a normal, healthy
    // outcome. The dashboard used to render it in `signal` magenta, which
    // read as an alarm next to genuinely failing venues.
    expect(CRAWL_STATUS_DISPLAY.skipped.kind).toBe('neutral')
  })

  it('separates the two statuses that need an operator', () => {
    expect(CRAWL_STATUS_DISPLAY.failed.kind).toBe('danger')
    expect(CRAWL_STATUS_DISPLAY.partial.kind).toBe('warning')
  })

  it('falls back to a readable label for an unknown status', () => {
    render(<CrawlStatusBadge status="something-new" />)
    expect(screen.getByText('something-new')).toBeTruthy()
  })

  it('does not mistake an inherited object property for a status', () => {
    // `status` is widened to string, so a value like `toString` reaches the
    // lookup. A prototype-chain hit would resolve to a function and render
    // an empty badge.
    render(<CrawlStatusBadge status="toString" />)
    expect(screen.getByText('toString')).toBeTruthy()
  })

  it('renders the never-crawled placeholder when status is null', () => {
    render(<CrawlStatusBadge status={null} />)
    expect(screen.getByText(CRAWL_STATUS_DISPLAY.never.label)).toBeTruthy()
  })
})
