// @vitest-environment jsdom

import { render, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { ThemeProvider, useTheme } from './ThemeProvider'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

Object.defineProperty(window, 'matchMedia', {
  value: () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  }),
})

beforeEach(() => {
  localStorageMock.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('style')
})

describe('ThemeProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <span>hello</span>
      </ThemeProvider>,
    )
    expect(getByText('hello')).toBeTruthy()
  })

  it('returns initial theme of electric when no data-theme is set', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    expect(result.current.theme).toBe('electric')
  })

  it('setTheme updates theme state, data-theme attribute, and localStorage', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })

    await act(async () => {
      result.current.setTheme('jade')
    })

    expect(result.current.theme).toBe('jade')
    expect(document.documentElement.getAttribute('data-theme')).toBe('jade')
    expect(localStorageMock.getItem('cc-theme')).toBe('jade')
  })

  it('reads existing data-theme attribute on mount', async () => {
    document.documentElement.setAttribute('data-theme', 'light')

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })

    // Wait for the useEffect to fire
    await act(async () => {})

    expect(result.current.theme).toBe('light')
  })

  it('useTheme throws when called outside ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within ThemeProvider',
    )
  })
})
