// @vitest-environment jsdom

import React from 'react'
// Type-only, so it is erased before the hoisted vi.mock factories run.
import type * as WatchingModule from '@/components/consumer/watching'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'

// Mocks are declared before the page import so the module under test resolves
// them.

const mockGetToken = vi.fn<() => Promise<string | null>>()
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: mockGetToken }),
}))

const mockFetchWatching = vi.fn()
vi.mock('@/lib/watching', () => ({
  fetchWatching: (...args: unknown[]) => mockFetchWatching(...args),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

// The signed-in list drags in a large client tree; the page's contract here is
// which branch it takes, not what the list renders.
vi.mock('@/components/consumer/watching', async () => {
  const actual = await vi.importActual<typeof WatchingModule>(
    '@/components/consumer/watching',
  )
  return {
    WatchingSignedOut: actual.WatchingSignedOut,
    WatchingContent: () => <div data-testid="watching-content" />,
  }
})

import WatchingPage from './page'

beforeEach(() => {
  mockGetToken.mockReset()
  mockFetchWatching.mockReset()
})

describe('WatchingPage — public route, gated payload (#794)', () => {
  it('never calls fetchWatching without a token', async () => {
    mockGetToken.mockResolvedValue(null)
    await WatchingPage()
    expect(mockFetchWatching).not.toHaveBeenCalled()
  })

  it('renders the signed-out teaching state without a token', async () => {
    mockGetToken.mockResolvedValue(null)
    const tree = await WatchingPage()
    expect(renderToString(tree)).toContain('Keep an eye on it.')
  })

  it('renders the real list with a token', async () => {
    mockGetToken.mockResolvedValue('tok_1')
    mockFetchWatching.mockResolvedValue([])
    const tree = await WatchingPage()
    expect(mockFetchWatching).toHaveBeenCalledWith('tok_1')
    expect(renderToString(tree)).toContain('watching-content')
  })
})
