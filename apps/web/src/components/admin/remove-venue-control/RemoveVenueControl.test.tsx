// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'

const mockRemoveVenue = vi.fn()
vi.mock('@/lib/actions/venues', () => ({
  removeVenue: (...args: unknown[]) => mockRemoveVenue(...args),
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { RemoveVenueControl } from './RemoveVenueControl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.venueDetailsClient.dangerZone.remove

const renderControl = () =>
  render(
    <RemoveVenueControl
      venueId="venue-1"
      venueName="The Church"
      removed={false}
    />,
  )

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: COPY.trigger }))
  return screen.getByRole('dialog')
}

const confirmButton = () =>
  screen
    .getAllByRole('button', { name: COPY.dialog.confirm })
    .find((button) => button.closest('[role="dialog"]') !== null)

describe('RemoveVenueControl', () => {
  beforeEach(() => {
    mockRemoveVenue.mockReset()
    mockRefresh.mockReset()
  })
  afterEach(cleanup)

  it('stays disarmed until both a reason and the exact venue name are given', () => {
    renderControl()
    openDialog()
    expect(confirmButton()?.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText(COPY.dialog.reasonLabel), {
      target: { value: 'venue asked' },
    })
    expect(confirmButton()?.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText(COPY.dialog.typedInputAriaLabel), {
      target: { value: 'The Chur' },
    })
    expect(confirmButton()?.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText(COPY.dialog.typedInputAriaLabel), {
      target: { value: 'The Church' },
    })
    expect(confirmButton()?.hasAttribute('disabled')).toBe(false)
  })

  it('removes with the trimmed reason, then closes and refreshes', async () => {
    mockRemoveVenue.mockResolvedValue({
      submissionsDeleted: 2,
      eventPricesCleared: 1,
    })
    renderControl()
    openDialog()
    fireEvent.change(screen.getByLabelText(COPY.dialog.reasonLabel), {
      target: { value: '  venue asked  ' },
    })
    fireEvent.change(screen.getByLabelText(COPY.dialog.typedInputAriaLabel), {
      target: { value: 'The Church' },
    })
    fireEvent.click(confirmButton()!)

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(mockRemoveVenue).toHaveBeenCalledWith('venue-1', 'venue asked')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the dialog open and says so when removal fails', async () => {
    mockRemoveVenue.mockRejectedValue(new Error('boom'))
    renderControl()
    openDialog()
    fireEvent.change(screen.getByLabelText(COPY.dialog.reasonLabel), {
      target: { value: 'venue asked' },
    })
    fireEvent.change(screen.getByLabelText(COPY.dialog.typedInputAriaLabel), {
      target: { value: 'The Church' },
    })
    fireEvent.click(confirmButton()!)

    expect((await screen.findByRole('alert')).textContent).toBe(
      COPY.dialog.failed,
    )
    expect(screen.queryByRole('dialog')).not.toBeNull()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
