// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

import CrewJoinError from './error'
import { CREWS_COPY } from '@/components/consumer/crews'

afterEach(cleanup)
beforeEach(() => {
  refresh.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('crew join error boundary (#1226)', () => {
  it('states the failure as ours and offers both a retry and a way out', () => {
    const reset = vi.fn()
    render(<CrewJoinError error={new Error('boom')} reset={reset} />)

    expect(
      screen.getByText(CREWS_COPY.net.errInviteEyebrow),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: CREWS_COPY.net.errInviteTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(CREWS_COPY.net.errInviteBody)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: CREWS_COPY.linkDead.browse }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: CREWS_COPY.net.retry }))
    // Both halves: `reset()` alone re-renders against the same cached, failed
    // RSC payload and lands straight back here.
    expect(refresh).toHaveBeenCalled()
    expect(reset).toHaveBeenCalled()
  })
})
