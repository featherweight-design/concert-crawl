// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { isIosSafari } from '../beforeinstallprompt'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPADOS_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const DESKTOP_MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1'

const stub = (userAgent: string, maxTouchPoints: number) => {
  const nav: { userAgent?: string; maxTouchPoints?: number } = navigator
  Object.defineProperty(nav, 'userAgent', {
    value: userAgent,
    configurable: true,
  })
  Object.defineProperty(nav, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  })
}

describe('isIosSafari', () => {
  afterEach(() => {
    const nav: { userAgent?: string; maxTouchPoints?: number } = navigator
    delete nav.userAgent
    delete nav.maxTouchPoints
  })

  it('detects iPhone Safari', () => {
    stub(IPHONE_SAFARI, 5)
    expect(isIosSafari()).toBe(true)
  })

  it('detects iPadOS 13+ Safari reporting a Macintosh UA with touch', () => {
    stub(IPADOS_SAFARI, 5)
    expect(isIosSafari()).toBe(true)
  })

  it('does not treat a real desktop Mac (no touch) as iOS Safari', () => {
    stub(DESKTOP_MAC_SAFARI, 0)
    expect(isIosSafari()).toBe(false)
  })

  it('does not treat iOS Chrome as iOS Safari', () => {
    stub(IPHONE_CHROME, 5)
    expect(isIosSafari()).toBe(false)
  })
})
