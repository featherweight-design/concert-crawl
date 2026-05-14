// @vitest-environment jsdom

import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetToken, mockPatchMe } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockPatchMe: vi.fn(),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

vi.mock('@/lib/users', () => ({
  patchMe: mockPatchMe,
}))

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

import { OnboardingThemeFlush } from './OnboardingThemeFlush'

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
  mockGetToken.mockResolvedValue('test-token')
  mockPatchMe.mockResolvedValue(undefined)
})

describe('OnboardingThemeFlush', () => {
  it('renders nothing', () => {
    const { container } = render(<OnboardingThemeFlush />)
    expect(container.firstChild).toBeNull()
  })

  it('does nothing when cc-onboarding-theme-pending is not set', async () => {
    render(<OnboardingThemeFlush />)
    await act(async () => {})
    expect(mockPatchMe).not.toHaveBeenCalled()
  })

  it('calls patchMe with the theme from cc-theme when flag is set', async () => {
    localStorageMock.setItem('cc-onboarding-theme-pending', '1')
    localStorageMock.setItem('cc-theme', 'jade')
    render(<OnboardingThemeFlush />)
    await act(async () => {})
    expect(mockPatchMe).toHaveBeenCalledWith('test-token', { theme: 'jade' })
  })

  it('clears cc-onboarding-theme-pending after a successful flush', async () => {
    localStorageMock.setItem('cc-onboarding-theme-pending', '1')
    localStorageMock.setItem('cc-theme', 'jade')
    render(<OnboardingThemeFlush />)
    await act(async () => {})
    expect(localStorageMock.getItem('cc-onboarding-theme-pending')).toBeNull()
  })

  it('clears cc-onboarding-theme-pending even when patchMe throws', async () => {
    localStorageMock.setItem('cc-onboarding-theme-pending', '1')
    localStorageMock.setItem('cc-theme', 'jade')
    mockPatchMe.mockRejectedValueOnce(new Error('network error'))
    render(<OnboardingThemeFlush />)
    await act(async () => {})
    expect(localStorageMock.getItem('cc-onboarding-theme-pending')).toBeNull()
  })

  it('does not call patchMe when cc-theme is not a valid ThemeName', async () => {
    localStorageMock.setItem('cc-onboarding-theme-pending', '1')
    localStorageMock.setItem('cc-theme', 'not-a-real-theme')
    render(<OnboardingThemeFlush />)
    await act(async () => {})
    expect(mockPatchMe).not.toHaveBeenCalled()
    expect(localStorageMock.getItem('cc-onboarding-theme-pending')).toBeNull()
  })

  it('does not call patchMe when getToken returns null', async () => {
    localStorageMock.setItem('cc-onboarding-theme-pending', '1')
    localStorageMock.setItem('cc-theme', 'jade')
    mockGetToken.mockResolvedValueOnce(null)
    render(<OnboardingThemeFlush />)
    await act(async () => {})
    expect(mockPatchMe).not.toHaveBeenCalled()
    expect(localStorageMock.getItem('cc-onboarding-theme-pending')).toBeNull()
  })
})
