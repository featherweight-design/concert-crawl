// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  DiagnosticsPanel,
  type CrawlRunForDiagnostics,
} from './DiagnosticsPanel'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.crawl.diagnostics

const run = (
  overrides: Partial<CrawlRunForDiagnostics>,
): CrawlRunForDiagnostics => ({
  id: 'run-1',
  status: 'failed',
  httpStatusCode: null,
  errorMessage: null,
  consecutiveFailures: 1,
  strategy: 'structured_data',
  venueName: 'Bluebird Theater',
  websiteUrl: 'https://www.bluebirdtheater.net/',
  ...overrides,
})

const noop = () => undefined

const renderPanel = (overrides: Partial<CrawlRunForDiagnostics>) =>
  render(
    <DiagnosticsPanel
      run={run(overrides)}
      stagedId={null}
      onStage={noop}
      onApply={noop}
      onDiscard={noop}
    />,
  )

describe('DiagnosticsPanel', () => {
  afterEach(cleanup)

  // Every option but manual entry used to stage a diff that "Apply" never
  // wrote. A class with nothing real to stage shows no options at all.
  it('offers no staged options for a rate-limited run', () => {
    renderPanel({ httpStatusCode: 429 })
    expect(screen.getByText(COPY.errorReasons.rate_limit.body)).toBeTruthy()
    expect(screen.queryByText(COPY.optionsLabel)).toBeNull()
  })

  it('offers no staged options for a timed-out run', () => {
    renderPanel({ errorMessage: 'TimeoutError: page.goto: Timeout 60000ms' })
    expect(screen.queryByText(COPY.optionsLabel)).toBeNull()
  })

  it('still offers manual entry for a blocked run', () => {
    renderPanel({ httpStatusCode: 403 })
    expect(screen.getByText(COPY.optionsLabel)).toBeTruthy()
    const manual = COPY.diagOptions.bot_detection[0]
    expect(manual && screen.getByText(manual.title)).toBeTruthy()
  })
})
