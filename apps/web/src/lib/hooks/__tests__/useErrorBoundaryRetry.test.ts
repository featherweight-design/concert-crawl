// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useErrorBoundaryRetry } from '../useErrorBoundaryRetry'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

describe('useErrorBoundaryRetry', () => {
  beforeEach(() => {
    refresh.mockClear()
  })

  // Regression guard: the boundaries used to wire onClick={reset} directly.
  // reset() only re-renders the boundary subtree against the already-cached
  // (failed) RSC payload, so "Try again" fired zero network requests and never
  // recovered even against a healed upstream — only a hard reload did.
  it('refreshes the router so the failed RSC payload is refetched', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useErrorBoundaryRetry(reset))

    act(() => result.current())

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('still resets the boundary error state', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useErrorBoundaryRetry(reset))

    act(() => result.current())

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('refreshes before resetting so the re-render sees fresh server data', () => {
    const calls: string[] = []
    refresh.mockImplementation(() => calls.push('refresh'))
    const reset = vi.fn(() => calls.push('reset'))

    const { result } = renderHook(() => useErrorBoundaryRetry(reset))
    act(() => result.current())

    expect(calls).toEqual(['refresh', 'reset'])
  })

  it('retries again on a second click', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useErrorBoundaryRetry(reset))

    act(() => result.current())
    act(() => result.current())

    expect(refresh).toHaveBeenCalledTimes(2)
    expect(reset).toHaveBeenCalledTimes(2)
  })

  // Sweep guard for the whole class: every error boundary in the app must go
  // through the hook. A new error.tsx wiring onClick={reset} directly ships the
  // same dead "Try again" button this hook exists to fix.
  it('is used by every error.tsx boundary in the app', () => {
    const appDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      'app',
    )

    const findErrorBoundaries = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return findErrorBoundaries(full)
        return entry.name === 'error.tsx' || entry.name === 'global-error.tsx'
          ? [full]
          : []
      })

    const boundaries = findErrorBoundaries(appDir)
    expect(boundaries.length).toBeGreaterThan(0)

    for (const boundary of boundaries) {
      const source = readFileSync(boundary, 'utf8')
      expect(source).toContain('useErrorBoundaryRetry')
      // Bare `onClick={reset}` is the exact defect — refetch never happens.
      expect(source).not.toMatch(/onClick=\{reset\}/)
    }
  })
})
