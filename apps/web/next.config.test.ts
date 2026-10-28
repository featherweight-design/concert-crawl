// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const { serwistInit } = vi.hoisted(() => ({
  serwistInit: vi.fn(() => (config: unknown) => config),
}))

vi.mock('@serwist/next', () => ({ default: serwistInit }))
vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
}))

describe('next.config Serwist options', () => {
  // ServiceWorkerRegistration owns registration and catches its failures.
  // Serwist's own auto-register calls `window.serwist.register()` without a
  // catch, so a browser whose `register()` resolves to nothing threw an
  // unhandled "reading 'waiting'" rejection on every page (CONCERT-CRAWL-WEB-2).
  it('leaves service worker registration to the app', async () => {
    await import('./next.config')
    expect(serwistInit).toHaveBeenCalledWith(
      expect.objectContaining({ register: false }),
    )
  })
})
