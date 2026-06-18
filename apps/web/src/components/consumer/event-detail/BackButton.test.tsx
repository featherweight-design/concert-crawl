// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockBack = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}))

import { BackButton } from './BackButton'

describe('event-detail BackButton', () => {
  let historyLengthSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockBack.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    cleanup()
    historyLengthSpy?.mockRestore()
  })

  function stubHistoryLength(length: number) {
    historyLengthSpy = vi
      .spyOn(window.history, 'length', 'get')
      .mockReturnValue(length)
  }

  it('calls router.back() when there is prior history (preserves filter state, #637)', () => {
    stubHistoryLength(3)
    render(<BackButton />)
    fireEvent.click(screen.getByRole('button', { name: /back to browse/i }))
    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('falls back to /events when opened as a direct link (no prior history)', () => {
    stubHistoryLength(1)
    render(<BackButton />)
    fireEvent.click(screen.getByRole('button', { name: /back to browse/i }))
    expect(mockPush).toHaveBeenCalledWith('/events')
    expect(mockBack).not.toHaveBeenCalled()
  })
})
