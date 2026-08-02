// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockBack = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}))

import { BackChip } from './BackChip'
import { BACK_CHIP_COPY } from './definitions/copy'

describe('BackChip', () => {
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

  function getChip() {
    return screen.getByRole('button', { name: BACK_CHIP_COPY.label })
  }

  it('is announced as "Back" on every surface that shares it', () => {
    render(<BackChip />)

    expect(BACK_CHIP_COPY.label).toBe('Back')
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  })

  it('renders a 44x44 hit target around a 36px visual disc', () => {
    render(<BackChip />)

    const button = getChip()
    expect(button.className).toContain('h-11')
    expect(button.className).toContain('w-11')

    const disc = button.querySelector('span[aria-hidden="true"]')
    expect(disc).not.toBeNull()
    expect(disc?.className).toContain('h-9')
    expect(disc?.className).toContain('w-9')
    expect(disc?.className).toContain('rounded-full')
  })

  it('calls router.back() when there is prior history (preserves filter state, #637)', () => {
    stubHistoryLength(3)
    render(<BackChip />)
    fireEvent.click(getChip())
    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('falls back to the fallbackHref when opened as a direct link (no prior history)', () => {
    stubHistoryLength(1)
    render(<BackChip fallbackHref="/venues" />)
    fireEvent.click(getChip())
    expect(mockPush).toHaveBeenCalledWith('/venues')
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('defaults the fallback route to /events', () => {
    stubHistoryLength(1)
    render(<BackChip />)
    fireEvent.click(getChip())
    expect(mockPush).toHaveBeenCalledWith('/events')
  })

  // The 44px button is 8px larger than the 36px disc on each axis, so it must be
  // offset by 4px up and left for the disc to land exactly where it did before.
  // JSDOM does no layout, so assert on the values the component writes, not geometry.
  it('offsets the button 4px above the requested disc top', () => {
    render(<BackChip top={56} />)
    expect(getChip().style.top).toBe('52px')
  })

  it('offsets by 4px from the default top of 56', () => {
    render(<BackChip />)
    expect(getChip().style.top).toBe('52px')
  })

  it('sits at left-2.5 (10px) so the disc stays at 14px', () => {
    render(<BackChip />)
    expect(getChip().className).toContain('left-2.5')
  })

  it('merges an extra className onto the button', () => {
    render(<BackChip className="custom-class" />)
    expect(getChip().className).toContain('custom-class')
  })
})
