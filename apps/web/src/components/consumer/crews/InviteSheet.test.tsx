// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}))

const fetchCurrentInvite = vi.fn()
const mintInvite = vi.fn()
const revokeInvite = vi.fn()
vi.mock('@/lib/crews', () => ({
  fetchCurrentInvite: (...args: unknown[]) => fetchCurrentInvite(...args),
  mintInvite: (...args: unknown[]) => mintInvite(...args),
  revokeInvite: (...args: unknown[]) => revokeInvite(...args),
}))

import { InviteSheet } from './InviteSheet'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY.invite

afterEach(cleanup)

const link = {
  id: 'inv-1',
  token: 'tok-abc',
  expiresAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
}

beforeEach(() => {
  fetchCurrentInvite.mockReset().mockResolvedValue(link)
  mintInvite.mockReset().mockResolvedValue(link)
  revokeInvite.mockReset()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const mount = (open: boolean) =>
  render(
    <InviteSheet
      open={open}
      onClose={vi.fn()}
      crewId="crew-1"
      crewName="Thursdays"
      patchSalt={1}
      memberCount={2}
    />,
  )

describe('InviteSheet (#1226)', () => {
  // A revoke that is still in flight when the sheet is dismissed used to leave
  // `busy` true, so every button on the next open was disabled with nothing
  // running to re-enable them.
  it('re-enables its buttons after being dismissed mid-revoke', async () => {
    revokeInvite.mockReturnValue(new Promise(() => undefined))
    const view = mount(true)
    await screen.findByText(`${COPY.expiry(6)}`)

    fireEvent.click(screen.getByRole('button', { name: COPY.revoke }))
    expect(screen.getByRole('button', { name: COPY.newLink })).toBeDisabled()
    // Every button's disabled state matches its handler's own guard, so none
    // of them is a control that looks live and silently does nothing.
    expect(screen.getByRole('button', { name: COPY.copy })).toBeDisabled()

    view.rerender(
      <InviteSheet
        open={false}
        onClose={vi.fn()}
        crewId="crew-1"
        crewName="Thursdays"
        patchSalt={1}
        memberCount={2}
      />,
    )
    view.rerender(
      <InviteSheet
        open
        onClose={vi.fn()}
        crewId="crew-1"
        crewName="Thursdays"
        patchSalt={1}
        memberCount={2}
      />,
    )

    await screen.findByText(`${COPY.expiry(6)}`)
    expect(screen.getByRole('button', { name: COPY.newLink })).toBeEnabled()
  })

  // `writeText` throws rather than rejecting on an insecure origin, so the
  // rejection handler alone never runs and the click took the sheet down.
  it('reports a failure instead of throwing when the clipboard is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    mount(true)
    await screen.findByText(`${COPY.expiry(6)}`)

    fireEvent.click(screen.getByRole('button', { name: COPY.copy }))
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.failed)
  })

  // The failure notice used to outlive the attempt that caused it, so a copy
  // that worked still sat under a message saying it had not.
  it('clears an earlier failure once a later copy succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    mount(true)
    await screen.findByText(`${COPY.expiry(6)}`)

    fireEvent.click(screen.getByRole('button', { name: COPY.copy }))
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.failed)

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.copy }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('tok-abc'))
  })
})
