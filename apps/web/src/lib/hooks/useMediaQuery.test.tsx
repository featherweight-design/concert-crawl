// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'

const listeners = new Set<() => void>()
let matches = false

const Probe = () => {
  const wide = useMediaQuery('(min-width: 768px)')
  return <div data-testid="probe">{wide ? 'wide' : 'narrow'}</div>
}

beforeEach(() => {
  listeners.clear()
  matches = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type: string, listener: () => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: () => void) => {
        listeners.delete(listener)
      },
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMediaQuery', () => {
  // The regression this pins: seeding `false` and correcting in an effect
  // paints one frame of the narrow layout on a desktop `min-width` consumer.
  it('reports a matching query on the very first render, with no correction pass', () => {
    matches = true
    const renders: string[] = []
    const Recorder = () => {
      const wide = useMediaQuery('(min-width: 768px)')
      renders.push(wide ? 'wide' : 'narrow')
      return null
    }
    render(<Recorder />)
    expect(renders[0]).toBe('wide')
    expect(renders).not.toContain('narrow')
  })

  it('follows the query when the viewport changes', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('narrow')

    act(() => {
      matches = true
      listeners.forEach((listener) => listener())
    })

    expect(screen.getByTestId('probe').textContent).toBe('wide')
  })
})
