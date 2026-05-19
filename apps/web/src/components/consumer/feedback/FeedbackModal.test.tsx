// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('tok') }),
  useUser: () => ({ user: null }),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/browse',
}))
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'electric' }),
}))
vi.mock('@/components/brand/cc-mark', () => ({
  CCMark: () => <div data-testid="cc-mark" />,
}))

import { FeedbackModal } from './FeedbackModal'

describe('FeedbackModal', () => {
  it('renders the dialog with form content when open', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Holler at us.')).toBeTruthy()
  })

  it('renders nothing when closed', () => {
    render(<FeedbackModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
