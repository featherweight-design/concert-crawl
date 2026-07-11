// @vitest-environment jsdom

// Regression tests for usePlanOpenParam (PR 4.2, Copilot round 2):
// (1) same-path query navigations must re-fire (the hook keys off
// useSearchParams, not window.location at mount), and (2) with /me
// mounting mobile + desktop trees concurrently, only the viewport-matching
// variant may open its sheet.

import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlanOpenParam, type PlanOpenVariant } from './use-plan-open-param'

let searchString = ''
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => '/me',
  useSearchParams: () => new URLSearchParams(searchString),
}))

let mobileViewport = false

beforeEach(() => {
  searchString = ''
  mobileViewport = false
  vi.clearAllMocks()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobileViewport,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

const Harness = ({
  onOpen,
  variant,
}: {
  onOpen: () => void
  variant?: PlanOpenVariant
}) => {
  usePlanOpenParam(onOpen, variant)
  return null
}

describe('usePlanOpenParam', () => {
  it('fires and strips the param when ?plan=open is present at mount', () => {
    searchString = 'plan=open'
    const onOpen = vi.fn()
    render(<Harness onOpen={onOpen} />)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/me', { scroll: false })
  })

  it('preserves unrelated params when stripping', () => {
    searchString = 'tab=plan&plan=open'
    render(<Harness onOpen={vi.fn()} />)
    expect(mockReplace).toHaveBeenCalledWith('/me?tab=plan', { scroll: false })
  })

  it('does nothing without the param', () => {
    const onOpen = vi.fn()
    render(<Harness onOpen={onOpen} />)
    expect(onOpen).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('re-fires on a same-path navigation that only changes the query', () => {
    const onOpen = vi.fn()
    const view = render(<Harness onOpen={onOpen} />)
    expect(onOpen).not.toHaveBeenCalled()
    // Simulate router.push('/me?plan=open') while already on /me: pathname
    // is unchanged, only useSearchParams yields a new value.
    searchString = 'plan=open'
    view.rerender(<Harness onOpen={onOpen} key="requery" />)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('only the viewport-matching variant fires when both trees are mounted (desktop)', () => {
    searchString = 'plan=open'
    mobileViewport = false
    const onMobileOpen = vi.fn()
    const onDesktopOpen = vi.fn()
    render(
      <>
        <Harness onOpen={onMobileOpen} variant="mobile" />
        <Harness onOpen={onDesktopOpen} variant="desktop" />
      </>,
    )
    expect(onMobileOpen).not.toHaveBeenCalled()
    expect(onDesktopOpen).toHaveBeenCalledTimes(1)
  })

  it('only the viewport-matching variant fires when both trees are mounted (mobile)', () => {
    searchString = 'plan=open'
    mobileViewport = true
    const onMobileOpen = vi.fn()
    const onDesktopOpen = vi.fn()
    render(
      <>
        <Harness onOpen={onMobileOpen} variant="mobile" />
        <Harness onOpen={onDesktopOpen} variant="desktop" />
      </>,
    )
    expect(onDesktopOpen).not.toHaveBeenCalled()
    expect(onMobileOpen).toHaveBeenCalledTimes(1)
  })

  it('a viewport-mismatched variant does not strip the param either', () => {
    searchString = 'plan=open'
    mobileViewport = false
    render(<Harness onOpen={vi.fn()} variant="mobile" />)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
