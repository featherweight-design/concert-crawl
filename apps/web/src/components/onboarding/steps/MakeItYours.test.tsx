// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { MakeItYours } from './MakeItYours'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

beforeEach(() => {
  localStorageMock.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('MakeItYours', () => {
  it('sets cc-onboarding-theme-pending in localStorage when a swatch is clicked', () => {
    render(<MakeItYours />, { wrapper: Wrapper })
    const swatches = screen.getAllByRole('button')
    fireEvent.click(swatches[0]!)
    expect(localStorageMock.getItem('cc-onboarding-theme-pending')).toBe('1')
  })

  it('does not set cc-onboarding-theme-pending before any swatch is clicked', () => {
    render(<MakeItYours />, { wrapper: Wrapper })
    expect(localStorageMock.getItem('cc-onboarding-theme-pending')).toBeNull()
  })

  it('renders the hero preview on initial render without any swatch interaction', () => {
    render(<MakeItYours />, { wrapper: Wrapper })
    expect(screen.getByText('The Midnight')).toBeDefined()
    expect(screen.getByText('Tonight')).toBeDefined()
  })
})
