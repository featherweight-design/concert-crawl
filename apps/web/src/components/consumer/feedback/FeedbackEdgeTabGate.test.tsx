// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let pathname: string
let isLoaded: boolean
let isSignedIn: boolean

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded, isSignedIn }),
}))

vi.mock('./FeedbackEdgeTab', () => ({
  FeedbackEdgeTab: () => <div data-testid="feedback-tab" />,
}))

import { FeedbackEdgeTabGate } from './FeedbackEdgeTabGate'

beforeEach(() => {
  pathname = '/events'
  isLoaded = true
  isSignedIn = true
})

describe('FeedbackEdgeTabGate — signed-out gating (#794)', () => {
  it('renders the tab for a signed-in visitor on a consumer route', () => {
    const { queryByTestId } = render(<FeedbackEdgeTabGate />)
    expect(queryByTestId('feedback-tab')).toBeTruthy()
  })

  // Feedback POSTs to an authed endpoint, so offering it to an anonymous
  // visitor can only produce a 401.
  it('renders nothing when signed out', () => {
    isSignedIn = false
    const { container } = render(<FeedbackEdgeTabGate />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing while Clerk is still resolving', () => {
    isLoaded = false
    isSignedIn = false
    const { container } = render(<FeedbackEdgeTabGate />)
    expect(container.innerHTML).toBe('')
  })

  it('still hides on admin routes', () => {
    pathname = '/admin/venues'
    const { container } = render(<FeedbackEdgeTabGate />)
    expect(container.innerHTML).toBe('')
  })
})
