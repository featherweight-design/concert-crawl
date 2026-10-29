// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// The server action pulls in next/headers; the link under test never calls it.
vi.mock('./actions', () => ({ validateAndSetInviteCode: vi.fn() }))
vi.mock('@/components/waitlist/WaitlistModal', () => ({
  WaitlistModal: () => null,
}))

import InviteCodePage from './page'

describe('invite-code screen links the Private Beta Agreement (#1619)', () => {
  it('renders a link to /legal/beta named after the agreement', () => {
    render(<InviteCodePage />)

    const link = screen.getByRole('link', { name: 'Private Beta Agreement' })
    expect(link).toHaveAttribute('href', '/legal/beta')
    expect(link.closest('p')).toHaveTextContent(
      'By continuing you agree to our Private Beta Agreement.',
    )
  })
})
